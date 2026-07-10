import { requireBusiness } from "@/lib/db";
import { generateDailyBrief } from "@/lib/daily-brief";
import { sendDailyBriefTest } from "@/app/app/actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Daily Brief — DueToday" };

export default async function BriefPage({
  searchParams,
}: {
  searchParams: { sent?: string; actions?: string; reason?: string };
}) {
  const { supabase, business } = await requireBusiness();
  const brief = await generateDailyBrief(supabase, business.id, business.name, business.settings);

  return (
    <div className="space-y-8">
      <div>
        <p className="eyebrow mb-2">Daily brief automation</p>
        <h1 className="font-display text-3xl">Morning action brief</h1>
        <p className="mt-2 text-faint max-w-2xl">
          This is the email foundation for DueToday. It prepares a daily owner brief from the same Today engine. Customer messages are still manual and approval-based.
        </p>
      </div>

      {searchParams.sent && (
        <div className="border border-rule bg-card p-4">
          <p className="font-semibold">
            {searchParams.sent === "sent" && "Test brief sent."}
            {searchParams.sent === "not_configured" && "Email provider is not configured yet."}
            {searchParams.sent === "failed" && "Test brief could not be sent."}
          </p>
          <p className="mt-1 text-sm text-faint">
            {searchParams.sent === "not_configured"
              ? "Set RESEND_API_KEY and DAILY_BRIEF_FROM / RESEND_FROM in Vercel to turn on email sending. The brief itself is already generated."
              : `${searchParams.actions ?? brief.actionCount} action${(searchParams.actions ?? String(brief.actionCount)) === "1" ? "" : "s"} included.`}
          </p>
        </div>
      )}

      <section className="grid gap-4 sm:grid-cols-3">
        <Metric label="Actions due" value={brief.actionCount} />
        <Metric label="Money actions" value={brief.moneyCount} />
        <Metric label="Lead actions" value={brief.leadCount} />
      </section>

      <section className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="bg-card shadow-card p-5">
          <p className="eyebrow mb-2">Email preview</p>
          <h2 className="font-display text-2xl">{brief.subject}</h2>
          <pre className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-faint font-sans">{brief.text}</pre>
        </div>

        <aside className="space-y-4">
          <div className="bg-card shadow-card p-5">
            <h2 className="font-semibold">Send test brief</h2>
            <p className="mt-2 text-sm text-faint">
              Sends this brief to the signed-in owner email when Resend environment variables are configured.
            </p>
            <form action={sendDailyBriefTest} className="mt-4">
              <button className="btn-primary w-full !py-2 text-sm">Send test email</button>
            </form>
          </div>
          <div className="border border-rule p-4 text-sm text-faint">
            <p className="font-semibold text-ink">Next automation step</p>
            <p className="mt-2">
              After testers confirm value, this can become a scheduled morning brief. For now, it is intentionally owner-triggered and safe.
            </p>
          </div>
        </aside>
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-card border border-rule p-4">
      <p className="font-display text-3xl">{value}</p>
      <p className="font-mono text-[11px] uppercase tracking-wider text-faint">{label}</p>
    </div>
  );
}
