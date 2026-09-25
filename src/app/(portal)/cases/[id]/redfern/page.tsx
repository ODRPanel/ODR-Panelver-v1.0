import { requireUser } from "@/lib/rbac";
import { getCaseForUserOr404 } from "@/lib/queries";
import { prisma } from "@/lib/prisma";
import { hasPermission, MODULE_KEYS } from "@/lib/permissions";
import {
  createRedfernRowAction,
  addRedfernObjectionAction,
  addRedfernReplyAction,
  decideRedfernRowAction,
} from "@/actions/redfern";
import { ErrorAlert, SuccessAlert } from "@/components/ui/Alert";
import { StatusBadge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";

export default async function RedfernSchedulePage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { error?: string; success?: string };
}) {
  const user = await requireUser();
  const kase = await getCaseForUserOr404(params.id, user);
  const canCreate = hasPermission(user.role.permissionSet, MODULE_KEYS.REDFERN_SCHEDULE, "create");
  const canDecide = hasPermission(user.role.permissionSet, MODULE_KEYS.REDFERN_SCHEDULE, "decide");

  const rows = await prisma.redfernScheduleRow.findMany({
    where: { referenceId: kase.id },
    orderBy: { rowNo: "asc" },
  });

  return (
    <div className="space-y-6">
      <ErrorAlert message={searchParams.error} />
      <SuccessAlert message={searchParams.success} />

      <div className="card overflow-x-auto p-6">
        <h2 className="section-title mb-2">Document Production / Discovery Schedule</h2>
        <p className="mb-4 text-xs text-slate-500">
          Redfern Schedule methodology (Module 5.21), consistent with Article 3 of the IBA Rules on
          the Taking of Evidence: request, objection, reply, Tribunal decision.
        </p>
        {rows.length === 0 ? (
          <EmptyState title="No rows yet" />
        ) : (
          <div className="space-y-4">
            {rows.map((r) => (
              <div key={r.id} className="rounded-md border border-slate-200 p-4 text-sm">
                <div className="flex items-center justify-between">
                  <p className="font-medium">Row {r.rowNo}: {r.documentsRequested}</p>
                  <StatusBadge status={r.tribunalDecision} />
                </div>
                <p className="mt-1 text-slate-600">Reasons: {r.requestingReasons}</p>
                {r.respondingObjection && <p className="mt-1 text-amber-700">Objection: {r.respondingObjection}</p>}
                {r.requestingReply && <p className="mt-1 text-slate-600">Reply: {r.requestingReply}</p>}
                {r.productionDueDate && <p className="mt-1 text-xs text-slate-500">Production due: {r.productionDueDate.toLocaleDateString()}</p>}

                {r.tribunalDecision === "pending" && (
                  <div className="mt-3 flex flex-wrap gap-4 border-t border-slate-100 pt-3">
                    {canCreate && !r.respondingObjection && (
                      <form action={addRedfernObjectionAction} className="flex items-center gap-2">
                        <input type="hidden" name="rowId" value={r.id} />
                        <input type="hidden" name="referenceId" value={kase.id} />
                        <input className="input py-1 text-xs" name="respondingObjection" placeholder="Objection" required />
                        <button className="text-xs font-medium text-amber-700 hover:underline" type="submit">Add objection</button>
                      </form>
                    )}
                    {canCreate && r.respondingObjection && !r.requestingReply && (
                      <form action={addRedfernReplyAction} className="flex items-center gap-2">
                        <input type="hidden" name="rowId" value={r.id} />
                        <input type="hidden" name="referenceId" value={kase.id} />
                        <input className="input py-1 text-xs" name="requestingReply" placeholder="Reply to objection" required />
                        <button className="text-xs font-medium text-brand-700 hover:underline" type="submit">Add reply</button>
                      </form>
                    )}
                    {canDecide && (
                      <form action={decideRedfernRowAction} className="flex flex-wrap items-center gap-2">
                        <input type="hidden" name="rowId" value={r.id} />
                        <input type="hidden" name="referenceId" value={kase.id} />
                        <select className="input py-1 text-xs" name="tribunalDecision" required>
                          <option value="produce">Produce</option>
                          <option value="refuse">Refuse</option>
                          <option value="produce_with_conditions">Produce with conditions</option>
                        </select>
                        <input className="input py-1 text-xs" name="productionDueDate" type="date" />
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
          <h2 className="section-title mb-4">Add a Request Row</h2>
          <form action={createRedfernRowAction} className="space-y-4">
            <input type="hidden" name="referenceId" value={kase.id} />
            <div>
              <label className="label" htmlFor="documentsRequested">Document(s) / category requested</label>
              <input className="input" id="documentsRequested" name="documentsRequested" required />
            </div>
            <div>
              <label className="label" htmlFor="requestingReasons">Reasons why relevant and material</label>
              <textarea className="input" id="requestingReasons" name="requestingReasons" rows={2} required />
            </div>
            <button className="btn-primary" type="submit">Add row</button>
          </form>
        </div>
      )}
    </div>
  );
}
