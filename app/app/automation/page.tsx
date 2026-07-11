import Link from "next/link";

export const metadata = { title: "Automation — DueToday" };

export default function DisabledPilotFeaturePage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="border border-rule bg-card p-6 shadow-card">
        <p className="eyebrow mb-2">Pilot boundary</p>
        <h1 className="font-display text-3xl">Not enabled during the controlled pilot</h1>
        <p className="mt-3 text-sm leading-6 text-faint">Source automation and autopilot controls are hidden until the production scheduler and required secrets are configured and verified.</p>
      </div>
      <div className="border border-rule p-5 text-sm text-faint">
        <p className="font-semibold text-ink">Current safe boundary</p>
        <p className="mt-2">DueToday is manual-first: add records, open Today, use the prepared draft, and record the result yourself. No scheduled sync, brief, or customer delivery is running.</p>
      </div>
      <Link href="/app" className="btn-primary inline-block">Return to Today</Link>
    </div>
  );
}
