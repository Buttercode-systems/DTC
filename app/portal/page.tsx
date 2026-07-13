import { redirect } from "next/navigation";
import { requireBusiness } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function PortalEntryPage() {
  const { business } = await requireBusiness();
  redirect(business.managed_by_tad ? "/app/service" : "/app");
}
