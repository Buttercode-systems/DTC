import { redirect } from "next/navigation";
import { requireOperator } from "@/lib/operator";

export const dynamic = "force-dynamic";

export default async function AdminHqEntryPage() {
  await requireOperator();
  redirect("/ops");
}
