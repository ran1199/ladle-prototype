"use client";

// iOS-style bottom sheet with a grab handle. Used for secondary actions,
// confirmations (instead of browser pop-ups) and explanations.
// Closes with Escape or a tap on the dimmed background; keyboard focus stays
// inside the sheet while it is open and returns to where it was afterwards.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { emitEvent } from "@/lib/events";

type SheetHost = {
  element: HTMLElement | null;
  /** Called by each sheet when it opens (+1) and closes (-1). */
  track: (delta: 1 | -1) => void;
};

const SheetHostContext = createContext<SheetHost>({ element: null, track: () => {} });

/** Provides the place sheets appear in, and tells the app when one is open. */
export function SheetHostProvider({
  element,
  onOpenCountChange,
  children,
}: {
  element: HTMLElement | null;
  onOpenCountChange: (count: number) => void;
  children: ReactNode;
}) {
  const count = useRef(0);
  const track = useCallback(
    (delta: 1 | -1) => {
      count.current = Math.max(0, count.current + delta);
      onOpenCountChange(count.current);
    },
    [onOpenCountChange],
  );
  return (
    <SheetHostContext.Provider value={{ element, track }}>{children}</SheetHostContext.Provider>
  );
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function Sheet({
  open,
  onClose,
  title,
  children,
  hideTitle = false,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  /** Keep the title for screen readers but don't show it. */
  hideTitle?: boolean;
}) {
  const host = useContext(SheetHostContext);
  const [mounted, setMounted] = useState(open);
  const [closing, setClosing] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  // Open → mount straight away. Close → play the slide-down, then unmount.
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setMounted(true);
      setClosing(false);
    } else if (mounted) {
      setClosing(true);
    }
  }

  const { track } = host;
  useEffect(() => {
    if (!mounted) return;
    track(1);
    const previous = document.activeElement as HTMLElement | null;
    // Focus the sheet itself: screen readers announce its title, and Tab moves into it.
    panelRef.current?.focus({ preventScroll: true });
    return () => {
      track(-1);
      previous?.focus?.({ preventScroll: true });
    };
  }, [mounted, track]);

  if (!mounted || !host.element) return null;

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      e.stopPropagation();
      emitEvent({ type: "wrong-turn", what: "closed a sheet" });
      onClose();
      return;
    }
    if (e.key !== "Tab" || !panelRef.current) return;
    const items = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
    if (items.length === 0) return;
    const firstItem = items[0];
    const lastItem = items[items.length - 1];
    if (e.shiftKey && document.activeElement === firstItem) {
      e.preventDefault();
      lastItem.focus();
    } else if (!e.shiftKey && document.activeElement === lastItem) {
      e.preventDefault();
      firstItem.focus();
    }
  }

  const anim = closing ? "var(--dur) var(--ease-out) forwards" : "var(--dur) var(--ease-out)";

  return createPortal(
    <div className="absolute inset-0 z-40 flex flex-col justify-end" onKeyDown={onKeyDown}>
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[var(--backdrop)]"
        style={{ animation: `${closing ? "fade-out" : "fade-in"} ${anim}` }}
        onClick={() => {
          emitEvent({ type: "wrong-turn", what: "closed a sheet" });
          onClose();
        }}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="relative max-h-[90%] overflow-y-auto rounded-t-[var(--radius-card)] bg-surface shadow-float outline-none"
        style={{
          animation: `${closing ? "sheet-out" : "sheet-in"} ${anim}`,
          paddingBottom: "calc(var(--safe-bottom) + 20px)",
        }}
        onAnimationEnd={(e) => {
          if (closing && e.target === e.currentTarget) {
            setMounted(false);
            setClosing(false);
          }
        }}
      >
        <div aria-hidden="true" className="flex justify-center pt-2 pb-1">
          <div className="h-[5px] w-9 rounded-full bg-line" />
        </div>
        <div className="px-5 pt-2">
          <h2 id={titleId} className={hideTitle ? "sr-only" : "text-title mb-3"}>
            {title}
          </h2>
          {children}
        </div>
      </div>
    </div>,
    host.element,
  );
}
