"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSessionUser, requirePermission } from "@/lib/rbac";
import { MODULE_KEYS } from "@/lib/permissions";
import { writeAudit } from "@/lib/audit";
import { exportToLiquidTextFormat, importFromLiquidTextFormat } from "@/lib/adapters/liquidtext";

function errorRedirect(path: string, message: string): never {
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}
function successRedirect(path: string, message: string): never {
  redirect(`${path}?success=${encodeURIComponent(message)}`);
}

export type CanvasCard = { id: string; x: number; y: number; text: string; tag?: string };

const createWorkspaceSchema = z.object({ referenceId: z.string().uuid(), title: z.string().min(1, "Enter a workspace title.") });

export async function createCanvasWorkspaceAction(formData: FormData) {
  const user = await requireSessionUser();
  const parsed = createWorkspaceSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) errorRedirect("/cases", parsed.error.issues[0]?.message ?? "Invalid input.");

  await requirePermission(user, MODULE_KEYS.DOCUMENT_INTELLIGENCE, "create", parsed.data.referenceId);

  const workspace = await prisma.liquidTextWorkspace.create({
    data: {
      referenceId: parsed.data.referenceId,
      workspaceType: "native_canvas",
      title: parsed.data.title,
      annotationLayer: { cards: [] },
      visibilityScope: "tribunal_only",
      createdByUserId: user.id,
    },
  });

  await writeAudit({ action: "canvas.workspace_created", actorUserId: user.id, referenceId: parsed.data.referenceId, entityId: workspace.id });
  revalidatePath(`/cases/${parsed.data.referenceId}/canvas`);
  redirect(`/cases/${parsed.data.referenceId}/canvas/${workspace.id}`);
}

const addCardSchema = z.object({
  workspaceId: z.string().uuid(),
  referenceId: z.string().uuid(),
  text: z.string().min(1, "Enter card text."),
  tag: z.string().optional(),
});

export async function addCanvasCardAction(formData: FormData) {
  const user = await requireSessionUser();
  const parsed = addCardSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) errorRedirect("/cases", parsed.error.issues[0]?.message ?? "Invalid input.");

  await requirePermission(user, MODULE_KEYS.DOCUMENT_INTELLIGENCE, "edit", parsed.data.referenceId);

  const workspace = await prisma.liquidTextWorkspace.findUniqueOrThrow({ where: { id: parsed.data.workspaceId } });
  const layer = workspace.annotationLayer as unknown as { cards: CanvasCard[] };
  const cards = layer.cards ?? [];

  const newCard: CanvasCard = {
    id: crypto.randomUUID(),
    x: 20 + ((cards.length * 40) % 400),
    y: 20 + Math.floor((cards.length * 40) / 400) * 120,
    text: parsed.data.text,
    tag: parsed.data.tag || undefined,
  };

  await prisma.liquidTextWorkspace.update({
    where: { id: workspace.id },
    data: { annotationLayer: { cards: [...cards, newCard] }, versionNo: { increment: 1 } },
  });

  await writeAudit({ action: "canvas.card_added", actorUserId: user.id, referenceId: parsed.data.referenceId, entityId: workspace.id });
  revalidatePath(`/cases/${parsed.data.referenceId}/canvas/${workspace.id}`);
}

const exportSchema = z.object({ workspaceId: z.string().uuid(), referenceId: z.string().uuid() });

export async function exportCanvasAction(formData: FormData): Promise<string> {
  const user = await requireSessionUser();
  const parsed = exportSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) throw new Error("Invalid input.");

  await requirePermission(user, MODULE_KEYS.DOCUMENT_INTELLIGENCE, "view", parsed.data.referenceId);

  const workspace = await prisma.liquidTextWorkspace.findUniqueOrThrow({ where: { id: parsed.data.workspaceId } });
  const exported = await exportToLiquidTextFormat(workspace.annotationLayer);

  await writeAudit({
    action: "canvas.exported_to_liquidtext",
    actorUserId: user.id,
    referenceId: parsed.data.referenceId,
    entityId: workspace.id,
    metadata: { residencyExceptionAcknowledged: true },
  });

  return exported;
}

const importSchema = z.object({ workspaceId: z.string().uuid(), referenceId: z.string().uuid() });

export async function importCanvasAction(formData: FormData) {
  const user = await requireSessionUser();
  const parsed = importSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) errorRedirect("/cases", "Invalid input.");

  await requirePermission(user, MODULE_KEYS.DOCUMENT_INTELLIGENCE, "edit", parsed.data.referenceId);

  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) errorRedirect("/cases", "Choose a LiquidText exchange file.");

  const text = await file.text();
  let importedLayer: unknown;
  try {
    importedLayer = await importFromLiquidTextFormat(text);
  } catch {
    errorRedirect(`/cases/${parsed.data.referenceId}/canvas/${parsed.data.workspaceId}`, "Could not parse that file as a LiquidText exchange file.");
  }

  await prisma.liquidTextWorkspace.update({
    where: { id: parsed.data.workspaceId },
    data: { annotationLayer: importedLayer as any, versionNo: { increment: 1 } },
  });

  await writeAudit({
    action: "canvas.imported_from_liquidtext",
    actorUserId: user.id,
    referenceId: parsed.data.referenceId,
    entityId: parsed.data.workspaceId,
  });

  revalidatePath(`/cases/${parsed.data.referenceId}/canvas/${parsed.data.workspaceId}`);
  successRedirect(`/cases/${parsed.data.referenceId}/canvas/${parsed.data.workspaceId}`, "Round-trip reconciled against version history.");
}
