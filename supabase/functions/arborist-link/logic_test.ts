import { assert, assertEquals } from "jsr:@std/assert@1";
import { TOKEN_PATTERN, decodeJpeg, guestReport, hashToken, mapDbError, newToken, reportPhotoPaths } from "./logic.ts";

Deno.test("tokens are 256-bit base64url and unique", () => {
  const a = newToken(), b = newToken();
  assert(TOKEN_PATTERN.test(a)); assert(a !== b);
});
Deno.test("hash is 64 hex chars and stable", async () => {
  const h = await hashToken("x".repeat(43));
  assertEquals(h.length, 64); assertEquals(h, await hashToken("x".repeat(43)));
});
Deno.test("only JPEG bytes accepted", () => {
  assert(decodeJpeg(btoa(String.fromCharCode(0xff, 0xd8, 0xff, 0xe0, 1))));
  assertEquals(decodeJpeg(btoa("\x89PNG....")), null);
  assertEquals(decodeJpeg("not base64!!"), null);
});
Deno.test("link states map to 410 without data; unknown errors are generic", () => {
  assertEquals(mapDbError("link_revoked"), { status: 410, body: { state: "revoked" } });
  assertEquals(mapDbError("link_stale").status, 409);
  assertEquals(mapDbError("relation secret does not exist").body, { error: "Something went wrong. Try again." });
});
Deno.test("guest report hides identity columns", () => {
  const out = guestReport({ id: "1", customer_name: "", property_address: "", visit_date: "2026-01-01", arborist_name: "", general_notes: "", trees: [], status: "draft", version: 1, submitted_at: null, ...{ author_id: "u", business_id: "b" } } as never);
  assert(!("author_id" in out) && !("business_id" in out));
});
Deno.test("only saved photo paths can be signed", () => {
  const paths = reportPhotoPaths([{ photos: [{ path: "a/b.jpg" }] }, { photos: "x" }]);
  assertEquals([...paths], ["a/b.jpg"]);
});
