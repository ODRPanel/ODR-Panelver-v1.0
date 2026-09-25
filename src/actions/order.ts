"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSessionUser, requirePermission } from "@/lib/rbac";
import { MODULE_KEYS } from "@/lib/permissions";
import { writeAudit } from "@/lib/audit";
import { applyElectronicSignature } from "@/lib/adapters/esign";
import { dispatchNotification } from "@/lib/notify";

function errorRedirect(path: string, message: string): never {
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}
function successRedirect(path: string, message: string): never {
  redirect(`${path}?success=${encodeURIComponent(message)}`);
}

const draftSchema = z.object({
  referenceId: z.string().uuid(),
  orderType: z.enum(["procedural", "interim", "award", "consent_award", "correction", "interpretation", "additional_award"]),
  title: z.string().min(2, "Enter a title."),
  contentText: z.string().min(1, "Enter the draft content."),
  settlementRefId: z.string().optional(),
});

export async function draftOrderAction(formData: FormData) {
  const user = await requireSessionUser();
  const parsed = draftSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) errorRedirect("/cases", parsed.error.issues[0]?.message ?? "Invalid input.");

  await requirePermission(user, MODULE_KEYS.ORDERS_AWARDS, "create", parsed.data.referenceId);

  const order = await prisma.order.create({
    data: {
      referenceId: parsed.data.referenceId,
      orderType: parsed.data.orderType,
      title: parsed.data.title,
      contentText: parsed.data.contentText,
      draftedByUserId: user.id,
      settlementRefId: parsed.data.settlementRefId || null,
      status: "draft",
    },
  });

  await writeAudit({
    action: "order.drafted",
    actorUserId: user.id,
    referenceId: parsed.data.referenceId,
    entityType: "Order",
    entityId: order.id,
    metadata: { orderType: parsed.data.orderType },
  });

  revalidatePath(`/cases/${parsed.data.referenceId}/orders`);
  redirect(`/cases/${parsed.data.referenceId}/orders/${order.id}`);
}

const publishSchema = z.object({
  orderId: z.string().uuid(),
  referenceId: z.string().uuid(),
  dissentText: z.string().optional(),
  majorityText: z.string().optional(),
});

export async function publishOrderAction(formData: FormData) {
  const user = await requireSessionUser();
  const parsed = publishSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) errorRedirect("/cases", "Invalid input.");

  // Publish is restricted to the Arbitrator role at the service layer,
  // independent of interface controls (Annexure B, Section 3.10).
  await requirePermission(user, MODULE_KEYS.ORDERS_AWARDS, "publish", parsed.data.referenceId);

  const order = await prisma.order.findUniqueOrThrow({ where: { id: parsed.data.orderId } });
  if (order.status === "published") errorRedirect(`/cases/${parsed.data.referenceId}/orders/${order.id}`, "Already published.");

  const signature = await applyElectronicSignature({
    documentContent: order.contentText ?? "",
    signerUserId: user.id,
    signerName: user.fullName,
  });

  await prisma.order.update({
    where: { id: order.id },
    data: {
      status: "published",
      publishedByUserId: user.id,
      publishedAt: signature.signedAt,
      dissentText: parsed.data.dissentText || undefined,
      majorityText: parsed.data.majorityText || undefined,
    },
  });

  const parties = await prisma.party.findMany({ where: { referenceId: parsed.data.referenceId } });
  await Promise.all(
    parties
      .filter((p) => p.partyUserId || p.representedByCounselUserId)
      .map((p) =>
        dispatchNotification({
          referenceId: parsed.data.referenceId,
          recipientPartyId: p.id,
          recipientUserId: p.partyUserId ?? p.representedByCounselUserId ?? undefined,
          channels: ["in_platform", "email"],
          subject: `${order.orderType.replace(/_/g, " ")} published: ${order.title}`,
          body: `A ${order.orderType.replace(/_/g, " ")} has been published on Reference.`,
          contentRefType: "Order",
          contentRefId: order.id,
        }),
      ),
  );

  await writeAudit({
    action: "order.published",
    actorUserId: user.id,
    referenceId: parsed.data.referenceId,
    entityId: order.id,
    metadata: { signatureId: signature.signatureId, orderType: order.orderType },
  });

  revalidatePath(`/cases/${parsed.data.referenceId}/orders`);
  successRedirect(`/cases/${parsed.data.referenceId}/orders/${order.id}`, "Published.");
}

const settlementSchema = z.object({
  referenceId: z.string().uuid(),
  description: z.string().min(2, "Describe the settlement."),
});

export async function recordSettlementAction(formData: FormData) {
  const user = await requireSessionUser();
  const parsed = settlementSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) errorRedirect("/cases", "Invalid input.");

  await requirePermission(user, MODULE_KEYS.ORDERS_AWARDS, "create", parsed.data.referenceId);

  const settlement = await prisma.settlement.create({
    data: { referenceId: parsed.data.referenceId, description: parsed.data.description, recordedByUserId: user.id },
  });

  await writeAudit({ action: "settlement.recorded", actorUserId: user.id, referenceId: parsed.data.referenceId, entityId: settlement.id });
  revalidatePath(`/cases/${parsed.data.referenceId}/orders`);
  successRedirect(`/cases/${parsed.data.referenceId}/orders`, "Settlement recorded - you can now draft a consent Award referencing it.");
}
