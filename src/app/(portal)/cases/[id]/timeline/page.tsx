import { requireUser } from "@/lib/rbac";
import { getCaseForUserOr404 } from "@/lib/queries";
import { hasPermission, MODULE_KEYS } from "@/lib/permissions";
import { requestTimelineExtensionAction } from "@/actions/case";
import { computeTimelineDeadline, computeConsentExtendedDeadline, daysUntil, getTimelineRules } from "@/lib/jurisdictionEngine";
import { ErrorAlert, SuccessAlert, InfoAlert } from "@/components/ui/Alert";

export default async function TimelinePage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { error?: string; success?: string };
}) {
  const user = await requireUser();
  const kase = await getCaseForUserOr404(params.id, user);
  const canEdit = hasPermission(user.role.permissionSet, MODULE_KEYS.TIMELINE, "edit");

  const rules = getTimelineRules(kase.jurisdictionProfile);
  const deadline = kase.timelineDeadline ?? computeTimelineDeadline(kase.jurisdictionProfile, kase.timelineStartDate ?? kase.createdAt);
  const days = daysUntil(deadline);
  const consentPreview = deadline ? computeConsentExtendedDeadline(kase.jurisdictionProfile, deadline) : null;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <ErrorAlert message={searchParams.error} />
      <SuccessAlert message={searchParams.success} />

      <div className="card p-6">
        <h2 className="section-title mb-4">{rules.label}</h2>
        <p className="text-sm text-slate-500">
          Rule type: <span className="font-medium">{rules.type.replace(/_/g, " ")}</span>
        </p>
        {deadline ? (
          <p className="mt-2 text-sm">
            Deadline/target: <strong>{deadline.toLocaleDateString()}</strong>{" "}
            {days !== null && (days < 0 ? `(overdue by ${Math.abs(days)} days)` : `(${days} days remaining)`)}
          </p>
        ) : (
          <InfoAlert>
            This Jurisdiction Rule Profile has no fixed statutory deadline - the timeline is
            tribunal-directed (Section 5.6 of the SOW/SRS).
          </InfoAlert>
        )}
        <p className="mt-2 text-xs text-slate-400">
          Reminder lead times: {rules.reminderDaysBeforeDeadline.join(", ") || "none"} days before the deadline/target.
        </p>
      </div>

      {canEdit && deadline && (
        <div className="card p-6">
          <h2 className="section-title mb-4">Extend the Timeline</h2>
          {rules.consentExtensionMonths ? (
            <form action={requestTimelineExtensionAction} className="mb-4 space-y-2">
              <input type="hidden" name="referenceId" value={kase.id} />
              <input type="hidden" name="kind" value="consent" />
              <p className="text-sm text-slate-500">
                Parties&apos; consent extension ({rules.consentExtensionMonths} months
                {consentPreview ? ` → ${consentPreview.toLocaleDateString()}` : ""}).
              </p>
              <button className="btn-secondary" type="submit">Log consent extension</button>
            </form>
          ) : null}
          <form action={requestTimelineExtensionAction} className="space-y-2 border-t border-slate-100 pt-4">
            <input type="hidden" name="referenceId" value={kase.id} />
            <input type="hidden" name="kind" value="court_or_institution" />
            <label className="label" htmlFor="newDeadline">
              Court/Institution-ordered new deadline
            </label>
            <div className="flex gap-2">
              <input className="input" id="newDeadline" name="newDeadline" type="date" required />
              <button className="btn-secondary shrink-0" type="submit">Log extension</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
