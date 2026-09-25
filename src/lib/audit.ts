import "server-only";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";

/**
 * Immutable, read-only audit log (Module 5.12). Every entry's hash is
 * computed over the previous entry's hash plus this entry's own content,
 * forming a hash chain so any retrospective alteration of a past row is
 * detectable (the "immutable_hash" column at Annexure B, Section 3.17).
 */
export async function writeAudit(params: {
  action: string;
  actorUserId?: string | null;
  institutionId?: string | null;
  referenceId?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  metadata?: Record<string, unknown> | null;
}) {
  const last = await prisma.auditLogEntry.findFirst({
    orderBy: { createdAt: "desc" },
    select: { immutableHash: true },
  });

  const previousHash = last?.immutableHash ?? "GENESIS";
  const payload = JSON.stringify({
    previousHash,
    action: params.action,
    actorUserId: params.actorUserId ?? null,
    referenceId: params.referenceId ?? null,
    entityType: params.entityType ?? null,
    entityId: params.entityId ?? null,
    metadata: params.metadata ?? null,
    at: new Date().toISOString(),
  });
  const immutableHash = crypto.createHash("sha256").update(payload).digest("hex");

  await prisma.auditLogEntry.create({
    data: {
      action: params.action,
      actorUserId: params.actorUserId ?? null,
      institutionId: params.institutionId ?? null,
      referenceId: params.referenceId ?? null,
      entityType: params.entityType ?? null,
      entityId: params.entityId ?? null,
      metadata: (params.metadata as any) ?? undefined,
      immutableHash,
    },
  });
}
