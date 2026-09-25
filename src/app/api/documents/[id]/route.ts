import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { hasCaseAccess } from "@/lib/rbac";
import { absoluteStoragePath } from "@/lib/storage";
import { writeAudit } from "@/lib/audit";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const doc = await prisma.documentRepositoryItem.findUnique({ where: { id: params.id } });
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const allowed = await hasCaseAccess(user, doc.referenceId);
  if (!allowed) return NextResponse.json({ error: "Access denied" }, { status: 403 });

  const buffer = await readFile(absoluteStoragePath(doc.storagePath));

  await writeAudit({
    action: "document.downloaded",
    actorUserId: user.id,
    referenceId: doc.referenceId,
    entityType: "DocumentRepositoryItem",
    entityId: doc.id,
  });

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": doc.mimeType,
      "Content-Disposition": `attachment; filename="${doc.fileName.replace(/"/g, "")}"`,
    },
  });
}
