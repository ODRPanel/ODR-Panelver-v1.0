import Link from "next/link";

/** Compact, persistent strip of the Case Master Information Panel (Module
 * 5.23), shown on every case screen via the case layout; the full
 * contact-directory + live court-order view lives at /summary (also
 * exportable there as a one-page PDF via the browser's Print dialog). */
export function CaseMasterPanelStrip({
  caseId,
  seat,
  competentCourt,
  tribunalLabel,
  openCourtOrderCount,
}: {
  caseId: string;
  seat: string | null;
  competentCourt: string | null;
  tribunalLabel: string;
  openCourtOrderCount: number;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-slate-200 bg-white px-4 py-2 text-xs text-slate-600">
      <div className="flex flex-wrap gap-4">
        <span><strong className="text-slate-400">Seat:</strong> {seat ?? "not yet fixed"}</span>
        <span><strong className="text-slate-400">Competent court:</strong> {competentCourt ?? "not yet fixed"}</span>
        <span><strong className="text-slate-400">Tribunal:</strong> {tribunalLabel}</span>
        {openCourtOrderCount > 0 && (
          <span className="font-medium text-amber-700">{openCourtOrderCount} open court proceeding(s)</span>
        )}
      </div>
      <Link href={`/cases/${caseId}/summary`} className="font-medium text-brand-700 hover:underline">
        Full Case Master Panel &rarr;
      </Link>
    </div>
  );
}
