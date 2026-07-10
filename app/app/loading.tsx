export default function Loading() {
  return (
    <div className="animate-pulse space-y-6" aria-busy="true" aria-label="Loading">
      <div className="space-y-2">
        <div className="h-7 w-48 bg-rule/60" />
        <div className="h-4 w-72 max-w-full bg-rule/40" />
      </div>
      <div className="bg-card shadow-card ruled">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="p-4 flex items-start gap-3">
            <div className="mt-0.5 h-5 w-5 shrink-0 bg-rule/60" />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="h-4 w-2/3 bg-rule/60" />
              <div className="h-3 w-1/3 bg-rule/40" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
