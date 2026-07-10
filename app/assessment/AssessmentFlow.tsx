"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  INDUSTRIES,
  JOBS,
  TEAM_SIZES,
  questionsForJob,
  type IndustryKey,
  type TeamSizeKey,
} from "@/lib/framework";
import { answerKey } from "@/lib/scoring";

type Step =
  | { kind: "profile" }
  | { kind: "job"; index: number }
  | { kind: "capture" };

export default function AssessmentFlow() {
  const router = useRouter();
  const [step, setStep] = useState<Step>({ kind: "profile" });
  const [industry, setIndustry] = useState<IndustryKey | "">("");
  const [teamSize, setTeamSize] = useState<TeamSizeKey | "">("");
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [lead, setLead] = useState({ full_name: "", email: "", company: "", phone: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalSteps = JOBS.length + 2;
  const stepNumber =
    step.kind === "profile" ? 1 : step.kind === "job" ? step.index + 2 : totalSteps;

  const preview = useMemo(() => {
    const values = Object.values(answers);
    if (values.length === 0) return 0;
    return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
  }, [answers]);

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/assessment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers, industry, team_size: teamSize, lead }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Something went wrong.");
      router.push(`/report/${body.token}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-5 py-10">
      {/* Progress */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <span className="eyebrow">
            {step.kind === "profile"
              ? "Your business"
              : step.kind === "job"
                ? `Job ${step.index + 1} of ${JOBS.length} — ${JOBS[step.index].label}`
                : "Your report"}
          </span>
          <span className="font-mono text-xs text-faint">
            {stepNumber}/{totalSteps}
          </span>
        </div>
        <div className="h-1.5 bg-rule" role="progressbar" aria-valuenow={stepNumber} aria-valuemin={1} aria-valuemax={totalSteps}>
          <div
            className="h-full bg-ledger transition-all"
            style={{ width: `${(stepNumber / totalSteps) * 100}%` }}
          />
        </div>
      </div>

      {step.kind === "profile" && (
        <section>
          <h1 className="font-display text-2xl leading-tight">
            Two things about your business, then we start.
          </h1>
          <div className="mt-6">
            <p className="font-semibold mb-2">What kind of business is it?</p>
            <div className="grid grid-cols-2 gap-2">
              {INDUSTRIES.map((i) => (
                <button
                  key={i.key}
                  type="button"
                  onClick={() => setIndustry(i.key)}
                  className={`border px-3 py-2.5 text-left text-sm transition-colors ${
                    industry === i.key
                      ? "border-ledger bg-ledger-tint font-semibold"
                      : "border-rule bg-card hover:border-ink/40"
                  }`}
                >
                  {i.label}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-6">
            <p className="font-semibold mb-2">How many people work in it?</p>
            <div className="grid grid-cols-2 gap-2">
              {TEAM_SIZES.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setTeamSize(t.key)}
                  className={`border px-3 py-2.5 text-left text-sm transition-colors ${
                    teamSize === t.key
                      ? "border-ledger bg-ledger-tint font-semibold"
                      : "border-rule bg-card hover:border-ink/40"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
          <button
            className="btn-primary mt-8 w-full disabled:opacity-40"
            disabled={!industry || !teamSize}
            onClick={() => setStep({ kind: "job", index: 0 })}
          >
            Start the assessment
          </button>
        </section>
      )}

      {step.kind === "job" && (
        <JobStep
          index={step.index}
          answers={answers}
          setAnswer={(k, v) => setAnswers((a) => ({ ...a, [k]: v }))}
          onBack={() =>
            setStep(
              step.index === 0
                ? { kind: "profile" }
                : { kind: "job", index: step.index - 1 }
            )
          }
          onNext={() =>
            setStep(
              step.index === JOBS.length - 1
                ? { kind: "capture" }
                : { kind: "job", index: step.index + 1 }
            )
          }
        />
      )}

      {step.kind === "capture" && (
        <section>
          <div className="bg-card shadow-card p-6 text-center">
            <p className="eyebrow">Your Execution Score preview</p>
            <p className="font-display text-6xl mt-2">{preview}%</p>
            <p className="mt-3 text-faint text-sm max-w-md mx-auto">
              Your full report maps all seven jobs, names the exact breakdowns,
              ranks what to fix first — and builds your first Today list.
            </p>
          </div>
          <form
            className="mt-6 space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <input
                required
                className="field"
                placeholder="Your name"
                value={lead.full_name}
                onChange={(e) => setLead({ ...lead, full_name: e.target.value })}
              />
              <input
                required
                type="email"
                className="field"
                placeholder="Email — your report link goes here"
                value={lead.email}
                onChange={(e) => setLead({ ...lead, email: e.target.value })}
              />
              <input
                className="field"
                placeholder="Business name (optional)"
                value={lead.company}
                onChange={(e) => setLead({ ...lead, company: e.target.value })}
              />
              <input
                className="field"
                placeholder="Phone (optional)"
                value={lead.phone}
                onChange={(e) => setLead({ ...lead, phone: e.target.value })}
              />
            </div>
            {error && <p className="text-stuck text-sm">{error}</p>}
            <button className="btn-primary w-full" disabled={submitting}>
              {submitting ? "Building your report…" : "Show my full report"}
            </button>
            <p className="font-mono text-xs text-faint text-center">
              Free. No card. Your answers stay yours.
            </p>
          </form>
        </section>
      )}
    </div>
  );
}

function JobStep({
  index,
  answers,
  setAnswer,
  onBack,
  onNext,
}: {
  index: number;
  answers: Record<string, number>;
  setAnswer: (key: string, value: number) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const job = JOBS[index];
  const questions = questionsForJob(job.key);
  const complete = questions.every(
    (q) => answers[answerKey(q.job, q.dimension)] !== undefined
  );

  return (
    <section>
      <p className="font-display text-ledger">{job.verb}</p>
      <h2 className="font-display text-2xl leading-tight">{job.label}</h2>
      <p className="mt-1 text-faint text-sm">{job.question}</p>

      <div className="mt-6 space-y-8">
        {questions.map((q) => {
          const k = answerKey(q.job, q.dimension);
          return (
            <fieldset key={k}>
              <legend className="font-semibold">{q.text}</legend>
              <div className="mt-3 space-y-1.5">
                {q.options.map((o) => (
                  <label
                    key={o.score}
                    className={`flex items-start gap-3 border px-3 py-2.5 text-sm cursor-pointer transition-colors ${
                      answers[k] === o.score
                        ? "border-ledger bg-ledger-tint"
                        : "border-rule bg-card hover:border-ink/40"
                    }`}
                  >
                    <input
                      type="radio"
                      name={k}
                      className="mt-0.5 accent-[#0E5C46]"
                      checked={answers[k] === o.score}
                      onChange={() => setAnswer(k, o.score)}
                    />
                    <span>{o.text}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          );
        })}
      </div>

      <div className="mt-8 flex gap-3">
        <button type="button" className="btn-secondary" onClick={onBack}>
          Back
        </button>
        <button
          type="button"
          className="btn-primary flex-1 disabled:opacity-40"
          disabled={!complete}
          onClick={() => {
            onNext();
            window.scrollTo({ top: 0 });
          }}
        >
          {index === JOBS.length - 1 ? "See my score" : "Next job"}
        </button>
      </div>
    </section>
  );
}
