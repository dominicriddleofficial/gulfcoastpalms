import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { createPortal } from "react-dom";
import { WorkspaceThemeProvider } from "@/contexts/WorkspaceThemeContext";

afterEach(cleanup);

describe("workspace theme lifecycle", () => {
  it("themes portaled content and restores the public theme on exit", () => {
    const root = document.documentElement;
    root.style.setProperty("--background", "140 20% 97%");
    const meta = document.createElement('meta');
    meta.name = 'theme-color'; meta.content = '#1a5c38'; document.head.append(meta);
    const view = render(<WorkspaceThemeProvider shortcode="GCP">{createPortal(<div role="dialog">Preview</div>, document.body)}</WorkspaceThemeProvider>);
    expect(root.style.getPropertyValue('--background')).toBe('195 29% 3%');
    expect(root.style.getPropertyValue('--popover')).toBe('195 20% 8%');
    expect(meta.content).toBe('#050809');
    view.unmount();
    expect(root.style.getPropertyValue('--background')).toBe('140 20% 97%');
    expect(root.style.getPropertyValue('--popover')).toBe('');
    expect(meta.content).toBe('#1a5c38');
    root.style.removeProperty('--background'); meta.remove();
  });
  it("keeps the PPS accent when switching workspaces", () => {
    const view = render(<WorkspaceThemeProvider shortcode="GCP"><div /></WorkspaceThemeProvider>);
    expect(document.documentElement.style.getPropertyValue('--accent-color')).toBe('#34E8A8');
    view.rerender(<WorkspaceThemeProvider shortcode="PPS"><div /></WorkspaceThemeProvider>);
    expect(document.documentElement.style.getPropertyValue('--accent-color')).toBe('#F0F0F0');
  });
});
