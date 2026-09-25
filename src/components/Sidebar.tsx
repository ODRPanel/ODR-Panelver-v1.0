import Link from "next/link";
import { MODULE_KEYS, hasPermission, type PermissionSet } from "@/lib/permissions";

type NavItem = { label: string; href: string; moduleKey?: string };

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard" },
  // No moduleKey gate: every role sees their own References list (scoped
  // server-side by getVisibleCases) - 5.10 below gates the separate,
  // institution-wide MIS/analytics view, not access to one's own cases.
  { label: "References (Cases)", href: "/cases" },
  { label: "New Reference", href: "/cases/new", moduleKey: MODULE_KEYS.CASE_INITIATION },
  { label: "Reports & MIS", href: "/reports", moduleKey: MODULE_KEYS.SEARCH_MIS },
  // No moduleKey gate: the grievance channel on this page is open to
  // every role (Section 5.14); the page itself further-gates the
  // breach-incident console to the roles that hold it.
  { label: "Compliance & Grievances", href: "/compliance" },
  { label: "Audit Trail", href: "/audit", moduleKey: MODULE_KEYS.AUDIT_TRAIL },
  { label: "Support Console", href: "/support", moduleKey: MODULE_KEYS.SUPPORT },
  { label: "Records Retention", href: "/retention", moduleKey: MODULE_KEYS.RETENTION },
  { label: "Administration", href: "/admin", moduleKey: MODULE_KEYS.ADMIN },
];

export function Sidebar({ permissionSet, roleName }: { permissionSet: PermissionSet; roleName: string }) {
  const visible = NAV_ITEMS.filter(
    (item) => !item.moduleKey || hasPermission(permissionSet, item.moduleKey, "view") || hasPermission(permissionSet, item.moduleKey, "create"),
  );

  return (
    <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-white md:block">
      <div className="flex h-16 items-center border-b border-slate-200 px-6">
        <span className="font-serif text-lg font-bold text-brand-900">ODR Panel</span>
      </div>
      <div className="px-6 py-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Signed in as</p>
        <p className="text-sm font-medium text-slate-800">{roleName}</p>
      </div>
      <nav className="space-y-1 px-3">
        {visible.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="block rounded-md px-3 py-2 text-sm font-medium text-slate-600 hover:bg-brand-50 hover:text-brand-800"
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
