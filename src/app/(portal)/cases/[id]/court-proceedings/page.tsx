import { requireUser } from "@/lib/rbac";
import { getCaseForUserOr404 } from "@/lib/queries";
import { prisma } from "@/lib/prisma";
import { hasPermission, MODULE_KEYS } from "@/lib/permissions";
import { createCourtProceedingAction, updateCourtProceedingStatusAction } from "@/actions/courtProceeding";
import { ErrorAlert, SuccessAlert } from "@/components/ui/Alert";
import { StatusBadge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";

export default async function CourtProceedingsPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { error?: string; success?: string };
}) {
  const user = await requireUser();
  const kase = await getCaseForUserOr404(params.id, user);
  const canCreate = hasPermission(user.role.permissionSet, MODULE_KEYS.COURT_ENFORCEMENT, "create");
  const canEdit = hasPermission(user.role.permissionSet, MODULE_KEYS.COURT_ENFORCEMENT, "edit");

  const proceedings = await prisma.courtProceeding.findMany({
    where: { referenceId: kase.id },
    orderBy: { filedAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <ErrorAlert message={searchParams.error} />
      <SuccessAlert message={searchParams.success} />

      <div className="card p-6">
        <h2 className="section-title mb-4">Court / Enforcement Proceedings &amp; Post-Award Tracker</h2>
        <p className="mb-4 text-xs text-slate-500">
          Parallel/ancillary proceedings before the competent court at the seat, and, since an
          Award may be enforced elsewhere, enforcement and any resistance to enforcement tracked
          against the New York Convention, 1958, Article V grounds (Module 5.13).
        </p>
        {proceedings.length === 0 ? (
          <EmptyState title="No court/enforcement proceedings logged" />
        ) : (
          <div className="space-y-3">
            {proceedings.map((p) => (
              <div key={p.id} className="rounded-md border border-slate-200 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium">{p.provisionType.replace(/_/g, " ")} - {p.courtOrBody}</p>
                  <StatusBadge status={p.status} />
                </div>
                <p className="text-xs text-slate-500">
                  {p.provisionReference ? `${p.provisionReference} · ` : ""}
                  {p.courtCaseNo ? `Case No. ${p.courtCaseNo}` : ""}
                </p>
                {p.nycArticleVGround && <p className="mt-1 text-xs text-amber-700">NYC Article V ground: {p.nycArticleVGround}</p>}
                {p.impactOnTimeline && <p className="mt-1 text-xs text-slate-500">Impact on timeline: {p.impactOnTimeline}</p>}

                {canEdit && p.status !== "disposed" && (
                  <form action={updateCourtProceedingStatusAction} className="mt-2 flex items-center gap-2 border-t border-slate-100 pt-2">
                    <input type="hidden" name="proceedingId" value={p.id} />
                    <input type="hidden" name="referenceId" value={kase.id} />
                    <select className="input py-1 text-xs" name="status" defaultValue={p.status}>
                      <option value="filed">filed</option>
                      <option value="pending">pending</option>
                      <option value="disposed">disposed</option>
                      <option value="stayed">stayed</option>
                    </select>
                    <button className="text-xs font-medium text-brand-700 hover:underline" type="submit">Update</button>
                  </form>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {canCreate && (
        <div className="card p-6">
          <h2 className="section-title mb-4">Log a Proceeding</h2>
          <form action={createCourtProceedingAction} className="grid gap-4 md:grid-cols-2">
            <input type="hidden" name="referenceId" value={kase.id} />
            <div>
              <label className="label" htmlFor="provisionType">Type</label>
              <select className="input" id="provisionType" name="provisionType" required>
                <option value="interim_relief">Interim relief</option>
                <option value="appointment">Appointment</option>
                <option value="evidence_assistance">Evidence assistance</option>
                <option value="timeline_extension">Timeline extension</option>
                <option value="challenge_setaside">Challenge / set-aside</option>
                <option value="enforcement">Enforcement</option>
                <option value="appeal">Appeal</option>
              </select>
            </div>
            <div>
              <label className="label" htmlFor="courtOrBody">Court / body</label>
              <input className="input" id="courtOrBody" name="courtOrBody" required />
            </div>
            <div>
              <label className="label" htmlFor="provisionReference">Statutory / rules reference</label>
              <input className="input" id="provisionReference" name="provisionReference" placeholder="e.g. Section 34, Arbitration Act 1996" />
            </div>
            <div>
              <label className="label" htmlFor="courtCaseNo">Court case number</label>
              <input className="input" id="courtCaseNo" name="courtCaseNo" />
            </div>
            <div className="md:col-span-2">
              <label className="label" htmlFor="nycArticleVGround">New York Convention Article V ground (if enforcement raised outside the seat)</label>
              <input className="input" id="nycArticleVGround" name="nycArticleVGround" />
            </div>
            <div className="md:col-span-2">
              <label className="label" htmlFor="impactOnTimeline">Impact on the Reference&apos;s timeline</label>
              <input className="input" id="impactOnTimeline" name="impactOnTimeline" />
            </div>
            <div className="md:col-span-2">
              <button className="btn-primary" type="submit">Log proceeding</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
