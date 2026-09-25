"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSessionUser, requirePermission } from "@/lib/rbac";
import { MODULE_KEYS } from "@/lib/permissions";
import { hashPassword } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";

function errorRedirect(path: string, message: string): never {
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}
function successRedirect(path: string, message: string): never {
  redirect(`${path}?success=${encodeURIComponent(message)}`);
}

// --- User, Role & Access Management (Module 5.11) --------------------------

const createUserSchema = z.object({
  fullName: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  roleId: z.string().uuid(),
});

export async function createUserAction(formData: FormData) {
  const user = await requireSessionUser();
  await requirePermission(user, MODULE_KEYS.USER_ROLE_ACCESS, "create");

  const parsed = createUserSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) errorRedirect("/admin/users", parsed.error.issues[0]?.message ?? "Invalid input.");

  const existing = await prisma.user.findUnique({ where: { email: parsed.data.email.toLowerCase() } });
  if (existing) errorRedirect("/admin/users", "A user with that email already exists.");

  const passwordHash = await hashPassword(parsed.data.password);
  const created = await prisma.user.create({
    data: {
      fullName: parsed.data.fullName,
      email: parsed.data.email.toLowerCase(),
      passwordHash,
      roleId: parsed.data.roleId,
      institutionId: user.institutionId,
      status: "active",
    },
  });

  await writeAudit({
    action: "user.created",
    actorUserId: user.id,
    entityType: "User",
    entityId: created.id,
    metadata: { email: created.email, roleId: created.roleId },
  });

  revalidatePath("/admin/users");
  successRedirect("/admin/users", `Account created for ${created.email}. Share the temporary password with them securely.`);
}

export async function toggleUserStatusAction(formData: FormData) {
  const user = await requireSessionUser();
  await requirePermission(user, MODULE_KEYS.USER_ROLE_ACCESS, "edit");

  const userId = String(formData.get("userId"));
  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) errorRedirect("/admin/users", "User not found.");

  const nextStatus = target.status === "active" ? "suspended" : "active";
  await prisma.user.update({
    where: { id: userId },
    data: {
      status: nextStatus,
      // Suspending invalidates every existing session immediately (Annexure
      // A-1, Section 9.3: "the account is not deleted", but access is cut).
      tokenVersion: nextStatus === "suspended" ? { increment: 1 } : undefined,
    },
  });

  await writeAudit({
    action: nextStatus === "suspended" ? "user.suspended" : "user.reactivated",
    actorUserId: user.id,
    entityType: "User",
    entityId: userId,
  });

  revalidatePath("/admin/users");
  successRedirect("/admin/users", `${target.email} is now ${nextStatus}.`);
}

// --- Jurisdiction Rule Profile Administration (Section 3.3 of SOW/SRS) -----

const createProfileSchema = z.object({
  profileCode: z.string().min(2).max(10),
  displayName: z.string().min(2),
  governingArbitrationLaw: z.string().min(2),
  evidenceRegime: z.string().min(2),
  confidentialityDefault: z.enum(["confidential_by_default", "general_duty", "no_default"]),
  feeScheduleType: z.enum(["ad_valorem", "hourly", "institution_own"]),
  defaultCurrency: z.string().length(3),
  dataResidencyRegion: z.string().min(2),
  applicableDataProtectionLaw: z.string().min(2),
  breachNotificationHours: z.coerce.number().int().positive(),
  rtlSupport: z.coerce.boolean().optional(),
});

export async function createJurisdictionProfileAction(formData: FormData) {
  const user = await requireSessionUser();
  await requirePermission(user, MODULE_KEYS.ADMIN, "create");

  const raw = Object.fromEntries(formData);
  const parsed = createProfileSchema.safeParse({ ...raw, rtlSupport: raw.rtlSupport === "on" });
  if (!parsed.success) {
    errorRedirect("/admin/jurisdiction-profiles", parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  try {
    await prisma.jurisdictionProfile.create({
      data: {
        profileCode: parsed.data.profileCode.toUpperCase() as any,
        displayName: parsed.data.displayName,
        governingArbitrationLaw: parsed.data.governingArbitrationLaw,
        evidenceRegime: parsed.data.evidenceRegime,
        confidentialityDefault: parsed.data.confidentialityDefault,
        feeScheduleType: parsed.data.feeScheduleType,
        defaultCurrency: parsed.data.defaultCurrency.toUpperCase(),
        dataResidencyRegion: parsed.data.dataResidencyRegion,
        applicableDataProtectionLaw: parsed.data.applicableDataProtectionLaw,
        breachNotificationHours: parsed.data.breachNotificationHours,
        rtlSupport: parsed.data.rtlSupport ?? false,
        timelineRules: {
          type: "tribunal_directed",
          label: `${parsed.data.displayName} Timeline`,
          reminderDaysBeforeDeadline: [30, 7],
        },
      },
    });
  } catch {
    errorRedirect("/admin/jurisdiction-profiles", "Could not create profile - check the profile code is unique.");
  }

  await writeAudit({
    action: "jurisdiction_profile.created",
    actorUserId: user.id,
    metadata: { profileCode: parsed.data.profileCode },
  });

  revalidatePath("/admin/jurisdiction-profiles");
  successRedirect(
    "/admin/jurisdiction-profiles",
    `Profile "${parsed.data.displayName}" added - a new jurisdiction added by configuration, per Section 3.3 of the SOW/SRS.`,
  );
}

// --- Feature flags (Section 8 of the SOW/SRS) -------------------------------

const createFlagSchema = z.object({
  key: z.string().min(2),
  scope: z.enum(["platform", "institution", "reference"]),
});

export async function createFeatureFlagAction(formData: FormData) {
  const user = await requireSessionUser();
  await requirePermission(user, MODULE_KEYS.ADMIN, "create");

  const parsed = createFlagSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) errorRedirect("/admin/feature-flags", "Invalid input.");

  await prisma.featureFlag.create({
    data: {
      key: parsed.data.key,
      scope: parsed.data.scope,
      institutionId: parsed.data.scope === "institution" ? user.institutionId : null,
      enabled: true,
    },
  });

  await writeAudit({ action: "feature_flag.created", actorUserId: user.id, metadata: { key: parsed.data.key } });
  revalidatePath("/admin/feature-flags");
  successRedirect("/admin/feature-flags", "Feature flag created.");
}

export async function toggleFeatureFlagAction(formData: FormData) {
  const user = await requireSessionUser();
  await requirePermission(user, MODULE_KEYS.ADMIN, "edit");

  const id = String(formData.get("id"));
  const flag = await prisma.featureFlag.findUnique({ where: { id } });
  if (!flag) errorRedirect("/admin/feature-flags", "Flag not found.");

  await prisma.featureFlag.update({ where: { id }, data: { enabled: !flag.enabled } });
  await writeAudit({
    action: "feature_flag.toggled",
    actorUserId: user.id,
    entityId: id,
    metadata: { key: flag.key, enabled: !flag.enabled },
  });

  revalidatePath("/admin/feature-flags");
}
