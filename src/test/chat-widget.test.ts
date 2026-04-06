import { describe, it, expect, vi } from "vitest";

describe("ChatWidget security", () => {
  it("does not import supabase client for direct DB access", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync("src/components/ChatWidget.tsx", "utf-8");

    // Should not have direct supabase imports for DB operations
    expect(content).not.toContain('supabase.from("chat_conversations")');
    expect(content).not.toContain('supabase.from("chat_messages")');
    expect(content).not.toContain("from('chat_conversations')");
    expect(content).not.toContain("from('chat_messages')");
  });

  it("sends messages via edge function, not direct DB insert", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync("src/components/ChatWidget.tsx", "utf-8");

    // Should use the chat-assistant edge function URL
    expect(content).toContain("chat-assistant");
    expect(content).toContain("fetch(CHAT_URL");
  });
});
