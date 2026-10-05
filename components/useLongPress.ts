"use client";

// Long-press support: hold a button for half a second to run `onLongPress`
// instead of the normal tap. The normal click is skipped after a long press.

import { useRef } from "react";

const HOLD_MS = 500;

export function useLongPress(onLongPress: () => void) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fired = useRef(false);

  function clear() {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  }

  return {
    onPointerDown() {
      fired.current = false;
      clear();
      timer.current = setTimeout(() => {
        fired.current = true;
        onLongPress();
      }, HOLD_MS);
    },
    onPointerUp: clear,
    onPointerLeave: clear,
    onPointerCancel: clear,
    onContextMenu(e: React.MouseEvent) {
      // Stop the phone's own long-press menu from appearing.
      e.preventDefault();
    },
    /** Call at the start of onClick: true means the click came from a long press. */
    consumeLongPress(): boolean {
      const was = fired.current;
      fired.current = false;
      return was;
    },
  };
}
