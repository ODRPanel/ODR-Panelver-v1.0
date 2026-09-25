import { requireUser } from "@/lib/rbac";
import { getCaseForUserOr404 } from "@/lib/queries";
import { prisma } from "@/lib/prisma";
import { hasPermission, MODULE_KEYS } from "@/lib/permissions";
import { addPartyAction } from "@/actions/case";
import { ErrorAlert, SuccessAlert } from "@/components/ui/Alert";
import { EmptyState } from "@/components/ui/EmptyState";

export default async function PartiesPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { error?: string; success?: string };
}) {
  const user = await requireUser();
  const kase = await getCaseForUserOr404(params.id, user);
  const canCreate = hasPermission(user.role.permissionSet, MODULE_KEYS.CASE_INITIATION, "create");

  const [partyUsers, counselUsers] = await Promise.all([
    prisma.user.findMany({ where: { role: { name: "Party" }, status: "active" }, orderBy: { fullName: "asc" } }),
    prisma.user.findMany({ where: { role: { name: "Counsel" }, status: "active" }, orderBy: { fullName: "asc" } }),
  ]);

  return (
    <div className="space-y-6">
      <ErrorAlert message={searchParams.error} />
      <SuccessAlert message={searchParams.success} />

      <div className="card p-6">
        <h2 className="section-title mb-4">Parties on this Reference</h2>
        {kase.parties.length === 0 ? (
          <EmptyState title="No Parties onboarded yet" />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-400">
                <th className="pb-2 pr-4">Designation</th>
                <th className="pb-2 pr-4">Name</th>
                <th className="pb-2 pr-4">Contact</th>
                <th className="pb-2">Third-party funding</th>
              </tr>
            </thead>
            <tbody>
              {kase.parties.map((p) => (
                <tr key={p.id} className="border-b border-slate-100">
                  <td className="py-2 pr-4 font-medium">{p.displayLabel}</td>
                  <td className="py-2 pr-4">
                    {p.fullName}
                    {p.organisation ? <span className="text-slate-400"> ({p.organisation})</span> : null}
                  </td>
                  <td className="py-2 pr-4 text-xs text-slate-500">
                    {p.email ?? "-"} {p.phone ? `· ${p.phone}` : ""}
                  </td>
                  <td className="py-2 text-xs">{p.thirdPartyFunderDisclosed ? "Disclosed" : "Not disclosed"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {canCreate && (
        <div className="card p-6">
          <h2 className="section-title mb-4">Onboard a Party</h2>
          <form action={addPartyAction} className="grid gap-4 md:grid-cols-2">
            <input type="hidden" name="referenceId" value={kase.id} />
            <div>
              <label className="label" htmlFor="designation">Designation (Section 4.3)</label>
              <select className="input" id="designation" name="designation" required>
                <option value="claimant">Claimant</option>
                <option value="applicant">Applicant</option>
                <option value="respondent">Respondent</option>
                <option value="counter_claimant">Counter-Claimant</option>
                <option value="cross_claimant">Cross-Claimant</option>
                <option value="cross_respondent">Cross-Respondent</option>
              </select>
              <p className="mt-1 text-xs text-slate-400">
                Numbering (e.g. &quot;Respondent 2&quot;) is computed automatically once more than one Party shares a designation.
              </p>
            </div>
            <div>
              <label className="label" htmlFor="fullName">Full name</label>
              <input className="input" id="fullName" name="fullName" required />
            </div>
            <div>
              <label className="label" htmlFor="organisation">Organisation</label>
              <input className="input" id="organisation" name="organisation" />
            </div>
            <div>
              <label className="label" htmlFor="email">Email</label>
              <input className="input" id="email" name="email" type="email" />
            </div>
            <div>
              <label className="label" htmlFor="phone">Phone</label>
              <input className="input" id="phone" name="phone" />
            </div>
            <div>
              <label className="label" htmlFor="postalAddress">Postal address</label>
              <input className="input" id="postalAddress" name="postalAddress" />
            </div>
            <div>
              <label className="label" htmlFor="partyUserId">Link to a Party login (optional)</label>
              <select className="input" id="partyUserId" name="partyUserId" defaultValue="">
                <option value="">No login yet</option>
                {partyUsers.map((u) => (
                  <option key={u.id} value={u.id}>{u.fullName} ({u.email})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="representedByCounselUserId">Represented by Counsel (optional)</label>
              <select className="input" id="representedByCounselUserId" name="representedByCounselUserId" defaultValue="">
                <option value="">Unrepresented</option>
                {counselUsers.map((u) => (
                  <option key={u.id} value={u.id}>{u.fullName} ({u.email})</option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2 flex items-center gap-2">
              <input id="thirdPartyFunderDisclosed" name="thirdPartyFunderDisclosed" type="checkbox" />
              <label htmlFor="thirdPartyFunderDisclosed" className="text-sm text-slate-700">
                Third-party funding disclosed for this Party
              </label>
            </div>
            <div className="md:col-span-2">
              <label className="label" htmlFor="thirdPartyFunderDetails">Funder details (if disclosed)</label>
              <input className="input" id="thirdPartyFunderDetails" name="thirdPartyFunderDetails" />
            </div>
            <div className="md:col-span-2">
              <button className="btn-primary" type="submit">Onboard Party</button>
            </div>
          </form>
          <p className="mt-3 text-xs text-slate-400">
            To give a Party or Counsel their own login, create the account first from
            Administration &rarr; User, Role &amp; Access Management, then select it here.
          </p>
        </div>
      )}
    </div>
  );
}
