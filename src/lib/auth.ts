import "server-only";
import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { authenticator } from "otplib";
import QRCode from "qrcode";
import { prisma } from "@/lib/prisma";
import type { PermissionSet } from "@/lib/permissions";

export const SESSION_COOKIE_NAME = "odr_session";
export const PENDING_MFA_COOKIE_NAME = "odr_pending_mfa";
const PENDING_MFA_TTL_SECONDS = 60 * 5;
const SESSION_TTL_SECONDS = 60 * 60 * 12; // 12 hours, consistent with an
// enterprise idle-timeout expectation (Section 6 of the SOW/SRS) without
// requiring a full identity-provider deployment for local evaluation.

function getSecretKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error(
      "SESSION_SECRET is missing or too short. Set a long random value in your .env file before starting the app.",
    );
  }
  return new TextEncoder().encode(secret);
}

// --- Passwords -------------------------------------------------------------

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 12);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

// --- MFA (TOTP) --------------------------------------------------------------
// Built-in authenticator-app MFA, per the SOW/SRS's own documented "Journey
// B" bootstrap/evaluation login path (Annexure A-1, Section 4.2), pending a
// production Enterprise SSO/OIDC deployment.

export function generateMfaSecret(): string {
  return authenticator.generateSecret();
}

export async function generateMfaQrCode(email: string, secret: string): Promise<string> {
  const otpauth = authenticator.keyuri(email, "ODR Panel", secret);
  return QRCode.toDataURL(otpauth);
}

export function verifyTotpCode(secret: string, token: string): boolean {
  try {
    return authenticator.verify({ token, secret });
  } catch {
    return false;
  }
}

// --- Session tokens ----------------------------------------------------------

interface SessionPayload {
  userId: string;
  tokenVersion: number;
}

async function signSession(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(getSecretKey());
}

async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    if (typeof payload.userId !== "string" || typeof payload.tokenVersion !== "number") {
      return null;
    }
    return { userId: payload.userId, tokenVersion: payload.tokenVersion };
  } catch {
    return null;
  }
}

export async function createSessionCookie(userId: string, tokenVersion: number) {
  const token = await signSession({ userId, tokenVersion });
  cookies().set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export function destroySessionCookie() {
  cookies().set(SESSION_COOKIE_NAME, "", { path: "/", maxAge: 0 });
}

/** Short-lived, single-purpose token bridging the password-check step and
 * the MFA-code step of login without creating a full session until both
 * factors are satisfied. */
export async function createPendingMfaCookie(userId: string) {
  const token = await new SignJWT({ userId, purpose: "mfa_pending" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${PENDING_MFA_TTL_SECONDS}s`)
    .sign(getSecretKey());

  cookies().set(PENDING_MFA_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: PENDING_MFA_TTL_SECONDS,
  });
}

export async function readPendingMfaCookie(): Promise<string | null> {
  const token = cookies().get(PENDING_MFA_COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    if (payload.purpose !== "mfa_pending" || typeof payload.userId !== "string") return null;
    return payload.userId;
  } catch {
    return null;
  }
}

export function destroyPendingMfaCookie() {
  cookies().set(PENDING_MFA_COOKIE_NAME, "", { path: "/", maxAge: 0 });
}

export type CurrentUser = {
  id: string;
  fullName: string;
  email: string;
  status: string;
  mfaEnabled: boolean;
  institutionId: string | null;
  role: {
    id: string;
    name: string;
    permissionSet: PermissionSet;
  };
};

/** Re-validated on every call against the database - RBAC is enforced at
 * this layer for every request, not only hidden by the interface, per
 * Section 6 ("Security") of the SOW/SRS. */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const token = cookies().get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  const session = await verifySession(token);
  if (!session) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    include: { role: true },
  });

  if (!user || user.isDeleted || user.status !== "active") return null;
  if (user.tokenVersion !== session.tokenVersion) return null; // revoked

  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    status: user.status,
    mfaEnabled: user.mfaEnabled,
    institutionId: user.institutionId,
    role: {
      id: user.role.id,
      name: user.role.name,
      permissionSet: user.role.permissionSet as PermissionSet,
    },
  };
}
