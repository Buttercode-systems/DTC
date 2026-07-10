import Link from "next/link";
import { notFound } from "next/navigation";
import { createSupabaseAnon } from "@/lib/supabase/server";
import { trackPublicEvent } from "@/lib/analytics";
import { jobByKey, DIMENSIONS } from "@/lib/framework";
import { MOMENTUM_LABEL, type Momentum, type ScoredAssessment } from "@/lib/scoring";
import { shortDate } from "@/lib/format";

export const metadata = { title: "Your Execution Report — DueToday" };
export const dynamic = "force-dynamic";

const DOT: Record<Momentum, string> = {
  moving: "bg-moving",
  slowing: "bg-slowing",
  stuck: "bg-stuck",
};
const TEXT: Record<Momentum, string> = {
  moving: "text-moving",
  slowing: "text-slowing",
  stuck: "text-stuck",
};

export default async function ReportPage({
  params,
}: {
  params: { token: string };
}) {
  const supabase = createSupabaseAnon();
  const { data, error } = await supabase.rpc("get_assessment", {
    p_token: params.token,
  });
  // A transient failure must not masquerade as a missing report (404).
  if (error) throw new Error(`Could not load the report: ${error.message}`);
  const assessment = data as {
    token: string;
    scores: ScoredAssessment;
    industry: string;
    created_at: string;
    claimed: boolean;
  } | null;

  if (!assessment) notFound();
  const scores = assessment.scores;
  await trackPublicEvent(supabase, "report_viewed", {
    path: "/report/[token]",
    metadata: { industry: assessment.industry, claimed: assessment.claimed, score: scores.overall },
  });
  const installHref = assessment.claimed
    ? "/app"
    : `/signup?assessment=${assessment.token}`;

  return (
    <main>
      <header className="border-b border-rule">
        <div className="mx-auto max-w-3xl px-5 py-4 flex items-center justify-between">
          <Link href="/" className="font-display text-lg tracking-tight">
            Due<span className="text-ledger">Today</span>
          </Link>
          <span className="font-mono text-xs text-faint">
            Report · {shortDate(assessment.created_at)}
          </span>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-5 py-10 space-y-12">
        {/* Score */}
        <section className="bg-card shadow-card p-6 md:p-8">
          <div className="flex flex-wrap items-center justify-between gap-6">
            <div>
              <p className="eyebrow">Business Execution Report</p>
              <h1 className="font-display text-3xl mt-1">Execution Score</h1>
            </div>
            <span className="stamp text-4xl md:text-5xl">{scores.overall}%</span>
          </div>
          <p className="mt-5 text-lg">{scores.headline}</p>
        </section>

        {/* Momentum map */}
        <section>
          <p className="eyebrow mb-1">Momentum Map</p>
          <h2 className="font-display text-2xl">
            Where work moves — and where it stops
          </h2>
          <div className="mt-5 bg-card shadow-card">
            <ul className="ruled">
              {scores.jobs.map((js) => {
                const job = jobByKey(js.job);
                return (
                  <li key={js.job} className="p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className={`h-2.5 w-2.5 rounded-full shrink-0 ${DOT[js.momentum]}`}
                          aria-hidden
                        />
                        <span className="font-semibold truncate">
                          {job.verb}
                          <span className="text-faint font-normal">
                            {" "}
                            · {job.label}
                          </span>
                        </span>
                      </div>
                      <span className="font-mono text-sm shrink-0">
                        <span className={TEXT[js.momentum]}>
                          {MOMENTUM_LABEL[js.momentum]}
                        </span>{" "}
                        · {js.score}
                      </span>
                    </div>
                    <div className="mt-2 h-1.5 bg-rule">
                      <div
                        className={`h-full ${DOT[js.momentum]}`}
                        style={{ width: `${Math.max(js.score, 3)}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
          <p className="mt-3 font-mono text-xs text-faint">
            Moving ≥ 70 · Slowing 40–69 · Stuck &lt; 40 — each score covers
            five dimensions: {DIMENSIONS.map((d) => d.label.toLowerCase()).join(", ")}.
          </p>
        </section>

        {/* Bottlenecks */}
        {scores.bottlenecks.length > 0 && (
          <section>
            <p className="eyebrow mb-1">Diagnosis</p>
            <h2 className="font-display text-2xl">
              What&apos;s breaking, in priority order
            </h2>
            <div className="mt-5 space-y-5">
              {scores.bottlenecks.map((b) => {
                const job = jobByKey(b.job);
                return (
                  <article key={b.job} className="bg-card shadow-card p-5">
                    <div className="flex items-baseline justify-between gap-3">
                      <h3 className="font-display text-lg">
                        <span className="text-faint font-mono text-sm mr-2">
                          Fix #{b.impactRank}
                        </span>
                        {job.label}
                      </h3>
                      <span className={`font-mono text-sm ${TEXT[b.momentum]}`}>
                        {MOMENTUM_LABEL[b.momentum]} · {b.score}
                      </span>
                    </div>
                    <p className="mt-2">{b.summary}</p>
                    {b.findings.length > 0 && (
                      <ul className="mt-3 space-y-2 border-l-2 border-stuck/60 pl-4">
                        {b.findings.map((f) => (
                          <li key={f.dimension} className="text-sm text-faint">
                            {f.text}
                          </li>
                        ))}
                      </ul>
                    )}
                  </article>
                );
              })}
            </div>
          </section>
        )}

        {/* Recommendations */}
        {scores.recommendations.length > 0 && (
          <section>
            <p className="eyebrow mb-1">Recommendations</p>
            <h2 className="font-display text-2xl">
              Build the capability — then choose how to run it
            </h2>
            <div className="mt-5 space-y-5">
              {scores.recommendations.map((r) => {
                const job = jobByKey(r.job);
                return (
                  <article key={r.job} className="border border-rule bg-card p-5">
                    <p className="font-mono text-xs text-faint uppercase tracking-wider">
                      {job.verb}
                    </p>
                    <h3 className="font-semibold mt-1">{r.capability}</h3>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      {r.routes.map((route) => (
                        <div key={route.label} className="border border-rule p-3">
                          <p className="text-sm font-semibold">{route.label}</p>
                          <p className="mt-1 text-sm text-faint">{route.detail}</p>
                        </div>
                      ))}
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        )}

        {/* First Today list */}
        <section>
          <p className="eyebrow mb-1">Your first Today list</p>
          <h2 className="font-display text-2xl">
            This report doesn&apos;t end here. It becomes your morning.
          </h2>
          <div className="mt-5 bg-card shadow-card p-6">
            <span className="stamp text-lg mb-4">Today</span>
            <ul className="ruled mt-2">
              {scores.starterActions.map((a) => (
                <li key={a.key} className="flex items-start gap-3 py-3">
                  <span
                    aria-hidden
                    className="mt-1 h-4 w-4 shrink-0 border-2 border-ink"
                  />
                  <div>
                    <p className="font-semibold text-sm">{a.title}</p>
                    <p className="text-sm text-faint">{a.detail}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <div className="mt-6 bg-ink text-paper p-6 md:p-8">
            <h3 className="font-display text-2xl">
              Install your DueToday action system
            </h3>
            <p className="mt-2 text-paper/80 max-w-prose">
              These actions are waiting for you inside DueToday. Add your open
              quotes, invoices and leads, and every morning starts with one
              list of the money actions due today. Finish the list. Go home.
            </p>
            <Link
              href={installHref}
              className="btn-primary mt-5 !bg-paper !text-ink hover:!bg-white"
            >
              {assessment.claimed
                ? "Open your Today list"
                : "Install DueToday — free"}
            </Link>
          </div>
        </section>

        <p className="font-mono text-xs text-faint text-center pb-6">
          Business Execution Framework v1.0 · This link is private to you —
          share it only with people you want to see the report.
        </p>
      </div>
    </main>
  );
}
