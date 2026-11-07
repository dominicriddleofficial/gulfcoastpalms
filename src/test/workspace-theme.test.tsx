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
  it("keeps GCP emerald and switches PPS to neutral charcoal and white", () => {
    const view = render(<WorkspaceThemeProvider shortcode="GCP"><div /></WorkspaceThemeProvider>);
    const root = document.documentElement;
    expect(root.style.getPropertyValue('--accent-color')).toBe('#34E8A8');
    expect(root.style.getPropertyValue('--background')).toBe('195 29% 3%');
    expect(root.style.getPropertyValue('--foreground')).toBe('160 15% 94%');
    expect(root.style.getPropertyValue('--platform-fade-mix')).toBe('72%');
    expect(root.style.getPropertyValue('--platform-fade-mid-mix')).toBe('48%');
    expect(root.style.getPropertyValue('--platform-fade-bloom')).toBe('0.3');

    view.rerender(<WorkspaceThemeProvider shortcode="PPS"><div /></WorkspaceThemeProvider>);
    expect(root.style.getPropertyValue('--accent-color')).toBe('#F4F4F5');
    expect(root.style.getPropertyValue('--background')).toBe('240 10% 3.9%');
    expect(root.style.getPropertyValue('--foreground')).toBe('0 0% 98%');
    expect(root.style.getPropertyValue('--card')).toBe('240 9% 8%');
    expect(root.style.getPropertyValue('--primary-foreground')).toBe('240 10% 3.9%');
    expect(root.style.getPropertyValue('--platform-fade-mix')).toBe('50%');
    expect(root.style.getPropertyValue('--platform-fade-mid-mix')).toBe('18%');
    expect(root.style.getPropertyValue('--platform-fade-bloom')).toBe('0.24');
    expect(root.style.getPropertyValue('--platform-tooltip-background')).toBe('#18181bef');
    expect(root.dataset.workspaceTheme).toBe('PPS');
    view.unmount();
  });
});
