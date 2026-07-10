export default function Loading() {
  return (
    <main className="animate-pulse" aria-busy="true" aria-label="Building your report">
      <header className="border-b border-rule">
        <div className="mx-auto max-w-3xl px-5 py-4 flex items-center justify-between">
          <div className="h-6 w-28 bg-rule/60" />
          <div className="h-4 w-32 bg-rule/40" />
        </div>
      </header>
      <div className="mx-auto max-w-3xl px-5 py-12 space-y-6">
        <div className="h-8 w-2/3 bg-rule/60" />
        <div className="h-24 w-40 bg-rule/40" />
        <div className="space-y-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-14 w-full bg-rule/30" />
          ))}
        </div>
        <p className="font-mono text-xs text-faint !mt-10">Building your report…</p>
      </div>
    </main>
  );
}
