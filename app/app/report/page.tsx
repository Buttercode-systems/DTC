import Link from "next/link";
import {
  AssessmentReport,
  type AssessmentReportData,
} from "@/components/AssessmentReport";
import { trackEvent } from "@/lib/analytics";
import { requireBusiness } from "@/lib/db";

export const metadata = { title: "Execution Report — DueToday" };
export const dynamic = "force-dynamic";

export default async function MyAssessmentReportPage() {
  const { supabase, business } = await requireBusiness();
  const { data, error } = await supabase.rpc("get_my_assessment");

  if (error) {
    throw new Error(`Could not load your assessment report: ${error.message}`);
  }

  const assessment = data as AssessmentReportData | null;
  if (!assessment) {
    return (
      <section className="max-w-2xl">
        <p className="eyebrow">Business Execution Report</p>
        <h1 className="mt-2 font-display text-3xl">No claimed assessment yet</h1>
        <p className="mt-4 text-faint leading-7">
          Complete the Business Execution Assessment while signed out, then create
          or connect your account from the report. The report will remain available
          here after it becomes your first Today list.
        </p>
        <Link href="/assessment" className="btn-primary mt-6">
          Start the assessment
        </Link>
      </section>
    );
  }

  await trackEvent(supabase, "claimed_report_viewed", {
    businessId: business.id,
    path: "/app/report",
    metadata: { score: assessment.scores.overall },
  });

  return (
    <AssessmentReport
      assessment={assessment}
      installHref="/app"
      showInstall={false}
    />
  );
}
