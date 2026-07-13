import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PRODUCTION_ORIGIN = "https://the-admin-department.vercel.app";
const MAX_BODY_BYTES = 12_000;

const DEPARTMENTS = {
  invoice: "Invoice Admin",
  sales: "Sales Admin",
  client: "Client Admin",
  property: "Property Admin",
  practice: "Practice / Booking Admin",
  member: "Member Admin",
} as const;

const ALLOWED_PROBLEMS = new Set([
  "missed",
  "ownership",
  "next_action",
  "visibility",
  "reporting",
  "missing_information",
  "approval_delay",
  "duplicates",
  "filing",
  "missing_documents",
  "onboarding_delay",
  "handover",
  "lost_requests",
  "supplier_delay",
  "scheduling",
  "completion_proof",
  "booking_gaps",
  "confirmation_gaps",
  "no_show_followup",
  "attendance_risk",
  "payment_followup",
  "churn_risk",
  "reactivation",
  "none",
]);

type Department = keyof typeof DEPARTMENTS;

function allowedOrigin(origin: string | null): boolean {
  if (!origin) return true;
  if (origin === PRODUCTION_ORIGIN) return true;
  if (/^http:\/\/localhost:\d+$/.test(origin)) return true;
  return /^https:\/\/the-admin-department-[a-z0-9-]+-ramatsies-projects\.vercel\.app$/.test(origin);
}

function cors(origin: string | null): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": origin && allowedOrigin(origin) ? origin : PRODUCTION_ORIGIN,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "content-type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
    "Cache-Control": "no-store",
  };
}

function json(
  origin: string | null,
  body: Record<string, unknown>,
  status = 200
): Response {
  return Response.json(body, { status, headers: cors(origin) });
}

function clean(value: unknown, max: number): string {
  return String(value ?? "").trim().slice(0, max);
}

function validEmail(value: string): boolean {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value);
}

function isDepartment(value: string): value is Department {
  return Object.prototype.hasOwnProperty.call(DEPARTMENTS, value);
}

function requestFingerprint(request: Request, email: string, department: Department): string {
  const forwarded = clean(request.headers.get("x-forwarded-for"), 300)
    .split(",")[0]
    .trim();
  const userAgent = clean(request.headers.get("user-agent"), 500);
  return createHash("sha256")
    .update(`${forwarded}|${userAgent}|${email.toLowerCase()}|${department}|tad-admin-v2`)
    .digest("hex");
}

async function sendEmail(input: {
  to: string;
  subject: string;
  text: string;
}): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM || process.env.DAILY_BRIEF_FROM;
  if (!apiKey || !from) return false;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to: [input.to], subject: input.subject, text: input.text }),
  });
  return response.ok;
}

export async function OPTIONS(request: Request): Promise<Response> {
  const origin = request.headers.get("origin");
  if (!allowedOrigin(origin)) return json(origin, { ok: false }, 403);
  return new Response(null, { status: 204, headers: cors(origin) });
}

