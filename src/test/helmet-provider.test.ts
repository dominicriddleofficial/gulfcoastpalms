import { describe, it, expect } from "vitest";
import fs from "fs";

describe("HelmetProvider in main.tsx", () => {
  it("main.tsx imports and uses HelmetProvider", () => {
    const content = fs.readFileSync("src/main.tsx", "utf-8");
    expect(content).toContain("HelmetProvider");
    expect(content).toContain("react-helmet-async");
    expect(content).toContain("<HelmetProvider>");
  });

  it("react-helmet-async is installed", async () => {
    const helmet = await import("react-helmet-async");
    expect(helmet.HelmetProvider).toBeDefined();
    expect(helmet.Helmet).toBeDefined();
  });
});
