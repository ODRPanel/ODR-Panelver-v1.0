import { deadlineUrgency } from "@/lib/jurisdictionEngine";

const URGENCY_STYLES: Record<string, string> = {
  neutral: "bg-slate-100 text-slate-700 border-slate-200",
  amber: "bg-amber-100 text-amber-900 border-amber-300",
  red: "bg-red-100 text-red-900 border-red-300",
};

/** Persistent, non-dismissible countdown banner (Annexure B, Section 1.1:
 * "Deadline visibility"), escalating neutral -> amber -> red as the
 * applicable timeline clock/target approaches (Section 1.3). */
export function DeadlineBanner({
  label,
  daysRemaining,
  deadlineDate,
}: {
  label: string;
  daysRemaining: number | null;
  deadlineDate: Date | null;
}) {
  if (daysRemaining === null || !deadlineDate) return null;
  const urgency = deadlineUrgency(daysRemaining);
  const style = URGENCY_STYLES[urgency] ?? URGENCY_STYLES.neutral;

  return (
    <div className={`flex items-center justify-between rounded-md border px-4 py-2 text-sm font-medium ${style}`}>
      <span>{label}</span>
      <span>
        {daysRemaining < 0
          ? `Overdue by ${Math.abs(daysRemaining)} day(s)`
          : `${daysRemaining} day(s) remaining`}{" "}
        &middot; {deadlineDate.toLocaleDateString()}
      </span>
    </div>
  );
}
