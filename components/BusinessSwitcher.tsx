import { switchActiveBusiness } from "@/app/app/workspace-actions";
import type { AccessibleBusiness } from "@/lib/db";

export function BusinessSwitcher({
  businesses,
  activeBusinessId,
}: {
  businesses: AccessibleBusiness[];
  activeBusinessId: string;
}) {
  const active = businesses.find((business) => business.id === activeBusinessId);

  if (businesses.length <= 1) {
    return (
      <span className="hidden sm:block text-sm text-faint truncate max-w-[18ch]">
        {active?.name ?? "Workspace"}
      </span>
    );
  }

  return (
    <details className="relative group">
      <summary className="cursor-pointer list-none border border-rule bg-paper px-3 py-2 text-sm font-semibold min-w-[10rem] max-w-[15rem] truncate">
        {active?.name ?? "Choose workspace"}
      </summary>
      <div className="absolute right-0 mt-2 w-72 max-w-[85vw] border border-rule bg-card shadow-card p-2 z-30">
        <p className="eyebrow px-2 py-2">Client workspaces</p>
        <div className="max-h-80 overflow-y-auto">
          {businesses.map((business) => (
            <form key={business.id} action={switchActiveBusiness}>
              <input type="hidden" name="business_id" value={business.id} />
              <button
                type="submit"
                className={`w-full text-left px-3 py-2.5 border-t border-rule first:border-t-0 hover:bg-paper ${
                  business.id === activeBusinessId ? "bg-paper" : ""
                }`}
              >
                <span className="block text-sm font-semibold truncate">
                  {business.name}
                </span>
                <span className="mt-0.5 block font-mono text-[10px] uppercase tracking-wider text-faint">
                  {business.managed_by_tad
                    ? `TAD · ${business.service_status}`
                    : "Self-managed"}
                </span>
              </button>
            </form>
          ))}
        </div>
      </div>
    </details>
  );
}
