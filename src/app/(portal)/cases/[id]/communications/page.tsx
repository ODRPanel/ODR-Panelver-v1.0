import { requireUser } from "@/lib/rbac";
import { getCaseForUserOr404 } from "@/lib/queries";
import { prisma } from "@/lib/prisma";
import { hasPermission, MODULE_KEYS } from "@/lib/permissions";
import { sendNoticeAction } from "@/actions/communication";
import { ErrorAlert, SuccessAlert } from "@/components/ui/Alert";
import { EmptyState } from "@/components/ui/EmptyState";

const CHANNELS: Array<[string, string]> = [
  ["in_platform", "In-Platform message"],
  ["email", "Email"],
  ["post", "Post / Courier"],
  ["whatsapp", "WhatsApp"],
  ["sms", "SMS"],
  ["process_server", "Process Server"],
];

export default async function CommunicationsPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { error?: string; success?: string };
}) {
  const user = await requireUser();
  const kase = await getCaseForUserOr404(params.id, user);
  const canCreate = hasPermission(user.role.permissionSet, MODULE_KEYS.COMMUNICATION, "create");

  const notifications = await prisma.notification.findMany({
    where: { referenceId: kase.id },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  // Group by dispatch batch (same subject+createdAt-minute) so multi-channel
  // sends show as one combined notice with a status per channel.
  const grouped = new Map<string, typeof notifications>();
  for (const n of notifications) {
    const key = `${n.recipientPartyId}|${n.subject}|${n.createdAt.toISOString().slice(0, 16)}`;
    grouped.set(key, [...(grouped.get(key) ?? []), n]);
  }

  return (
    <div className="space-y-6">
      <ErrorAlert message={searchParams.error} />
      <SuccessAlert message={searchParams.success} />

      <div className="card p-6">
        <h2 className="section-title mb-4">Notices Served</h2>
        {grouped.size === 0 ? (
          <EmptyState title="No notices sent yet" />
        ) : (
          <div className="space-y-3">
            {Array.from(grouped.values()).map((group) => {
              const party = kase.parties.find((p) => p.id === group[0].recipientPartyId);
              return (
                <div key={group[0].id} className="rounded-md border border-slate-200 p-3 text-sm">
                  <p className="font-medium">{group[0].subject}</p>
                  <p className="text-xs text-slate-500">To: {party?.displayLabel ?? "Unknown"} &middot; {group[0].body}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {group.map((n) => (
                      <span key={n.id} className="badge bg-slate-100 text-slate-600">
                        {n.channel.replace(/_/g, " ")}: {n.deliveredAt ? "delivered" : n.proofOfServiceRef ? "dispatched (external)" : "dispatched"}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {canCreate && (
        <div className="card p-6">
          <h2 className="section-title mb-4">Serve a Notice</h2>
          <form action={sendNoticeAction} className="space-y-4">
            <input type="hidden" name="referenceId" value={kase.id} />
            <div>
              <label className="label" htmlFor="recipientPartyId">Recipient</label>
              <select className="input" id="recipientPartyId" name="recipientPartyId" required>
                {kase.parties.map((p) => (
                  <option key={p.id} value={p.id}>{p.displayLabel} - {p.fullName}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="subject">Subject</label>
              <input className="input" id="subject" name="subject" required />
            </div>
            <div>
              <label className="label" htmlFor="body">Message</label>
              <textarea className="input" id="body" name="body" rows={3} required />
            </div>
            <fieldset>
              <legend className="label">Channel(s)</legend>
              <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
                {CHANNELS.map(([value, label]) => (
                  <label key={value} className="flex items-center gap-2 text-sm text-slate-700">
                    <input type="checkbox" name="channels" value={value} defaultChecked={value === "in_platform"} />
                    {label}
                  </label>
                ))}
              </div>
            </fieldset>
            <button className="btn-primary" type="submit">Dispatch notice</button>
          </form>
        </div>
      )}
    </div>
  );
}
