import Link from "next/link";
import { requireUser } from "@/lib/rbac";
import { getCaseForUserOr404 } from "@/lib/queries";
import { prisma } from "@/lib/prisma";
import { hasPermission, MODULE_KEYS } from "@/lib/permissions";
import { draftOrderAction, recordSettlementAction } from "@/actions/order";
import { ErrorAlert, SuccessAlert } from "@/components/ui/Alert";
import { StatusBadge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";

export default async function OrdersPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { error?: string; success?: string };
}) {
  const user = await requireUser();
  const kase = await getCaseForUserOr404(params.id, user);
  const canCreate = hasPermission(user.role.permissionSet, MODULE_KEYS.ORDERS_AWARDS, "create");

  const [orders, settlements] = await Promise.all([
    prisma.order.findMany({ where: { referenceId: kase.id }, include: { draftedByUser: true }, orderBy: { createdAt: "desc" } }),
    prisma.settlement.findMany({ where: { referenceId: kase.id }, orderBy: { settledAt: "desc" } }),
  ]);

  const isMultiMember = kase.tribunal && kase.tribunal.compositionType !== "sole";

  return (
    <div className="space-y-6">
      <ErrorAlert message={searchParams.error} />
      <SuccessAlert message={searchParams.success} />

      <div className="card p-6">
        <h2 className="section-title mb-4">Orders, Directions &amp; Awards</h2>
        {orders.length === 0 ? (
          <EmptyState title="No Orders drafted yet" />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-400">
                <th className="pb-2 pr-4">Type</th>
                <th className="pb-2 pr-4">Title</th>
                <th className="pb-2 pr-4">Drafted by</th>
                <th className="pb-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} className="border-b border-slate-100">
                  <td className="py-2 pr-4 text-xs">{o.orderType.replace(/_/g, " ")}</td>
                  <td className="py-2 pr-4">
                    <Link href={`/cases/${kase.id}/orders/${o.id}`} className="font-medium text-brand-700 hover:underline">
                      {o.title}
                    </Link>
                  </td>
                  <td className="py-2 pr-4 text-xs">{o.draftedByUser.fullName}</td>
                  <td className="py-2"><StatusBadge status={o.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {isMultiMember && (
        <div className="card p-4 text-xs text-slate-500">
          This Reference has a {kase.tribunal?.compositionType.replace(/_/g, " ")} Tribunal - the Presiding
          Arbitrator may record the majority view and any dissent/separate opinion when publishing an Award
          (Section 4.4/5.5 of the SOW/SRS).
        </div>
      )}

      <div className="card p-6">
        <h2 className="section-title mb-4">Settlements</h2>
        {settlements.length === 0 ? (
          <p className="text-sm text-slate-500">No settlement recorded.</p>
        ) : (
          <ul className="mb-4 space-y-1 text-sm">
            {settlements.map((s) => (
              <li key={s.id}>
                {s.description} <span className="text-xs text-slate-400">({s.settledAt.toLocaleDateString()})</span>
              </li>
            ))}
          </ul>
        )}
        {canCreate && (
          <form action={recordSettlementAction} className="flex items-center gap-2">
            <input type="hidden" name="referenceId" value={kase.id} />
            <input className="input" name="description" placeholder="Settlement terms summary" required />
            <button className="btn-secondary" type="submit">Record settlement</button>
          </form>
        )}
      </div>

      {canCreate && (
        <div className="card p-6">
          <h2 className="section-title mb-4">Draft an Order / Direction / Award</h2>
          <form action={draftOrderAction} className="space-y-4">
            <input type="hidden" name="referenceId" value={kase.id} />
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="label" htmlFor="orderType">Type</label>
                <select className="input" id="orderType" name="orderType" required>
                  <option value="procedural">Procedural Order</option>
                  <option value="interim">Interim Order</option>
                  <option value="award">Award</option>
                  <option value="consent_award">Consent Award</option>
                  <option value="correction">Correction</option>
                  <option value="interpretation">Interpretation</option>
                  <option value="additional_award">Additional Award</option>
                </select>
              </div>
              <div>
                <label className="label" htmlFor="title">Title</label>
                <input className="input" id="title" name="title" required />
              </div>
            </div>
            <div>
              <label className="label" htmlFor="contentText">Draft content</label>
              <textarea className="input" id="contentText" name="contentText" rows={6} required />
            </div>
            <button className="btn-primary" type="submit">Save draft</button>
          </form>
        </div>
      )}
    </div>
  );
}
