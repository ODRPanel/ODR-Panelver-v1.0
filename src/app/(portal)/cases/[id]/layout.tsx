import { requireUser } from "@/lib/rbac";
import { getCaseForUserOr404 } from "@/lib/queries";
import { prisma } from "@/lib/prisma";
import { CaseSubNav } from "@/components/CaseSubNav";
import { CASE_NAV_ITEMS } from "@/lib/caseNav";
import { DeadlineBanner } from "@/components/ui/DeadlineBanner";
import { CaseMasterPanelStrip } from "@/components/CaseMasterPanelStrip";
import { computeTimelineDeadline, daysUntil, getTimelineRules } from "@/lib/jurisdictionEngine";
import { StatusBadge } from "@/components/ui/Badge";

export default async function CaseLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { id: string };
}) {
  const user = await requireUser();
  const kase = await getCaseForUserOr404(params.id, user);

  const deadline = kase.timelineDeadline ?? computeTimelineDeadline(kase.jurisdictionProfile, kase.timelineStartDate ?? kase.createdAt);
  const days = daysUntil(deadline);
  const rules = getTimelineRules(kase.jurisdictionProfile);

  const openCourtOrderCount = await prisma.courtProceeding.count({
    where: { referenceId: kase.id, status: { in: ["filed", "pending", "stayed"] } },
  });
  const tribunalLabel = kase.tribunal
    ? `${kase.tribunal.compositionType.replace(/_/g, " ")} - ${kase.tribunal.status}`
    : "not yet constituted";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="page-title">{kase.referenceNumber}</h1>
          <p className="text-sm text-slate-500">{kase.title}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="badge bg-brand-100 text-brand-800">{kase.jurisdictionProfile.displayName}</span>
          <StatusBadge status={kase.status} />
        </div>
      </div>

      <DeadlineBanner label={rules.label} daysRemaining={days} deadlineDate={deadline} />

      <CaseMasterPanelStrip
        caseId={kase.id}
        seat={kase.seat}
        competentCourt={kase.competentCourt}
        tribunalLabel={tribunalLabel}
        openCourtOrderCount={openCourtOrderCount}
      />

      <CaseSubNav caseId={kase.id} items={CASE_NAV_ITEMS} />

      <div>{children}</div>
    </div>
  );
}
