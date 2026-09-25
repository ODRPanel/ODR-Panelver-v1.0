"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSessionUser, requirePermission } from "@/lib/rbac";
import { MODULE_KEYS } from "@/lib/permissions";
import { writeAudit } from "@/lib/audit";

function errorRedirect(path: string, message: string): never {
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}
function successRedirect(path: string, message: string): never {
  redirect(`${path}?success=${encodeURIComponent(message)}`);
}

const createSchema = z.object({
  referenceId: z.string().uuid(),
  proceduralOrderNo: z.coerce.number().int().min(1),
  description: z.string().min(2, "Describe the direction."),
  responsibleRole: z.enum(["tribunal", "party", "counsel", "registrar", "other"]),
  responsiblePartyId: z.string().optional(),
  dueDate: z.string().optional(),
  phase: z.enum(["single", "jurisdiction", "liability", "quantum"]),
  supersedesOrderNo: z.string().optional(),
});

export async function createDirectionAction(formData: FormData) {
  const user = await requireSessionUser();
  const parsed = createSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) errorRedirect("/cases", parsed.error.issues[0]?.message ?? "Invalid input.");

  await requirePermission(user, MODULE_KEYS.DIRECTIONS_CMC, "create", parsed.data.referenceId);

  const direction = await prisma.proceduralDirection.create({
    data: {
      referenceId: parsed.data.referenceId,
      proceduralOrderNo: parsed.data.proceduralOrderNo,
      supersedesOrderNo: parsed.data.supersedesOrderNo ? Number(parsed.data.supersedesOrderNo) : null,
      description: parsed.data.description,
      responsibleRole: parsed.data.responsibleRole,
      responsiblePartyId: parsed.data.responsibleRole === "party" ? parsed.data.responsiblePartyId || null : null,
      dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null,
      phase: parsed.data.phase,
      createdByUserId: user.id,
      status: "pending",
    },
  });

  await writeAudit({
    action: "direction.created",
    actorUserId: user.id,
    referenceId: parsed.data.referenceId,
    entityType: "ProceduralDirection",
    entityId: direction.id,
    metadata: { proceduralOrderNo: parsed.data.proceduralOrderNo, phase: parsed.data.phase },
  });

  revalidatePath(`/cases/${parsed.data.referenceId}/directions`);
  successRedirect(`/cases/${parsed.data.referenceId}/directions`, "Direction added.");
}

const statusSchema = z.object({
  directionId: z.string().uuid(),
  referenceId: z.string().uuid(),
  status: z.enum(["pending", "complied", "overdue", "varied"]),
});

export async function updateDirectionStatusAction(formData: FormData) {
  const user = await requireSessionUser();
  const parsed = statusSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) errorRedirect("/cases", "Invalid input.");

  await requirePermission(user, MODULE_KEYS.DIRECTIONS_CMC, "edit", parsed.data.referenceId);

  await prisma.proceduralDirection.update({ where: { id: parsed.data.directionId }, data: { status: parsed.data.status } });
  await writeAudit({
    action: "direction.status_changed",
    actorUserId: user.id,
    referenceId: parsed.data.referenceId,
    entityId: parsed.data.directionId,
    metadata: { status: parsed.data.status },
  });

  revalidatePath(`/cases/${parsed.data.referenceId}/directions`);
}
