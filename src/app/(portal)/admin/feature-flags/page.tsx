import { requireUser, requirePermission } from "@/lib/rbac";
import { MODULE_KEYS, hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { createFeatureFlagAction, toggleFeatureFlagAction } from "@/actions/admin";
import { ErrorAlert, SuccessAlert } from "@/components/ui/Alert";

export default async function FeatureFlagsPage({
  searchParams,
}: {
  searchParams: { error?: string; success?: string };
}) {
  const user = await requireUser();
  await requirePermission(user, MODULE_KEYS.ADMIN, "view");
  const canEdit = hasPermission(user.role.permissionSet, MODULE_KEYS.ADMIN, "edit");

  const flags = await prisma.featureFlag.findMany({ orderBy: { key: "asc" } });

  return (
    <div className="space-y-6">
      <h1 className="page-title">Feature Flags &amp; Module Enablement</h1>
      <p className="text-sm text-slate-500">
        Every Phase-gated or Institution-specific module - the AI Layer, FIDIC/construction
        support, Document Intelligence - is individually toggleable per Institution or Reference
        (Section 8 of the SOW/SRS) without touching core-service code.
      </p>
      <ErrorAlert message={searchParams.error} />
      <SuccessAlert message={searchParams.success} />

      <div className="card p-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-400">
              <th className="pb-2">Key</th>
              <th className="pb-2">Scope</th>
              <th className="pb-2">Enabled</th>
              {canEdit && <th className="pb-2">Action</th>}
            </tr>
          </thead>
          <tbody>
            {flags.map((f) => (
              <tr key={f.id} className="border-b border-slate-100">
                <td className="py-2 font-medium">{f.key}</td>
                <td className="py-2">{f.scope}</td>
                <td className="py-2">{f.enabled ? "Yes" : "No"}</td>
                {canEdit && (
                  <td className="py-2">
                    <form action={toggleFeatureFlagAction}>
                      <input type="hidden" name="id" value={f.id} />
                      <button className="text-xs font-medium text-brand-700 hover:underline" type="submit">
                        {f.enabled ? "Disable" : "Enable"}
                      </button>
                    </form>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {canEdit && (
        <div className="card p-6">
          <h2 className="section-title mb-4">Add a feature flag</h2>
          <form action={createFeatureFlagAction} className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="label" htmlFor="key">Key (e.g. 5.16-ai-layer)</label>
              <input className="input" id="key" name="key" required />
            </div>
            <div>
              <label className="label" htmlFor="scope">Scope</label>
              <select className="input" id="scope" name="scope">
                <option value="platform">Platform-wide</option>
                <option value="institution">This institution</option>
              </select>
            </div>
            <div className="flex items-end">
              <button className="btn-primary" type="submit">Create</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
