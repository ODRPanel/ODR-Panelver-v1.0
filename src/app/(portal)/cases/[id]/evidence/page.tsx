import { requireUser } from "@/lib/rbac";
import { getCaseForUserOr404 } from "@/lib/queries";
import { prisma } from "@/lib/prisma";
import { hasPermission, MODULE_KEYS } from "@/lib/permissions";
import { fileEvidenceAction, raiseObjectionAction, ruleOnObjectionAction } from "@/actions/evidence";
import { ErrorAlert, SuccessAlert } from "@/components/ui/Alert";
import { StatusBadge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";

export default async function EvidencePage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { error?: string; success?: string };
}) {
  const user = await requireUser();
  const kase = await getCaseForUserOr404(params.id, user);
  const canCreate = hasPermission(user.role.permissionSet, MODULE_KEYS.EVIDENCE, "create");
  const canEdit = hasPermission(user.role.permissionSet, MODULE_KEYS.EVIDENCE, "edit");
  const canDecide = hasPermission(user.role.permissionSet, MODULE_KEYS.EVIDENCE, "decide");

  const exhibits = await prisma.evidence.findMany({
    where: { referenceId: kase.id },
    include: { filedByUser: true, document: true },
    orderBy: { filedAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <ErrorAlert message={searchParams.error} />
      <SuccessAlert message={searchParams.success} />

      <div className="card p-6">
        <h2 className="section-title mb-4">Evidence / Exhibits</h2>
        {exhibits.length === 0 ? (
          <EmptyState title="No exhibits filed yet" />
        ) : (
          <div className="space-y-4">
            {exhibits.map((ex) => (
              <div key={ex.id} className="rounded-md border border-slate-200 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium">
                      {ex.exhibitNo} - {ex.title}{" "}
                      <span className="text-xs text-slate-400">({ex.evidenceCategory.replace(/_/g, " ")})</span>
                    </p>
                    <p className="text-xs text-slate-500">
                      Filed by {ex.filedByUser.fullName} &middot; hash {ex.integrityHash?.slice(0, 16)}...
                      {ex.document && (
                        <a href={`/api/documents/${ex.document.id}`} className="ml-2 text-brand-700 hover:underline" target="_blank" rel="noreferrer">
                          download
                        </a>
                      )}
                    </p>
                  </div>
                  <StatusBadge status={ex.objectionStatus} />
                </div>
                {ex.objectionText && <p className="mt-2 text-xs text-red-700">Objection: {ex.objectionText}</p>}
                {ex.rulingText && <p className="mt-1 text-xs text-emerald-700">Ruling: {ex.rulingText}</p>}

                <div className="mt-3 flex flex-wrap gap-4 border-t border-slate-100 pt-3">
                  {canEdit && ex.objectionStatus === "none" && (
                    <form action={raiseObjectionAction} className="flex items-center gap-2">
                      <input type="hidden" name="evidenceId" value={ex.id} />
                      <input type="hidden" name="referenceId" value={kase.id} />
                      <input className="input py-1 text-xs" name="objectionText" placeholder="Grounds of objection" required />
                      <button className="text-xs font-medium text-red-700 hover:underline" type="submit">Raise objection</button>
                    </form>
                  )}
                  {canDecide && ex.objectionStatus === "raised" && (
                    <form action={ruleOnObjectionAction} className="flex items-center gap-2">
                      <input type="hidden" name="evidenceId" value={ex.id} />
                      <input type="hidden" name="referenceId" value={kase.id} />
                      <input className="input py-1 text-xs" name="rulingText" placeholder="Tribunal's ruling" required />
                      <button className="text-xs font-medium text-emerald-700 hover:underline" type="submit">Record ruling</button>
                    </form>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {canCreate && (
        <div className="card p-6">
          <h2 className="section-title mb-4">File an Exhibit</h2>
          <form action={fileEvidenceAction} className="grid gap-4 md:grid-cols-2" encType="multipart/form-data">
            <input type="hidden" name="referenceId" value={kase.id} />
            <div>
              <label className="label" htmlFor="title">Title</label>
              <input className="input" id="title" name="title" required />
            </div>
            <div>
              <label className="label" htmlFor="evidenceCategory">Category</label>
              <select className="input" id="evidenceCategory" name="evidenceCategory" required>
                <option value="documentary">Documentary</option>
                <option value="expert_report">Expert report</option>
                <option value="witness_statement">Witness statement</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="label" htmlFor="file">File</label>
              <input className="input" id="file" name="file" type="file" required />
            </div>
            <div className="md:col-span-2">
              <button className="btn-primary" type="submit">File exhibit</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
