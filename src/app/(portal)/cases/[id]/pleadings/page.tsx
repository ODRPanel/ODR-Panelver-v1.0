import { requireUser } from "@/lib/rbac";
import { getCaseForUserOr404 } from "@/lib/queries";
import { prisma } from "@/lib/prisma";
import { hasPermission, MODULE_KEYS } from "@/lib/permissions";
import { filePleadingAction, updatePleadingStatusAction } from "@/actions/pleading";
import { ErrorAlert, SuccessAlert } from "@/components/ui/Alert";
import { StatusBadge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";

const PLEADING_TYPES = [
  ["statement_of_claim", "Statement of Claim"],
  ["statement_of_defence", "Statement of Defence"],
  ["counter_claim", "Counter-Claim"],
  ["reply", "Reply"],
  ["rejoinder", "Rejoinder"],
  ["challenge_application", "Challenge Application (Section 12-13)"],
  ["application", "Application"],
  ["other", "Other"],
];

export default async function PleadingsPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { error?: string; success?: string };
}) {
  const user = await requireUser();
  const kase = await getCaseForUserOr404(params.id, user);
  const canCreate = hasPermission(user.role.permissionSet, MODULE_KEYS.PLEADINGS, "create");
  const canEdit = hasPermission(user.role.permissionSet, MODULE_KEYS.PLEADINGS, "edit");

  const pleadings = await prisma.pleading.findMany({
    where: { referenceId: kase.id },
    include: { filedByUser: true, document: true },
    orderBy: { filedAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <ErrorAlert message={searchParams.error} />
      <SuccessAlert message={searchParams.success} />

      <div className="card p-6">
        <h2 className="section-title mb-4">Pleadings on Record</h2>
        {pleadings.length === 0 ? (
          <EmptyState title="No pleadings filed yet" />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-400">
                <th className="pb-2 pr-4">Type</th>
                <th className="pb-2 pr-4">Title</th>
                <th className="pb-2 pr-4">Version</th>
                <th className="pb-2 pr-4">Filed by</th>
                <th className="pb-2 pr-4">Confidential</th>
                <th className="pb-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {pleadings.map((p) => (
                <tr key={p.id} className="border-b border-slate-100">
                  <td className="py-2 pr-4 text-xs">{p.pleadingType.replace(/_/g, " ")}</td>
                  <td className="py-2 pr-4 font-medium">
                    {p.title}
                    {p.document && (
                      <a href={`/api/documents/${p.document.id}`} className="ml-2 text-xs text-brand-700 hover:underline" target="_blank" rel="noreferrer">
                        download
                      </a>
                    )}
                  </td>
                  <td className="py-2 pr-4">v{p.versionNo}</td>
                  <td className="py-2 pr-4 text-xs">{p.filedByUser.fullName}</td>
                  <td className="py-2 pr-4 text-xs">{p.confidentialityFlag ? "Yes" : "No"}</td>
                  <td className="py-2">
                    {canEdit ? (
                      <form action={updatePleadingStatusAction} className="flex items-center gap-2">
                        <input type="hidden" name="pleadingId" value={p.id} />
                        <input type="hidden" name="referenceId" value={kase.id} />
                        <select className="input py-1 text-xs" name="status" defaultValue={p.status}>
                          <option value="draft">draft</option>
                          <option value="filed">filed</option>
                          <option value="admitted">admitted</option>
                          <option value="rejected">rejected</option>
                        </select>
                        <button className="text-xs font-medium text-brand-700 hover:underline" type="submit">Save</button>
                      </form>
                    ) : (
                      <StatusBadge status={p.status} />
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
          <h2 className="section-title mb-4">File a Pleading</h2>
          <form action={filePleadingAction} className="grid gap-4 md:grid-cols-2" encType="multipart/form-data">
            <input type="hidden" name="referenceId" value={kase.id} />
            <div>
              <label className="label" htmlFor="pleadingType">Pleading type</label>
              <select className="input" id="pleadingType" name="pleadingType" required>
                {PLEADING_TYPES.map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="title">Title</label>
              <input className="input" id="title" name="title" required />
            </div>
            <div className="md:col-span-2">
              <label className="label" htmlFor="file">Attach document (optional)</label>
              <input className="input" id="file" name="file" type="file" />
            </div>
            <div className="flex items-center gap-2">
              <input id="confidentialityFlag" name="confidentialityFlag" type="checkbox" defaultChecked />
              <label htmlFor="confidentialityFlag" className="text-sm text-slate-700">Confidential (Tribunal-only until otherwise directed)</label>
            </div>
            <div className="md:col-span-2">
              <button className="btn-primary" type="submit">File pleading</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