export async function POST(request: Request): Promise<Response> {
  const origin = request.headers.get("origin");
  if (!allowedOrigin(origin)) {
    return json(origin, { ok: false, error: "origin_not_allowed" }, 403);
  }

  const declaredLength = Number(request.headers.get("content-length") || 0);
  if (declaredLength > MAX_BODY_BYTES) {
    return json(origin, { ok: false, error: "request_too_large" }, 413);
  }

  let payload: Record<string, unknown>;
  try {
    payload = (await request.json()) as Record<string, unknown>;
  } catch {
    return json(origin, { ok: false, error: "invalid_json" }, 400);
  }

  if (clean(payload.company_website, 200)) {
    return json(origin, { ok: true, received: true }, 202);
  }

  const startedAt = Number(payload.started_at || 0);
  const elapsed = Date.now() - startedAt;
  if (!Number.isFinite(startedAt) || elapsed < 2_500 || elapsed > 4 * 60 * 60 * 1000) {
    return json(origin, { ok: false, error: "invalid_form_session" }, 400);
  }

  const department = clean(payload.department || "sales", 30);
  const businessName = clean(payload.business, 160);
  const contactName = clean(payload.contact, 160);
  const email = clean(payload.email, 320).toLowerCase();
  const activeRecords = Number(payload.active_records);
  const workflowProblem = clean(
    payload.workflow_problem || payload.follow_up_problem,
    80
  );
  const currentTools = clean(payload.tools, 300);
  const requiredOutcome = clean(payload.outcome, 700);
  const ownerAvailable = payload.owner_available === true;
  const dataAuthority = payload.data_authority === true;
  const boundaryAccepted = payload.boundary_accepted === true;

  if (!isDepartment(department)) {
    return json(origin, { ok: false, error: "invalid_department" }, 400);
  }
  if (businessName.length < 2 || contactName.length < 2 || !validEmail(email)) {
    return json(origin, { ok: false, error: "invalid_contact_details" }, 400);
  }
  if (!Number.isInteger(activeRecords) || activeRecords < 0 || activeRecords > 10_000) {
    return json(origin, { ok: false, error: "invalid_active_records" }, 400);
  }
  if (!ALLOWED_PROBLEMS.has(workflowProblem) || requiredOutcome.length < 5) {
    return json(origin, { ok: false, error: "invalid_qualification_details" }, 400);
  }
  if (!ownerAvailable || !dataAuthority || !boundaryAccepted) {
    return json(origin, { ok: false, error: "required_confirmations_missing" }, 400);
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !anonKey) {
    return json(origin, { ok: false, error: "intake_unavailable" }, 503);
  }

  const supabase = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const fingerprint = requestFingerprint(request, email, department);
  const departmentLabel = DEPARTMENTS[department];

  const { data, error } = await supabase.rpc("submit_tad_department_application", {
    p_department: department,
    p_business_name: businessName,
    p_contact_name: contactName,
    p_email: email,
    p_active_records: activeRecords,
    p_workflow_problem: workflowProblem,
    p_current_tools: currentTools || null,
    p_required_outcome: requiredOutcome,
    p_owner_available: ownerAvailable,
    p_data_authority: dataAuthority,
    p_boundary_accepted: boundaryAccepted,
    p_request_fingerprint: fingerprint,
    p_source: `${department}_admin_offer`,
  });

  if (error) {
    const message = error.message || "";
    const status = message.includes("rate_limit_exceeded") ? 429 : 400;
    const code = status === 429 ? "too_many_requests" : "application_rejected";
    return json(origin, { ok: false, error: code }, status);
  }

  const result = data as {
    id?: string;
    department?: string;
    duplicate?: boolean;
    readiness_ready?: boolean;
  } | null;
  const applicationId = result?.id || "";
  const duplicate = result?.duplicate === true;
  const reference = applicationId ? applicationId.slice(0, 8).toUpperCase() : "RECEIVED";

  let acknowledgementSent = false;
  let operatorNotificationSent = false;
  if (!duplicate) {
    const applicantText = [
      `Hi ${contactName},`,
      "",
      `We received your ${departmentLabel} application.`,
      `Reference: ${reference}`,
      "",
      "The Admin Department will review the workflow facts you supplied. No customer, supplier, tenant, patient, member or other operational records were submitted through the public form.",
      "",
      "Important decisions and any later use of operational records remain subject to explicit scope, authority and human approval.",
      "",
      "The Admin Department",
    ].join("\n");
    const operatorText = [
      `NEW TAD ${departmentLabel.toUpperCase()} APPLICATION`,
      "",
      `Reference: ${reference}`,
      `Department: ${departmentLabel}`,
      `Business: ${businessName}`,
      `Contact: ${contactName}`,
      `Email: ${email}`,
      `Active workflow records: ${activeRecords}`,
      `Problem: ${workflowProblem}`,
      `Tools: ${currentTools || "Not supplied"}`,
      `Required outcome: ${requiredOutcome}`,
      `Ready by public rules: ${result?.readiness_ready ? "Yes" : "No"}`,
      "",
      "Review privately: https://due-today-six.vercel.app/ops/applications",
    ].join("\n");

    const notifyTo = process.env.TAD_APPLICATION_NOTIFY_TO || "buttercoder.dev@gmail.com";
    [acknowledgementSent, operatorNotificationSent] = await Promise.all([
      sendEmail({
        to: email,
        subject: `${departmentLabel} application received — ${reference}`,
        text: applicantText,
      }).catch(() => false),
      sendEmail({
        to: notifyTo,
        subject: `New ${departmentLabel} application — ${businessName}`,
        text: operatorText,
      }).catch(() => false),
    ]);
  }

  return json(
    origin,
    {
      ok: true,
      received: true,
      reference,
      department,
      duplicate,
      email_delivery: {
        acknowledgement: acknowledgementSent,
        operator_notification: operatorNotificationSent,
      },
    },
    duplicate ? 200 : 201
  );
}
