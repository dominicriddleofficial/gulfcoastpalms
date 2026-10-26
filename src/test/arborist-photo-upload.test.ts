import { beforeEach, describe, expect, it, vi } from "vitest";
import { newArboristQuote } from "@/lib/arborist-quotes";
const storage = vi.hoisted(() => ({ upload: vi.fn(), createSignedUrl: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { storage: { from: () => storage } } }));
import { uploadArboristPhoto } from "@/hooks/useArboristQuotes";

describe("arborist photo retry", () => {
  beforeEach(() => vi.resetAllMocks());
  it("returns the private object path after a successful upload", async () => {
    storage.upload.mockResolvedValue({ error: null });
    const quote = newArboristQuote("business", "author");
    const path = await uploadArboristPhoto(quote, "tree", "photo", new Blob());
    expect(path).toBe(`business/author/${quote.id}/tree/photo.jpg`);
    expect(storage.upload.mock.calls[0][2]).toEqual({ contentType: "image/jpeg", upsert: false });
  });
  it("recovers a lost upload response only after verifying the exact existing object", async () => {
    storage.upload.mockResolvedValue({ error: { message: "The resource already exists" } });
    storage.createSignedUrl.mockResolvedValue({ error: null, data: { signedUrl: "private-signed-url" } });
    const quote = newArboristQuote("business", "author");
    const path = await uploadArboristPhoto(quote, "tree", "photo", new Blob());
    expect(storage.createSignedUrl).toHaveBeenCalledWith(path, 60);
  });
  it("keeps an unverified duplicate as a failed upload", async () => {
    storage.upload.mockResolvedValue({ error: { message: "Duplicate resource" } });
    storage.createSignedUrl.mockResolvedValue({ error: { message: "Access denied" }, data: null });
    await expect(uploadArboristPhoto(newArboristQuote("business", "author"), "tree", "photo", new Blob())).rejects.toThrow("Photo upload failed");
  });
});
