import Link from "next/link";
import { requireUser } from "@/lib/rbac";
import { getVisibleCases } from "@/lib/queries";
import { StatusBadge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { hasPermission, MODULE_KEYS } from "@/lib/permissions";

export default async function CasesListPage() {
  const user = await requireUser();
  const cases = await getVisibleCases(user);
  const canCreate = hasPermission(user.role.permissionSet, MODULE_KEYS.CASE_INITIATION, "create");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="page-title">References</h1>
        {canCreate && (
          <Link href="/cases/new" className="btn-primary">
            + New Reference
          </Link>
        )}
      </div>

      {cases.length === 0 ? (
        <EmptyState title="No References found" />
      ) : (
        <div className="card overflow-x-auto p-6">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-400">
                <th className="pb-2 pr-4">Reference</th>
                <th className="pb-2 pr-4">Jurisdiction Profile</th>
                <th className="pb-2 pr-4">Type</th>
                <th className="pb-2 pr-4">Tribunal</th>
                <th className="pb-2 pr-4">Status</th>
                <th className="pb-2">Seat</th>
              </tr>
            </thead>
            <tbody>
              {cases.map((c) => (
                <tr key={c.id} className="border-b border-slate-100">
                  <td className="py-2 pr-4">
                    <Link href={`/cases/${c.id}`} className="font-medium text-brand-700 hover:underline">
                      {c.referenceNumber}
                    </Link>
                    <p className="text-xs text-slate-400">{c.title}</p>
                  </td>
                  <td className="py-2 pr-4">{c.jurisdictionProfile.displayName}</td>
                  <td className="py-2 pr-4">{c.type}</td>
                  <td className="py-2 pr-4">
                    {c.tribunal ? `${c.tribunal.compositionType.replace(/_/g, " ")} (${c.tribunal.status})` : "-"}
                  </td>
                  <td className="py-2 pr-4">
                    <StatusBadge status={c.status} />
                  </td>
                  <td className="py-2">{c.seat ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
