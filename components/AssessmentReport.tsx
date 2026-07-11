import Link from "next/link";
import { DIMENSIONS, jobByKey } from "@/lib/framework";
import { shortDate } from "@/lib/format";
import {
  MOMENTUM_LABEL,
  type Momentum,
  type ScoredAssessment,
} from "@/lib/scoring";
import { PrintReportButton } from "@/components/PrintReportButton";

export interface AssessmentReportData {
  token: string;
  scores: ScoredAssessment;
  industry: string;
  team_size?: string;
  created_at: string;
  claimed: boolean;
}

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

export function AssessmentReport({
  assessment,
  installHref,
  showInstall = true,
}: {
  assessment: AssessmentReportData;
  installHref: string;
  showInstall?: boolean;
}) {
  const scores = assessment.scores;

  return (
    <div className="assessment-report mx-auto max-w-3xl px-5 py-10 space-y-12">
      <div className="no-print flex flex-wrap items-center justify-between gap-3 border-b border-rule pb-4">
        <div>
          <p className="eyebrow">Your private report</p>
          <p className="mt-1 text-sm text-faint">
            Save a copy for your team or records.
          </p>
        </div>
        <PrintReportButton />
      </div>

      <section className="report-section report-card bg-card shadow-card p-6 md:p-8">
        <div className="flex flex-wrap items-center justify-between gap-6">
          <div>
            <p className="eyebrow">Business Execution Report</p>
            <h1 className="font-display text-3xl mt-1">Execution Score</h1>
            <p className="mt-2 font-mono text-xs text-faint">
              {assessment.industry}
              {assessment.team_size ? ` · ${assessment.team_size}` : ""}
              {` · ${shortDate(assessment.created_at)}`}
            </p>
          </div>
          <span className="stamp text-4xl md:text-5xl">{scores.overall}%</span>
        </div>
        <p className="mt-5 text-lg">{scores.headline}</p>
      </section>

      <section className="report-section">
        <p className="eyebrow mb-1">Momentum Map</p>
        <h2 className="font-display text-2xl">
          Where work moves — and where it stops
        </h2>
        <div className="mt-5 report-card bg-card shadow-card">
          <ul className="ruled">
            {scores.jobs.map((js) => {
              const job = jobByKey(js.job);
              return (
                <li key={js.job} className="p-4 break-inside-avoid">
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
          Moving ≥ 70 · Slowing 40–69 · Stuck &lt; 40 — each score covers five
          dimensions: {DIMENSIONS.map((d) => d.label.toLowerCase()).join(", ")}.
        </p>
      </section>

      {scores.bottlenecks.length > 0 && (
        <section className="report-section">
          <p className="eyebrow mb-1">Diagnosis</p>
          <h2 className="font-display text-2xl">
            What&apos;s breaking, in priority order
          </h2>
          <div className="mt-5 space-y-5">
            {scores.bottlenecks.map((b) => {
              const job = jobByKey(b.job);
              return (
                <article
                  key={b.job}
                  className="report-card break-inside-avoid bg-card shadow-card p-5"
                >
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
                      {b.findings.map((finding) => (
                        <li
                          key={finding.dimension}
                          className="text-sm text-faint"
                        >
                          {finding.text}
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

      {scores.recommendations.length > 0 && (
        <section className="report-section">
          <p className="eyebrow mb-1">Recommendations</p>
          <h2 className="font-display text-2xl">
            Build the capability — then choose how to run it
          </h2>
          <div className="mt-5 space-y-5">
            {scores.recommendations.map((recommendation) => {
              const job = jobByKey(recommendation.job);
              return (
                <article
                  key={recommendation.job}
                  className="report-card break-inside-avoid border border-rule bg-card p-5"
                >
                  <p className="font-mono text-xs text-faint uppercase tracking-wider">
                    {job.verb}
                  </p>
                  <h3 className="font-semibold mt-1">
                    {recommendation.capability}
                  </h3>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    {recommendation.routes.map((route) => (
                      <div
                        key={route.label}
                        className="break-inside-avoid border border-rule p-3"
                      >
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

      <section className="report-section">
        <p className="eyebrow mb-1">Your first Today list</p>
        <h2 className="font-display text-2xl">
          This report doesn&apos;t end here. It becomes your morning.
        </h2>
        <div className="mt-5 report-card bg-card shadow-card p-6">
          <span className="stamp text-lg mb-4">Today</span>
          <ul className="ruled mt-2">
            {scores.starterActions.map((action) => (
              <li
                key={action.key}
                className="break-inside-avoid flex items-start gap-3 py-3"
              >
                <span
                  aria-hidden
                  className="mt-1 h-4 w-4 shrink-0 border-2 border-ink"
                />
                <div>
                  <p className="font-semibold text-sm">{action.title}</p>
                  <p className="text-sm text-faint">{action.detail}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {showInstall && (
          <div className="no-print mt-6 bg-ink text-paper p-6 md:p-8">
            <h3 className="font-display text-2xl">
              Install your DueToday action system
            </h3>
            <p className="mt-2 text-paper/80 max-w-prose">
              These actions are waiting for you inside DueToday. Add your open
              quotes, invoices and leads, and every morning starts with one list
              of the money actions due today. Finish the list. Go home.
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
        )}
      </section>

      <p className="report-footer font-mono text-xs text-faint text-center pb-6">
        Business Execution Framework v1.0 · This report is private. Share it only
        with people you want to see it.
      </p>
    </div>
  );
}
