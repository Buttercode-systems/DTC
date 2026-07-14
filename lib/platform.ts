import { redirect } from "next/navigation";
import { requireBusiness } from "@/lib/db";

export async function requireTadBusiness() {
  const context = await requireBusiness();
  if (context.business.platform_key !== "tad") redirect("/app");
  return context;
}

export async function requireDueTodayBusiness() {
  const context = await requireBusiness();
  if (context.business.platform_key !== "duetoday") redirect("/app");
  return context;
}

export function assertTadPlatform(platform: string): void {
  if (platform !== "tad") throw new Error("This action is available only in a TAD workspace.");
}
