"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSessionUser } from "@/lib/rbac";

export async function markNotificationReadAction(formData: FormData) {
  const user = await requireSessionUser();
  const id = String(formData.get("id"));

  await prisma.notification.updateMany({
    where: { id, recipientUserId: user.id },
    data: { readAt: new Date() },
  });

  revalidatePath("/notifications");
}
