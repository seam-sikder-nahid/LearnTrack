"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Uses the native <dialog> element rather than a hand-rolled Radix-style
 * portal: it gives us focus trapping, Escape-to-close, and the top-layer
 * stacking context for free, all of which are otherwise easy to get wrong
 * for an accessibility-sensitive modal (§29).
 */
export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export function Dialog({ open, onClose, title, children }: DialogProps) {
  const ref = React.useRef<HTMLDialogElement>(null);

  React.useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onCancel={onClose}
      aria-labelledby="dialog-title"
      className={cn(
        "w-full max-w-md rounded-[var(--radius-structural)] border border-border bg-surface-raised p-0 text-text backdrop:bg-black/40",
        "open:animate-none",
      )}
    >
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <h2 id="dialog-title" className="text-sm font-medium">
          {title}
        </h2>
        <button
          onClick={onClose}
          aria-label="Close dialog"
          className="text-text-faint hover:text-text"
        >
          ✕
        </button>
      </div>
      <div className="px-5 py-4">{children}</div>
    </dialog>
  );
}
