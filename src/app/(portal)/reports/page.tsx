import { requireUser, requirePermission } from "@/lib/rbac";
import { MODULE_KEYS } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export default async function ReportsPage({ searchParams }: { searchParams: { profile?: string } }) {
  const user = await requireUser();
  await requirePermission(user, MODULE_KEYS.SEARCH_MIS, "view");

  const profiles = await prisma.jurisdictionProfile.findMany({ orderBy: { displayName: "asc" } });
  const profileFilter = searchParams.profile;

  const caseWhere = profileFilter ? { isDeleted: false, jurisdictionProfile: { profileCode: profileFilter as any } } : { isDeleted: false };

  const [totalCases, byStatus, byProfile, openBreaches, pendingDirections, publishedAwards] = await Promise.all([
    prisma.case.count({ where: caseWhere }),
    prisma.case.groupBy({ by: ["status"], where: caseWhere, _count: true }),
    prisma.case.groupBy({ by: ["jurisdictionProfileId"], where: { isDeleted: false }, _count: true }),
    prisma.breachIncident.count({ where: { status: "open" } }),
    prisma.proceduralDirection.count({ where: { status: { in: ["pending", "overdue"] } } }),
    prisma.order.count({ where: { orderType: { in: ["award", "consent_award"] }, status: "published" } }),
  ]);

  const profileNameById = Object.fromEntries(profiles.map((p) => [p.id, p.displayName]));

  return (
    <div className="space-y-6">
      <h1 className="page-title">Search, Reporting &amp; MIS</h1>
      <p className="text-sm text-slate-500">
        Institutional dashboard, caseload and compliance statistics (Module 5.10), filterable by
        Jurisdiction Rule Profile for multi-profile portfolios.
      </p>

      <div className="flex flex-wrap gap-2">
        <a href="/reports" className={`badge ${!profileFilter ? "bg-brand-700 text-white" : "bg-slate-100 text-slate-600"}`}>All profiles</a>
        {profiles.map((p) => (
          <a
            key={p.id}
            href={`/reports?profile=${p.profileCode}`}
            className={`badge ${profileFilter === p.profileCode ? "bg-brand-700 text-white" : "bg-slate-100 text-slate-600"}`}
          >
            {p.displayName}
          </a>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="References" value={totalCases} />
        <StatCard label="Published Awards" value={publishedAwards} />
        <StatCard label="Open breach incidents" value={openBreaches} />
        <StatCard label="Pending/overdue directions" value={pendingDirections} />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="card p-6">
          <h2 className="section-title mb-4">Caseload by Status</h2>
          <table className="w-full text-sm">
            <tbody>
              {byStatus.map((row) => (
                <tr key={row.status} className="border-b border-slate-100">
                  <td className="py-2 capitalize">{row.status.replace(/_/g, " ")}</td>
                  <td className="py-2 text-right font-medium">{row._count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="card p-6">
          <h2 className="section-title mb-4">Caseload by Jurisdiction Profile</h2>
          <table className="w-full text-sm">
            <tbody>
              {byProfile.map((row) => (
                <tr key={row.jurisdictionProfileId} className="border-b border-slate-100">
                  <td className="py-2">{profileNameById[row.jurisdictionProfileId]}</td>
                  <td className="py-2 text-right font-medium">{row._count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="card p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-2 font-serif text-3xl font-bold text-slate-900">{value}</p>
    </div>
  );
}
