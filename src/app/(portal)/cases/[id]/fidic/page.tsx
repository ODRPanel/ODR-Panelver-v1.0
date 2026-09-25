import { requireUser } from "@/lib/rbac";
import { getCaseForUserOr404 } from "@/lib/queries";
import { prisma } from "@/lib/prisma";
import { hasPermission, MODULE_KEYS } from "@/lib/permissions";
import { updateFidicChecklistAction, addFidicLogEntryAction } from "@/actions/fidic";
import { ErrorAlert, InfoAlert } from "@/components/ui/Alert";

const LOG_LABELS: Record<string, string> = {
  engineerDeterminationLog: "Engineer's Determinations",
  dabDecisionLog: "DAB/DAAB Decisions",
  eotClaimLog: "Extension-of-Time (EOT) Claims",
  variationOrderLog: "Variation Orders",
};

export default async function FidicPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { error?: string };
}) {
  const user = await requireUser();
  const kase = await getCaseForUserOr404(params.id, user);
  const canEdit = hasPermission(user.role.permissionSet, MODULE_KEYS.FIDIC, "edit");

  if (!kase.fidicEnabled) {
    return (
      <div className="mx-auto max-w-xl">
        <InfoAlert>
          The FIDIC / multi-tier construction dispute module is not enabled for this Reference.
          Enable it from the Overview tab if this arises under a FIDIC or comparable clause
          (Module 5.22).
        </InfoAlert>
      </div>
    );
  }

  const referral = await prisma.fIDICDisputeReferral.findUnique({ where: { referenceId: kase.id } });
  if (!referral) {
    return <InfoAlert>No FIDIC referral record found. Re-enable the module from Overview.</InfoAlert>;
  }

  const anyGap = !referral.dabDaabReferralEvidenced || !referral.noticeOfDissatisfactionEvidenced || !referral.coolingOffEvidenced;

  return (
    <div className="space-y-6">
      <ErrorAlert message={searchParams.error} />

      <div className="card p-6">
        <h2 className="section-title mb-2">Condition-Precedent Compliance Checklist</h2>
        <p className="mb-4 text-xs text-slate-500">Contract form: {referral.contractForm}</p>
        {anyGap && (
          <div className="mb-4 rounded-md border border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-800">
            A condition-precedent item is not yet evidenced. The Reference may still proceed, but
            this gap is flagged to the Tribunal (Section 5.22).
          </div>
        )}
        <form action={updateFidicChecklistAction} className="space-y-3">
          <input type="hidden" name="referenceId" value={kase.id} />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="dabDaabReferralEvidenced" defaultChecked={referral.dabDaabReferralEvidenced} disabled={!canEdit} />
            Prior reference to a Dispute Adjudication Board / DAAB evidenced
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="noticeOfDissatisfactionEvidenced" defaultChecked={referral.noticeOfDissatisfactionEvidenced} disabled={!canEdit} />
            Notice of Dissatisfaction with the DAB/DAAB decision evidenced
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="coolingOffEvidenced" defaultChecked={referral.coolingOffEvidenced} disabled={!canEdit} />
            Contractual amicable-settlement / cooling-off period evidenced
          </label>
          {canEdit && <button className="btn-primary mt-2" type="submit">Save checklist</button>}
        </form>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {(["engineerDeterminationLog", "dabDecisionLog", "eotClaimLog", "variationOrderLog"] as const).map((logKey) => {
          const entries = (referral[logKey] as unknown as Array<{ text: string; at: string }>) ?? [];
          return (
            <div key={logKey} className="card p-4">
              <h3 className="section-title mb-2 text-sm">{LOG_LABELS[logKey]}</h3>
              {entries.length === 0 ? (
                <p className="text-xs text-slate-400">No entries yet.</p>
              ) : (
                <ul className="mb-2 space-y-1 text-xs">
                  {entries.map((e, idx) => (
                    <li key={idx} className="border-b border-slate-100 pb-1">
                      {e.text} <span className="text-slate-400">({new Date(e.at).toLocaleDateString()})</span>
                    </li>
                  ))}
                </ul>
              )}
              {canEdit && (
                <form action={addFidicLogEntryAction} className="flex items-center gap-2">
                  <input type="hidden" name="referenceId" value={kase.id} />
                  <input type="hidden" name="logType" value={logKey} />
                  <input className="input py-1 text-xs" name="entryText" placeholder="Add entry" required />
                  <button className="text-xs font-medium text-brand-700 hover:underline" type="submit">Add</button>
                </form>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
