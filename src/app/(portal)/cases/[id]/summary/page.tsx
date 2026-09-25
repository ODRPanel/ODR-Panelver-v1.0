import { requireUser } from "@/lib/rbac";
import { getCaseForUserOr404 } from "@/lib/queries";
import { prisma } from "@/lib/prisma";
import { StatusBadge } from "@/components/ui/Badge";

export default async function CaseSummaryPage({ params }: { params: { id: string } }) {
  const user = await requireUser();
  const kase = await getCaseForUserOr404(params.id, user);

  const courtProceedings = await prisma.courtProceeding.findMany({
    where: { referenceId: kase.id },
    orderBy: { filedAt: "desc" },
  });

  return (
    <div className="mx-auto max-w-3xl space-y-6 print:max-w-full">
      <div className="flex items-center justify-between print:hidden">
        <p className="text-sm text-slate-500">
          Use your browser&apos;s Print (Ctrl/Cmd+P) and choose &quot;Save as PDF&quot; to export
          this one-page case summary for a hearing bundle or Client briefing (Module 5.23).
        </p>
      </div>

      <div className="card p-8 print:border-0 print:shadow-none">
        <h1 className="page-title">Case Master Information Panel</h1>
        <p className="text-sm text-slate-500">{kase.referenceNumber} - {kase.title}</p>

        <section className="mt-6">
          <h2 className="section-title mb-2">Reference</h2>
          <dl className="grid grid-cols-2 gap-2 text-sm">
            <Row label="Jurisdiction Rule Profile" value={kase.jurisdictionProfile.displayName} />
            <Row label="Type" value={kase.type} />
            <Row label="Seat" value={kase.seat ?? "Not yet fixed"} />
            <Row label="Competent court" value={kase.competentCourt ?? "Not yet fixed"} />
            <Row label="Status" value={kase.status} />
            <Row label="Ledger currency" value={kase.ledgerCurrency} />
          </dl>
        </section>

        <section className="mt-6">
          <h2 className="section-title mb-2">Tribunal Composition</h2>
          {kase.tribunal ? (
            <>
              <p className="text-sm">
                {kase.tribunal.compositionType.replace(/_/g, " ")} &middot; <StatusBadge status={kase.tribunal.status} />
              </p>
              <table className="mt-2 w-full text-sm">
                <tbody>
                  {kase.tribunal.members.map((m) => (
                    <tr key={m.id} className="border-b border-slate-100">
                      <td className="py-1 pr-4">{m.arbitratorUser.fullName}</td>
                      <td className="py-1 pr-4 text-xs text-slate-500">{m.nominationSource.replace(/_/g, " ")}</td>
                      <td className="py-1 text-xs">{m.isPresiding ? "Presiding" : ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          ) : (
            <p className="text-sm text-slate-500">Not yet constituted.</p>
          )}
        </section>

        <section className="mt-6">
          <h2 className="section-title mb-2">Contact Directory</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-400">
                <th className="py-1 pr-4">Designation</th>
                <th className="py-1 pr-4">Name</th>
                <th className="py-1 pr-4">Organisation</th>
                <th className="py-1">Contact</th>
              </tr>
            </thead>
            <tbody>
              {kase.parties.map((p) => (
                <tr key={p.id} className="border-b border-slate-100">
                  <td className="py-1 pr-4 font-medium">{p.displayLabel}</td>
                  <td className="py-1 pr-4">{p.fullName}</td>
                  <td className="py-1 pr-4">{p.organisation ?? "-"}</td>
                  <td className="py-1 text-xs">{p.email ?? "-"} {p.phone ? `· ${p.phone}` : ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="mt-6">
          <h2 className="section-title mb-2">Live Court-Order Status</h2>
          {courtProceedings.length === 0 ? (
            <p className="text-sm text-slate-500">No court orders affecting this arbitration are on record.</p>
          ) : (
            <table className="w-full text-sm">
              <tbody>
                {courtProceedings.map((p) => (
                  <tr key={p.id} className="border-b border-slate-100">
                    <td className="py-1 pr-4">{p.provisionType.replace(/_/g, " ")}</td>
                    <td className="py-1 pr-4">{p.courtOrBody}</td>
                    <td className="py-1"><StatusBadge status={p.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="col-span-1">
      <dt className="text-xs text-slate-400">{label}</dt>
      <dd className="font-medium text-slate-800">{value}</dd>
    </div>
  );
}
