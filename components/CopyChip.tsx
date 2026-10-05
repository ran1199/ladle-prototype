"use client";

// Shows a link with a Copy button that briefly says "Copied ✓".
// Falls back to selecting the text if the clipboard isn't available.

import { useRef, useState } from "react";

export function CopyChip({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  const textRef = useRef<HTMLSpanElement>(null);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // No clipboard access: select the text so it can be copied by hand.
      const node = textRef.current;
      if (!node) return;
      const range = document.createRange();
      range.selectNodeContents(node);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
    }
  }

  return (
    <div className="flex min-h-12 items-center gap-2 rounded-[var(--radius-control)] bg-surface-2 py-1 pr-1 pl-3">
      <span ref={textRef} className="text-caption min-w-0 flex-1 truncate text-ink-2" title={text}>
        {text}
      </span>
      <button
        type="button"
        onClick={copy}
        aria-label={`Copy ${label}`}
        className="text-caption min-h-10 min-w-[4.75rem] rounded-[10px] bg-surface px-3 font-semibold text-ink"
      >
        <span aria-live="polite">{copied ? "Copied ✓" : "Copy"}</span>
      </button>
    </div>
  );
}
