"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { requireSessionUser, requirePermission } from "@/lib/rbac";
import { MODULE_KEYS } from "@/lib/permissions";
import { writeAudit } from "@/lib/audit";
import { createHearingRoomLink } from "@/lib/adapters/video";
import { dispatchNotification } from "@/lib/notify";

function errorRedirect(path: string, message: string): never {
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}
function successRedirect(path: string, message: string): never {
  redirect(`${path}?success=${encodeURIComponent(message)}`);
}

const scheduleSchema = z.object({
  referenceId: z.string().uuid(),
  hearingType: z.enum(["case_management_conference", "procedural", "evidentiary", "final"]),
  mode: z.enum(["in_person", "virtual", "hybrid"]),
  scheduledStart: z.string().min(1, "Set a start date/time."),
  scheduledEnd: z.string().optional(),
  venueOrLink: z.string().optional(),
  interpreterRequired: z.coerce.boolean().optional(),
  interpreterLanguage: z.string().optional(),
  observerAccess: z.coerce.boolean().optional(),
  cybersecurityProtocolSignedOff: z.coerce.boolean().optional(),
});

export async function scheduleHearingAction(formData: FormData) {
  const user = await requireSessionUser();
  const raw = Object.fromEntries(formData);
  const parsed = scheduleSchema.safeParse({
    ...raw,
    interpreterRequired: raw.interpreterRequired === "on",
    observerAccess: raw.observerAccess === "on",
    cybersecurityProtocolSignedOff: raw.cybersecurityProtocolSignedOff === "on",
  });
  if (!parsed.success) errorRedirect("/cases", parsed.error.issues[0]?.message ?? "Invalid input.");

  await requirePermission(user, MODULE_KEYS.HEARINGS, "create", parsed.data.referenceId);

  const hearing = await prisma.hearing.create({
    data: {
      referenceId: parsed.data.referenceId,
      hearingType: parsed.data.hearingType,
      mode: parsed.data.mode,
      scheduledStart: new Date(parsed.data.scheduledStart),
      scheduledEnd: parsed.data.scheduledEnd ? new Date(parsed.data.scheduledEnd) : null,
      venueOrLink: parsed.data.venueOrLink || null,
      interpreterRequired: parsed.data.interpreterRequired ?? false,
      interpreterLanguage: parsed.data.interpreterLanguage || null,
      observerAccess: parsed.data.observerAccess ?? false,
      cybersecurityProtocolSignedOff: parsed.data.cybersecurityProtocolSignedOff ?? false,
      status: "scheduled",
    },
  });

  if (parsed.data.mode !== "in_person" && !parsed.data.venueOrLink) {
    const link = await createHearingRoomLink(hearing.id);
    await prisma.hearing.update({ where: { id: hearing.id }, data: { venueOrLink: link } });
  }

  const parties = await prisma.party.findMany({ where: { referenceId: parsed.data.referenceId } });
  const recipients = parties.filter((p) => p.partyUserId || p.representedByCounselUserId);
  await Promise.all(
    recipients.map((p) =>
      dispatchNotification({
        referenceId: parsed.data.referenceId,
        recipientPartyId: p.id,
        recipientUserId: p.partyUserId ?? p.representedByCounselUserId ?? undefined,
        channels: ["in_platform"],
        subject: `Hearing scheduled: ${parsed.data.hearingType.replace(/_/g, " ")}`,
        body: `A ${parsed.data.hearingType.replace(/_/g, " ")} has been scheduled for ${new Date(parsed.data.scheduledStart).toLocaleString()}.`,
        contentRefType: "Hearing",
        contentRefId: hearing.id,
      }),
    ),
  );

  await writeAudit({
    action: "hearing.scheduled",
    actorUserId: user.id,
    referenceId: parsed.data.referenceId,
    entityType: "Hearing",
    entityId: hearing.id,
    metadata: { hearingType: parsed.data.hearingType, mode: parsed.data.mode },
  });

  revalidatePath(`/cases/${parsed.data.referenceId}/hearings`);
  successRedirect(`/cases/${parsed.data.referenceId}/hearings`, "Hearing scheduled.");
}

const statusSchema = z.object({
  hearingId: z.string().uuid(),
  referenceId: z.string().uuid(),
  status: z.enum(["scheduled", "completed", "adjourned", "cancelled"]),
});

export async function updateHearingStatusAction(formData: FormData) {
  const user = await requireSessionUser();
  const parsed = statusSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) errorRedirect("/cases", "Invalid input.");

  await requirePermission(user, MODULE_KEYS.HEARINGS, "edit", parsed.data.referenceId);
  await prisma.hearing.update({ where: { id: parsed.data.hearingId }, data: { status: parsed.data.status } });
  await writeAudit({
    action: "hearing.status_changed",
    actorUserId: user.id,
    referenceId: parsed.data.referenceId,
    entityId: parsed.data.hearingId,
    metadata: { status: parsed.data.status },
  });

  revalidatePath(`/cases/${parsed.data.referenceId}/hearings`);
}

const certifySchema = z.object({
  hearingId: z.string().uuid(),
  referenceId: z.string().uuid(),
  recordingRef: z.string().optional(),
  transcriptRef: z.string().optional(),
});

export async function certifyHearingRecordAction(formData: FormData) {
  const user = await requireSessionUser();
  const parsed = certifySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) errorRedirect("/cases", "Invalid input.");

  await requirePermission(user, MODULE_KEYS.HEARINGS, "edit", parsed.data.referenceId);

  const transcriptHash = parsed.data.transcriptRef
    ? crypto.createHash("sha256").update(parsed.data.transcriptRef).digest("hex")
    : undefined;

  await prisma.hearing.update({
    where: { id: parsed.data.hearingId },
    data: {
      recordingRef: parsed.data.recordingRef || undefined,
      transcriptRef: parsed.data.transcriptRef || undefined,
      transcriptHash,
    },
  });

  await writeAudit({
    action: "hearing.record_certified",
    actorUserId: user.id,
    referenceId: parsed.data.referenceId,
    entityId: parsed.data.hearingId,
  });

  revalidatePath(`/cases/${parsed.data.referenceId}/hearings`);
}
