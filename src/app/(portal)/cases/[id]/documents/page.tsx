import { requireUser } from "@/lib/rbac";
import { getCaseForUserOr404 } from "@/lib/queries";
import { prisma } from "@/lib/prisma";
import { hasPermission, MODULE_KEYS } from "@/lib/permissions";
import { uploadGeneralDocumentAction, toggleTranslationCertifiedAction } from "@/actions/document";
import { ErrorAlert, SuccessAlert } from "@/components/ui/Alert";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";

export default async function DocumentsPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { error?: string; success?: string };
}) {
  const user = await requireUser();
  const kase = await getCaseForUserOr404(params.id, user);
  const canCreate = hasPermission(user.role.permissionSet, MODULE_KEYS.DOCUMENT_REPOSITORY, "create");
  const canEdit = hasPermission(user.role.permissionSet, MODULE_KEYS.DOCUMENT_REPOSITORY, "edit");

  const documents = await prisma.documentRepositoryItem.findMany({
    where: { referenceId: kase.id },
    include: { uploadedByUser: true },
    orderBy: { uploadedAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <ErrorAlert message={searchParams.error} />
      <SuccessAlert message={searchParams.success} />

      <div className="card overflow-x-auto p-6">
        <h2 className="section-title mb-4">Document Repository ({documents.length})</h2>
        {documents.length === 0 ? (
          <EmptyState title="No documents yet" />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-400">
                <th className="pb-2 pr-4">File</th>
                <th className="pb-2 pr-4">Category</th>
                <th className="pb-2 pr-4">Uploaded by</th>
                <th className="pb-2 pr-4">Confidential</th>
                <th className="pb-2">Translation certified</th>
              </tr>
            </thead>
            <tbody>
              {documents.map((d) => (
                <tr key={d.id} className="border-b border-slate-100">
                  <td className="py-2 pr-4">
                    <a href={`/api/documents/${d.id}`} className="font-medium text-brand-700 hover:underline" target="_blank" rel="noreferrer">
                      {d.fileName}
                    </a>
                    <p className="text-xs text-slate-400">{(d.sizeBytes / 1024).toFixed(1)} KB</p>
                  </td>
                  <td className="py-2 pr-4 text-xs">{d.category}</td>
                  <td className="py-2 pr-4 text-xs">{d.uploadedByUser.fullName}</td>
                  <td className="py-2 pr-4">{d.confidentialityFlag ? <Badge color="amber">Confidential</Badge> : <Badge>Open</Badge>}</td>
                  <td className="py-2">
                    {canEdit ? (
                      <form action={toggleTranslationCertifiedAction}>
                        <input type="hidden" name="documentId" value={d.id} />
                        <input type="hidden" name="referenceId" value={kase.id} />
                        <button className="text-xs font-medium text-brand-700 hover:underline" type="submit">
                          {d.translationCertified ? "Certified (click to unset)" : "Mark certified"}
                        </button>
                      </form>
                    ) : (
                      d.translationCertified ? "Yes" : "No"
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
          <h2 className="section-title mb-4">Upload a Document</h2>
          <form action={uploadGeneralDocumentAction} className="flex flex-wrap items-end gap-4" encType="multipart/form-data">
            <input type="hidden" name="referenceId" value={kase.id} />
            <div>
              <label className="label" htmlFor="file">File</label>
              <input className="input" id="file" name="file" type="file" required />
            </div>
            <div className="flex items-center gap-2 pb-2">
              <input id="confidentialityFlag" name="confidentialityFlag" type="checkbox" defaultChecked />
              <label htmlFor="confidentialityFlag" className="text-sm text-slate-700">Confidential</label>
            </div>
            <button className="btn-primary" type="submit">Upload</button>
          </form>
        </div>
      )}
    </div>
  );
}
