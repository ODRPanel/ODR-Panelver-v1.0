import "server-only";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, type CurrentUser } from "@/lib/auth";
import { hasPermission, type Action, type ModuleKey, type PermissionSet } from "@/lib/permissions";

/** For use at the top of a Server Component / page: redirects to /login
 * when there is no valid session, so no page ever renders case content to
 * an unauthenticated request. */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/** For use at the top of a Server Action / mutation: throws rather than
 * redirecting, so the calling form can surface the error. This is the
 * "RBAC enforced at the API layer for every request, not the interface
 * alone" requirement at Section 6 of the SOW/SRS - every mutation re-checks
 * permission here regardless of what the UI already hid. */
export async function requireSessionUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated. Please log in again.");
  return user;
}

/**
 * Resolves the permission set that governs a user's access to a given
 * Reference: a Reference-scoped role assignment (a user may hold a
 * different role on different References - Annexure B, Section 3.6)
 * overrides the user's platform-primary role for that Reference only.
 */
export async function effectivePermissionSet(
  user: CurrentUser,
  referenceId?: string,
): Promise<PermissionSet> {
  if (!referenceId) return user.role.permissionSet;

  const assignment = await prisma.referenceRoleAssignment.findFirst({
    where: { referenceId, userId: user.id },
    include: { role: true },
  });

  return (assignment?.role.permissionSet as PermissionSet) ?? user.role.permissionSet;
}

export async function requirePermission(
  user: CurrentUser,
  moduleKey: ModuleKey | string,
  action: Action,
  referenceId?: string,
): Promise<void> {
  const permissionSet = await effectivePermissionSet(user, referenceId);
  if (!hasPermission(permissionSet, moduleKey, action)) {
    throw new Error(
      `Access denied: your role does not have "${action}" rights on module ${moduleKey}.`,
    );
  }
}

export async function can(
  user: CurrentUser,
  moduleKey: ModuleKey | string,
  action: Action,
  referenceId?: string,
): Promise<boolean> {
  const permissionSet = await effectivePermissionSet(user, referenceId);
  return hasPermission(permissionSet, moduleKey, action);
}

/** True where the user has ANY role assignment on the Reference, or is a
 * platform-wide role that is not Reference-scoped (Super Admin, Auditor,
 * Technical Support Administrator, Compliance Officer, Records Retention
 * Officer) - used to gate whether a Case appears in someone's list at all. */
export async function hasCaseAccess(user: CurrentUser, referenceId: string): Promise<boolean> {
  const platformWideRoles = [
    "Super Admin",
    "Auditor",
    "Technical Support Administrator",
    "Compliance Officer",
    "Records Retention Officer",
  ];
  if (platformWideRoles.includes(user.role.name)) return true;

  const assignment = await prisma.referenceRoleAssignment.findFirst({
    where: { referenceId, userId: user.id },
  });
  return Boolean(assignment);
}
