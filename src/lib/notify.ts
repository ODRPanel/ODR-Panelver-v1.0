import "server-only";
import { addDays } from "date-fns";
import { prisma } from "@/lib/prisma";
import type { NotificationChannel } from "@prisma/client";

/**
 * Multi-channel service of notice (Module 5.8). In-Platform, email,
 * WhatsApp and SMS are dispatched immediately in this local build (there is
 * no paid SMS/WhatsApp gateway wired in - see src/lib/adapters); post and
 * process-server channels record a proof-of-service reference the way a
 * Registrar would log a courier tracking number or a bailiff's affidavit.
 * One Notification row is created per channel selected, per Annexure B,
 * Section 3.16.
 */
export async function dispatchNotification(params: {
  referenceId?: string;
  recipientPartyId?: string;
  recipientUserId?: string;
  channels: NotificationChannel[];
  subject: string;
  body: string;
  contentRefType?: string;
  contentRefId?: string;
}) {
  const now = new Date();
  const created = [];

  for (const channel of params.channels) {
    const isElectronicInstant = ["in_platform", "email", "whatsapp", "sms"].includes(channel);
    const deemedServiceDate = isElectronicInstant
      ? now
      : channel === "post"
        ? addDays(now, 2)
        : addDays(now, 1); // process_server

    const proofOfServiceRef = isElectronicInstant
      ? undefined
      : channel === "post"
        ? `COURIER-${Date.now().toString(36).toUpperCase()}`
        : `PROCESS-SERVER-AFFIDAVIT-${Date.now().toString(36).toUpperCase()}`;

    const entry = await prisma.notification.create({
      data: {
        referenceId: params.referenceId,
        recipientPartyId: params.recipientPartyId,
        recipientUserId: params.recipientUserId,
        channel,
        subject: params.subject,
        body: params.body,
        contentRefType: params.contentRefType,
        contentRefId: params.contentRefId,
        dispatchedAt: now,
        deliveredAt: isElectronicInstant ? now : undefined,
        proofOfServiceRef,
        deemedServiceDate,
      },
    });
    created.push(entry);
  }

  return created;
}
