import { requireUser } from "@/lib/rbac";
import { getCaseForUserOr404 } from "@/lib/queries";
import { prisma } from "@/lib/prisma";
import {
  sendCounselClientMessageAction,
  uploadCounselClientDocumentAction,
  promoteCounselClientDocumentAction,
} from "@/actions/counselClient";
import { ErrorAlert, InfoAlert } from "@/components/ui/Alert";
import { EmptyState } from "@/components/ui/EmptyState";

export default async function CounselClientPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { error?: string };
}) {
  const user = await requireUser();
  const kase = await getCaseForUserOr404(params.id, user);

  // This user's own privileged relationship(s) on this Reference, if any -
  // never another user's. No Tribunal/Registrar/opposing-side role can
  // reach this data through this page, since the query itself is scoped
  // to the current user's id on both sides of the relationship.
  const myParty = kase.parties.find((p) => p.representedByCounselUserId === user.id || p.partyUserId === user.id);

  if (!myParty || !myParty.representedByCounselUserId) {
    return (
      <div className="mx-auto max-w-xl">
        <InfoAlert>
          The Counsel-Client privileged channel (Module 5.20) is visible only to a Party&apos;s own
          Counsel of record and that Party&apos;s own login - not to the Tribunal, Registrar, other
          Parties or opposing Counsel. You do not have a privileged thread on this Reference.
        </InfoAlert>
      </div>
    );
  }

  const [messages, documents] = await Promise.all([
    prisma.counselClientMessage.findMany({
      where: { referenceId: kase.id, clientPartyId: myParty.id },
      orderBy: { sentAt: "asc" },
      include: { counselUser: true },
    }),
    prisma.counselClientDocument.findMany({
      where: { referenceId: kase.id, clientPartyId: myParty.id },
      orderBy: { uploadedAt: "desc" },
    }),
  ]);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <ErrorAlert message={searchParams.error} />
      <InfoAlert>
        Privileged space between Counsel and {myParty.displayLabel}. Never visible to the Tribunal,
        Registrar, other Parties or opposing Counsel.
      </InfoAlert>

      <div className="card p-6">
        <h2 className="section-title mb-4">Messages</h2>
        {messages.length === 0 ? (
          <EmptyState title="No messages yet" />
        ) : (
          <div className="space-y-3">
            {messages.map((m) => (
              <div key={m.id} className={`max-w-[80%] rounded-md p-3 text-sm ${m.counselUserId === user.id ? "ml-auto bg-brand-50" : "bg-slate-100"}`}>
                <p className="text-xs font-medium text-slate-500">{m.counselUserId === user.id ? "You (Counsel)" : m.counselUser.fullName}</p>
                <p>{m.body}</p>
                <p className="mt-1 text-[10px] text-slate-400">{m.sentAt.toLocaleString()}</p>
              </div>
            ))}
          </div>
        )}
        <form action={sendCounselClientMessageAction} className="mt-4 flex items-center gap-2">
          <input type="hidden" name="referenceId" value={kase.id} />
          <input type="hidden" name="clientPartyId" value={myParty.id} />
          <input className="input" name="body" placeholder="Type a message..." required />
          <button className="btn-primary shrink-0" type="submit">Send</button>
        </form>
      </div>

      <div className="card p-6">
        <h2 className="section-title mb-4">Privileged Documents</h2>
        {documents.length === 0 ? (
          <EmptyState title="No documents yet" />
        ) : (
          <div className="space-y-2">
            {documents.map((d) => (
              <div key={d.id} className="flex items-center justify-between rounded-md border border-slate-200 p-3 text-sm">
                <span>{d.fileName}</span>
                {d.promotedToRepositoryItemId ? (
                  <span className="text-xs text-emerald-700">Promoted to case record</span>
                ) : (
                  <form action={promoteCounselClientDocumentAction}>
                    <input type="hidden" name="documentId" value={d.id} />
                    <input type="hidden" name="referenceId" value={kase.id} />
                    <input type="hidden" name="clientPartyId" value={myParty.id} />
                    <button className="text-xs font-medium text-brand-700 hover:underline" type="submit">
                      Promote to Document Repository
                    </button>
                  </form>
                )}
              </div>
            ))}
          </div>
        )}
        <form action={uploadCounselClientDocumentAction} className="mt-4 flex items-center gap-2" encType="multipart/form-data">
          <input type="hidden" name="referenceId" value={kase.id} />
          <input type="hidden" name="clientPartyId" value={myParty.id} />
          <input className="input" name="file" type="file" required />
          <button className="btn-secondary shrink-0" type="submit">Upload</button>
        </form>
      </div>
    </div>
  );
}
