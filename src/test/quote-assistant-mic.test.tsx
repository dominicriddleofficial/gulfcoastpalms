import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

vi.mock("@/integrations/supabase/client", () => ({ supabase: { auth: { getSession: async () => ({ data: { session: { access_token: "t" } } }) } } }));
import QuoteAssistant, { TRANSCRIBE_TIMEOUT_MS } from "@/components/platform/billing/QuoteAssistant";

/* Fake microphone + MediaRecorder (simulation — not a physical iPhone). */
class FakeTrack { stopped = false; stop() { this.stopped = true; } }
class FakeStream { tracks = [new FakeTrack()]; getTracks() { return this.tracks; } }
let recorders: FakeRecorder[] = [];
let throwOnConstruct = false;
class FakeRecorder {
  static isTypeSupported(t: string) { return t === "audio/webm"; }
  state: "inactive" | "recording" = "inactive"; mimeType = "audio/webm";
  ondataavailable: ((e: { data: Blob }) => void) | null = null; onstop: (() => void) | null = null;
  constructor(public stream: FakeStream) { if (throwOnConstruct) throw new Error("boom"); recorders.push(this); }
  start() { this.state = "recording"; }
  stop() { this.state = "inactive"; this.ondataavailable?.({ data: new Blob(["voice"], { type: "audio/webm" }) }); this.onstop?.(); }
}
let pending: Array<{ resolve: (s: FakeStream) => void; reject: (e: unknown) => void }> = [];
const getUserMedia = vi.fn(() => new Promise<FakeStream>((resolve, reject) => pending.push({ resolve, reject })));
const fetchMock = vi.fn();

function ui(props: Partial<{ open: boolean; businessId: string }> = {}) {
  return <QuoteAssistant open={props.open ?? true} onOpenChange={() => {}} businessId={props.businessId ?? "pps"} hasExistingWork={false} settingsSummary="none" onApply={() => {}} />;
}
const recordBtn = () => screen.getByRole("button", { name: /record voice memo|waiting for microphone/i });

beforeEach(() => {
  recorders = []; pending = []; throwOnConstruct = false; getUserMedia.mockClear(); fetchMock.mockReset();
  vi.stubGlobal("MediaRecorder", FakeRecorder);
  Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: { getUserMedia } });
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.useRealTimers(); });

describe("Quote assistant microphone lifecycle", () => {
  it("closing while permission is pending releases the stream when granted and never starts recording", async () => {
    const view = render(ui());
    fireEvent.click(recordBtn());
    expect(getUserMedia).toHaveBeenCalledTimes(1);
    view.rerender(ui({ open: false }));
    const stream = new FakeStream();
    await act(async () => { pending[0].resolve(stream); });
    expect(stream.tracks[0].stopped).toBe(true);
    expect(recorders).toHaveLength(0);
  });

  it("unmounting while permission is pending releases the late stream", async () => {
    const view = render(ui());
    fireEvent.click(recordBtn());
    view.unmount();
    const stream = new FakeStream();
    await act(async () => { pending[0].resolve(stream); });
    expect(stream.tracks[0].stopped).toBe(true);
    expect(recorders).toHaveLength(0);
  });

  it("shows a starting state and allows only one permission request at a time", async () => {
    render(ui());
    fireEvent.click(recordBtn());
    expect(recordBtn().textContent).toContain("Waiting for microphone");
    fireEvent.click(recordBtn());
    expect(getUserMedia).toHaveBeenCalledTimes(1);
  });

  it("releases the stream when the recorder cannot be created", async () => {
    throwOnConstruct = true;
    render(ui());
    fireEvent.click(recordBtn());
    const stream = new FakeStream();
    await act(async () => { pending[0].resolve(stream); });
    expect(stream.tracks[0].stopped).toBe(true);
    expect(screen.getByRole("alert").textContent).toContain("Couldn't start recording");
  });

  it("start → stop uploads the recorded blob for this workspace and appends the transcript", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ text: "Patio 605 square feet" })));
    render(ui());
    fireEvent.change(screen.getByLabelText(/Description/), { target: { value: "Typed first." } });
    fireEvent.click(recordBtn());
    const stream = new FakeStream();
    await act(async () => { pending[0].resolve(stream); });
    fireEvent.click(screen.getByRole("button", { name: "Stop recording" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const form = fetchMock.mock.calls[0][1].body as FormData;
    expect(form.get("business_id")).toBe("pps");
    expect((form.get("file") as File).name).toBe("recording.webm");
    expect((form.get("file") as File).size).toBeGreaterThan(0);
    await waitFor(() => expect((screen.getByLabelText(/Description/) as HTMLTextAreaElement).value).toBe("Typed first.\nPatio 605 square feet"));
    expect(stream.tracks[0].stopped).toBe(true);
  });

  it("a workspace change during recording releases the mic, resets the transcript and drops the recording", async () => {
    const view = render(ui());
    fireEvent.change(screen.getByLabelText(/Description/), { target: { value: "PPS words" } });
    fireEvent.click(recordBtn());
    const stream = new FakeStream();
    await act(async () => { pending[0].resolve(stream); });
    view.rerender(ui({ businessId: "gcp" }));
    expect(stream.tracks[0].stopped).toBe(true);
    expect((screen.getByLabelText(/Description/) as HTMLTextAreaElement).value).toBe("");
    recorders[0].onstop?.(); // a delayed stop callback must not upload
    await act(async () => {});
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("a stale upload result after a workspace change is ignored", async () => {
    let resolveFetch: (r: Response) => void = () => {};
    fetchMock.mockImplementation(() => new Promise<Response>(r => { resolveFetch = r; }));
    const view = render(ui());
    fireEvent.click(recordBtn());
    await act(async () => { pending[0].resolve(new FakeStream()); });
    fireEvent.click(screen.getByRole("button", { name: "Stop recording" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    view.rerender(ui({ businessId: "gcp" }));
    await act(async () => { resolveFetch(new Response(JSON.stringify({ text: "old workspace words" }))); });
    expect((screen.getByLabelText(/Description/) as HTMLTextAreaElement).value).toBe("");
  });

  it("times out a stalled request, keeps typed work and does not truncate long transcripts", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    fetchMock.mockImplementation((_u: string, init: RequestInit) => new Promise((_r, reject) => {
      init.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")));
    }));
    render(ui());
    const long = "x".repeat(8100);
    fireEvent.change(screen.getByLabelText(/Description/), { target: { value: long } });
    expect((screen.getByLabelText(/Description/) as HTMLTextAreaElement).value).toHaveLength(8100);
    expect(screen.getByTestId("quote-ai-count").textContent).toContain("nothing was cut");
    expect((screen.getByRole("button", { name: /generate quote/i }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(screen.getByLabelText(/Description/), { target: { value: "Patio 605 sq ft" } });
    fireEvent.click(screen.getByRole("button", { name: /generate quote/i }));
    await act(async () => { await vi.advanceTimersByTimeAsync(TRANSCRIBE_TIMEOUT_MS); });
    await waitFor(() => expect(screen.getByRole("alert").textContent).toContain("took too long"));
    expect((screen.getByLabelText(/Description/) as HTMLTextAreaElement).value).toBe("Patio 605 sq ft");
  });
});
