import { requireUser, requirePermission } from "@/lib/rbac";
import { MODULE_KEYS, hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { createJurisdictionProfileAction } from "@/actions/admin";
import { ErrorAlert, SuccessAlert } from "@/components/ui/Alert";

export default async function JurisdictionProfilesPage({
  searchParams,
}: {
  searchParams: { error?: string; success?: string };
}) {
  const user = await requireUser();
  await requirePermission(user, MODULE_KEYS.ADMIN, "view");
  const canCreate = hasPermission(user.role.permissionSet, MODULE_KEYS.ADMIN, "create");

  const profiles = await prisma.jurisdictionProfile.findMany({ orderBy: { profileCode: "asc" } });

  return (
    <div className="space-y-6">
      <h1 className="page-title">Jurisdiction Rule Profile Administration</h1>
      <p className="text-sm text-slate-500">
        The Jurisdiction Rule Engine resolves the governing law, institution, disclosure standard,
        confidentiality default, timeline rule-set, fee schedule and data-residency region for
        every Reference from these records (Section 7.1 of the SOW/SRS). Adding a further
        jurisdiction is a configuration record, not a code change (Section 3.3).
      </p>
      <ErrorAlert message={searchParams.error} />
      <SuccessAlert message={searchParams.success} />

      <div className="grid gap-4 md:grid-cols-2">
        {profiles.map((p) => (
          <div key={p.id} className="card p-5">
            <div className="flex items-center justify-between">
              <h2 className="section-title">{p.displayName}</h2>
              <span className="badge bg-brand-100 text-brand-800">{p.profileCode}</span>
            </div>
            <dl className="mt-3 space-y-1 text-sm text-slate-600">
              <div><dt className="inline font-medium">Governing law: </dt><dd className="inline">{p.governingArbitrationLaw}</dd></div>
              <div><dt className="inline font-medium">Evidence regime: </dt><dd className="inline">{p.evidenceRegime}</dd></div>
              <div><dt className="inline font-medium">Confidentiality: </dt><dd className="inline">{p.confidentialityDefault.replace(/_/g, " ")}</dd></div>
              <div><dt className="inline font-medium">Default currency: </dt><dd className="inline">{p.defaultCurrency}</dd></div>
              <div><dt className="inline font-medium">Data residency: </dt><dd className="inline">{p.dataResidencyRegion}</dd></div>
              <div><dt className="inline font-medium">Data-protection law: </dt><dd className="inline">{p.applicableDataProtectionLaw}</dd></div>
              <div><dt className="inline font-medium">Breach notification: </dt><dd className="inline">{p.breachNotificationHours} hours</dd></div>
              <div><dt className="inline font-medium">RTL support: </dt><dd className="inline">{p.rtlSupport ? "Yes (Arabic)" : "No"}</dd></div>
            </dl>
          </div>
        ))}
      </div>

      {canCreate && (
        <div className="card p-6">
          <h2 className="section-title mb-4">Add a further jurisdiction (Section 3.3)</h2>
          <form action={createJurisdictionProfileAction} className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="label" htmlFor="profileCode">Profile code (short, e.g. HKIAC)</label>
              <input className="input" id="profileCode" name="profileCode" maxLength={10} required />
            </div>
            <div>
              <label className="label" htmlFor="displayName">Display name</label>
              <input className="input" id="displayName" name="displayName" required />
            </div>
            <div>
              <label className="label" htmlFor="governingArbitrationLaw">Governing arbitration law</label>
              <input className="input" id="governingArbitrationLaw" name="governingArbitrationLaw" required />
            </div>
            <div>
              <label className="label" htmlFor="evidenceRegime">Evidence regime</label>
              <input className="input" id="evidenceRegime" name="evidenceRegime" required />
            </div>
            <div>
              <label className="label" htmlFor="confidentialityDefault">Confidentiality default</label>
              <select className="input" id="confidentialityDefault" name="confidentialityDefault" required>
                <option value="confidential_by_default">Confidential by default</option>
                <option value="general_duty">General duty</option>
                <option value="no_default">No default</option>
              </select>
            </div>
            <div>
              <label className="label" htmlFor="feeScheduleType">Fee schedule type</label>
              <select className="input" id="feeScheduleType" name="feeScheduleType" required>
                <option value="ad_valorem">Ad valorem</option>
                <option value="hourly">Hourly</option>
                <option value="institution_own">Institution&apos;s own</option>
              </select>
            </div>
            <div>
              <label className="label" htmlFor="defaultCurrency">Default currency (ISO 4217)</label>
              <input className="input" id="defaultCurrency" name="defaultCurrency" maxLength={3} required />
            </div>
            <div>
              <label className="label" htmlFor="dataResidencyRegion">Data residency region</label>
              <input className="input" id="dataResidencyRegion" name="dataResidencyRegion" required />
            </div>
            <div>
              <label className="label" htmlFor="applicableDataProtectionLaw">Applicable data-protection law</label>
              <input className="input" id="applicableDataProtectionLaw" name="applicableDataProtectionLaw" required />
            </div>
            <div>
              <label className="label" htmlFor="breachNotificationHours">Breach notification target (hours)</label>
              <input className="input" id="breachNotificationHours" name="breachNotificationHours" type="number" min={1} defaultValue={72} required />
            </div>
            <div className="flex items-center gap-2 pt-6">
              <input id="rtlSupport" name="rtlSupport" type="checkbox" />
              <label htmlFor="rtlSupport" className="text-sm text-slate-700">Enable Arabic / RTL support</label>
            </div>
            <div className="md:col-span-2">
              <button className="btn-primary" type="submit">Add jurisdiction profile</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
