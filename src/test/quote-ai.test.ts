import { describe, expect, it } from "vitest";
import { parseAiDraft, toReviewLines, lineStatus, reviewTotals, scopeText, toAppliedLines, dollarsToCents, lineCents, builderHasWork } from "@/lib/quote-ai";
import { formatQuantity, unitPriceSuffix } from "@/lib/quote-units";
import { decideQuoteAiAccess, audioUploadType } from "../../supabase/functions/quote-ai/authz";

const ids = () => { let i = 0; return () => `id${++i}`; };
const realQuote = {
  title: "x",
  sections: [
    { heading: "Patio", quantity: 605, unit: "sq_ft", steps: ["Surface preparation for coating", "Moisture vapor barrier", "UV-resistant polyaspartic base coat", "Decorative flake broadcast into base", "Polyaspartic top coat"], exclusions: [] },
    { heading: "Garage", quantity: 975, unit: "sq_ft", steps: ["Surface preparation for coating", "Epoxy base coat", "Decorative flake broadcast into epoxy base", "Polyaspartic top coat"], exclusions: ["No moisture vapor barrier"] },
  ],
  lines: [
    { section_index: 0, description: "Patio coating system", quantity: 605, unit: "sq_ft", unit_rate: 7.5, price_status: "stated", issue: null },
    { section_index: 1, description: "Garage coating system", quantity: 975, unit: "sq_ft", unit_rate: 6.5, price_status: "stated", issue: null },
  ],
  unresolved: [],
};

describe("quote AI money", () => {
  it("computes the real patio + garage quote exactly in cents", () => {
    const lines = toReviewLines(parseAiDraft(realQuote), ids());
    expect(lines.map(l => lineStatus(l).cents)).toEqual([453750, 633750]);
    expect(reviewTotals(lines)).toEqual({ subtotalCents: 1087500, unresolved: 0 });
  });
  it("ignores any AI-supplied total fields", () => {
    const tampered = { ...realQuote, total: 1, lines: realQuote.lines.map(l => ({ ...l, line_total: 5 })) };
    expect(reviewTotals(toReviewLines(parseAiDraft(tampered), ids())).subtotalCents).toBe(1087500);
  });
  it("parses money text exactly and rounds line amounts half-up once", () => {
    expect(dollarsToCents("$1,200.5")).toBe(120050);
    expect(dollarsToCents("7.505")).toBeNull();
    expect(dollarsToCents("-3")).toBeNull();
    expect(lineCents(2.5, 333)).toBe(833);
    expect(lineCents(0.1, 3)).toBe(0);
  });
  it("flags missing or ambiguous prices and never treats them as $0", () => {
    const draft = parseAiDraft({ ...realQuote, lines: [...realQuote.lines,
      { section_index: null, description: "Pressure wash driveway", quantity: null, unit: "job", unit_rate: null, price_status: "missing", issue: "No price given" },
      { section_index: null, description: "Stem wall", quantity: 40, unit: "linear_ft", unit_rate: 0, price_status: "ambiguous", issue: null }] });
    const lines = toReviewLines(draft, ids());
    expect(lines[2].rate).toBe("");
    expect(lines[3].rate).toBe("");
    expect(lineStatus(lines[2]).problem).toBe("No price given");
    expect(reviewTotals(lines)).toEqual({ subtotalCents: 1087500, unresolved: 2 });
    const applied = toAppliedLines(lines);
    expect(applied[2]).toMatchObject({ price: "", issue: "No price given" });
    expect(applied[3].price).toBe("");
  });
});

describe("quote AI scope and units", () => {
  it("keeps separate area sections, step order and the garage exclusion", () => {
    const text = scopeText(parseAiDraft(realQuote));
    expect(text).toContain("Patio — 605 sq ft\n• Surface preparation for coating\n• Moisture vapor barrier");
    expect(text).toContain("Garage — 975 sq ft");
    expect(text).toContain("Not included: moisture vapor barrier");
    expect(text.split("\n\n")).toHaveLength(2);
  });
  it("applies square-foot units, not each", () => {
    const applied = toAppliedLines(toReviewLines(parseAiDraft(realQuote), ids()));
    expect(applied.map(l => [l.qty, l.unit, l.price])).toEqual([["605", "sq ft", "7.50"], ["975", "sq ft", "6.50"]]);
    expect(formatQuantity(605, "sq ft")).toBe("605 sq ft");
    expect(unitPriceSuffix("sq ft")).toBe(" / sq ft");
    expect(formatQuantity(2, "each")).toBe("2");
  });
  it("requires confirmation before replacing a non-empty quote", () => {
    expect(builderHasWork("", [{ description: "", price: "" }])).toBe(false);
    expect(builderHasWork("", [{ description: "Gutter clean", price: "" }])).toBe(true);
    expect(builderHasWork("Existing scope", [])).toBe(true);
  });
  it("rejects malformed AI output", () => {
    expect(() => parseAiDraft({ sections: "no" })).toThrow();
    expect(() => parseAiDraft(null)).toThrow();
  });
});

