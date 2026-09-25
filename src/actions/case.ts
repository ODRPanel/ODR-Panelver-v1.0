"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSessionUser, requirePermission, hasCaseAccess } from "@/lib/rbac";
import { MODULE_KEYS } from "@/lib/permissions";
import { writeAudit } from "@/lib/audit";
import { computeTimelineDeadline, computeConsentExtendedDeadline } from "@/lib/jurisdictionEngine";
import { assignNextPartySequence, designationLabel } from "@/lib/designation";

function errorRedirect(path: string, message: string): never {
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}
function successRedirect(path: string, message: string): never {
  redirect(`${path}?success=${encodeURIComponent(message)}`);
}

async function nextReferenceNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const count = await prisma.case.count();
  return `ODR-${year}-${String(count + 1).padStart(4, "0")}`;
}

// --- Case Initiation (Module 5.1) -------------------------------------------

const createCaseSchema = z.object({
  title: z.string().min(3, "Enter a case title."),
  jurisdictionProfileId: z.string().uuid("Select a Jurisdiction Rule Profile."),
  type: z.enum(["ad_hoc", "institutional"]),
  compositionType: z.enum(["sole", "three_member", "five_member", "other_odd_number"]),
  seat: z.string().optional(),
  ledgerCurrency: z
    .union([z.literal(""), z.string().length(3, "Use a 3-letter currency code.")])
    .optional(),
});

export async function createCaseAction(formData: FormData) {
  const user = await requireSessionUser();
  await requirePermission(user, MODULE_KEYS.CASE_INITIATION, "create");

  const parsed = createCaseSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    errorRedirect("/cases/new", parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const profile = await prisma.jurisdictionProfile.findUnique({
    where: { id: parsed.data.jurisdictionProfileId },
  });
  if (!profile) errorRedirect("/cases/new", "Jurisdiction Rule Profile not found.");

  const referenceNumber = await nextReferenceNumber();
  const timelineStartDate = new Date();
  const timelineDeadline = computeTimelineDeadline(profile, timelineStartDate);

  const created = await prisma.$transaction(async (tx) => {
    const kase = await tx.case.create({
      data: {
        institutionId: user.institutionId,
        referenceNumber,
        title: parsed.data.title,
        jurisdictionProfileId: profile.id,
        type: parsed.data.type,
        seat: parsed.data.seat || null,
        ledgerCurrency: (parsed.data.ledgerCurrency || profile.defaultCurrency).toUpperCase(),
        timelineStartDate,
        timelineDeadline,
        retentionPeriodMonths: null,
        createdByUserId: user.id,
        status: "constitution",
      },
    });

    await tx.tribunal.create({
      data: {
        referenceId: kase.id,
        compositionType: parsed.data.compositionType,
        status: "nominating",
      },
    });

    // The initiator (Section 5.1: Claimant/Party, Counsel, or an Arbitrator
    // post-appointment may each trigger Case Initiation) is given a
    // Reference-level role assignment mirroring their platform role, so
    // they retain access to the Reference they just created.
    await tx.referenceRoleAssignment.create({
      data: { referenceId: kase.id, userId: user.id, roleId: user.role.id },
    });

    return kase;
  });

  await writeAudit({
    action: "case.created",
    actorUserId: user.id,
    referenceId: created.id,
    entityType: "Case",
    entityId: created.id,
    metadata: { referenceNumber, jurisdictionProfile: profile.profileCode },
  });

  redirect(`/cases/${created.id}`);
}

export async function acceptConfidentialityAction(formData: FormData) {
  const user = await requireSessionUser();
  const referenceId = String(formData.get("referenceId"));
  await requirePermission(user, MODULE_KEYS.CASE_INITIATION, "edit", referenceId);

  await prisma.case.update({ where: { id: referenceId }, data: { confidentialityAccepted: true } });
  await writeAudit({ action: "confidentiality.accepted", actorUserId: user.id, referenceId });
  revalidatePath(`/cases/${referenceId}`);
}

export async function toggleFidicAction(formData: FormData) {
  const user = await requireSessionUser();
  const referenceId = String(formData.get("referenceId"));
  await requirePermission(user, MODULE_KEYS.CASE_INITIATION, "edit", referenceId);

  const kase = await prisma.case.findUniqueOrThrow({ where: { id: referenceId } });
  const nextValue = !kase.fidicEnabled;

  await prisma.case.update({ where: { id: referenceId }, data: { fidicEnabled: nextValue } });

  if (nextValue) {
    const contractForm = String(formData.get("contractForm") || "FIDIC Red Book");
    const existing = await prisma.fIDICDisputeReferral.findUnique({ where: { referenceId } });
    if (!existing) {
      await prisma.fIDICDisputeReferral.create({ data: { referenceId, contractForm } });
    }
  }

  await writeAudit({ action: "fidic.module_toggled", actorUserId: user.id, referenceId, metadata: { enabled: nextValue } });
  revalidatePath(`/cases/${referenceId}`);
}

const requestExtensionSchema = z.object({
  referenceId: z.string().uuid(),
  kind: z.enum(["consent", "court_or_institution"]),
  newDeadline: z.string().optional(),
});

export async function requestTimelineExtensionAction(formData: FormData) {
  const user = await requireSessionUser();
  const parsed = requestExtensionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) errorRedirect("/cases", "Invalid input.");
  await requirePermission(user, MODULE_KEYS.TIMELINE, "edit", parsed.data.referenceId);

  const kase = await prisma.case.findUniqueOrThrow({
    where: { id: parsed.data.referenceId },
    include: { jurisdictionProfile: true },
  });

  let newDeadline: Date | null = null;
  if (parsed.data.kind === "consent") {
    newDeadline = kase.timelineDeadline
      ? computeConsentExtendedDeadline(kase.jurisdictionProfile, kase.timelineDeadline)
      : null;
  } else if (parsed.data.newDeadline) {
    newDeadline = new Date(parsed.data.newDeadline);
  }

  if (!newDeadline) errorRedirect(`/cases/${kase.id}`, "Could not compute an extended deadline.");

  await prisma.case.update({ where: { id: kase.id }, data: { timelineDeadline: newDeadline } });
  await writeAudit({
    action: `timeline.extended.${parsed.data.kind}`,
    actorUserId: user.id,
    referenceId: kase.id,
    metadata: { newDeadline },
  });

  revalidatePath(`/cases/${kase.id}`);
}

