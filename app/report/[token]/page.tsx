import Link from "next/link";
import { notFound } from "next/navigation";
import {
  AssessmentReport,
  type AssessmentReportData,
} from "@/components/AssessmentReport";
import { trackPublicEvent } from "@/lib/analytics";
import { createSupabaseAnon } from "@/lib/supabase/server";

export const metadata = { title: "Your Execution Report — DueToday" };
export const dynamic = "force-dynamic";

export default async function ReportPage({
  params,
}: {
  params: { token: string };
}) {
  const supabase = createSupabaseAnon();
  const { data, error } = await supabase.rpc("get_assessment", {
    p_token: params.token,
  });

  if (error) throw new Error(`Could not load the report: ${error.message}`);
  const assessment = data as AssessmentReportData | null;
  if (!assessment) notFound();

  await trackPublicEvent(supabase, "report_viewed", {
    path: "/report/[token]",
    metadata: {
      industry: assessment.industry,
      claimed: assessment.claimed,
      score: assessment.scores.overall,
    },
  });

  const installHref = assessment.claimed
    ? "/app/report"
    : `/signup?assessment=${assessment.token}`;

  return (
    <main>
      <header className="no-print border-b border-rule">
        <div className="mx-auto max-w-3xl px-5 py-4 flex items-center justify-between">
          <Link href="/" className="font-display text-lg tracking-tight">
            Due<span className="text-ledger">Today</span>
          </Link>
          <span className="font-mono text-xs text-faint">Execution report</span>
        </div>
      </header>
      <AssessmentReport
        assessment={assessment}
        installHref={installHref}
        showInstall
      />
    </main>
  );
}
