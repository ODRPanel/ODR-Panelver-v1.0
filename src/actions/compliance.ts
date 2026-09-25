"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSessionUser, requirePermission } from "@/lib/rbac";
import { MODULE_KEYS } from "@/lib/permissions";
import { writeAudit } from "@/lib/audit";
import { computeBreachNotificationDeadline } from "@/lib/jurisdictionEngine";

function errorRedirect(path: string, message: string): never {
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}
function successRedirect(path: string, message: string): never {
  redirect(`${path}?success=${encodeURIComponent(message)}`);
}

const logBreachSchema = z.object({
  referenceId: z.string().optional(),
  severity: z.enum(["low", "medium", "high", "critical"]),
  description: z.string().min(2, "Describe the incident."),
});

export async function logBreachIncidentAction(formData: FormData) {
  const user = await requireSessionUser();
  const parsed = logBreachSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) errorRedirect("/compliance", parsed.error.issues[0]?.message ?? "Invalid input.");

  await requirePermission(user, MODULE_KEYS.COMPLIANCE_BREACH, "create", parsed.data.referenceId || undefined);

  let notificationDeadlineAt: Date | undefined;
  if (parsed.data.referenceId) {
    const kase = await prisma.case.findUnique({ where: { id: parsed.data.referenceId }, include: { jurisdictionProfile: true } });
    if (kase) notificationDeadlineAt = computeBreachNotificationDeadline(kase.jurisdictionProfile, new Date());
  }

  const incident = await prisma.breachIncident.create({
    data: {
      referenceId: parsed.data.referenceId || null,
      severity: parsed.data.severity,
      description: parsed.data.description,
      ownerUserId: user.id,
      status: "open",
      notificationDeadlineAt,
    },
  });

  await writeAudit({
    action: "breach.logged",
    actorUserId: user.id,
    referenceId: parsed.data.referenceId || null,
    entityType: "BreachIncident",
    entityId: incident.id,
    metadata: { severity: parsed.data.severity },
  });

  revalidatePath("/compliance");
  successRedirect("/compliance", "Breach incident logged.");
}

const notifySchema = z.object({ incidentId: z.string().uuid(), which: z.enum(["client", "regulator"]) });

export async function notifyBreachAction(formData: FormData) {
  const user = await requireSessionUser();
  const parsed = notifySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) errorRedirect("/compliance", "Invalid input.");

  await requirePermission(user, MODULE_KEYS.COMPLIANCE_BREACH, "edit");

  await prisma.breachIncident.update({
    where: { id: parsed.data.incidentId },
    data:
      parsed.data.which === "client"
        ? { clientNotifiedAt: new Date(), status: "notified" }
        : { regulatorNotifiedAt: new Date(), status: "notified" },
  });

  await writeAudit({ action: `breach.${parsed.data.which}_notified`, actorUserId: user.id, entityId: parsed.data.incidentId });
  revalidatePath("/compliance");
}

const closeSchema = z.object({ incidentId: z.string().uuid(), remediationNote: z.string().min(2, "Enter a remediation note.") });

export async function closeBreachIncidentAction(formData: FormData) {
  const user = await requireSessionUser();
  const parsed = closeSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) errorRedirect("/compliance", parsed.error.issues[0]?.message ?? "Invalid input.");

  await requirePermission(user, MODULE_KEYS.COMPLIANCE_BREACH, "decide");

  await prisma.breachIncident.update({
    where: { id: parsed.data.incidentId },
    data: { status: "closed", remediationNote: parsed.data.remediationNote },
  });

  await writeAudit({ action: "breach.closed", actorUserId: user.id, entityId: parsed.data.incidentId });
  revalidatePath("/compliance");
  successRedirect("/compliance", "Incident closed.");
}

// --- Grievance channel (Ombudsman / Complaints Officer) --------------------

const grievanceSchema = z.object({
  referenceId: z.string().optional(),
  against: z.enum(["institution", "arbitrator"]),
  subject: z.string().min(2, "Enter a subject."),
  description: z.string().min(2, "Describe the grievance."),
});

export async function raiseGrievanceAction(formData: FormData) {
  const user = await requireSessionUser();
  const parsed = grievanceSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) errorRedirect("/compliance", parsed.error.issues[0]?.message ?? "Invalid input.");

  const grievance = await prisma.grievanceTicket.create({
    data: {
      referenceId: parsed.data.referenceId || null,
      against: parsed.data.against,
      subject: parsed.data.subject,
      description: parsed.data.description,
      raisedByUserId: user.id,
      status: "open",
    },
  });

  await writeAudit({
    action: "grievance.raised",
    actorUserId: user.id,
    referenceId: parsed.data.referenceId || null,
    entityType: "GrievanceTicket",
    entityId: grievance.id,
  });

  revalidatePath("/compliance");
  successRedirect("/compliance", "Grievance logged.");
}

const resolveGrievanceSchema = z.object({ ticketId: z.string().uuid(), outcomeText: z.string().min(2, "Enter the outcome.") });

export async function resolveGrievanceAction(formData: FormData) {
  const user = await requireSessionUser();
  const parsed = resolveGrievanceSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) errorRedirect("/compliance", parsed.error.issues[0]?.message ?? "Invalid input.");

  await requirePermission(user, MODULE_KEYS.COMPLIANCE_BREACH, "decide");

  await prisma.grievanceTicket.update({
    where: { id: parsed.data.ticketId },
    data: { status: "resolved", outcomeText: parsed.data.outcomeText, investigatedByUserId: user.id },
  });

  await writeAudit({ action: "grievance.resolved", actorUserId: user.id, entityId: parsed.data.ticketId });
  revalidatePath("/compliance");
}
