import Link from "next/link";
import { requireUser, requirePermission } from "@/lib/rbac";
import { MODULE_KEYS } from "@/lib/permissions";

export default async function AdminHomePage() {
  const user = await requireUser();
  await requirePermission(user, MODULE_KEYS.ADMIN, "view");

  const cards = [
    { href: "/admin/users", title: "User, Role & Access Management", desc: "Provision and suspend accounts platform-wide (Module 5.11)." },
    { href: "/admin/jurisdiction-profiles", title: "Jurisdiction Rule Profile Administration", desc: "The six launch profiles and any further jurisdiction added by configuration (Section 3.3)." },
    { href: "/admin/feature-flags", title: "Feature Flags & Module Enablement", desc: "Enable or withhold a module per Institution or Reference (Section 8)." },
    { href: "/admin/templates", title: "Template Library Administration", desc: "Add Institution/Client house-style templates (Section 5.19)." },
    { href: "/audit", title: "Audit Trail (read-only)", desc: "Immutable system-health log (Module 5.12)." },
  ];

  return (
    <div className="space-y-6">
      <h1 className="page-title">System Administration</h1>
      <p className="text-sm text-slate-500">
        The Super Admin has no drafting, filing or publication rights over case content
        (Annexure A-1, Section 2) - this console is scoped to system configuration only.
      </p>
      <div className="grid gap-4 md:grid-cols-2">
        {cards.map((c) => (
          <Link key={c.href} href={c.href} className="card block p-6 hover:border-brand-300">
            <h2 className="section-title">{c.title}</h2>
            <p className="mt-1 text-sm text-slate-500">{c.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
