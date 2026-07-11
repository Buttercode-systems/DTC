export function SummaryCard({ label, value, note }: { label: string; value: number; note: string }) {
  return (
    <article className="bg-card p-5">
      <p className="font-mono text-[11px] uppercase tracking-wider text-faint">{label}</p>
      <p className="mt-2 font-display text-4xl">{value}</p>
      <p className="mt-2 text-sm text-faint">{note}</p>
    </article>
  );
}

export function Status({ value }: { value: string }) {
  return (
    <span className="border border-rule px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-faint">
      {value.replaceAll("_", " ")}
    </span>
  );
}

export function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="font-mono text-[10px] uppercase tracking-wider text-faint">{label}</dt>
      <dd className="mt-1 break-words font-semibold">{value}</dd>
    </div>
  );
}

export function EmptyState({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="border border-dashed border-rule bg-card/50 p-8 text-center">
      <h3 className="font-display text-2xl">{title}</h3>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-faint">{detail}</p>
    </div>
  );
}
