import { requireUser, requirePermission } from "@/lib/rbac";
import { MODULE_KEYS } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { createCaseAction } from "@/actions/case";
import { JurisdictionProfileSelect } from "@/components/JurisdictionProfileSelect";
import { ErrorAlert } from "@/components/ui/Alert";

export default async function NewCasePage({ searchParams }: { searchParams: { error?: string } }) {
  const user = await requireUser();
  await requirePermission(user, MODULE_KEYS.CASE_INITIATION, "create");

  const profiles = await prisma.jurisdictionProfile.findMany({ orderBy: { displayName: "asc" } });

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="page-title">Case Initiation</h1>
      <p className="text-sm text-slate-500">
        Case Initiation may be triggered by the Claimant/Party directly, by Counsel on behalf of a
        Client, or by an Arbitrator taking over case-management administration after appointment
        (Section 5.1 of the SOW/SRS).
      </p>
      <ErrorAlert message={searchParams.error} />

      <form action={createCaseAction} className="card space-y-4 p-6">
        <JurisdictionProfileSelect profiles={profiles} />

        <div>
          <label className="label" htmlFor="title">Case title / style of cause</label>
          <input className="input" id="title" name="title" required placeholder="e.g. ABC Constructions v. XYZ Developers" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label" htmlFor="type">Reference type</label>
            <select className="input" id="type" name="type" required>
              <option value="institutional">Institutional</option>
              <option value="ad_hoc">Ad hoc</option>
            </select>
          </div>
          <div>
            <label className="label" htmlFor="compositionType">Tribunal composition</label>
            <select className="input" id="compositionType" name="compositionType" required>
              <option value="sole">Sole Arbitrator</option>
              <option value="three_member">Three-member panel</option>
              <option value="five_member">Five-member panel</option>
              <option value="other_odd_number">Other odd number</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label" htmlFor="seat">Seat of arbitration</label>
            <input className="input" id="seat" name="seat" placeholder="e.g. New Delhi" />
          </div>
          <div>
            <label className="label" htmlFor="ledgerCurrency">Ledger currency (optional override)</label>
            <input className="input" id="ledgerCurrency" name="ledgerCurrency" maxLength={3} placeholder="Defaults from profile" />
          </div>
        </div>

        <button className="btn-primary w-full" type="submit">
          Create Reference
        </button>
      </form>
    </div>
  );
}
