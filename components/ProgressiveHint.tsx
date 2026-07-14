"use client";

import { useEffect, useState } from "react";

const STORAGE_PREFIX = "duetoday:guidance:v1";

type ProgressiveHintProps = {
  businessId: string;
  guidanceKey: string;
  eyebrow?: string;
  title: string;
  detail: string;
  completionSignal?: boolean;
};

export function ProgressiveHint({
  businessId,
  guidanceKey,
  eyebrow = "Start here",
  title,
  detail,
  completionSignal = false,
}: ProgressiveHintProps) {
  const [visible, setVisible] = useState(false);
  const storageKey = `${STORAGE_PREFIX}:${businessId}:${guidanceKey}`;

  useEffect(() => {
    if (completionSignal) {
      window.localStorage.setItem(storageKey, "completed");
      setVisible(false);
      return;
    }

    setVisible(window.localStorage.getItem(storageKey) === null);
  }, [completionSignal, storageKey]);

  function dismiss(status: "dismissed" | "completed") {
    window.localStorage.setItem(storageKey, status);
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <aside
      className="mt-4 border border-ledger/30 bg-ledger/5 p-4"
      aria-label="Contextual guidance"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-3xl">
          <p className="font-mono text-[10px] font-semibold uppercase tracking-wider text-ledger">
            {eyebrow}
          </p>
          <h2 className="mt-1 font-semibold text-sm">{title}</h2>
          <p className="mt-1 text-sm leading-6 text-faint">{detail}</p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <button
            type="button"
            onClick={() => dismiss("completed")}
            className="inline-flex min-h-11 items-center border border-ledger px-3 text-xs font-semibold text-ledger hover:bg-ledger-tint"
          >
            Got it
          </button>
          <button
            type="button"
            onClick={() => dismiss("dismissed")}
            className="inline-flex min-h-11 items-center px-3 text-xs text-faint hover:text-ink"
          >
            Don&apos;t show again
          </button>
        </div>
      </div>
    </aside>
  );
}
