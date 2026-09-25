import { requireUser } from "@/lib/rbac";
import { getCaseForUserOr404 } from "@/lib/queries";
import { prisma } from "@/lib/prisma";
import { hasPermission, MODULE_KEYS } from "@/lib/permissions";
import { raiseFeeEntryAction, updateFeeEntryStatusAction } from "@/actions/costs";
import { ErrorAlert, SuccessAlert } from "@/components/ui/Alert";
import { StatusBadge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";

export default async function CostsPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { error?: string; success?: string };
}) {
  const user = await requireUser();
  const kase = await getCaseForUserOr404(params.id, user);
  const canCreate = hasPermission(user.role.permissionSet, MODULE_KEYS.COSTS_FEES, "create");
  const canEdit = hasPermission(user.role.permissionSet, MODULE_KEYS.COSTS_FEES, "edit");
  const canDecide = hasPermission(user.role.permissionSet, MODULE_KEYS.COSTS_FEES, "decide");

  const [entries, hearings] = await Promise.all([
    prisma.costLedgerEntry.findMany({ where: { referenceId: kase.id }, orderBy: { raisedAt: "desc" } }),
    prisma.hearing.findMany({ where: { referenceId: kase.id }, orderBy: { scheduledStart: "asc" } }),
  ]);

  const totalRaised = entries.reduce((sum, e) => sum + Number(e.amount), 0);
  const totalPaid = entries.filter((e) => e.status === "paid").reduce((sum, e) => sum + Number(e.amount), 0);

  return (
    <div className="space-y-6">
      <ErrorAlert message={searchParams.error} />
      <SuccessAlert message={searchParams.success} />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        <div className="card p-4">
          <p className="text-xs uppercase text-slate-400">Total raised</p>
          <p className="font-serif text-2xl font-bold">{kase.ledgerCurrency} {totalRaised.toLocaleString()}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs uppercase text-slate-400">Total paid</p>
          <p className="font-serif text-2xl font-bold">{kase.ledgerCurrency} {totalPaid.toLocaleString()}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs uppercase text-slate-400">Entries</p>
          <p className="font-serif text-2xl font-bold">{entries.length}</p>
        </div>
      </div>

      <div className="card overflow-x-auto p-6">
        <h2 className="section-title mb-4">Cost Ledger</h2>
        {entries.length === 0 ? (
          <EmptyState title="No ledger entries yet" />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-400">
                <th className="pb-2 pr-4">Type</th>
                <th className="pb-2 pr-4">Fee model</th>
                <th className="pb-2 pr-4">Payer</th>
                <th className="pb-2 pr-4">Amount</th>
                <th className="pb-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id} className="border-b border-slate-100">
                  <td className="py-2 pr-4 text-xs">{e.entryType.replace(/_/g, " ")}</td>
                  <td className="py-2 pr-4 text-xs">{e.feeModel.replace(/_/g, " ")}</td>
                  <td className="py-2 pr-4 text-xs">{e.payerAllocation.replace(/_/g, " ")}</td>
                  <td className="py-2 pr-4 font-medium">{e.currency} {Number(e.amount).toLocaleString()}</td>
                  <td className="py-2">
                    {canEdit || canDecide ? (
                      <form action={updateFeeEntryStatusAction} className="flex items-center gap-2">
                        <input type="hidden" name="entryId" value={e.id} />
                        <input type="hidden" name="referenceId" value={kase.id} />
                        <select className="input py-1 text-xs" name="status" defaultValue={e.status}>
                          <option value="raised">raised</option>
                          <option value="invoiced">invoiced</option>
                          <option value="paid">paid</option>
                          {canDecide && <option value="disputed">disputed</option>}
                          {canDecide && <option value="under_review">under review</option>}
                          {canDecide && <option value="resolved">resolved</option>}
                        </select>
                        <button className="text-xs font-medium text-brand-700 hover:underline" type="submit">Save</button>
                      </form>
                    ) : (
                      <StatusBadge status={e.status} />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {canCreate && (
        <div className="card p-6">
          <h2 className="section-title mb-4">Raise a Ledger Entry</h2>
          <form action={raiseFeeEntryAction} className="grid gap-4 md:grid-cols-2">
            <input type="hidden" name="referenceId" value={kase.id} />
            <div>
              <label className="label" htmlFor="entryType">Entry type</label>
              <select className="input" id="entryType" name="entryType" required>
                <option value="fee">Fee</option>
                <option value="expense">Expense</option>
                <option value="escrow">Escrow</option>
                <option value="security_for_costs">Security for costs</option>
              </select>
            </div>
            <div>
              <label className="label" htmlFor="feeModel">Fee model</label>
              <select className="input" id="feeModel" name="feeModel" required>
                <option value="ad_valorem">Ad valorem</option>
                <option value="hourly">Hourly</option>
                <option value="per_sitting">Per sitting</option>
                <option value="fixed_lump_sum">Fixed / lump sum</option>
                <option value="ad_hoc">Ad hoc</option>
                <option value="institution_own">Institution&apos;s own</option>
              </select>
            </div>
            <div>
              <label className="label" htmlFor="payerAllocation">Payer allocation</label>
              <select className="input" id="payerAllocation" name="payerAllocation" required>
                <option value="claimant">Claimant</option>
                <option value="respondent">Respondent</option>
                <option value="shared_equally">Shared equally</option>
                <option value="apportioned_by_tribunal">Apportioned by Tribunal</option>
                <option value="costs_follow_event_pending">Costs follow the event (pending Award)</option>
              </select>
            </div>
            <div>
              <label className="label" htmlFor="linkedHearingId">Linked hearing (for per-sitting fees)</label>
              <select className="input" id="linkedHearingId" name="linkedHearingId" defaultValue="">
                <option value="">-</option>
                {hearings.map((h) => (
                  <option key={h.id} value={h.id}>{h.scheduledStart.toLocaleDateString()} - {h.hearingType}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="amount">Amount</label>
              <input className="input" id="amount" name="amount" type="number" step="0.01" min="0.01" required />
            </div>
            <div>
              <label className="label" htmlFor="currency">Currency</label>
              <input className="input" id="currency" name="currency" maxLength={3} defaultValue={kase.ledgerCurrency} required />
            </div>
            <div>
              <label className="label" htmlFor="escrowReference">Escrow reference (optional)</label>
              <input className="input" id="escrowReference" name="escrowReference" />
            </div>
            <div>
              <label className="label" htmlFor="description">Description</label>
              <input className="input" id="description" name="description" />
            </div>
            <div className="md:col-span-2">
              <button className="btn-primary" type="submit">Raise entry</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
