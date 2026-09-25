import Link from "next/link";
import { requireUser } from "@/lib/rbac";
import { getCaseForUserOr404 } from "@/lib/queries";
import { prisma } from "@/lib/prisma";
import { hasPermission, MODULE_KEYS } from "@/lib/permissions";
import { createCanvasWorkspaceAction } from "@/actions/canvas";
import { EmptyState } from "@/components/ui/EmptyState";

export default async function CanvasListPage({ params }: { params: { id: string } }) {
  const user = await requireUser();
  const kase = await getCaseForUserOr404(params.id, user);
  const canCreate = hasPermission(user.role.permissionSet, MODULE_KEYS.DOCUMENT_INTELLIGENCE, "create");

  const workspaces = await prisma.liquidTextWorkspace.findMany({
    where: { referenceId: kase.id },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="card p-6">
        <h2 className="section-title mb-2">Native Analysis Canvas</h2>
        <p className="mb-4 text-xs text-slate-500">
          A freeform, spatial workspace for excerpting and grouping document extracts, tagged to
          an issue or exhibit (Module 5.15(B)). LiquidText round-trip export/import is available
          within each workspace (5.15(A)).
        </p>
        {workspaces.length === 0 ? (
          <EmptyState title="No canvas workspaces yet" />
        ) : (
          <div className="space-y-2">
            {workspaces.map((w) => (
              <Link
                key={w.id}
                href={`/cases/${kase.id}/canvas/${w.id}`}
                className="block rounded-md border border-slate-200 p-3 text-sm hover:border-brand-300"
              >
                {w.title} <span className="text-xs text-slate-400">(v{w.versionNo})</span>
              </Link>
            ))}
          </div>
        )}
      </div>

      {canCreate && (
        <div className="card p-6">
          <h2 className="section-title mb-4">New Workspace</h2>
          <form action={createCanvasWorkspaceAction} className="flex items-center gap-2">
            <input type="hidden" name="referenceId" value={kase.id} />
            <input className="input" name="title" placeholder="Workspace title" required />
            <button className="btn-primary shrink-0" type="submit">Create</button>
          </form>
        </div>
      )}
    </div>
  );
}
