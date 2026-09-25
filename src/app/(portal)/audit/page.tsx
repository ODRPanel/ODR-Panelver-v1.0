import { requireUser, requirePermission } from "@/lib/rbac";
import { MODULE_KEYS } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export default async function AuditPage() {
  const user = await requireUser();
  await requirePermission(user, MODULE_KEYS.AUDIT_TRAIL, "view");

  const entries = await prisma.auditLogEntry.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { actorUser: true, reference: true },
  });

  return (
    <div className="space-y-6">
      <h1 className="page-title">Compliance &amp; Audit Trail</h1>
      <p className="text-sm text-slate-500">
        Immutable, read-only log (Module 5.12). Each entry&apos;s hash chains to the one before it,
        so any retrospective alteration is detectable. Showing the latest {entries.length} entries.
      </p>
      <div className="card overflow-x-auto p-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-400">
              <th className="pb-2 pr-4">When</th>
              <th className="pb-2 pr-4">Action</th>
              <th className="pb-2 pr-4">Actor</th>
              <th className="pb-2 pr-4">Reference</th>
              <th className="pb-2">Entity</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <tr key={e.id} className="border-b border-slate-100 align-top">
                <td className="py-2 pr-4 whitespace-nowrap text-xs text-slate-500">
                  {e.createdAt.toLocaleString()}
                </td>
                <td className="py-2 pr-4 font-mono text-xs">{e.action}</td>
                <td className="py-2 pr-4">{e.actorUser?.fullName ?? "System"}</td>
                <td className="py-2 pr-4">{e.reference?.referenceNumber ?? "-"}</td>
                <td className="py-2 text-xs text-slate-400">
                  {e.entityType ? `${e.entityType}${e.entityId ? ` #${e.entityId.slice(0, 8)}` : ""}` : "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
