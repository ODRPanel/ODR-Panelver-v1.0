import { requireUser } from "@/lib/rbac";
import { getCaseForUserOr404 } from "@/lib/queries";
import { prisma } from "@/lib/prisma";
import { hasPermission, MODULE_KEYS } from "@/lib/permissions";
import {
  nominateArbitratorAction,
  recordDisclosureAction,
  confirmAppointmentAction,
} from "@/actions/case";
import { ErrorAlert, SuccessAlert } from "@/components/ui/Alert";
import { StatusBadge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";

const REQUIRED_COUNT: Record<string, number> = {
  sole: 1,
  three_member: 3,
  five_member: 5,
  other_odd_number: 99,
};

export default async function TribunalPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { error?: string; success?: string };
}) {
  const user = await requireUser();
  const kase = await getCaseForUserOr404(params.id, user);
  const canEdit = hasPermission(user.role.permissionSet, MODULE_KEYS.CASE_INITIATION, "edit");
  const canDecide = hasPermission(user.role.permissionSet, MODULE_KEYS.CASE_INITIATION, "decide");

  const arbitratorUsers = await prisma.user.findMany({
    where: { role: { name: { in: ["Arbitrator", "Emergency Arbitrator"] } }, status: "active" },
    orderBy: { fullName: "asc" },
  });

  const tribunal = kase.tribunal;
  const requiredCount = tribunal ? REQUIRED_COUNT[tribunal.compositionType] ?? 1 : 1;
  const canNominateMore = tribunal ? tribunal.members.length < requiredCount : false;

  return (
    <div className="space-y-6">
      <ErrorAlert message={searchParams.error} />
      <SuccessAlert message={searchParams.success} />

      <div className="card p-6">
        <div className="flex items-center justify-between">
          <h2 className="section-title">Tribunal Composition</h2>
          {tribunal && <StatusBadge status={tribunal.status} />}
        </div>
        <p className="mt-1 text-sm text-slate-500">
          {tribunal?.compositionType.replace(/_/g, " ")} &middot; {tribunal?.members.length ?? 0} of{" "}
          {requiredCount === 99 ? "?" : requiredCount} Arbitrator(s) nominated
        </p>

        {tribunal && tribunal.members.length === 0 ? (
          <div className="mt-4">
            <EmptyState title="No Arbitrators nominated yet" />
          </div>
        ) : (
          <table className="mt-4 w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-400">
                <th className="pb-2 pr-4">Arbitrator</th>
                <th className="pb-2 pr-4">Nomination source</th>
                <th className="pb-2 pr-4">Presiding</th>
                <th className="pb-2 pr-4">Disclosure</th>
                <th className="pb-2">Appointment</th>
              </tr>
            </thead>
            <tbody>
              {tribunal?.members.map((m) => (
                <tr key={m.id} className="border-b border-slate-100 align-top">
                  <td className="py-2 pr-4 font-medium">{m.arbitratorUser.fullName}</td>
                  <td className="py-2 pr-4 text-xs">{m.nominationSource.replace(/_/g, " ")}</td>
                  <td className="py-2 pr-4">{m.isPresiding ? "Yes" : "No"}</td>
                  <td className="py-2 pr-4 text-xs">
                    {m.disclosureFiledAt ? (
                      `Filed ${m.disclosureFiledAt.toLocaleDateString()}`
                    ) : canEdit ? (
                      <form action={recordDisclosureAction} className="space-y-1">
                        <input type="hidden" name="memberId" value={m.id} />
                        <input type="hidden" name="referenceId" value={kase.id} />
                        <input className="input text-xs" name="disclosureText" placeholder="Disclosure statement" />
                        <button className="text-xs font-medium text-brand-700 hover:underline" type="submit">
                          Record disclosure
                        </button>
                      </form>
                    ) : (
                      "Pending"
                    )}
                  </td>
                  <td className="py-2 text-xs">
                    {m.acceptedAt ? (
                      `Confirmed ${m.acceptedAt.toLocaleDateString()}`
                    ) : canDecide ? (
                      <form action={confirmAppointmentAction}>
                        <input type="hidden" name="memberId" value={m.id} />
                        <input type="hidden" name="referenceId" value={kase.id} />
                        <button className="text-xs font-medium text-brand-700 hover:underline" type="submit">
                          Confirm appointment
                        </button>
                      </form>
                    ) : (
                      "Awaiting Appointing Authority"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {canEdit && canNominateMore && (
        <div className="card p-6">
          <h2 className="section-title mb-4">Nominate an Arbitrator</h2>
          <p className="mb-3 text-xs text-slate-500">
            Standard sequence (Section 4.4): Claimant(s) nominate first, Respondent(s) nominate
            second, the two party-nominated Arbitrators nominate the Presiding Arbitrator. Failing
            a nomination, the Appointing Authority appoints in default.
          </p>
          <form action={nominateArbitratorAction} className="grid gap-4 md:grid-cols-2">
            <input type="hidden" name="referenceId" value={kase.id} />
            <div>
              <label className="label" htmlFor="arbitratorUserId">Arbitrator</label>
              <select className="input" id="arbitratorUserId" name="arbitratorUserId" required>
                {arbitratorUsers.map((u) => (
                  <option key={u.id} value={u.id}>{u.fullName} ({u.email})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="nominationSource">Nomination source</label>
              <select className="input" id="nominationSource" name="nominationSource" required>
                <option value="claimant_nominated">Claimant-nominated</option>
                <option value="respondent_nominated">Respondent-nominated</option>
                <option value="co_arbitrator_nominated">Co-arbitrator-nominated (Presiding)</option>
                <option value="institution_appointed">Institution-appointed (default)</option>
                <option value="party_agreed_sole">Party-agreed sole Arbitrator</option>
              </select>
            </div>
            <div>
              <label className="label" htmlFor="nominatedByPartyId">Nominated by Party (optional)</label>
              <select className="input" id="nominatedByPartyId" name="nominatedByPartyId" defaultValue="">
                <option value="">-</option>
                {kase.parties.map((p) => (
                  <option key={p.id} value={p.id}>{p.displayLabel}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2 pt-6">
              <input id="isPresiding" name="isPresiding" type="checkbox" />
              <label htmlFor="isPresiding" className="text-sm text-slate-700">This is the Presiding Arbitrator</label>
            </div>
            <div className="md:col-span-2">
              <button className="btn-primary" type="submit">Record nomination</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