// --- Party Onboarding (Section 4.3 / Module 5.1) ----------------------------

const addPartySchema = z.object({
  referenceId: z.string().uuid(),
  designation: z.enum(["claimant", "applicant", "respondent", "counter_claimant", "cross_claimant", "cross_respondent"]),
  fullName: z.string().min(2, "Enter the Party's name."),
  organisation: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  postalAddress: z.string().optional(),
  partyUserId: z.string().optional(),
  representedByCounselUserId: z.string().optional(),
  thirdPartyFunderDisclosed: z.coerce.boolean().optional(),
  thirdPartyFunderDetails: z.string().optional(),
});

export async function addPartyAction(formData: FormData) {
  const user = await requireSessionUser();
  const raw = Object.fromEntries(formData);
  const parsed = addPartySchema.safeParse({
    ...raw,
    thirdPartyFunderDisclosed: raw.thirdPartyFunderDisclosed === "on",
  });
  if (!parsed.success) errorRedirect("/cases", parsed.error.issues[0]?.message ?? "Invalid input.");

  await requirePermission(user, MODULE_KEYS.CASE_INITIATION, "create", parsed.data.referenceId);

  const seq = await assignNextPartySequence(parsed.data.referenceId, parsed.data.designation);

  await prisma.$transaction(async (tx) => {
    if (seq.retro) {
      await tx.party.update({
        where: { id: seq.retro.partyId },
        data: { sequenceNo: seq.retro.sequenceNo, displayLabel: seq.retro.displayLabel },
      });
    }

    const party = await tx.party.create({
      data: {
        referenceId: parsed.data.referenceId,
        designation: parsed.data.designation,
        sequenceNo: seq.sequenceNo,
        displayLabel: seq.displayLabel,
        fullName: parsed.data.fullName,
        organisation: parsed.data.organisation || null,
        email: parsed.data.email || null,
        phone: parsed.data.phone || null,
        postalAddress: parsed.data.postalAddress || null,
        partyUserId: parsed.data.partyUserId || null,
        representedByCounselUserId: parsed.data.representedByCounselUserId || null,
        thirdPartyFunderDisclosed: parsed.data.thirdPartyFunderDisclosed ?? false,
        thirdPartyFunderDetails: parsed.data.thirdPartyFunderDetails || null,
      },
    });

    // Give the onboarded Party/Counsel login a Reference-level role
    // assignment so they can see this specific Reference.
    for (const [userId, roleName] of [
      [parsed.data.partyUserId, "Party"],
      [parsed.data.representedByCounselUserId, "Counsel"],
    ] as const) {
      if (!userId) continue;
      const role = await tx.role.findUnique({ where: { name: roleName } });
      if (!role) continue;
      await tx.referenceRoleAssignment.upsert({
        where: { referenceId_userId_roleId: { referenceId: parsed.data.referenceId, userId, roleId: role.id } },
        update: {},
        create: { referenceId: parsed.data.referenceId, userId, roleId: role.id },
      });
    }

    return party;
  });

  await writeAudit({
    action: "party.onboarded",
    actorUserId: user.id,
    referenceId: parsed.data.referenceId,
    metadata: { designation: parsed.data.designation, label: seq.displayLabel },
  });

  revalidatePath(`/cases/${parsed.data.referenceId}/parties`);
  successRedirect(`/cases/${parsed.data.referenceId}/parties`, `${seq.displayLabel} onboarded.`);
}

