"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSessionUser } from "@/lib/rbac";
import { writeAudit } from "@/lib/audit";
import { saveUploadedFile, absoluteStoragePath } from "@/lib/storage";
import { readFile } from "fs/promises";
import crypto from "crypto";

function errorRedirect(path: string, message: string): never {
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}

/**
 * Verifies the requesting user is one of the two sides of this privileged
 * relationship - the Counsel of record, or the represented Party's own
 * login - before any read or write. This is enforced here, at the
 * service layer, independently of anything the interface already hid
 * (Section 5.20 of the SOW/SRS: invisible to the Tribunal, Registrar,
 * other Parties and opposing Counsel).
 */
async function assertCounselClientAccess(referenceId: string, clientPartyId: string, userId: string) {
  const party = await prisma.party.findFirst({ where: { id: clientPartyId, referenceId } });
  if (!party) throw new Error("Party not found on this Reference.");

  const isCounsel = party.representedByCounselUserId === userId;
  const isClient = party.partyUserId === userId;
  if (!isCounsel && !isClient) {
    throw new Error("Access denied: this privileged channel is visible only to the Counsel of record and their represented Client.");
  }
  return { party, counselUserId: party.representedByCounselUserId! };
}

const messageSchema = z.object({
  referenceId: z.string().uuid(),
  clientPartyId: z.string().uuid(),
  body: z.string().min(1, "Enter a message."),
});

export async function sendCounselClientMessageAction(formData: FormData) {
  const user = await requireSessionUser();
  const parsed = messageSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) errorRedirect("/cases", parsed.error.issues[0]?.message ?? "Invalid input.");

  const { counselUserId } = await assertCounselClientAccess(parsed.data.referenceId, parsed.data.clientPartyId, user.id);
  if (!counselUserId) errorRedirect("/cases", "This Party has no Counsel of record yet.");

  await prisma.counselClientMessage.create({
    data: {
      referenceId: parsed.data.referenceId,
      counselUserId,
      clientPartyId: parsed.data.clientPartyId,
      body: parsed.data.body,
    },
  });

  await writeAudit({
    action: "counsel_client.message_sent",
    actorUserId: user.id,
    referenceId: parsed.data.referenceId,
    metadata: { clientPartyId: parsed.data.clientPartyId },
  });

  revalidatePath(`/cases/${parsed.data.referenceId}/counsel-client`);
}

const uploadSchema = z.object({ referenceId: z.string().uuid(), clientPartyId: z.string().uuid() });

export async function uploadCounselClientDocumentAction(formData: FormData) {
  const user = await requireSessionUser();
  const parsed = uploadSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) errorRedirect("/cases", "Invalid input.");

  const { counselUserId } = await assertCounselClientAccess(parsed.data.referenceId, parsed.data.clientPartyId, user.id);
  if (!counselUserId) errorRedirect("/cases", "This Party has no Counsel of record yet.");

  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) errorRedirect("/cases", "Choose a file.");

  const saved = await saveUploadedFile(parsed.data.referenceId, file);
  await prisma.counselClientDocument.create({
    data: {
      referenceId: parsed.data.referenceId,
      counselUserId,
      clientPartyId: parsed.data.clientPartyId,
      fileName: saved.fileName,
      storagePath: saved.storagePath,
      mimeType: saved.mimeType,
      sizeBytes: saved.sizeBytes,
    },
  });

  await writeAudit({ action: "counsel_client.document_uploaded", actorUserId: user.id, referenceId: parsed.data.referenceId });
  revalidatePath(`/cases/${parsed.data.referenceId}/counsel-client`);
}

const promoteSchema = z.object({ documentId: z.string().uuid(), referenceId: z.string().uuid(), clientPartyId: z.string().uuid() });

export async function promoteCounselClientDocumentAction(formData: FormData) {
  const user = await requireSessionUser();
  const parsed = promoteSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) errorRedirect("/cases", "Invalid input.");

  await assertCounselClientAccess(parsed.data.referenceId, parsed.data.clientPartyId, user.id);

  const doc = await prisma.counselClientDocument.findUniqueOrThrow({ where: { id: parsed.data.documentId } });
  if (doc.promotedToRepositoryItemId) errorRedirect(`/cases/${parsed.data.referenceId}/counsel-client`, "Already promoted.");

  const fileBuffer = await readFile(absoluteStoragePath(doc.storagePath));
  const sha256Hash = crypto.createHash("sha256").update(fileBuffer).digest("hex");

  const repoItem = await prisma.documentRepositoryItem.create({
    data: {
      referenceId: parsed.data.referenceId,
      fileName: doc.fileName,
      storagePath: doc.storagePath,
      mimeType: doc.mimeType,
      sizeBytes: doc.sizeBytes,
      sha256Hash,
      confidentialityFlag: true,
      category: "counsel_client_promoted",
      uploadedByUserId: user.id,
    },
  });

  await prisma.counselClientDocument.update({
    where: { id: doc.id },
    data: { promotedToRepositoryItemId: repoItem.id },
  });

  await writeAudit({
    action: "counsel_client.document_promoted",
    actorUserId: user.id,
    referenceId: parsed.data.referenceId,
    entityId: repoItem.id,
  });

  revalidatePath(`/cases/${parsed.data.referenceId}/counsel-client`);
  revalidatePath(`/cases/${parsed.data.referenceId}/documents`);
}
