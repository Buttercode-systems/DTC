export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json(
    { ok: false, error: "automation_disabled_during_controlled_pilot" },
    { status: 503 }
  );
}
