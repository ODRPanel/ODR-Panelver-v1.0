"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSessionUser, requirePermission } from "@/lib/rbac";
import { MODULE_KEYS } from "@/lib/permissions";
import { writeAudit } from "@/lib/audit";
import { dispatchNotification } from "@/lib/notify";

function errorRedirect(path: string, message: string): never {
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}
function successRedirect(path: string, message: string): never {
  redirect(`${path}?success=${encodeURIComponent(message)}`);
}

const sendSchema = z.object({
  referenceId: z.string().uuid(),
  recipientPartyId: z.string().uuid("Select a recipient Party."),
  subject: z.string().min(2, "Enter a subject."),
  body: z.string().min(2, "Enter the notice text."),
  channels: z.union([z.string(), z.array(z.string())]).optional(),
});

export async function sendNoticeAction(formData: FormData) {
  const user = await requireSessionUser();
  const raw = Object.fromEntries(formData);
  const channels = formData.getAll("channels").map(String);
  const parsed = sendSchema.safeParse({ ...raw, channels });
  if (!parsed.success) errorRedirect("/cases", parsed.error.issues[0]?.message ?? "Invalid input.");
  if (channels.length === 0) errorRedirect("/cases", "Select at least one service channel.");

  await requirePermission(user, MODULE_KEYS.COMMUNICATION, "create", parsed.data.referenceId);

  const recipientParty = await prisma.party.findUniqueOrThrow({ where: { id: parsed.data.recipientPartyId } });

  await dispatchNotification({
    referenceId: parsed.data.referenceId,
    recipientPartyId: recipientParty.id,
    recipientUserId: recipientParty.partyUserId ?? recipientParty.representedByCounselUserId ?? undefined,
    channels: channels as any,
    subject: parsed.data.subject,
    body: parsed.data.body,
  });

  await writeAudit({
    action: "notice.dispatched",
    actorUserId: user.id,
    referenceId: parsed.data.referenceId,
    metadata: { recipientPartyId: recipientParty.id, channels },
  });

  revalidatePath(`/cases/${parsed.data.referenceId}/communications`);
  successRedirect(`/cases/${parsed.data.referenceId}/communications`, `Notice dispatched to ${recipientParty.displayLabel}.`);
}
