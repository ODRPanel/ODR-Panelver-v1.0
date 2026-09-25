import type { CaseNavItem } from "@/components/CaseSubNav";

// Extended incrementally as each module's case-scoped screen is built.
export const CASE_NAV_ITEMS: CaseNavItem[] = [
  { label: "Overview", href: "" },
  { label: "Parties", href: "/parties" },
  { label: "Tribunal", href: "/tribunal" },
  { label: "Pleadings", href: "/pleadings" },
  { label: "Hearings", href: "/hearings" },
  { label: "Evidence", href: "/evidence" },
  { label: "Orders & Awards", href: "/orders" },
  { label: "Timeline", href: "/timeline" },
  { label: "Costs & Fees", href: "/costs" },
  { label: "Communications", href: "/communications" },
  { label: "Documents", href: "/documents" },
  { label: "Court / Enforcement", href: "/court-proceedings" },
];
