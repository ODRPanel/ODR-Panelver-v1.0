import { requireUser } from "@/lib/rbac";
import { MODULE_KEYS, hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import {
  logBreachIncidentAction,
  notifyBreachAction,
  closeBreachIncidentAction,
  raiseGrievanceAction,
  resolveGrievanceAction,
} from "@/actions/compliance";
import { ErrorAlert, SuccessAlert } from "@/components/ui/Alert";
import { StatusBadge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { getVisibleCases } from "@/lib/queries";

export default async function CompliancePage({
  searchParams,
}: {
  searchParams: { error?: string; success?: string };
}) {
  const user = await requireUser();
  // The grievance channel (below) is deliberately open to every role - a
  // Party or Counsel is exactly who would raise one. Only the breach-
  // incident console and the grievance queue itself are gated to the
  // roles Section 5.14 assigns them to.
  const canViewBreach = hasPermission(user.role.permissionSet, MODULE_KEYS.COMPLIANCE_BREACH, "view");
  const canLogBreach = hasPermission(user.role.permissionSet, MODULE_KEYS.COMPLIANCE_BREACH, "create");
  const canManageBreach = hasPermission(user.role.permissionSet, MODULE_KEYS.COMPLIANCE_BREACH, "edit");
  const canDecide = hasPermission(user.role.permissionSet, MODULE_KEYS.COMPLIANCE_BREACH, "decide");

  const [incidents, grievances, cases] = await Promise.all([
    canViewBreach
      ? prisma.breachIncident.findMany({ orderBy: { detectedAt: "desc" }, include: { reference: true } })
      : Promise.resolve([]),
    canViewBreach
      ? prisma.grievanceTicket.findMany({ orderBy: { createdAt: "desc" }, include: { reference: true, raisedByUser: true } })
      : Promise.resolve([]),
    getVisibleCases(user),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="page-title">Compliance &amp; Breach-Incident Management</h1>
      <p className="text-sm text-slate-500">
        Owned by the Data Protection/Compliance Officer (Module 5.14); also the channel of record
        for grievances against an Institution or an Arbitrator&apos;s conduct short of a formal
        challenge.
      </p>
      <ErrorAlert message={searchParams.error} />
      <SuccessAlert message={searchParams.success} />

      {canViewBreach && (
      <div className="card p-6">
        <h2 className="section-title mb-4">Breach Incidents</h2>
        {incidents.length === 0 ? (
          <EmptyState title="No incidents logged" />
        ) : (
          <div className="space-y-3">
            {incidents.map((i) => (
              <div key={i.id} className="rounded-md border border-slate-200 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium">
                    {i.severity.toUpperCase()} {i.reference ? `- ${i.reference.referenceNumber}` : "(platform-wide)"}
                  </p>
                  <StatusBadge status={i.status} />
                </div>
                <p className="text-sm text-slate-600">{i.description}</p>
                <p className="mt-1 text-xs text-slate-400">
                  Detected {i.detectedAt.toLocaleString()}
                  {i.notificationDeadlineAt ? ` · Notification target: ${i.notificationDeadlineAt.toLocaleString()}` : ""}
                </p>
                {i.remediationNote && <p className="mt-1 text-xs text-emerald-700">Remediation: {i.remediationNote}</p>}

                {i.status !== "closed" && (canManageBreach || canDecide) && (
                  <div className="mt-3 flex flex-wrap gap-3 border-t border-slate-100 pt-3">
                    {canManageBreach && !i.clientNotifiedAt && (
                      <form action={notifyBreachAction}>
                        <input type="hidden" name="incidentId" value={i.id} />
                        <input type="hidden" name="which" value="client" />
                        <button className="text-xs font-medium text-brand-700 hover:underline" type="submit">Notify Client</button>
                      </form>
                    )}
                    {canManageBreach && !i.regulatorNotifiedAt && (
                      <form action={notifyBreachAction}>
                        <input type="hidden" name="incidentId" value={i.id} />
                        <input type="hidden" name="which" value="regulator" />
                        <button className="text-xs font-medium text-brand-700 hover:underline" type="submit">Notify Regulator</button>
                      </form>
                    )}
                    {canDecide && (
                      <form action={closeBreachIncidentAction} className="flex items-center gap-2">
                        <input type="hidden" name="incidentId" value={i.id} />
                        <input className="input py-1 text-xs" name="remediationNote" placeholder="Remediation note" required />
                        <button className="text-xs font-medium text-emerald-700 hover:underline" type="submit">Close</button>
                      </form>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      )}

      {canLogBreach && (
        <div className="card p-6">
          <h2 className="section-title mb-4">Log a Breach Incident</h2>
          <form action={logBreachIncidentAction} className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="label" htmlFor="referenceId">Reference (optional - leave blank for platform-wide)</label>
              <select className="input" id="referenceId" name="referenceId" defaultValue="">
                <option value="">Platform-wide</option>
                {cases.map((c) => (
                  <option key={c.id} value={c.id}>{c.referenceNumber}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="severity">Severity</label>
              <select className="input" id="severity" name="severity" required>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="label" htmlFor="description">Description</label>
              <textarea className="input" id="description" name="description" rows={3} required />
            </div>
            <div className="md:col-span-2">
              <button className="btn-primary" type="submit">Log incident</button>
            </div>
          </form>
        </div>
      )}

      {canViewBreach && (
      <div className="card p-6">
        <h2 className="section-title mb-4">Grievances</h2>
        {grievances.length === 0 ? (
          <EmptyState title="No grievances logged" />
        ) : (
          <div className="space-y-3">
            {grievances.map((g) => (
              <div key={g.id} className="rounded-md border border-slate-200 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium">{g.subject} <span className="text-xs text-slate-400">(against {g.against})</span></p>
                  <StatusBadge status={g.status} />
                </div>
                <p className="text-sm text-slate-600">{g.description}</p>
                <p className="mt-1 text-xs text-slate-400">Raised by {g.raisedByUser.fullName} on {g.createdAt.toLocaleDateString()}</p>
                {g.outcomeText && <p className="mt-1 text-xs text-emerald-700">Outcome: {g.outcomeText}</p>}
                {canDecide && g.status !== "resolved" && (
                  <form action={resolveGrievanceAction} className="mt-2 flex items-center gap-2 border-t border-slate-100 pt-2">
                    <input type="hidden" name="ticketId" value={g.id} />
                    <input className="input py-1 text-xs" name="outcomeText" placeholder="Outcome / recommendation" required />
                    <button className="text-xs font-medium text-brand-700 hover:underline" type="submit">Resolve</button>
                  </form>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      )}

      <div className="card p-6">
        <h2 className="section-title mb-4">Raise a Grievance</h2>
        <form action={raiseGrievanceAction} className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="label" htmlFor="referenceId2">Reference (optional)</label>
            <select className="input" id="referenceId2" name="referenceId" defaultValue="">
              <option value="">Not tied to a Reference</option>
              {cases.map((c) => (
                <option key={c.id} value={c.id}>{c.referenceNumber}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="against">Against</label>
            <select className="input" id="against" name="against" required>
              <option value="institution">Institution&apos;s administration</option>
              <option value="arbitrator">An Arbitrator&apos;s conduct</option>
            </select>
          </div>
          <div>
            <label className="label" htmlFor="subject">Subject</label>
            <input className="input" id="subject" name="subject" required />
          </div>
          <div className="md:col-span-2">
            <label className="label" htmlFor="description2">Description</label>
            <textarea className="input" id="description2" name="description" rows={3} required />
          </div>
          <div className="md:col-span-2">
            <button className="btn-secondary" type="submit">Submit grievance</button>
          </div>
        </form>
      </div>
    </div>
  );
}
