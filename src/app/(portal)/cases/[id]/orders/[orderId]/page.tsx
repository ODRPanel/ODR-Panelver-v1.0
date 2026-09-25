import { notFound } from "next/navigation";
import { requireUser } from "@/lib/rbac";
import { getCaseForUserOr404 } from "@/lib/queries";
import { prisma } from "@/lib/prisma";
import { hasPermission, MODULE_KEYS } from "@/lib/permissions";
import { publishOrderAction } from "@/actions/order";
import { ErrorAlert, SuccessAlert } from "@/components/ui/Alert";
import { StatusBadge } from "@/components/ui/Badge";

export default async function OrderDetailPage({
  params,
  searchParams,
}: {
  params: { id: string; orderId: string };
  searchParams: { error?: string; success?: string };
}) {
  const user = await requireUser();
  const kase = await getCaseForUserOr404(params.id, user);
  const canPublish = hasPermission(user.role.permissionSet, MODULE_KEYS.ORDERS_AWARDS, "publish");

  const order = await prisma.order.findFirst({
    where: { id: params.orderId, referenceId: kase.id },
    include: { draftedByUser: true, publishedByUser: true },
  });
  if (!order) notFound();

  const isMultiMember = kase.tribunal && kase.tribunal.compositionType !== "sole";
  const isAwardType = order.orderType === "award" || order.orderType === "consent_award";

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <ErrorAlert message={searchParams.error} />
      <SuccessAlert message={searchParams.success} />

      <div className="card p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="section-title">{order.title}</h2>
            <p className="text-xs text-slate-400">{order.orderType.replace(/_/g, " ")} &middot; v{order.versionNo}</p>
          </div>
          <StatusBadge status={order.status} />
        </div>

        <pre className="mt-4 whitespace-pre-wrap rounded-md bg-slate-50 p-4 text-sm text-slate-700">{order.contentText}</pre>

        <dl className="mt-4 space-y-1 text-xs text-slate-500">
          <p>Drafted by {order.draftedByUser.fullName} on {order.createdAt.toLocaleString()}</p>
          {order.publishedByUser && (
            <p>Published by {order.publishedByUser.fullName} on {order.publishedAt?.toLocaleString()}</p>
          )}
          {order.aiAssisted && <p className="text-amber-700">AI-assisted drafting was used and disclosed for this document.</p>}
        </dl>

        {order.majorityText && (
          <div className="mt-4 rounded-md border border-slate-200 p-3 text-sm">
            <p className="font-medium">Majority view</p>
            <p className="text-slate-600">{order.majorityText}</p>
          </div>
        )}
        {order.dissentText && (
          <div className="mt-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm">
            <p className="font-medium">Dissent / separate opinion</p>
            <p className="text-slate-600">{order.dissentText}</p>
          </div>
        )}
      </div>

      {order.status === "draft" && canPublish && (
        <div className="card p-6">
          <h2 className="section-title mb-4">Publish</h2>
          <p className="mb-3 text-xs text-slate-500">
            Publish is restricted to the Arbitrator role at the service layer (Annexure B, Section
            3.10). Publishing applies an electronic signature and locks this document version.
          </p>
          <form action={publishOrderAction} className="space-y-4">
            <input type="hidden" name="orderId" value={order.id} />
            <input type="hidden" name="referenceId" value={kase.id} />
            {isMultiMember && isAwardType && (
              <>
                <div>
                  <label className="label" htmlFor="majorityText">Majority view</label>
                  <textarea className="input" id="majorityText" name="majorityText" rows={3} />
                </div>
                <div>
                  <label className="label" htmlFor="dissentText">Dissent / separate opinion (if any)</label>
                  <textarea className="input" id="dissentText" name="dissentText" rows={3} />
                </div>
              </>
            )}
            <button className="btn-primary" type="submit">Publish</button>
          </form>
        </div>
      )}
    </div>
  );
}