// --- Multi-Arbitrator Tribunal Constitution (Section 4.4 / Stage 1A) -------

const nominateSchema = z.object({
  referenceId: z.string().uuid(),
  arbitratorUserId: z.string().uuid("Select an Arbitrator."),
  nominationSource: z.enum([
    "claimant_nominated",
    "respondent_nominated",
    "co_arbitrator_nominated",
    "institution_appointed",
    "party_agreed_sole",
  ]),
  nominatedByPartyId: z.string().optional(),
  isPresiding: z.coerce.boolean().optional(),
});

export async function nominateArbitratorAction(formData: FormData) {
  const user = await requireSessionUser();
  const raw = Object.fromEntries(formData);
  const parsed = nominateSchema.safeParse({ ...raw, isPresiding: raw.isPresiding === "on" });
  if (!parsed.success) errorRedirect("/cases", parsed.error.issues[0]?.message ?? "Invalid input.");

  await requirePermission(user, MODULE_KEYS.CASE_INITIATION, "edit", parsed.data.referenceId);

  const tribunal = await prisma.tribunal.findUniqueOrThrow({
    where: { referenceId: parsed.data.referenceId },
    include: { members: true },
  });

  const requiredCount = { sole: 1, three_member: 3, five_member: 5, other_odd_number: tribunal.members.length + 1 }[
    tribunal.compositionType
  ];

  if (tribunal.members.length >= requiredCount) {
    errorRedirect(`/cases/${parsed.data.referenceId}/tribunal`, "The Tribunal is already fully constituted.");
  }

  const isPresiding = tribunal.compositionType === "sole" ? true : parsed.data.isPresiding ?? false;

  await prisma.tribunalMember.create({
    data: {
      tribunalId: tribunal.id,
      arbitratorUserId: parsed.data.arbitratorUserId,
      nominationSource: parsed.data.nominationSource,
      nominatedByPartyId: parsed.data.nominatedByPartyId || null,
      isPresiding,
    },
  });

  const newCount = tribunal.members.length + 1;
  if (newCount >= requiredCount) {
    await prisma.tribunal.update({ where: { id: tribunal.id }, data: { status: "constituted" } });
  }

  await writeAudit({
    action: "tribunal.member_nominated",
    actorUserId: user.id,
    referenceId: parsed.data.referenceId,
    metadata: { nominationSource: parsed.data.nominationSource, isPresiding },
  });

  revalidatePath(`/cases/${parsed.data.referenceId}/tribunal`);
  successRedirect(`/cases/${parsed.data.referenceId}/tribunal`, "Arbitrator nominated.");
}

export async function recordDisclosureAction(formData: FormData) {
  const user = await requireSessionUser();
  const memberId = String(formData.get("memberId"));
  const referenceId = String(formData.get("referenceId"));
  const disclosureText = String(formData.get("disclosureText") || "");

  await requirePermission(user, MODULE_KEYS.CASE_INITIATION, "edit", referenceId);

  await prisma.tribunalMember.update({
    where: { id: memberId },
    data: { disclosureText, disclosureFiledAt: new Date() },
  });

  await writeAudit({ action: "tribunal.disclosure_filed", actorUserId: user.id, referenceId, entityId: memberId });
  revalidatePath(`/cases/${referenceId}/tribunal`);
}

export async function confirmAppointmentAction(formData: FormData) {
  const user = await requireSessionUser();
  const memberId = String(formData.get("memberId"));
  const referenceId = String(formData.get("referenceId"));

  await requirePermission(user, MODULE_KEYS.CASE_INITIATION, "decide", referenceId);

  await prisma.tribunalMember.update({ where: { id: memberId }, data: { acceptedAt: new Date() } });
  await writeAudit({ action: "tribunal.appointment_confirmed", actorUserId: user.id, referenceId, entityId: memberId });
  revalidatePath(`/cases/${referenceId}/tribunal`);
}
