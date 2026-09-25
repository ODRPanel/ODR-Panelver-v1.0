import { requireUser, requirePermission } from "@/lib/rbac";
import { MODULE_KEYS } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { createCustomTemplateAction } from "@/actions/template";
import { ErrorAlert, SuccessAlert } from "@/components/ui/Alert";

export default async function AdminTemplatesPage({
  searchParams,
}: {
  searchParams: { error?: string; success?: string };
}) {
  const user = await requireUser();
  await requirePermission(user, MODULE_KEYS.TEMPLATES, "create");

  const [templates, profiles] = await Promise.all([
    prisma.template.findMany({ orderBy: { title: "asc" } }),
    prisma.jurisdictionProfile.findMany({ orderBy: { displayName: "asc" } }),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="page-title">Template Library Administration</h1>
      <p className="text-sm text-slate-500">
        An Institution or Client may add its own house-style template within a profile,
        version-controlled separately from the Platform&apos;s own default templates (Section 5.19).
      </p>
      <ErrorAlert message={searchParams.error} />
      <SuccessAlert message={searchParams.success} />

      <div className="card overflow-x-auto p-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-400">
              <th className="pb-2 pr-4">Title</th>
              <th className="pb-2 pr-4">Type</th>
              <th className="pb-2">Profile</th>
            </tr>
          </thead>
          <tbody>
            {templates.map((t) => (
              <tr key={t.id} className="border-b border-slate-100">
                <td className="py-2 pr-4">{t.title}</td>
                <td className="py-2 pr-4 text-xs">{t.templateType.replace(/_/g, " ")}</td>
                <td className="py-2 text-xs">{profiles.find((p) => p.id === t.jurisdictionProfileId)?.displayName ?? "All profiles"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card p-6">
        <h2 className="section-title mb-4">Add a Custom Template</h2>
        <form action={createCustomTemplateAction} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="label" htmlFor="templateType">Template type</label>
              <select className="input" id="templateType" name="templateType" required>
                <option value="notice_of_arbitration">Notice/Request for Arbitration</option>
                <option value="answer">Answer / Response</option>
                <option value="procedural_order_1">Procedural Order No. 1</option>
                <option value="terms_of_reference">Terms of Reference</option>
                <option value="institution_form">Institution form</option>
                <option value="custom">Custom</option>
              </select>
            </div>
            <div>
              <label className="label" htmlFor="jurisdictionProfileId">Scope to profile (optional)</label>
              <select className="input" id="jurisdictionProfileId" name="jurisdictionProfileId" defaultValue="">
                <option value="">All profiles</option>
                {profiles.map((p) => (
                  <option key={p.id} value={p.id}>{p.displayName}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="label" htmlFor="title">Title</label>
            <input className="input" id="title" name="title" required />
          </div>
          <div>
            <label className="label" htmlFor="bodyMarkup">
              Content (use {"{{reference_number}}"}, {"{{seat}}"}, {"{{claimant_name}}"}, {"{{respondent_name}}"}, {"{{tribunal_composition}}"} as merge fields)
            </label>
            <textarea className="input" id="bodyMarkup" name="bodyMarkup" rows={8} required />
          </div>
          <button className="btn-primary" type="submit">Add template</button>
        </form>
      </div>
    </div>
  );
}
