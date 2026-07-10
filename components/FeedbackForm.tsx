"use client";

import { usePathname } from "next/navigation";
import { submitFeedback } from "@/app/app/actions";

export function FeedbackForm({ businessName }: { businessName: string }) {
  const pathname = usePathname();

  return (
    <section className="mt-10 border border-rule bg-card p-4 sm:p-5">
      <details>
        <summary className="cursor-pointer list-none">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="eyebrow">Early access feedback</p>
              <h2 className="font-display text-xl">Help shape DueToday</h2>
            </div>
            <span className="font-mono text-xs text-ledger font-semibold">Send feedback →</span>
          </div>
        </summary>

        <form action={submitFeedback} className="mt-5 grid gap-3 sm:grid-cols-2">
          <input type="hidden" name="page" value={pathname} />
          <input type="hidden" name="email" value="" />
          <label className="text-xs text-faint">
            Feedback type
            <select name="kind" className="field mt-1">
              <option value="general">General feedback</option>
              <option value="bug">Something broke</option>
              <option value="confusing">Something confused me</option>
              <option value="idea">Feature idea</option>
              <option value="would_pay">I would pay for this</option>
              <option value="would_not_pay">I would not pay yet</option>
            </select>
          </label>
          <label className="text-xs text-faint">
            Rating
            <select name="rating" className="field mt-1">
              <option value="">No rating</option>
              <option value="5">5 — very useful</option>
              <option value="4">4 — useful</option>
              <option value="3">3 — unsure</option>
              <option value="2">2 — weak</option>
              <option value="1">1 — not useful</option>
            </select>
          </label>
          <label className="text-xs text-faint sm:col-span-2">
            What happened inside {businessName}?
            <textarea
              name="message"
              required
              minLength={3}
              maxLength={2000}
              className="field mt-1 min-h-28"
              placeholder="Example: I added an invoice but expected it to appear immediately on Today…"
            />
          </label>
          <div className="sm:col-span-2 flex flex-wrap items-center justify-between gap-3">
            <p className="font-mono text-[11px] text-faint">
              Early access: feedback goes to the soft-launch dashboard.
            </p>
            <button className="btn-primary !py-2 text-sm">Submit feedback</button>
          </div>
        </form>
      </details>
    </section>
  );
}
