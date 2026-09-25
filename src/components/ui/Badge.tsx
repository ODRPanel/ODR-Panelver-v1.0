const COLOR_MAP: Record<string, string> = {
  slate: "bg-slate-100 text-slate-700",
  blue: "bg-blue-100 text-blue-700",
  green: "bg-emerald-100 text-emerald-700",
  amber: "bg-amber-100 text-amber-800",
  red: "bg-red-100 text-red-700",
  purple: "bg-purple-100 text-purple-700",
};

export function Badge({
  children,
  color = "slate",
}: {
  children: React.ReactNode;
  color?: keyof typeof COLOR_MAP;
}) {
  return <span className={`badge ${COLOR_MAP[color] ?? COLOR_MAP.slate}`}>{children}</span>;
}

const STATUS_COLORS: Record<string, keyof typeof COLOR_MAP> = {
  draft: "slate",
  pending: "amber",
  filed: "blue",
  admitted: "green",
  rejected: "red",
  scheduled: "blue",
  completed: "green",
  adjourned: "amber",
  cancelled: "red",
  published: "green",
  raised: "slate",
  invoiced: "blue",
  paid: "green",
  disputed: "red",
  under_review: "amber",
  resolved: "green",
  none: "slate",
  ruled: "green",
  active: "green",
  suspended: "red",
  open: "amber",
  notified: "blue",
  closed: "green",
  granted: "green",
  refused: "red",
  varied: "amber",
  complied: "green",
  overdue: "red",
  produce: "green",
  refuse: "red",
  produce_with_conditions: "amber",
  constituted: "green",
  nominating: "amber",
  reconstituted: "purple",
};

export function StatusBadge({ status }: { status: string }) {
  const color = STATUS_COLORS[status] ?? "slate";
  return <Badge color={color}>{status.replace(/_/g, " ")}</Badge>;
}
