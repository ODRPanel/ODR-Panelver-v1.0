"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSessionUser, requirePermission } from "@/lib/rbac";
import { MODULE_KEYS } from "@/lib/permissions";
import { writeAudit } from "@/lib/audit";
import { runAiAnalysis } from "@/lib/adapters/ai";

function errorRedirect(path: string, message: string): never {
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}

async function assertAiEnabled(referenceId: string) {
  const [platformFlag, kase] = await Promise.all([
    prisma.featureFlag.findFirst({ where: { key: "phase4-ai-layer", scope: "platform" } }),
    prisma.case.findUniqueOrThrow({ where: { id: referenceId } }),
  ]);
  if (!platformFlag?.enabled) {
    errorRedirect(`/cases/${referenceId}/ai`, "The AI Layer is withheld platform-wide pending the Phase 4 AI-governance sign-off (Section 11.4).");
  }
  if (!kase.aiEnabled) {
    errorRedirect(`/cases/${referenceId}/ai`, "The AI Layer is not enabled for this Reference.");
  }
}

const toggleSchema = z.object({ referenceId: z.string().uuid() });

export async function toggleAiEnabledAction(formData: FormData) {
  const user = await requireSessionUser();
  const parsed = toggleSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) errorRedirect("/cases", "Invalid input.");

  await requirePermission(user, MODULE_KEYS.CASE_INITIATION, "edit", parsed.data.referenceId);

  const platformFlag = await prisma.featureFlag.findFirst({ where: { key: "phase4-ai-layer", scope: "platform" } });
  if (!platformFlag?.enabled) {
    errorRedirect(`/cases/${parsed.data.referenceId}/ai`, "A Super Admin must enable the platform-wide AI Layer feature flag first.");
  }

  const kase = await prisma.case.findUniqueOrThrow({ where: { id: parsed.data.referenceId } });
  await prisma.case.update({ where: { id: kase.id }, data: { aiEnabled: !kase.aiEnabled } });
  await writeAudit({ action: "ai_layer.toggled", actorUserId: user.id, referenceId: kase.id, metadata: { enabled: !kase.aiEnabled } });
  revalidatePath(`/cases/${parsed.data.referenceId}/ai`);
}

const requestSchema = z.object({
  referenceId: z.string().uuid(),
  requestType: z.enum(["summary", "chronology", "draft_assist", "conflict_flag"]),
  inputDocumentIds: z.union([z.string(), z.array(z.string())]).optional(),
});

export async function requestAiAnalysisAction(formData: FormData) {
  const user = await requireSessionUser();
  await assertAiEnabled(String(formData.get("referenceId")));

  const inputDocumentIds = formData.getAll("inputDocumentIds").map(String);
  const parsed = requestSchema.safeParse({ ...Object.fromEntries(formData), inputDocumentIds });
  if (!parsed.success) errorRedirect("/cases", parsed.error.issues[0]?.message ?? "Invalid input.");

  await requirePermission(user, MODULE_KEYS.AI_LAYER, "create", parsed.data.referenceId);

  const kase = await prisma.case.findUniqueOrThrow({ where: { id: parsed.data.referenceId } });
  const outputText = await runAiAnalysis({
    requestType: parsed.data.requestType,
    referenceTitle: kase.title,
    inputDocumentCount: inputDocumentIds.length,
  });

  const job = await prisma.aIAnalysisJob.create({
    data: {
      referenceId: parsed.data.referenceId,
      requestType: parsed.data.requestType,
      inputDocumentIds,
      outputText,
      decision: "pending",
      requestedByUserId: user.id,
    },
  });

  await writeAudit({
    action: "ai_job.requested",
    actorUserId: user.id,
    referenceId: parsed.data.referenceId,
    entityType: "AIAnalysisJob",
    entityId: job.id,
    metadata: { requestType: parsed.data.requestType },
  });

  revalidatePath(`/cases/${parsed.data.referenceId}/ai`);
}

const decisionSchema = z.object({
  jobId: z.string().uuid(),
  referenceId: z.string().uuid(),
  decision: z.enum(["accepted", "edited_and_accepted", "discarded"]),
  editedText: z.string().optional(),
});

export async function decideAiJobAction(formData: FormData) {
  const user = await requireSessionUser();
  const parsed = decisionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) errorRedirect("/cases", "Invalid input.");

  await requirePermission(user, MODULE_KEYS.AI_LAYER, "decide", parsed.data.referenceId);

  await prisma.aIAnalysisJob.update({
    where: { id: parsed.data.jobId },
    data: {
      decision: parsed.data.decision,
      outputText: parsed.data.decision === "edited_and_accepted" && parsed.data.editedText ? parsed.data.editedText : undefined,
      decidedByUserId: user.id,
      decidedAt: new Date(),
    },
  });

  // Every AI-assisted action affecting the case record is disclosed in the
  // audit trail (Section 5.16 of the SOW/SRS) - logged here regardless of
  // outcome, including a discard, for a complete record.
  await writeAudit({
    action: "ai_job.decided",
    actorUserId: user.id,
    referenceId: parsed.data.referenceId,
    entityId: parsed.data.jobId,
    metadata: { decision: parsed.data.decision },
  });

  revalidatePath(`/cases/${parsed.data.referenceId}/ai`);
}
