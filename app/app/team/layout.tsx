import { requireTadBusiness } from "@/lib/platform";

export default async function TeamLayout({ children }: { children: React.ReactNode }) {
  await requireTadBusiness();
  return children;
}
