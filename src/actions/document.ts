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

const uploadSchema = z.object({
  referenceId: z.string().uuid(),
  confidentialityFlag: z.coerce.boolean().optional(),
});

export async function uploadGeneralDocumentAction(formData: FormData) {
  const user = await requireSessionUser();
  const raw = Object.fromEntries(formData);
  const parsed = uploadSchema.safeParse({ ...raw, confidentialityFlag: raw.confidentialityFlag === "on" });
  if (!parsed.success) errorRedirect("/cases", "Invalid input.");

  await requirePermission(user, MODULE_KEYS.DOCUMENT_REPOSITORY, "create", parsed.data.referenceId);

  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) errorRedirect("/cases", "Choose a file to upload.");

  const saved = await saveUploadedFile(parsed.data.referenceId, file);
  const doc = await prisma.documentRepositoryItem.create({
    data: {
      referenceId: parsed.data.referenceId,
      fileName: saved.fileName,
      storagePath: saved.storagePath,
      mimeType: saved.mimeType,
      sizeBytes: saved.sizeBytes,
      sha256Hash: saved.sha256Hash,
      confidentialityFlag: parsed.data.confidentialityFlag ?? true,
      category: "general",
      uploadedByUserId: user.id,
    },
  });

  await writeAudit({
    action: "document.uploaded",
    actorUserId: user.id,
    referenceId: parsed.data.referenceId,
    entityType: "DocumentRepositoryItem",
    entityId: doc.id,
  });

  revalidatePath(`/cases/${parsed.data.referenceId}/documents`);
  successRedirect(`/cases/${parsed.data.referenceId}/documents`, "Document uploaded to the repository.");
}

const certifySchema = z.object({
  documentId: z.string().uuid(),
  referenceId: z.string().uuid(),
});

export async function toggleTranslationCertifiedAction(formData: FormData) {
  const user = await requireSessionUser();
  const parsed = certifySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) errorRedirect("/cases", "Invalid input.");

  await requirePermission(user, MODULE_KEYS.DOCUMENT_REPOSITORY, "edit", parsed.data.referenceId);

  const doc = await prisma.documentRepositoryItem.findUniqueOrThrow({ where: { id: parsed.data.documentId } });
  await prisma.documentRepositoryItem.update({
    where: { id: doc.id },
    data: { translationCertified: !doc.translationCertified },
  });

  await writeAudit({ action: "document.translation_certification_toggled", actorUserId: user.id, referenceId: parsed.data.referenceId, entityId: doc.id });
  revalidatePath(`/cases/${parsed.data.referenceId}/documents`);
}
