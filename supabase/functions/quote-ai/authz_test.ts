import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { shapeTranscript, MAX_TRANSCRIPT_CHARS, MAX_TRANSCRIPT_RESPONSE_CHARS } from "./authz.ts";

Deno.test("transcript over the 8,000-char generation limit is returned complete", () => {
  const long = "patio coating step ".repeat(700).trim();
  if (long.length <= MAX_TRANSCRIPT_CHARS) throw new Error("fixture too short");
  assertEquals(shapeTranscript(`  ${long}\n`), { text: long });
});

Deno.test("transcript above the safety ceiling is rejected, not cut", () => {
  const r = shapeTranscript("a".repeat(MAX_TRANSCRIPT_RESPONSE_CHARS + 1));
  assertEquals("error" in r && r.status, 413);
});

Deno.test("empty transcript is rejected", () => {
  assertEquals("error" in shapeTranscript("   ") && shapeTranscript("   "), { error: "No speech was found in that recording.", status: 422 });
});
