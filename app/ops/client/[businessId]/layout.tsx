import Link from "next/link";

export default function ManagedClientLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { businessId: string };
}) {
  return (
    <div className="space-y-6">
      <nav className="flex flex-wrap items-center justify-end gap-2 border-b border-rule pb-3 text-sm">
        <Link href={`/ops/client/${params.businessId}`} className="btn-secondary">Workflow</Link>
        <Link href={`/ops/client/${params.businessId}/access`} className="btn-secondary">Client access</Link>
      </nav>
      {children}
    </div>
  );
}
