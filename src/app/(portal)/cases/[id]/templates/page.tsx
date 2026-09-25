import { requireUser } from "@/lib/rbac";
import { getCaseForUserOr404 } from "@/lib/queries";
import { prisma } from "@/lib/prisma";
import { hasPermission, MODULE_KEYS } from "@/lib/permissions";
import { instantiateTemplateAction } from "@/actions/template";
import { ErrorAlert, SuccessAlert } from "@/components/ui/Alert";
import { EmptyState } from "@/components/ui/EmptyState";

export default async function TemplatesPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { error?: string; success?: string };
}) {
  const user = await requireUser();
  const kase = await getCaseForUserOr404(params.id, user);
  const canCreate = hasPermission(user.role.permissionSet, MODULE_KEYS.TEMPLATES, "create");

  // Scoped to the Reference's own Jurisdiction Rule Profile, plus
  // Platform-wide generic templates (Section 5.19).
  const templates = await prisma.template.findMany({
    where: { OR: [{ jurisdictionProfileId: kase.jurisdictionProfileId }, { jurisdictionProfileId: null }] },
    orderBy: { title: "asc" },
  });

  return (
    <div className="space-y-6">
      <ErrorAlert message={searchParams.error} />
      <SuccessAlert message={searchParams.success} />

      <div className="card p-6">
        <h2 className="section-title mb-2">Jurisdiction-Specific Template Library</h2>
        <p className="mb-4 text-xs text-slate-500">
          Templates are filtered to this Reference&apos;s Jurisdiction Rule Profile ({kase.jurisdictionProfile.displayName})
          so only the relevant forms are offered (Module 5.19). Selecting one auto-populates known
          Reference fields and opens as a new draft Order/Direction.
        </p>
        {templates.length === 0 ? (
          <EmptyState title="No templates available" />
        ) : (
          <div className="space-y-3">
            {templates.map((t) => (
              <div key={t.id} className="flex items-center justify-between rounded-md border border-slate-200 p-3">
                <div>
                  <p className="font-medium text-sm">{t.title}</p>
                  <p className="text-xs text-slate-400">{t.templateType.replace(/_/g, " ")} &middot; v{t.versionNo}</p>
                </div>
                {canCreate && (
                  <form action={instantiateTemplateAction}>
                    <input type="hidden" name="referenceId" value={kase.id} />
                    <input type="hidden" name="templateId" value={t.id} />
                    <button className="btn-secondary" type="submit">Use template</button>
                  </form>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
