import { requireUser } from "@/lib/rbac";
import { getCaseForUserOr404 } from "@/lib/queries";
import { hasPermission, MODULE_KEYS } from "@/lib/permissions";
import { acceptConfidentialityAction, toggleFidicAction } from "@/actions/case";
import { InfoAlert } from "@/components/ui/Alert";

export default async function CaseOverviewPage({ params }: { params: { id: string } }) {
  const user = await requireUser();
  const kase = await getCaseForUserOr404(params.id, user);
  const canEdit = hasPermission(user.role.permissionSet, MODULE_KEYS.CASE_INITIATION, "edit");

  const tpfDisclosures = kase.parties.filter((p) => p.thirdPartyFunderDisclosed);

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="card p-6">
        <h2 className="section-title mb-4">Reference Details</h2>
        <dl className="space-y-2 text-sm">
          <Row label="Reference number" value={kase.referenceNumber} />
          <Row label="Type" value={kase.type} />
          <Row label="Seat" value={kase.seat ?? "Not yet fixed"} />
          <Row label="Ledger currency" value={kase.ledgerCurrency} />
          <Row label="Governing law" value={kase.jurisdictionProfile.governingArbitrationLaw} />
          <Row label="Confidentiality basis" value={kase.jurisdictionProfile.confidentialityDefault.replace(/_/g, " ")} />
          <Row label="Data residency" value={kase.jurisdictionProfile.dataResidencyRegion} />
        </dl>
      </div>

      <div className="space-y-6">
        <div className="card p-6">
          <h2 className="section-title mb-4">Confidentiality Undertaking</h2>
          {kase.confidentialityAccepted ? (
            <InfoAlert>The confidentiality undertaking for this Reference has been accepted.</InfoAlert>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-slate-500">
                This Reference&apos;s confidentiality basis ({kase.jurisdictionProfile.confidentialityDefault.replace(/_/g, " ")}) is fixed by its Jurisdiction Rule Profile (Section 3.1 of the SOW/SRS).
              </p>
              {canEdit && (
                <form action={acceptConfidentialityAction}>
                  <input type="hidden" name="referenceId" value={kase.id} />
                  <button className="btn-primary" type="submit">Accept confidentiality undertaking</button>
                </form>
              )}
            </div>
          )}
        </div>

        <div className="card p-6">
          <h2 className="section-title mb-4">FIDIC / Construction Dispute Support (Module 5.22)</h2>
          <p className="mb-3 text-sm text-slate-500">
            Feature-flagged per Reference - enable only where this arises under a FIDIC or
            comparable multi-tier dispute clause.
          </p>
          {canEdit ? (
            <form action={toggleFidicAction} className="flex items-center gap-3">
              <input type="hidden" name="referenceId" value={kase.id} />
              {!kase.fidicEnabled && (
                <input className="input" name="contractForm" placeholder="e.g. FIDIC Red Book" />
              )}
              <button className="btn-secondary" type="submit">
                {kase.fidicEnabled ? "Disable FIDIC module" : "Enable FIDIC module"}
              </button>
            </form>
          ) : (
            <p className="text-sm">{kase.fidicEnabled ? "Enabled" : "Disabled"}</p>
          )}
        </div>

        {tpfDisclosures.length > 0 && (
          <div className="card p-6">
            <h2 className="section-title mb-4">Third-Party Funding Disclosures</h2>
            <ul className="space-y-1 text-sm">
              {tpfDisclosures.map((p) => (
                <li key={p.id}>
                  <strong>{p.displayLabel}:</strong> {p.thirdPartyFunderDetails || "Disclosed, no further detail on record"}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-slate-100 pb-1">
      <dt className="text-slate-500">{label}</dt>
      <dd className="font-medium text-slate-800">{value}</dd>
    </div>
  );
}
