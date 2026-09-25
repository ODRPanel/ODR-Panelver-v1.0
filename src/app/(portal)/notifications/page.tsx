import { requireUser } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { EmptyState } from "@/components/ui/EmptyState";
import { markNotificationReadAction } from "@/actions/notifications";

export default async function NotificationsPage() {
  const user = await requireUser();

  const notifications = await prisma.notification.findMany({
    where: { recipientUserId: user.id },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { reference: true },
  });

  return (
    <div className="space-y-6">
      <h1 className="page-title">Notification Centre</h1>
      <p className="text-sm text-slate-500">
        A single inbox consolidating filing alerts, hearing reminders, deadline countdowns and
        escalations across every Reference (Annexure B, Section 1.1).
      </p>
      {notifications.length === 0 ? (
        <EmptyState title="No notifications yet" />
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => (
            <div
              key={n.id}
              className={`card flex items-start justify-between p-4 ${n.readAt ? "opacity-60" : ""}`}
            >
              <div>
                <p className="text-sm font-medium text-slate-800">{n.subject}</p>
                <p className="text-sm text-slate-500">{n.body}</p>
                <p className="mt-1 text-xs text-slate-400">
                  {n.reference?.referenceNumber ? `${n.reference.referenceNumber} · ` : ""}
                  {n.channel.replace(/_/g, " ")} &middot; {n.createdAt.toLocaleString()}
                </p>
              </div>
              {!n.readAt && (
                <form action={markNotificationReadAction}>
                  <input type="hidden" name="id" value={n.id} />
                  <button className="text-xs font-medium text-brand-700 hover:underline" type="submit">
                    Mark read
                  </button>
                </form>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
