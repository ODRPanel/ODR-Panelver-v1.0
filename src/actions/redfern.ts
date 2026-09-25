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

const createRowSchema = z.object({
  referenceId: z.string().uuid(),
  documentsRequested: z.string().min(2, "Describe the document(s)/category requested."),
  requestingReasons: z.string().min(2, "Enter the reasons why it is relevant and material."),
});

export async function createRedfernRowAction(formData: FormData) {
  const user = await requireSessionUser();
  const parsed = createRowSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) errorRedirect("/cases", parsed.error.issues[0]?.message ?? "Invalid input.");

  await requirePermission(user, MODULE_KEYS.REDFERN_SCHEDULE, "create", parsed.data.referenceId);

  const rowCount = await prisma.redfernScheduleRow.count({ where: { referenceId: parsed.data.referenceId } });

  await prisma.redfernScheduleRow.create({
    data: {
      referenceId: parsed.data.referenceId,
      rowNo: rowCount + 1,
      documentsRequested: parsed.data.documentsRequested,
      requestingReasons: parsed.data.requestingReasons,
      tribunalDecision: "pending",
    },
  });

  await writeAudit({ action: "redfern.row_created", actorUserId: user.id, referenceId: parsed.data.referenceId });
  revalidatePath(`/cases/${parsed.data.referenceId}/redfern`);
  successRedirect(`/cases/${parsed.data.referenceId}/redfern`, "Row added.");
}

const objectionSchema = z.object({ rowId: z.string().uuid(), referenceId: z.string().uuid(), respondingObjection: z.string().min(1) });

export async function addRedfernObjectionAction(formData: FormData) {
  const user = await requireSessionUser();
  const parsed = objectionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) errorRedirect("/cases", "Invalid input.");

  await requirePermission(user, MODULE_KEYS.REDFERN_SCHEDULE, "create", parsed.data.referenceId);
  await prisma.redfernScheduleRow.update({ where: { id: parsed.data.rowId }, data: { respondingObjection: parsed.data.respondingObjection } });
  await writeAudit({ action: "redfern.objection_added", actorUserId: user.id, referenceId: parsed.data.referenceId, entityId: parsed.data.rowId });
  revalidatePath(`/cases/${parsed.data.referenceId}/redfern`);
}

const replySchema = z.object({ rowId: z.string().uuid(), referenceId: z.string().uuid(), requestingReply: z.string().min(1) });

export async function addRedfernReplyAction(formData: FormData) {
  const user = await requireSessionUser();
  const parsed = replySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) errorRedirect("/cases", "Invalid input.");

  await requirePermission(user, MODULE_KEYS.REDFERN_SCHEDULE, "create", parsed.data.referenceId);
  await prisma.redfernScheduleRow.update({ where: { id: parsed.data.rowId }, data: { requestingReply: parsed.data.requestingReply } });
  await writeAudit({ action: "redfern.reply_added", actorUserId: user.id, referenceId: parsed.data.referenceId, entityId: parsed.data.rowId });
  revalidatePath(`/cases/${parsed.data.referenceId}/redfern`);
}

const decideSchema = z.object({
  rowId: z.string().uuid(),
  referenceId: z.string().uuid(),
  tribunalDecision: z.enum(["produce", "refuse", "produce_with_conditions"]),
  productionDueDate: z.string().optional(),
});

export async function decideRedfernRowAction(formData: FormData) {
  const user = await requireSessionUser();
  const parsed = decideSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) errorRedirect("/cases", parsed.error.issues[0]?.message ?? "Invalid input.");

  await requirePermission(user, MODULE_KEYS.REDFERN_SCHEDULE, "decide", parsed.data.referenceId);

  await prisma.redfernScheduleRow.update({
    where: { id: parsed.data.rowId },
    data: {
      tribunalDecision: parsed.data.tribunalDecision,
      productionDueDate:
        parsed.data.tribunalDecision !== "refuse" && parsed.data.productionDueDate
          ? new Date(parsed.data.productionDueDate)
          : null,
    },
  });

  await writeAudit({
    action: "redfern.decided",
    actorUserId: user.id,
    referenceId: parsed.data.referenceId,
    entityId: parsed.data.rowId,
    metadata: { tribunalDecision: parsed.data.tribunalDecision },
  });

  revalidatePath(`/cases/${parsed.data.referenceId}/redfern`);
}

const linkSchema = z.object({ rowId: z.string().uuid(), referenceId: z.string().uuid(), producedEvidenceId: z.string().uuid() });

export async function linkProducedEvidenceAction(formData: FormData) {
  const user = await requireSessionUser();
  const parsed = linkSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) errorRedirect("/cases", "Invalid input.");

  await requirePermission(user, MODULE_KEYS.REDFERN_SCHEDULE, "create", parsed.data.referenceId);
  await prisma.redfernScheduleRow.update({ where: { id: parsed.data.rowId }, data: { producedEvidenceId: parsed.data.producedEvidenceId } });
  await writeAudit({ action: "redfern.evidence_linked", actorUserId: user.id, referenceId: parsed.data.referenceId, entityId: parsed.data.rowId });
  revalidatePath(`/cases/${parsed.data.referenceId}/redfern`);
}
