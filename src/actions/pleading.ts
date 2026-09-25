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

const filePleadingSchema = z.object({
  referenceId: z.string().uuid(),
  pleadingType: z.enum([
    "statement_of_claim",
    "statement_of_defence",
    "counter_claim",
    "reply",
    "rejoinder",
    "challenge_application",
    "application",
    "other",
  ]),
  title: z.string().min(2, "Enter a title for this pleading."),
  confidentialityFlag: z.coerce.boolean().optional(),
});

export async function filePleadingAction(formData: FormData) {
  const user = await requireSessionUser();
  const raw = Object.fromEntries(formData);
  const parsed = filePleadingSchema.safeParse({
    ...raw,
    confidentialityFlag: raw.confidentialityFlag === "on",
  });
  if (!parsed.success) errorRedirect("/cases", parsed.error.issues[0]?.message ?? "Invalid input.");

  await requirePermission(user, MODULE_KEYS.PLEADINGS, "create", parsed.data.referenceId);

  const file = formData.get("file") as File | null;
  let documentId: string | null = null;

  if (file && file.size > 0) {
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
        category: "pleading",
        uploadedByUserId: user.id,
      },
    });
    documentId = doc.id;
  }

  const priorVersions = await prisma.pleading.count({
    where: { referenceId: parsed.data.referenceId, pleadingType: parsed.data.pleadingType, title: parsed.data.title },
  });

  const pleading = await prisma.pleading.create({
    data: {
      referenceId: parsed.data.referenceId,
      pleadingType: parsed.data.pleadingType,
      title: parsed.data.title,
      versionNo: priorVersions + 1,
      confidentialityFlag: parsed.data.confidentialityFlag ?? true,
      filedByUserId: user.id,
      documentId,
      status: "filed",
    },
  });

  await writeAudit({
    action: "pleading.filed",
    actorUserId: user.id,
    referenceId: parsed.data.referenceId,
    entityType: "Pleading",
    entityId: pleading.id,
    metadata: { pleadingType: parsed.data.pleadingType, versionNo: pleading.versionNo },
  });

  revalidatePath(`/cases/${parsed.data.referenceId}/pleadings`);
  successRedirect(`/cases/${parsed.data.referenceId}/pleadings`, `${parsed.data.title} filed (v${pleading.versionNo}).`);
}

const statusSchema = z.object({
  pleadingId: z.string().uuid(),
  referenceId: z.string().uuid(),
  status: z.enum(["draft", "filed", "admitted", "rejected"]),
});

export async function updatePleadingStatusAction(formData: FormData) {
  const user = await requireSessionUser();
  const parsed = statusSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) errorRedirect("/cases", "Invalid input.");

  await requirePermission(user, MODULE_KEYS.PLEADINGS, "edit", parsed.data.referenceId);

  await prisma.pleading.update({ where: { id: parsed.data.pleadingId }, data: { status: parsed.data.status } });
  await writeAudit({
    action: "pleading.status_changed",
    actorUserId: user.id,
    referenceId: parsed.data.referenceId,
    entityId: parsed.data.pleadingId,
    metadata: { status: parsed.data.status },
  });

  revalidatePath(`/cases/${parsed.data.referenceId}/pleadings`);
}
