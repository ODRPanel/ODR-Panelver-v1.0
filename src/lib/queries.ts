import "server-only";
import { prisma } from "@/lib/prisma";
import type { CurrentUser } from "@/lib/auth";

const PLATFORM_WIDE_ROLES = [
  "Super Admin",
  "Auditor",
  "Technical Support Administrator",
  "Compliance Officer",
  "Records Retention Officer",
];

/** The set of References a user may see in a list view: every Reference
 * for a platform-wide oversight role, or only those the user holds a
 * Reference-level role assignment on (Annexure B, Section 3.6). */
export async function getVisibleCases(user: CurrentUser) {
  const isPlatformWide = PLATFORM_WIDE_ROLES.includes(user.role.name);

  return prisma.case.findMany({
    where: isPlatformWide
      ? { isDeleted: false }
      : { isDeleted: false, roleAssignments: { some: { userId: user.id } } },
    include: {
      jurisdictionProfile: true,
      parties: true,
      tribunal: { include: { members: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}
