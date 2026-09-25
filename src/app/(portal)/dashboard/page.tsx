import Link from "next/link";
import { requireUser } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { getVisibleCases } from "@/lib/queries";
import { StatusBadge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { hasPermission, MODULE_KEYS } from "@/lib/permissions";
import { computeTimelineDeadline, daysUntil } from "@/lib/jurisdictionEngine";

function StatCard({ label, value, href }: { label: string; value: number | string; href?: string }) {
  const content = (
    <div className="card p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-2 font-serif text-3xl font-bold text-slate-900">{value}</p>
    </div>
  );
  return href ? <Link href={href}>{content}</Link> : content;
}

export default async function DashboardPage() {
  const user = await requireUser();
  const cases = await getVisibleCases(user);
  const referenceIds = cases.map((c) => c.id);

  const [upcomingHearings, openInterimApplications, pendingDirections, unreadNotifications] =
    await Promise.all([
      prisma.hearing.count({
        where: {
          referenceId: { in: referenceIds },
          status: "scheduled",
          scheduledStart: { gte: new Date(), lte: new Date(Date.now() + 7 * 86400000) },
        },
      }),
      prisma.interimApplication.count({
        where: { referenceId: { in: referenceIds }, decision: "pending" },
      }),
      prisma.proceduralDirection.count({
        where: { referenceId: { in: referenceIds }, status: { in: ["pending", "overdue"] } },
      }),
      prisma.notification.count({
        where: { recipientUserId: user.id, readAt: null },
      }),
    ]);

  const isSuperAdmin = user.role.name === "Super Admin";
  const canCreateCase = hasPermission(user.role.permissionSet, MODULE_KEYS.CASE_INITIATION, "create");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Welcome, {user.fullName}</h1>
          <p className="text-sm text-slate-500">
            Signed in as <span className="font-medium">{user.role.name}</span>
          </p>
        </div>
        {canCreateCase && (
          <Link href="/cases/new" className="btn-primary">
            + New Reference
          </Link>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="References" value={cases.length} href="/cases" />
        <StatCard label="Hearings (next 7 days)" value={upcomingHearings} />
        <StatCard label="Open interim applications" value={openInterimApplications} />
        <StatCard label="Unread notifications" value={unreadNotifications} href="/notifications" />
      </div>

      {isSuperAdmin ? (
        <SuperAdminSnapshot />
      ) : (
        <div className="card p-6">
          <h2 className="section-title mb-4">My References</h2>
          {cases.length === 0 ? (
            <EmptyState
              title="No References yet"
              hint={canCreateCase ? "Use “New Reference” to start a Case Initiation." : "References you are assigned to will appear here."}
            />
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-400">
                  <th className="pb-2">Reference</th>
                  <th className="pb-2">Profile</th>
                  <th className="pb-2">Status</th>
                  <th className="pb-2">Timeline</th>
                </tr>
              </thead>
              <tbody>
                {cases.slice(0, 10).map((c) => {
                  const deadline = c.timelineDeadline ?? computeTimelineDeadline(c.jurisdictionProfile, c.timelineStartDate ?? c.createdAt);
                  const days = daysUntil(deadline);
                  return (
                    <tr key={c.id} className="border-b border-slate-100">
                      <td className="py-2">
                        <Link href={`/cases/${c.id}`} className="font-medium text-brand-700 hover:underline">
                          {c.referenceNumber}
                        </Link>
                        <p className="text-xs text-slate-400">{c.title}</p>
                      </td>
                      <td className="py-2">{c.jurisdictionProfile.profileCode}</td>
                      <td className="py-2">
                        <StatusBadge status={c.status} />
                      </td>
                      <td className="py-2 text-xs text-slate-500">
                        {days === null ? "No fixed deadline" : days < 0 ? `Overdue ${Math.abs(days)}d` : `${days} day(s) left`}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {pendingDirections > 0 && (
        <div className="card p-4 text-sm text-amber-800 bg-amber-50 border-amber-200">
          {pendingDirections} Procedural Order direction(s) are pending or overdue across your References.
        </div>
      )}
    </div>
  );
}

async function SuperAdminSnapshot() {
  const [totalCases, usersByRole, flagCount] = await Promise.all([
    prisma.case.count({ where: { isDeleted: false } }),
    prisma.role.findMany({
      include: { _count: { select: { users: true } } },
      orderBy: { name: "asc" },
    }),
    prisma.featureFlag.count({ where: { enabled: true } }),
  ]);

  return (
    <div className="card p-6">
      <h2 className="section-title mb-4">Platform Snapshot</h2>
      <p className="mb-4 text-sm text-slate-500">
        {totalCases} active Reference(s) platform-wide &middot; {flagCount} enabled feature flag(s)
      </p>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-400">
            <th className="pb-2">Role</th>
            <th className="pb-2">Provisioned users</th>
          </tr>
        </thead>
        <tbody>
          {usersByRole.map((r) => (
            <tr key={r.id} className="border-b border-slate-100">
              <td className="py-2">{r.name}</td>
              <td className="py-2">{r._count.users}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
