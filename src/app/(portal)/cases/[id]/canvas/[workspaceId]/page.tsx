import { notFound } from "next/navigation";
import { requireUser } from "@/lib/rbac";
import { getCaseForUserOr404 } from "@/lib/queries";
import { prisma } from "@/lib/prisma";
import { hasPermission, MODULE_KEYS } from "@/lib/permissions";
import { addCanvasCardAction, importCanvasAction, type CanvasCard } from "@/actions/canvas";
import { CanvasExportButton } from "@/components/CanvasExportButton";
import { ErrorAlert, SuccessAlert } from "@/components/ui/Alert";

export default async function CanvasWorkspacePage({
  params,
  searchParams,
}: {
  params: { id: string; workspaceId: string };
  searchParams: { error?: string; success?: string };
}) {
  const user = await requireUser();
  const kase = await getCaseForUserOr404(params.id, user);
  const canEdit = hasPermission(user.role.permissionSet, MODULE_KEYS.DOCUMENT_INTELLIGENCE, "edit");

  const workspace = await prisma.liquidTextWorkspace.findFirst({ where: { id: params.workspaceId, referenceId: kase.id } });
  if (!workspace) notFound();

  const cards = ((workspace.annotationLayer as unknown as { cards: CanvasCard[] }).cards ?? []);

  return (
    <div className="space-y-4">
      <ErrorAlert message={searchParams.error} />
      <SuccessAlert message={searchParams.success} />

      <div className="flex items-center justify-between">
        <h2 className="section-title">{workspace.title} <span className="text-xs text-slate-400">v{workspace.versionNo}</span></h2>
        <div className="flex gap-2">
          <CanvasExportButton workspaceId={workspace.id} referenceId={kase.id} />
          {canEdit && (
            <form action={importCanvasAction} className="flex items-center gap-2" encType="multipart/form-data">
              <input type="hidden" name="workspaceId" value={workspace.id} />
              <input type="hidden" name="referenceId" value={kase.id} />
              <input className="input py-1 text-xs" name="file" type="file" accept=".json" required />
              <button className="btn-secondary" type="submit">Import</button>
            </form>
          )}
        </div>
      </div>

      <div className="relative h-[500px] w-full overflow-auto rounded-lg border border-slate-200 bg-slate-50 p-2">
        {cards.length === 0 && (
          <p className="p-6 text-sm text-slate-400">No excerpt cards yet. Add one below - it will appear here, spatially positioned.</p>
        )}
        {cards.map((c) => (
          <div
            key={c.id}
            className="absolute w-56 rounded-md border border-amber-300 bg-amber-50 p-3 text-xs shadow-sm"
            style={{ left: c.x, top: c.y }}
          >
            {c.tag && <p className="mb-1 font-semibold text-amber-800">{c.tag}</p>}
            <p className="text-slate-700">{c.text}</p>
          </div>
        ))}
      </div>

      {canEdit && (
        <div className="card p-4">
          <form action={addCanvasCardAction} className="flex flex-wrap items-center gap-2">
            <input type="hidden" name="workspaceId" value={workspace.id} />
            <input type="hidden" name="referenceId" value={kase.id} />
            <input className="input" name="text" placeholder="Excerpt / note text" required />
            <input className="input w-40" name="tag" placeholder="Tag (e.g. Issue 2, Ex-4)" />
            <button className="btn-primary shrink-0" type="submit">Add card</button>
          </form>
        </div>
      )}
    </div>
  );
}
