"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  createPendingMfaCookie,
  createSessionCookie,
  destroyPendingMfaCookie,
  destroySessionCookie,
  generateMfaQrCode,
  generateMfaSecret,
  getCurrentUser,
  hashPassword,
  readPendingMfaCookie,
  verifyPassword,
  verifyTotpCode,
} from "@/lib/auth";
import { writeAudit } from "@/lib/audit";

// This application deliberately avoids useFormState/useActionState (only
// available on React's canary channel) so every form works as a plain,
// progressively-enhanced HTML form against stable React 18: a Server
// Action either redirects to the next screen on success, or redirects
// back to the same screen with ?error=... on failure, which the page
// reads from searchParams to render an alert. No client-side JavaScript
// is required for any form in this application to function.

function errorRedirect(path: string, message: string): never {
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}

const loginSchema = z.object({
  email: z.string().email("Enter a valid email address."),
  password: z.string().min(1, "Enter your password."),
});

export async function loginAction(formData: FormData) {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    errorRedirect("/login", parsed.error.issues[0]?.message ?? "Invalid input.");
  }
  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user || user.isDeleted) {
    errorRedirect("/login", "Incorrect email or password.");
  }
  if (user.status !== "active") {
    errorRedirect("/login", "This account is suspended. Contact your Super Admin or Registrar.");
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    await writeAudit({ action: "login.failed", metadata: { email } });
    errorRedirect("/login", "Incorrect email or password.");
  }

  if (user.mfaEnabled) {
    await createPendingMfaCookie(user.id);
    redirect("/login/mfa");
  }

  await createSessionCookie(user.id, user.tokenVersion);
  await writeAudit({ action: "login.success", actorUserId: user.id });
  redirect("/dashboard");
}

const mfaSchema = z.object({
  code: z.string().min(6, "Enter the 6-digit code from your authenticator app.").max(6),
});

export async function verifyMfaAction(formData: FormData) {
  const userId = await readPendingMfaCookie();
  if (!userId) {
    errorRedirect("/login", "Your login attempt expired. Please log in again.");
  }
  const parsed = mfaSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    errorRedirect("/login/mfa", parsed.error.issues[0]?.message ?? "Invalid code.");
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !user.mfaSecret || user.status !== "active") {
    errorRedirect("/login", "Unable to verify. Please log in again.");
  }

  const valid = verifyTotpCode(user.mfaSecret, parsed.data.code);
  if (!valid) {
    await writeAudit({ action: "mfa.failed", actorUserId: user.id });
    errorRedirect("/login/mfa", "Incorrect code. Please try again.");
  }

  destroyPendingMfaCookie();
  await createSessionCookie(user.id, user.tokenVersion);
  await writeAudit({ action: "login.success.mfa", actorUserId: user.id });
  redirect("/dashboard");
}

export async function logoutAction() {
  const user = await getCurrentUser();
  if (user) await writeAudit({ action: "logout", actorUserId: user.id });
  destroySessionCookie();
  redirect("/login");
}

// --- MFA self-enrolment (Section 6 of the SOW/SRS: mandatory MFA before
// live case data is entered) ------------------------------------------------

export async function startMfaEnrollmentAction(): Promise<{ qrCodeDataUrl: string; secret: string }> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated.");

  const secret = generateMfaSecret();
  await prisma.user.update({ where: { id: user.id }, data: { mfaSecret: secret, mfaEnabled: false } });
  const qrCodeDataUrl = await generateMfaQrCode(user.email, secret);
  return { qrCodeDataUrl, secret };
}

export async function confirmMfaEnrollmentAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) errorRedirect("/login", "Not authenticated.");

  const parsed = mfaSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    errorRedirect("/profile/mfa", parsed.error.issues[0]?.message ?? "Invalid code.");
  }

  const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
  if (!dbUser?.mfaSecret) errorRedirect("/profile/mfa", "Start MFA enrolment first.");

  if (!verifyTotpCode(dbUser.mfaSecret, parsed.data.code)) {
    errorRedirect("/profile/mfa", "Incorrect code. Please try again.");
  }

  await prisma.user.update({ where: { id: user.id }, data: { mfaEnabled: true } });
  await writeAudit({ action: "mfa.enabled", actorUserId: user.id });
  redirect("/profile/mfa?success=" + encodeURIComponent("Multi-factor authentication is now enabled."));
}

export async function disableMfaAction() {
  const user = await getCurrentUser();
  if (!user) errorRedirect("/login", "Not authenticated.");
  await prisma.user.update({ where: { id: user.id }, data: { mfaEnabled: false, mfaSecret: null } });
  await writeAudit({ action: "mfa.disabled", actorUserId: user.id });
  redirect("/profile/mfa?success=" + encodeURIComponent("Multi-factor authentication has been disabled."));
}

// --- Bootstrap (Annexure A-1, Section 4.2, "Journey B"): the very first
// Super Admin account, only creatable while no user exists yet -------------

const bootstrapSchema = z.object({
  fullName: z.string().min(2, "Enter your full name."),
  email: z.string().email("Enter a valid email address."),
  password: z.string().min(8, "Use at least 8 characters."),
});

export async function bootstrapSuperAdminAction(formData: FormData) {
  const existingUsers = await prisma.user.count();
  if (existingUsers > 0) {
    errorRedirect("/login", "Setup has already been completed. Please log in.");
  }

  const parsed = bootstrapSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    errorRedirect("/setup", parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const role = await prisma.role.findUnique({ where: { name: "Super Admin" } });
  if (!role) {
    errorRedirect(
      "/setup",
      'Roles are not seeded yet. Open a terminal in the project folder and run "npm run db:seed" first.',
    );
  }

  const institution = await prisma.institution.upsert({
    where: { id: "00000000-0000-0000-0000-000000000001" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000001",
      name: "Default Institution",
      type: "institutional",
    },
  });

  const passwordHash = await hashPassword(parsed.data.password);
  const user = await prisma.user.create({
    data: {
      fullName: parsed.data.fullName,
      email: parsed.data.email.toLowerCase(),
      passwordHash,
      roleId: role.id,
      institutionId: institution.id,
      status: "active",
    },
  });

  await createSessionCookie(user.id, user.tokenVersion);
  await writeAudit({ action: "bootstrap.super_admin_created", actorUserId: user.id });
  redirect("/dashboard");
}
