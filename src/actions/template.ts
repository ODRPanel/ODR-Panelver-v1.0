"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSessionUser, requirePermission } from "@/lib/rbac";
import { MODULE_KEYS } from "@/lib/permissions";
import { writeAudit } from "@/lib/audit";
import { designationLabel } from "@/lib/designation";

function errorRedirect(path: string, message: string): never {
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}

/** Auto-populates known Reference fields into a template's merge fields
 * (Section 5.19 of the SOW/SRS), reducing re-keying and transcription
 * error at the point of drafting. */
export async function mergeTemplateFields(referenceId: string, bodyMarkup: string): Promise<string> {
  const kase = await prisma.case.findUniqueOrThrow({
    where: { id: referenceId },
    include: { parties: true, tribunal: { include: { members: true } } },
  });

  const claimant = kase.parties.find((p) => p.designation === "claimant");
  const respondent = kase.parties.find((p) => p.designation === "respondent");
  const tribunalLabel = kase.tribunal
    ? `${kase.tribunal.compositionType.replace(/_/g, " ")} (${kase.tribunal.members.length} member(s))`
    : "not yet constituted";

  return bodyMarkup
    .replaceAll("{{reference_number}}", kase.referenceNumber)
    .replaceAll("{{seat}}", kase.seat ?? "[seat to be fixed]")
    .replaceAll("{{claimant_name}}", claimant ? `${claimant.fullName} (${claimant.displayLabel})` : "[Claimant]")
    .replaceAll("{{respondent_name}}", respondent ? `${respondent.fullName} (${respondent.displayLabel})` : "[Respondent]")
    .replaceAll("{{tribunal_composition}}", tribunalLabel);
}

const instantiateSchema = z.object({
  referenceId: z.string().uuid(),
  templateId: z.string().uuid(),
});

export async function instantiateTemplateAction(formData: FormData) {
  const user = await requireSessionUser();
  const parsed = instantiateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) errorRedirect("/cases", "Invalid input.");

  await requirePermission(user, MODULE_KEYS.TEMPLATES, "create", parsed.data.referenceId);

  const template = await prisma.template.findUniqueOrThrow({ where: { id: parsed.data.templateId } });
  const mergedContent = await mergeTemplateFields(parsed.data.referenceId, template.bodyMarkup);

  const orderTypeMap: Record<string, string> = {
    procedural_order_1: "procedural",
    terms_of_reference: "procedural",
  };

  const order = await prisma.order.create({
    data: {
      referenceId: parsed.data.referenceId,
      orderType: (orderTypeMap[template.templateType] as any) ?? "procedural",
      title: template.title,
      contentText: mergedContent,
      draftedByUserId: user.id,
      status: "draft",
    },
  });

  await writeAudit({
    action: "template.instantiated",
    actorUserId: user.id,
    referenceId: parsed.data.referenceId,
    entityType: "Template",
    entityId: template.id,
    metadata: { newOrderId: order.id },
  });

  revalidatePath(`/cases/${parsed.data.referenceId}/orders`);
  redirect(`/cases/${parsed.data.referenceId}/orders/${order.id}`);
}

const customTemplateSchema = z.object({
  jurisdictionProfileId: z.string().optional(),
  templateType: z.enum(["notice_of_arbitration", "answer", "procedural_order_1", "terms_of_reference", "institution_form", "custom"]),
  title: z.string().min(2, "Enter a title."),
  bodyMarkup: z.string().min(2, "Enter the template content."),
});

export async function createCustomTemplateAction(formData: FormData) {
  const user = await requireSessionUser();
  const parsed = customTemplateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) errorRedirect("/admin", parsed.error.issues[0]?.message ?? "Invalid input.");

  await requirePermission(user, MODULE_KEYS.TEMPLATES, "create");

  await prisma.template.create({
    data: {
      jurisdictionProfileId: parsed.data.jurisdictionProfileId || null,
      templateType: parsed.data.templateType,
      title: parsed.data.title,
      bodyMarkup: parsed.data.bodyMarkup,
      ownerInstitutionId: user.institutionId,
    },
  });

  await writeAudit({ action: "template.custom_added", actorUserId: user.id, metadata: { title: parsed.data.title } });
  revalidatePath("/admin/templates");
  redirect("/admin/templates?success=" + encodeURIComponent("Custom template added."));
}
