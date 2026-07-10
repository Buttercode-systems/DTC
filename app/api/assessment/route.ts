import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { createSupabaseAnon } from "@/lib/supabase/server";
import { scoreAssessment, validateAnswers } from "@/lib/scoring";
import { INDUSTRIES, TEAM_SIZES } from "@/lib/framework";
import { trackPublicEvent } from "@/lib/analytics";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  if (!rateLimit(`assessment:${clientIp(request.headers)}`, 5, 60_000)) {
    return NextResponse.json(
      { error: "Too many submissions. Wait a minute and try again." },
      { status: 429 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const { answers, industry, team_size, lead } = (body ?? {}) as Record<string, unknown>;

  if (!validateAnswers(answers)) {
    return NextResponse.json(
      { error: "Please answer every question." },
      { status: 400 }
    );
  }
  if (!INDUSTRIES.some((i) => i.key === industry)) {
    return NextResponse.json({ error: "Choose an industry." }, { status: 400 });
  }
  if (!TEAM_SIZES.some((t) => t.key === team_size)) {
    return NextResponse.json({ error: "Choose a team size." }, { status: 400 });
  }
  const l = (lead ?? {}) as Record<string, unknown>;
  const email = typeof l.email === "string" ? l.email.trim() : "";
  const fullName = typeof l.full_name === "string" ? l.full_name.trim() : "";
  if (!fullName || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json(
      { error: "A name and a valid email are needed for your report." },
      { status: 400 }
    );
  }

  const scores = scoreAssessment(answers, industry as never);
  const token = randomBytes(18).toString("base64url");
  const supabase = createSupabaseAnon();

  const { error } = await supabase.rpc("submit_assessment", {
    p_token: token,
    p_full_name: fullName.slice(0, 200),
    p_email: email.slice(0, 320),
    p_company: typeof l.company === "string" ? l.company.slice(0, 200) : null,
    p_phone: typeof l.phone === "string" ? l.phone.slice(0, 50) : null,
    p_industry: industry,
    p_team_size: team_size,
    p_answers: answers,
    p_scores: scores,
  });

  if (error) {
    return NextResponse.json(
      { error: "Could not save your assessment. Try again." },
      { status: 500 }
    );
  }

  await trackPublicEvent(supabase, "assessment_completed", {
    path: "/assessment",
    metadata: { industry: String(industry), team_size: String(team_size), score: scores.overall },
  });

  return NextResponse.json({ token });
}
