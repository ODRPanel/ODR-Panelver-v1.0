"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSessionUser, requirePermission } from "@/lib/rbac";
import { MODULE_KEYS } from "@/lib/permissions";
import { writeAudit } from "@/lib/audit";

function errorRedirect(path: string, message: string): never {
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}

const checklistSchema = z.object({
  referenceId: z.string().uuid(),
  dabDaabReferralEvidenced: z.coerce.boolean().optional(),
  noticeOfDissatisfactionEvidenced: z.coerce.boolean().optional(),
  coolingOffEvidenced: z.coerce.boolean().optional(),
});

export async function updateFidicChecklistAction(formData: FormData) {
  const user = await requireSessionUser();
  const raw = Object.fromEntries(formData);
  const parsed = checklistSchema.safeParse({
    ...raw,
    dabDaabReferralEvidenced: raw.dabDaabReferralEvidenced === "on",
    noticeOfDissatisfactionEvidenced: raw.noticeOfDissatisfactionEvidenced === "on",
    coolingOffEvidenced: raw.coolingOffEvidenced === "on",
  });
  if (!parsed.success) errorRedirect("/cases", "Invalid input.");

  await requirePermission(user, MODULE_KEYS.FIDIC, "edit", parsed.data.referenceId);

  await prisma.fIDICDisputeReferral.update({
    where: { referenceId: parsed.data.referenceId },
    data: {
      dabDaabReferralEvidenced: parsed.data.dabDaabReferralEvidenced ?? false,
      noticeOfDissatisfactionEvidenced: parsed.data.noticeOfDissatisfactionEvidenced ?? false,
      coolingOffEvidenced: parsed.data.coolingOffEvidenced ?? false,
    },
  });

  const anyGap =
    !parsed.data.dabDaabReferralEvidenced || !parsed.data.noticeOfDissatisfactionEvidenced || !parsed.data.coolingOffEvidenced;

  await writeAudit({
    action: "fidic.checklist_updated",
    actorUserId: user.id,
    referenceId: parsed.data.referenceId,
    metadata: { gapFlagged: anyGap },
  });

  revalidatePath(`/cases/${parsed.data.referenceId}/fidic`);
}

const logSchema = z.object({
  referenceId: z.string().uuid(),
  logType: z.enum(["engineerDeterminationLog", "dabDecisionLog", "eotClaimLog", "variationOrderLog"]),
  entryText: z.string().min(2, "Enter the log entry."),
});

export async function addFidicLogEntryAction(formData: FormData) {
  const user = await requireSessionUser();
  const parsed = logSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) errorRedirect("/cases", parsed.error.issues[0]?.message ?? "Invalid input.");

  await requirePermission(user, MODULE_KEYS.FIDIC, "edit", parsed.data.referenceId);

  const referral = await prisma.fIDICDisputeReferral.findUniqueOrThrow({ where: { referenceId: parsed.data.referenceId } });
  const currentLog = (referral[parsed.data.logType] as unknown as Array<Record<string, string>>) ?? [];
  const updatedLog = [...currentLog, { text: parsed.data.entryText, at: new Date().toISOString() }];

  await prisma.fIDICDisputeReferral.update({
    where: { referenceId: parsed.data.referenceId },
    data: { [parsed.data.logType]: updatedLog },
  });

  await writeAudit({
    action: "fidic.log_entry_added",
    actorUserId: user.id,
    referenceId: parsed.data.referenceId,
    metadata: { logType: parsed.data.logType },
  });

  revalidatePath(`/cases/${parsed.data.referenceId}/fidic`);
}
