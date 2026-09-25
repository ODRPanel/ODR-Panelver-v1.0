import { requireUser } from "@/lib/rbac";
import { getCaseForUserOr404 } from "@/lib/queries";
import { prisma } from "@/lib/prisma";
import { hasPermission, MODULE_KEYS } from "@/lib/permissions";
import { createDirectionAction, updateDirectionStatusAction } from "@/actions/direction";
import { ErrorAlert, SuccessAlert } from "@/components/ui/Alert";
import { EmptyState } from "@/components/ui/EmptyState";

const STATUS_COLUMNS: Array<["pending" | "complied" | "overdue" | "varied", string]> = [
  ["pending", "Pending"],
  ["complied", "Complied"],
  ["overdue", "Overdue"],
  ["varied", "Varied"],
];

export default async function DirectionsPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { error?: string; success?: string };
}) {
  const user = await requireUser();
  const kase = await getCaseForUserOr404(params.id, user);
  const canCreate = hasPermission(user.role.permissionSet, MODULE_KEYS.DIRECTIONS_CMC, "create");
  const canEdit = hasPermission(user.role.permissionSet, MODULE_KEYS.DIRECTIONS_CMC, "edit");

  const directions = await prisma.proceduralDirection.findMany({
    where: { referenceId: kase.id },
    include: { responsibleParty: true },
    orderBy: [{ proceduralOrderNo: "desc" }, { createdAt: "asc" }],
  });

  // Mark date-bound directions overdue on read if their due date has passed
  // and no one has actioned them yet (the Section 5.18 escalation logic).
  const today = new Date();
  const effectiveStatus = (d: (typeof directions)[number]) =>
    d.status === "pending" && d.dueDate && d.dueDate < today ? "overdue" : d.status;

  return (
    <div className="space-y-6">
      <ErrorAlert message={searchParams.error} />
      <SuccessAlert message={searchParams.success} />

      <div className="card p-6">
        <h2 className="section-title mb-2">Procedural Order No. 1 Directions Tracker</h2>
        <p className="mb-4 text-xs text-slate-500">
          Each direction is individually due-dated and tracked to compliance or escalation (Module
          5.18), doubling as the Tribunal&apos;s own to-do list. Group by procedural-order number to
          see a later Order&apos;s variations against an earlier one.
        </p>
        {directions.length === 0 ? (
          <EmptyState title="No directions issued yet" />
        ) : (
          <div className="grid gap-4 md:grid-cols-4">
            {STATUS_COLUMNS.map(([status, label]) => (
              <div key={status}>
                <p className="mb-2 text-xs font-semibold uppercase text-slate-400">{label}</p>
                <div className="space-y-2">
                  {directions
                    .filter((d) => effectiveStatus(d) === status)
                    .map((d) => (
                      <div key={d.id} className="rounded-md border border-slate-200 bg-white p-3 text-xs">
                        <p className="font-medium text-slate-700">PO No. {d.proceduralOrderNo}{d.supersedesOrderNo ? ` (supersedes No. ${d.supersedesOrderNo})` : ""}</p>
                        <p className="mt-1 text-slate-600">{d.description}</p>
                        <p className="mt-1 text-slate-400">
                          {d.responsibleRole === "party" && d.responsibleParty ? d.responsibleParty.displayLabel : d.responsibleRole}
                          {d.dueDate ? ` · due ${d.dueDate.toLocaleDateString()}` : ""}
                        </p>
                        {d.phase !== "single" && <p className="mt-1 text-purple-700">Phase: {d.phase}</p>}
                        {canEdit && (
                          <form action={updateDirectionStatusAction} className="mt-2 flex items-center gap-1">
                            <input type="hidden" name="directionId" value={d.id} />
                            <input type="hidden" name="referenceId" value={kase.id} />
                            <select className="input py-0.5 text-xs" name="status" defaultValue={d.status}>
                              <option value="pending">pending</option>
                              <option value="complied">complied</option>
                              <option value="overdue">overdue</option>
                              <option value="varied">varied</option>
                            </select>
                            <button className="text-brand-700 hover:underline" type="submit">Save</button>
                          </form>
                        )}
                      </div>
                    ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {canCreate && (
        <div className="card p-6">
          <h2 className="section-title mb-4">Add a Direction</h2>
          <form action={createDirectionAction} className="grid gap-4 md:grid-cols-2">
            <input type="hidden" name="referenceId" value={kase.id} />
            <div>
              <label className="label" htmlFor="proceduralOrderNo">Procedural Order No.</label>
              <input className="input" id="proceduralOrderNo" name="proceduralOrderNo" type="number" min={1} defaultValue={1} required />
            </div>
            <div>
              <label className="label" htmlFor="supersedesOrderNo">Supersedes Order No. (if a variation)</label>
              <input className="input" id="supersedesOrderNo" name="supersedesOrderNo" type="number" min={1} />
            </div>
            <div className="md:col-span-2">
              <label className="label" htmlFor="description">Direction</label>
              <input className="input" id="description" name="description" required placeholder="e.g. Claimant to file Reply by [date]" />
            </div>
            <div>
              <label className="label" htmlFor="responsibleRole">Responsible</label>
              <select className="input" id="responsibleRole" name="responsibleRole" required>
                <option value="tribunal">Tribunal</option>
                <option value="party">A Party</option>
                <option value="counsel">Counsel</option>
                <option value="registrar">Registrar</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="label" htmlFor="responsiblePartyId">If a Party, which one</label>
              <select className="input" id="responsiblePartyId" name="responsiblePartyId" defaultValue="">
                <option value="">-</option>
                {kase.parties.map((p) => (
                  <option key={p.id} value={p.id}>{p.displayLabel}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="dueDate">Due date</label>
              <input className="input" id="dueDate" name="dueDate" type="date" />
            </div>
            <div>
              <label className="label" htmlFor="phase">Phase (bifurcation/trifurcation)</label>
              <select className="input" id="phase" name="phase" defaultValue="single">
                <option value="single">Single (not bifurcated)</option>
                <option value="jurisdiction">Jurisdiction</option>
                <option value="liability">Liability</option>
                <option value="quantum">Quantum</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <button className="btn-primary" type="submit">Add direction</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
