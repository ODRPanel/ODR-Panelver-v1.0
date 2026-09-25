import { requireUser } from "@/lib/rbac";
import { getCaseForUserOr404 } from "@/lib/queries";
import { prisma } from "@/lib/prisma";
import { hasPermission, MODULE_KEYS } from "@/lib/permissions";
import { scheduleHearingAction, updateHearingStatusAction, certifyHearingRecordAction } from "@/actions/hearing";
import { ErrorAlert, SuccessAlert } from "@/components/ui/Alert";
import { StatusBadge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";

export default async function HearingsPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { error?: string; success?: string };
}) {
  const user = await requireUser();
  const kase = await getCaseForUserOr404(params.id, user);
  const canCreate = hasPermission(user.role.permissionSet, MODULE_KEYS.HEARINGS, "create");
  const canEdit = hasPermission(user.role.permissionSet, MODULE_KEYS.HEARINGS, "edit");

  const hearings = await prisma.hearing.findMany({
    where: { referenceId: kase.id },
    orderBy: { scheduledStart: "desc" },
  });

  return (
    <div className="space-y-6">
      <ErrorAlert message={searchParams.error} />
      <SuccessAlert message={searchParams.success} />

      <div className="card p-6">
        <h2 className="section-title mb-4">Hearings</h2>
        {hearings.length === 0 ? (
          <EmptyState title="No hearings scheduled yet" />
        ) : (
          <div className="space-y-4">
            {hearings.map((h) => (
              <div key={h.id} className="rounded-md border border-slate-200 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium">{h.hearingType.replace(/_/g, " ")} &middot; {h.mode}</p>
                    <p className="text-xs text-slate-500">
                      {h.scheduledStart.toLocaleString()} {h.scheduledEnd ? `- ${h.scheduledEnd.toLocaleString()}` : ""}
                    </p>
                  </div>
                  <StatusBadge status={h.status} />
                </div>
                {h.venueOrLink && <p className="mt-2 text-xs text-slate-500">Link/Venue: {h.venueOrLink}</p>}
                {h.interpreterRequired && (
                  <p className="mt-1 text-xs text-amber-700">Interpreter required{h.interpreterLanguage ? ` (${h.interpreterLanguage})` : ""}</p>
                )}
                {h.observerAccess && <p className="mt-1 text-xs text-slate-500">Observer access: enabled</p>}
                <p className="mt-1 text-xs text-slate-500">
                  Cybersecurity/virtual-hearing protocol: {h.cybersecurityProtocolSignedOff ? "signed off" : "pending"}
                </p>
                {h.recordingRef && <p className="mt-1 text-xs text-slate-500">Recording: {h.recordingRef}</p>}
                {h.transcriptHash && <p className="mt-1 text-xs text-slate-500">Transcript certified (hash {h.transcriptHash.slice(0, 12)}...)</p>}

                {canEdit && (
                  <div className="mt-3 flex flex-wrap gap-4 border-t border-slate-100 pt-3">
                    <form action={updateHearingStatusAction} className="flex items-center gap-2">
                      <input type="hidden" name="hearingId" value={h.id} />
                      <input type="hidden" name="referenceId" value={kase.id} />
                      <select className="input py-1 text-xs" name="status" defaultValue={h.status}>
                        <option value="scheduled">scheduled</option>
                        <option value="completed">completed</option>
                        <option value="adjourned">adjourned</option>
                        <option value="cancelled">cancelled</option>
                      </select>
                      <button className="text-xs font-medium text-brand-700 hover:underline" type="submit">Update status</button>
                    </form>

                    <form action={certifyHearingRecordAction} className="flex flex-wrap items-center gap-2">
                      <input type="hidden" name="hearingId" value={h.id} />
                      <input type="hidden" name="referenceId" value={kase.id} />
                      <input className="input py-1 text-xs" name="recordingRef" placeholder="Recording reference" defaultValue={h.recordingRef ?? ""} />
                      <input className="input py-1 text-xs" name="transcriptRef" placeholder="Transcript text/reference" defaultValue={h.transcriptRef ?? ""} />
                      <button className="text-xs font-medium text-brand-700 hover:underline" type="submit">Save &amp; certify</button>
                    </form>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {canCreate && (
        <div className="card p-6">
          <h2 className="section-title mb-4">Schedule a Hearing</h2>
          <form action={scheduleHearingAction} className="grid gap-4 md:grid-cols-2">
            <input type="hidden" name="referenceId" value={kase.id} />
            <div>
              <label className="label" htmlFor="hearingType">Hearing type</label>
              <select className="input" id="hearingType" name="hearingType" required>
                <option value="case_management_conference">Case Management Conference</option>
                <option value="procedural">Procedural hearing</option>
                <option value="evidentiary">Evidentiary hearing</option>
                <option value="final">Final hearing</option>
              </select>
            </div>
            <div>
              <label className="label" htmlFor="mode">Mode</label>
              <select className="input" id="mode" name="mode" required>
                <option value="virtual">Virtual</option>
                <option value="in_person">In person</option>
                <option value="hybrid">Hybrid</option>
              </select>
            </div>
            <div>
              <label className="label" htmlFor="scheduledStart">Start</label>
              <input className="input" id="scheduledStart" name="scheduledStart" type="datetime-local" required />
            </div>
            <div>
              <label className="label" htmlFor="scheduledEnd">End (optional)</label>
              <input className="input" id="scheduledEnd" name="scheduledEnd" type="datetime-local" />
            </div>
            <div className="md:col-span-2">
              <label className="label" htmlFor="venueOrLink">Venue (leave blank for virtual/hybrid to auto-generate a link)</label>
              <input className="input" id="venueOrLink" name="venueOrLink" />
            </div>
            <div className="flex items-center gap-2">
              <input id="interpreterRequired" name="interpreterRequired" type="checkbox" />
              <label htmlFor="interpreterRequired" className="text-sm text-slate-700">Interpreter required</label>
            </div>
            <div>
              <input className="input" name="interpreterLanguage" placeholder="Language (e.g. Arabic)" />
            </div>
            <div className="flex items-center gap-2">
              <input id="observerAccess" name="observerAccess" type="checkbox" />
              <label htmlFor="observerAccess" className="text-sm text-slate-700">Allow Observer access</label>
            </div>
            <div className="flex items-center gap-2">
              <input id="cybersecurityProtocolSignedOff" name="cybersecurityProtocolSignedOff" type="checkbox" />
              <label htmlFor="cybersecurityProtocolSignedOff" className="text-sm text-slate-700">Cybersecurity/virtual-hearing protocol signed off</label>
            </div>
            <div className="md:col-span-2">
              <button className="btn-primary" type="submit">Schedule hearing</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
