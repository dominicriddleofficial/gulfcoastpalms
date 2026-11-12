import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

type W = Window & { __gcpNoTracking?: boolean; dataLayer?: unknown[][]; loadGA?: () => void; loadMetaPixel?: () => void; fbq?: unknown };
const w = window as W;
const html = readFileSync(resolve(__dirname, "../../index.html"), "utf8");
const head = html.slice(0, html.indexOf("</head>"));
const scripts = [...head.matchAll(/<script(?![^>]*\bsrc=)(?![^>]*ld\+json)[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
const run = () => { for (const code of scripts) (0, eval)(code); };
const srcs = () => [...document.querySelectorAll("script[src]")].map((s) => s.getAttribute("src") || "");
const configs = () => (w.dataLayer || []).map((a) => Array.from(a as ArrayLike<unknown>)).filter((a) => a[0] === "config" || a[0] === "js");

beforeEach(() => { delete w.__gcpNoTracking; delete w.dataLayer; delete w.fbq; document.head.innerHTML = '<script src="/x.js"></script>'; });
afterEach(() => { vi.restoreAllMocks(); document.querySelectorAll("script[src]").forEach((s) => s.remove()); window.history.replaceState(null, "", "/"); });

describe("tracker setup in index.html", () => {
  it("the cinematic preview configures and loads no Google or Meta trackers", () => {
    window.history.replaceState(null, "", "/preview/cinematic-home");
    run();
    expect(w.__gcpNoTracking).toBe(true);
    expect(configs()).toEqual([]);
    w.loadGA?.(); w.loadMetaPixel?.();
    expect(srcs().some((s) => /googletagmanager|facebook/.test(s))).toBe(false);
    expect(w.fbq).toBeUndefined();
  });

  it("the root homepage keeps its GA4 and Google Ads config and loaders", () => {
    run();
    expect(w.__gcpNoTracking).toBeUndefined();
    expect(configs().filter((a) => a[0] === "config").map((a) => a[1])).toEqual(["G-8FNKZVRWGY", "AW-11356668550"]);
    w.loadGA?.(); w.loadMetaPixel?.();
    expect(srcs().some((s) => s.includes("googletagmanager.com/gtag/js?id=G-8FNKZVRWGY"))).toBe(true);
    expect(srcs().some((s) => s.includes("connect.facebook.net"))).toBe(true);
  });
});
