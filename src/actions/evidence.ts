"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSessionUser, requirePermission } from "@/lib/rbac";
import { MODULE_KEYS } from "@/lib/permissions";
import { writeAudit } from "@/lib/audit";
import { saveUploadedFile } from "@/lib/storage";

function errorRedirect(path: string, message: string): never {
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}
function successRedirect(path: string, message: string): never {
  redirect(`${path}?success=${encodeURIComponent(message)}`);
}

const fileEvidenceSchema = z.object({
  referenceId: z.string().uuid(),
  title: z.string().min(2, "Enter a title for this exhibit."),
  evidenceCategory: z.enum(["documentary", "expert_report", "witness_statement"]),
});

const CATEGORY_PREFIX: Record<string, string> = {
  documentary: "EX",
  expert_report: "EXP",
  witness_statement: "WS",
};

export async function fileEvidenceAction(formData: FormData) {
  const user = await requireSessionUser();
  const parsed = fileEvidenceSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) errorRedirect("/cases", parsed.error.issues[0]?.message ?? "Invalid input.");

  await requirePermission(user, MODULE_KEYS.EVIDENCE, "create", parsed.data.referenceId);

  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) errorRedirect("/cases", "Attach a file for this exhibit.");

  const saved = await saveUploadedFile(parsed.data.referenceId, file);
  const doc = await prisma.documentRepositoryItem.create({
    data: {
      referenceId: parsed.data.referenceId,
      fileName: saved.fileName,
      storagePath: saved.storagePath,
      mimeType: saved.mimeType,
      sizeBytes: saved.sizeBytes,
      sha256Hash: saved.sha256Hash,
      confidentialityFlag: true,
      category: "evidence",
      uploadedByUserId: user.id,
    },
  });

  const existingCount = await prisma.evidence.count({ where: { referenceId: parsed.data.referenceId } });
  const exhibitNo = `${CATEGORY_PREFIX[parsed.data.evidenceCategory]}-${existingCount + 1}`;

  const evidence = await prisma.evidence.create({
    data: {
      referenceId: parsed.data.referenceId,
      exhibitNo,
      title: parsed.data.title,
      evidenceCategory: parsed.data.evidenceCategory,
      documentId: doc.id,
      integrityHash: saved.sha256Hash,
      filedByUserId: user.id,
    },
  });

  await writeAudit({
    action: "evidence.filed",
    actorUserId: user.id,
    referenceId: parsed.data.referenceId,
    entityType: "Evidence",
    entityId: evidence.id,
    metadata: { exhibitNo, evidenceCategory: parsed.data.evidenceCategory },
  });

  revalidatePath(`/cases/${parsed.data.referenceId}/evidence`);
  successRedirect(`/cases/${parsed.data.referenceId}/evidence`, `Exhibit ${exhibitNo} filed.`);
}

const objectionSchema = z.object({
  evidenceId: z.string().uuid(),
  referenceId: z.string().uuid(),
  objectionText: z.string().min(1, "Enter the objection."),
});

export async function raiseObjectionAction(formData: FormData) {
  const user = await requireSessionUser();
  const parsed = objectionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) errorRedirect("/cases", "Invalid input.");

  await requirePermission(user, MODULE_KEYS.EVIDENCE, "edit", parsed.data.referenceId);

  await prisma.evidence.update({
    where: { id: parsed.data.evidenceId },
    data: { objectionStatus: "raised", objectionText: parsed.data.objectionText },
  });

  await writeAudit({ action: "evidence.objection_raised", actorUserId: user.id, referenceId: parsed.data.referenceId, entityId: parsed.data.evidenceId });
  revalidatePath(`/cases/${parsed.data.referenceId}/evidence`);
}

const rulingSchema = z.object({
  evidenceId: z.string().uuid(),
  referenceId: z.string().uuid(),
  rulingText: z.string().min(1, "Enter the Tribunal's ruling."),
});

export async function ruleOnObjectionAction(formData: FormData) {
  const user = await requireSessionUser();
  const parsed = rulingSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) errorRedirect("/cases", "Invalid input.");

  await requirePermission(user, MODULE_KEYS.EVIDENCE, "decide", parsed.data.referenceId);

  await prisma.evidence.update({
    where: { id: parsed.data.evidenceId },
    data: { objectionStatus: "ruled", rulingText: parsed.data.rulingText },
  });

  await writeAudit({ action: "evidence.objection_ruled", actorUserId: user.id, referenceId: parsed.data.referenceId, entityId: parsed.data.evidenceId });
  revalidatePath(`/cases/${parsed.data.referenceId}/evidence`);
}
