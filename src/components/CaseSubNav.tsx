"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type CaseNavItem = { label: string; href: string };

export function CaseSubNav({ caseId, items }: { caseId: string; items: CaseNavItem[] }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-wrap gap-1 border-b border-slate-200 pb-2">
      {items.map((item) => {
        const href = `/cases/${caseId}${item.href}`;
        const active = pathname === href;
        return (
          <Link
            key={item.href}
            href={href}
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${
              active ? "bg-brand-700 text-white" : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
