import { useCallback, useLayoutEffect, useRef } from "react";

/**
 * Remembers what had keyboard focus when a dialog opened and gives it back when the
 * dialog closes, so a keyboard or screen-reader user lands where they were.
 *
 * The dialogs here are opened by buttons elsewhere on the page (the header, the bottom
 * bar, a gallery photo), not by a trigger inside the dialog component, so the dialog
 * library cannot work this out by itself.
 *
 * Pass the returned handler to the dialog content's `onCloseAutoFocus`.
 */
export function useReturnFocus(open: boolean) {
  const opener = useRef<HTMLElement | null>(null);
  // Runs before the dialog moves focus into itself.
  useLayoutEffect(() => {
    if (!open) return;
    const active = document.activeElement;
    opener.current = active instanceof HTMLElement && active !== document.body ? active : null;
  }, [open]);
  return useCallback((event: Event) => {
    const el = opener.current;
    // After moving to another page the opener is gone; leave focus to the new page.
    if (!el || !el.isConnected) return;
    event.preventDefault();
    el.focus();
  }, []);
}