describe("quote AI server permissions", () => {
  const biz = "b0000000-0000-0000-0000-000000000002";
  it("allows owners and office managers only", () => {
    expect(decideQuoteAiAccess({ userId: "u", businessId: biz, restrictedClimber: false, role: "owner" })).toEqual({ ok: true });
    expect(decideQuoteAiAccess({ userId: "u", businessId: biz, restrictedClimber: false, role: "office_manager" }).ok).toBe(true);
    expect(decideQuoteAiAccess({ userId: "u", businessId: biz, restrictedClimber: false, role: "crew" })).toMatchObject({ ok: false, status: 403 });
    expect(decideQuoteAiAccess({ userId: "u", businessId: biz, restrictedClimber: false, role: null })).toMatchObject({ ok: false, status: 403 });
  });
  it("rejects signed-out users, bad workspaces and restricted climbers", () => {
    expect(decideQuoteAiAccess({ userId: null, businessId: biz, restrictedClimber: false, role: "owner" })).toMatchObject({ status: 401 });
    expect(decideQuoteAiAccess({ userId: "u", businessId: "x", restrictedClimber: false, role: "owner" })).toMatchObject({ status: 400 });
    expect(decideQuoteAiAccess({ userId: "u", businessId: biz, restrictedClimber: true, role: "owner" })).toMatchObject({ status: 403 });
    expect(decideQuoteAiAccess({ userId: "u", businessId: biz, restrictedClimber: null, role: "owner" })).toMatchObject({ status: 403 });
  });
  it("accepts verified iPhone/browser formats and bounds size", () => {
    expect(audioUploadType("memo.m4a", 10)).toEqual({ type: "audio/mp4" });
    expect(audioUploadType("rec.webm", 10)).toEqual({ type: "audio/webm" });
    expect(audioUploadType("a.wav", 10)).toEqual({ type: "audio/wav" });
    expect(audioUploadType("a.aac", 10)).toHaveProperty("error");
    expect(audioUploadType("a.m4a", 0)).toHaveProperty("error");
    expect(audioUploadType("a.m4a", 21 * 1024 * 1024)).toHaveProperty("error");
    expect(audioUploadType("a.exe", 10)).toHaveProperty("error");
  });
});

import { aiLineProblem, builderLineCents, signedDollarsToCents, parseQty, MAX_RATE_CENTS } from "@/lib/quote-ai";
import { publicDepositPlan } from "@/lib/quote-deposit";
describe("bounded money and AI line status", () => {
  it("rejects huge or non-finite rates and quantities", () => {
    expect(dollarsToCents("1e308")).toBeNull();
    expect(dollarsToCents("99999999999")).toBeNull();
    expect(dollarsToCents("1000000.00")).toBe(MAX_RATE_CENTS);
    expect(parseQty("1e9")).toBeNull();
    expect(parseQty("Infinity")).toBeNull();
  });
  it("derives AI unresolved status from both quantity and rate", () => {
    expect(aiLineProblem("605", "", "Price not stated")).toBe("Price not stated");
    expect(aiLineProblem("", "7.50", null)).toBe("Enter a quantity.");
    expect(aiLineProblem("605", "0", null)).toBe("Enter a price.");
    expect(aiLineProblem("605", "7.50", "Price not stated")).toBeNull();
  });
  it("builder line cents match the review calculation for the PPS areas", () => {
    expect(builderLineCents("605", "7.50")).toBe(453750);
    expect(builderLineCents("975", "6.50")).toBe(633750);
    expect(signedDollarsToCents("-1000.00")).toBe(-100000);
  });
});
describe("public deposit plan", () => {
  it("shows no deposit for a quote that doesn't require one, regardless of brand", () => {
    expect(publicDepositPlan({ deposit_required: false, deposit_amount: 0, total: 10875 })).toBeNull();
    expect(publicDepositPlan({ deposit_required: true, deposit_amount: 0, total: 10875 })).toBeNull();
  });
  it("uses the saved deposit amount exactly", () => {
    expect(publicDepositPlan({ deposit_required: true, deposit_amount: 250, total: 10875 })).toEqual({ amountCents: 25000, amount: 250 });
    expect(publicDepositPlan({ deposit_required: true, deposit_amount: 20000, total: 10875 })).toBeNull();
  });
});
