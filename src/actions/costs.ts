"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSessionUser, requirePermission } from "@/lib/rbac";
import { MODULE_KEYS } from "@/lib/permissions";
import { writeAudit } from "@/lib/audit";
import { simulatePaymentCapture } from "@/lib/adapters/payment";

function errorRedirect(path: string, message: string): never {
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}
function successRedirect(path: string, message: string): never {
  redirect(`${path}?success=${encodeURIComponent(message)}`);
}

const raiseSchema = z.object({
  referenceId: z.string().uuid(),
  entryType: z.enum(["fee", "expense", "escrow", "security_for_costs"]),
  feeModel: z.enum(["ad_valorem", "hourly", "per_sitting", "fixed_lump_sum", "ad_hoc", "institution_own"]),
  payerAllocation: z.enum(["claimant", "respondent", "shared_equally", "apportioned_by_tribunal", "costs_follow_event_pending"]),
  linkedHearingId: z.string().optional(),
  amount: z.coerce.number().positive("Enter an amount greater than zero."),
  currency: z.string().length(3),
  description: z.string().optional(),
  escrowReference: z.string().optional(),
});

export async function raiseFeeEntryAction(formData: FormData) {
  const user = await requireSessionUser();
  const raw = Object.fromEntries(formData);
  const parsed = raiseSchema.safeParse(raw);
  if (!parsed.success) errorRedirect("/cases", parsed.error.issues[0]?.message ?? "Invalid input.");

  await requirePermission(user, MODULE_KEYS.COSTS_FEES, "create", parsed.data.referenceId);

  const entry = await prisma.costLedgerEntry.create({
    data: {
      referenceId: parsed.data.referenceId,
      entryType: parsed.data.entryType,
      feeModel: parsed.data.feeModel,
      payerAllocation: parsed.data.payerAllocation,
      linkedHearingId: parsed.data.feeModel === "per_sitting" ? parsed.data.linkedHearingId || null : null,
      amount: parsed.data.amount,
      currency: parsed.data.currency.toUpperCase(),
      description: parsed.data.description || null,
      escrowReference: parsed.data.escrowReference || null,
      raisedByUserId: user.id,
      status: "raised",
    },
  });

  await writeAudit({
    action: "cost_entry.raised",
    actorUserId: user.id,
    referenceId: parsed.data.referenceId,
    entityType: "CostLedgerEntry",
    entityId: entry.id,
    metadata: { entryType: parsed.data.entryType, amount: parsed.data.amount, currency: parsed.data.currency },
  });

  revalidatePath(`/cases/${parsed.data.referenceId}/costs`);
  successRedirect(`/cases/${parsed.data.referenceId}/costs`, "Ledger entry raised.");
}

const statusSchema = z.object({
  entryId: z.string().uuid(),
  referenceId: z.string().uuid(),
  status: z.enum(["raised", "invoiced", "paid", "disputed", "under_review", "resolved"]),
});

export async function updateFeeEntryStatusAction(formData: FormData) {
  const user = await requireSessionUser();
  const parsed = statusSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) errorRedirect("/cases", "Invalid input.");

  const isTaxingReview = ["disputed", "under_review", "resolved"].includes(parsed.data.status);
  await requirePermission(
    user,
    MODULE_KEYS.COSTS_FEES,
    isTaxingReview ? "decide" : "edit",
    parsed.data.referenceId,
  );

  const entry = await prisma.costLedgerEntry.findUniqueOrThrow({ where: { id: parsed.data.entryId } });

  if (parsed.data.status === "paid") {
    await simulatePaymentCapture({ amount: Number(entry.amount), currency: entry.currency });
  }

  await prisma.costLedgerEntry.update({ where: { id: parsed.data.entryId }, data: { status: parsed.data.status } });
  await writeAudit({
    action: "cost_entry.status_changed",
    actorUserId: user.id,
    referenceId: parsed.data.referenceId,
    entityId: parsed.data.entryId,
    metadata: { status: parsed.data.status },
  });

  revalidatePath(`/cases/${parsed.data.referenceId}/costs`);
}
