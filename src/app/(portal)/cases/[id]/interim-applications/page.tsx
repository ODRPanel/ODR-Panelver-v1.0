import { requireUser } from "@/lib/rbac";
import { getCaseForUserOr404 } from "@/lib/queries";
import { prisma } from "@/lib/prisma";
import { hasPermission, MODULE_KEYS } from "@/lib/permissions";
import { fileInterimApplicationAction, fileOppositionAction, decideInterimApplicationAction } from "@/actions/interimApplication";
import { ErrorAlert, SuccessAlert } from "@/components/ui/Alert";
import { StatusBadge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";

export default async function InterimApplicationsPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { error?: string; success?: string };
}) {
  const user = await requireUser();
  const kase = await getCaseForUserOr404(params.id, user);
  const canCreate = hasPermission(user.role.permissionSet, MODULE_KEYS.INTERIM_APPLICATIONS, "create");
  const canDecide = hasPermission(user.role.permissionSet, MODULE_KEYS.INTERIM_APPLICATIONS, "decide");

  const applications = await prisma.interimApplication.findMany({
    where: { referenceId: kase.id },
    include: { filedByParty: true },
    orderBy: { filedAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <ErrorAlert message={searchParams.error} />
      <SuccessAlert message={searchParams.success} />

      <div className="card p-6">
        <h2 className="section-title mb-4">Interim &amp; Emergency Applications to the Tribunal</h2>
        <p className="mb-4 text-xs text-slate-500">
          Distinct from a Court or Emergency Arbitrator application (Module 5.13) - an application
          for interim measures to the Tribunal itself, with its own expedited timeline (Module 5.17).
        </p>
        {applications.length === 0 ? (
          <EmptyState title="No interim applications filed" />
        ) : (
          <div className="space-y-3">
            {applications.map((a) => (
              <div key={a.id} className="rounded-md border border-slate-200 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium">{a.title} <span className="text-xs text-slate-400">by {a.filedByParty.displayLabel}</span></p>
                  <StatusBadge status={a.decision} />
                </div>
                <p className="text-sm text-slate-600">{a.description}</p>
                <p className="mt-1 text-xs text-slate-500">
                  Opposition due {a.oppositionDueAt?.toLocaleDateString()} &middot; Decision due {a.decisionDueAt?.toLocaleDateString()}
                </p>
                {a.oppositionText && <p className="mt-1 text-xs text-amber-700">Opposition: {a.oppositionText}</p>}
                {a.decisionText && <p className="mt-1 text-xs text-emerald-700">Decision: {a.decisionText}</p>}

                {a.decision === "pending" && (
                  <div className="mt-3 space-y-2 border-t border-slate-100 pt-3">
                    {canCreate && !a.oppositionText && (
                      <form action={fileOppositionAction} className="flex items-center gap-2">
                        <input type="hidden" name="applicationId" value={a.id} />
                        <input type="hidden" name="referenceId" value={kase.id} />
                        <input className="input py-1 text-xs" name="oppositionText" placeholder="Opposition text" required />
                        <button className="text-xs font-medium text-amber-700 hover:underline" type="submit">File opposition</button>
                      </form>
                    )}
                    {canDecide && (
                      <form action={decideInterimApplicationAction} className="flex flex-wrap items-center gap-2">
                        <input type="hidden" name="applicationId" value={a.id} />
                        <input type="hidden" name="referenceId" value={kase.id} />
                        <select className="input py-1 text-xs" name="decision" required>
                          <option value="granted">Granted</option>
                          <option value="refused">Refused</option>
                          <option value="varied">Varied</option>
                        </select>
                        <input className="input py-1 text-xs" name="decisionText" placeholder="Decision text" required />
                        <input className="input py-1 w-32 text-xs" name="securityAmount" placeholder="Security amount (opt.)" type="number" step="0.01" />
                        <button className="text-xs font-medium text-emerald-700 hover:underline" type="submit">Record decision</button>
                      </form>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {canCreate && (
        <div className="card p-6">
          <h2 className="section-title mb-4">File an Interim Application</h2>
          <form action={fileInterimApplicationAction} className="space-y-4">
            <input type="hidden" name="referenceId" value={kase.id} />
            <div>
              <label className="label" htmlFor="filedByPartyId">Filing Party</label>
              <select className="input" id="filedByPartyId" name="filedByPartyId" required>
                {kase.parties.map((p) => (
                  <option key={p.id} value={p.id}>{p.displayLabel}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="title">Title</label>
              <input className="input" id="title" name="title" required placeholder="e.g. Application for interim injunction" />
            </div>
            <div>
              <label className="label" htmlFor="description">Description / relief sought</label>
              <textarea className="input" id="description" name="description" rows={3} required />
            </div>
            <button className="btn-primary" type="submit">File application</button>
          </form>
        </div>
      )}
    </div>
  );
}
