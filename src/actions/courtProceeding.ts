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
function successRedirect(path: string, message: string): never {
  redirect(`${path}?success=${encodeURIComponent(message)}`);
}

const createSchema = z.object({
  referenceId: z.string().uuid(),
  provisionType: z.enum([
    "interim_relief",
    "appointment",
    "evidence_assistance",
    "timeline_extension",
    "challenge_setaside",
    "enforcement",
    "appeal",
  ]),
  provisionReference: z.string().optional(),
  courtOrBody: z.string().min(2, "Enter the court or body."),
  courtCaseNo: z.string().optional(),
  nycArticleVGround: z.string().optional(),
  impactOnTimeline: z.string().optional(),
});

export async function createCourtProceedingAction(formData: FormData) {
  const user = await requireSessionUser();
  const parsed = createSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) errorRedirect("/cases", parsed.error.issues[0]?.message ?? "Invalid input.");

  await requirePermission(user, MODULE_KEYS.COURT_ENFORCEMENT, "create", parsed.data.referenceId);

  const proceeding = await prisma.courtProceeding.create({
    data: {
      referenceId: parsed.data.referenceId,
      provisionType: parsed.data.provisionType,
      provisionReference: parsed.data.provisionReference || null,
      courtOrBody: parsed.data.courtOrBody,
      courtCaseNo: parsed.data.courtCaseNo || null,
      nycArticleVGround: parsed.data.nycArticleVGround || null,
      impactOnTimeline: parsed.data.impactOnTimeline || null,
      status: "filed",
    },
  });

  await writeAudit({
    action: "court_proceeding.logged",
    actorUserId: user.id,
    referenceId: parsed.data.referenceId,
    entityType: "CourtProceeding",
    entityId: proceeding.id,
    metadata: { provisionType: parsed.data.provisionType },
  });

  revalidatePath(`/cases/${parsed.data.referenceId}/court-proceedings`);
  successRedirect(`/cases/${parsed.data.referenceId}/court-proceedings`, "Court/enforcement proceeding logged.");
}

const statusSchema = z.object({
  proceedingId: z.string().uuid(),
  referenceId: z.string().uuid(),
  status: z.enum(["filed", "pending", "disposed", "stayed"]),
});

export async function updateCourtProceedingStatusAction(formData: FormData) {
  const user = await requireSessionUser();
  const parsed = statusSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) errorRedirect("/cases", "Invalid input.");

  await requirePermission(user, MODULE_KEYS.COURT_ENFORCEMENT, "edit", parsed.data.referenceId);

  await prisma.courtProceeding.update({
    where: { id: parsed.data.proceedingId },
    data: {
      status: parsed.data.status,
      disposedAt: parsed.data.status === "disposed" ? new Date() : undefined,
    },
  });

  await writeAudit({
    action: "court_proceeding.status_changed",
    actorUserId: user.id,
    referenceId: parsed.data.referenceId,
    entityId: parsed.data.proceedingId,
    metadata: { status: parsed.data.status },
  });

  revalidatePath(`/cases/${parsed.data.referenceId}/court-proceedings`);
}
