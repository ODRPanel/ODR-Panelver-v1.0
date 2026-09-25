import type { CaseNavItem } from "@/components/CaseSubNav";

// Extended incrementally as each module's case-scoped screen is built.
export const CASE_NAV_ITEMS: CaseNavItem[] = [
  { label: "Overview", href: "" },
  { label: "Parties", href: "/parties" },
  { label: "Tribunal", href: "/tribunal" },
];
