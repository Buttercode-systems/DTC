import { requireTadBusiness } from "@/lib/platform";

export default async function DepartmentsLayout({ children }: { children: React.ReactNode }) {
  await requireTadBusiness();
  return children;
}
