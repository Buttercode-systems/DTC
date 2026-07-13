"use client";

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
      <span className="hidden max-w-[18ch] truncate text-sm text-faint sm:block">
        {active?.name ?? "Workspace"}
      </span>
    );
  }

  return (
    <form action={switchActiveBusiness} className="min-w-0">
      <label className="sr-only" htmlFor="active-business-switcher">
        Client workspace
      </label>
      <select
        id="active-business-switcher"
        name="business_id"
        defaultValue={activeBusinessId}
        onChange={(event) => event.currentTarget.form?.requestSubmit()}
        className="max-w-[15rem] cursor-pointer truncate border border-rule bg-paper px-3 py-2 text-sm font-semibold"
        aria-label="Client workspace"
      >
        {businesses.map((business) => (
          <option key={business.id} value={business.id}>
            {business.name} · {business.managed_by_tad ? `TAD ${business.service_status}` : "Self-managed"}
          </option>
        ))}
      </select>
    </form>
  );
}
