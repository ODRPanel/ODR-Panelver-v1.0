"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSessionUser, requirePermission } from "@/lib/rbac";
import { MODULE_KEYS } from "@/lib/permissions";
import { writeAudit } from "@/lib/audit";
import { getInterimApplicationTimeline } from "@/lib/jurisdictionEngine";
import { addDays } from "date-fns";

function errorRedirect(path: string, message: string): never {
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}
function successRedirect(path: string, message: string): never {
  redirect(`${path}?success=${encodeURIComponent(message)}`);
}

const fileSchema = z.object({
  referenceId: z.string().uuid(),
  title: z.string().min(2, "Enter a title."),
  description: z.string().min(2, "Describe the interim measure sought."),
  filedByPartyId: z.string().uuid("Select the filing Party."),
});

export async function fileInterimApplicationAction(formData: FormData) {
  const user = await requireSessionUser();
  const parsed = fileSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) errorRedirect("/cases", parsed.error.issues[0]?.message ?? "Invalid input.");

  await requirePermission(user, MODULE_KEYS.INTERIM_APPLICATIONS, "create", parsed.data.referenceId);

  const kase = await prisma.case.findUniqueOrThrow({
    where: { id: parsed.data.referenceId },
    include: { jurisdictionProfile: true },
  });
  const timeline = getInterimApplicationTimeline(kase.jurisdictionProfile);
  const now = new Date();

  const application = await prisma.interimApplication.create({
    data: {
      referenceId: parsed.data.referenceId,
      title: parsed.data.title,
      description: parsed.data.description,
      filedByPartyId: parsed.data.filedByPartyId,
      filedByUserId: user.id,
      oppositionDueAt: addDays(now, timeline.oppositionDays),
      decisionDueAt: addDays(now, timeline.decisionDays),
      decision: "pending",
    },
  });

  await writeAudit({
    action: "interim_application.filed",
    actorUserId: user.id,
    referenceId: parsed.data.referenceId,
    entityType: "InterimApplication",
    entityId: application.id,
  });

  revalidatePath(`/cases/${parsed.data.referenceId}/interim-applications`);
  successRedirect(`/cases/${parsed.data.referenceId}/interim-applications`, "Interim application filed with an expedited timeline.");
}

const oppositionSchema = z.object({
  applicationId: z.string().uuid(),
  referenceId: z.string().uuid(),
  oppositionText: z.string().min(2, "Enter the opposition."),
});

export async function fileOppositionAction(formData: FormData) {
  const user = await requireSessionUser();
  const parsed = oppositionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) errorRedirect("/cases", parsed.error.issues[0]?.message ?? "Invalid input.");

  await requirePermission(user, MODULE_KEYS.INTERIM_APPLICATIONS, "create", parsed.data.referenceId);

  await prisma.interimApplication.update({
    where: { id: parsed.data.applicationId },
    data: { oppositionText: parsed.data.oppositionText },
  });

  await writeAudit({ action: "interim_application.opposed", actorUserId: user.id, referenceId: parsed.data.referenceId, entityId: parsed.data.applicationId });
  revalidatePath(`/cases/${parsed.data.referenceId}/interim-applications`);
}

const decideSchema = z.object({
  applicationId: z.string().uuid(),
  referenceId: z.string().uuid(),
  decision: z.enum(["granted", "refused", "varied"]),
  decisionText: z.string().min(2, "Enter the Tribunal's decision."),
  securityAmount: z.string().optional(),
});

export async function decideInterimApplicationAction(formData: FormData) {
  const user = await requireSessionUser();
  const raw = Object.fromEntries(formData);
  const parsed = decideSchema.safeParse(raw);
  if (!parsed.success) errorRedirect("/cases", parsed.error.issues[0]?.message ?? "Invalid input.");

  await requirePermission(user, MODULE_KEYS.INTERIM_APPLICATIONS, "decide", parsed.data.referenceId);

  const application = await prisma.interimApplication.findUniqueOrThrow({ where: { id: parsed.data.applicationId } });
  const kase = await prisma.case.findUniqueOrThrow({ where: { id: parsed.data.referenceId } });

  let securityOrderedLedgerId: string | undefined;
  const securityAmount = parsed.data.securityAmount ? Number(parsed.data.securityAmount) : 0;
  if (securityAmount > 0) {
    const entry = await prisma.costLedgerEntry.create({
      data: {
        referenceId: parsed.data.referenceId,
        entryType: "security_for_costs",
        feeModel: "ad_hoc",
        payerAllocation: "apportioned_by_tribunal",
        amount: securityAmount,
        currency: kase.ledgerCurrency,
        description: `Security for costs ordered on interim application: ${application.title}`,
        raisedByUserId: user.id,
        status: "raised",
      },
    });
    securityOrderedLedgerId = entry.id;
  }

  await prisma.interimApplication.update({
    where: { id: parsed.data.applicationId },
    data: {
      decision: parsed.data.decision,
      decisionText: parsed.data.decisionText,
      decidedAt: new Date(),
      securityOrderedLedgerId,
    },
  });

  await writeAudit({
    action: "interim_application.decided",
    actorUserId: user.id,
    referenceId: parsed.data.referenceId,
    entityId: parsed.data.applicationId,
    metadata: { decision: parsed.data.decision, securityAmount },
  });

  revalidatePath(`/cases/${parsed.data.referenceId}/interim-applications`);
  successRedirect(`/cases/${parsed.data.referenceId}/interim-applications`, "Decision recorded.");
}
