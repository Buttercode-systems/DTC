import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Service Desk — The Admin Department",
  description: "Private Client Portal for managed approvals, workflow progress and weekly service reports.",
};

export default function ServiceLayout({ children }: { children: React.ReactNode }) {
  return children;
}
