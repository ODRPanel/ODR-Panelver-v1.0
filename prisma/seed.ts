import { PrismaClient, ProfileCode } from "@prisma/client";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { addMonths, addDays, subDays } from "date-fns";
import { DEFAULT_ROLE_PERMISSIONS, SYSTEM_ROLES } from "../src/lib/permissions";

const prisma = new PrismaClient();

const DEFAULT_INSTITUTION_ID = "00000000-0000-0000-0000-000000000001";
const DEMO_PASSWORD = "Passw0rd!1";

async function seedInstitution() {
  return prisma.institution.upsert({
    where: { id: DEFAULT_INSTITUTION_ID },
    update: {},
    create: {
      id: DEFAULT_INSTITUTION_ID,
      name: "Default Institution (Local Evaluation)",
      type: "institutional",
    },
  });
}

async function seedRoles() {
  const roles: Record<string, string> = {};
  for (const name of SYSTEM_ROLES) {
    const role = await prisma.role.upsert({
      where: { name },
      update: { permissionSet: DEFAULT_ROLE_PERMISSIONS[name] as any },
      create: { name, permissionSet: DEFAULT_ROLE_PERMISSIONS[name] as any, isSystem: true },
    });
    roles[name] = role.id;
  }
  return roles;
}

// Section 3.1 of the SOW/SRS - the six launch Jurisdiction Rule Profiles,
// transcribed field-for-field from the two tables at that section.
async function seedJurisdictionProfiles() {
  const profiles: Array<Parameters<typeof prisma.jurisdictionProfile.upsert>[0]["create"]> = [
    {
      profileCode: ProfileCode.INDIA,
      displayName: "India",
      governingArbitrationLaw: "Arbitration and Conciliation Act, 1996",
      evidenceRegime: "Evidence Act, 1872 / Bharatiya Sakshya Adhiniyam, 2023 (Ss. 65A/65B)",
      confidentialityDefault: "confidential_by_default",
      feeScheduleType: "ad_valorem",
      defaultCurrency: "INR",
      dataResidencyRegion: "AWS ap-south-1 (Mumbai) / Azure Central India",
      applicableDataProtectionLaw:
        "Digital Personal Data Protection Act, 2023 (72-hour breach-notification target)",
      breachNotificationHours: 72,
      rtlSupport: false,
      timelineRules: {
        type: "statutory",
        label: "Section 29A Timeline",
        targetMonths: 12,
        consentExtensionMonths: 6,
        courtOrInstitutionExtensionAuthority: "Competent Court under Section 29A(4)/(5)",
        reminderDaysBeforeDeadline: [90, 30, 7],
      },
    },
    {
      profileCode: ProfileCode.DIAC,
      displayName: "UAE (Dubai) - DIAC",
      governingArbitrationLaw: "UAE Federal Arbitration Law No. 6 of 2018; DIAC Arbitration Rules 2022",
      evidenceRegime: "UAE Federal Evidence Law / DIFC Courts practice, as applicable to the seat chosen",
      confidentialityDefault: "confidential_by_default",
      feeScheduleType: "ad_valorem",
      defaultCurrency: "AED",
      dataResidencyRegion: "Nearest available UAE/Middle East cloud region",
      applicableDataProtectionLaw:
        "UAE Federal Decree-Law No. 45 of 2021 (PDPL); DIFC Data Protection Law No. 5 of 2020 where the seat is DIFC",
      breachNotificationHours: 72,
      rtlSupport: true,
      timelineRules: {
        type: "tribunal_directed",
        label: "DIAC Tribunal-Directed Timeline (Emergency Arbitrator under Art. 15)",
        reminderDaysBeforeDeadline: [30, 7],
      },
    },
    {
      profileCode: ProfileCode.SIAC,
      displayName: "Singapore - SIAC",
      governingArbitrationLaw: "Singapore International Arbitration Act 1994 (IAA), incorporating the UNCITRAL Model Law",
      evidenceRegime: "Singapore Evidence Act 1893; Electronic Transactions Act 2010",
      confidentialityDefault: "confidential_by_default",
      feeScheduleType: "ad_valorem",
      defaultCurrency: "SGD",
      dataResidencyRegion: "AWS ap-southeast-1 (Singapore)",
      applicableDataProtectionLaw: "Personal Data Protection Act 2012 (PDPA)",
      breachNotificationHours: 72,
      rtlSupport: false,
      timelineRules: {
        type: "institutional_target",
        label: "SIAC Expedited Procedure Target (Rule 5.3)",
        targetMonths: 6,
        reminderDaysBeforeDeadline: [30, 7],
      },
    },
    {
      profileCode: ProfileCode.LCIA,
      displayName: "England (London) - LCIA",
      governingArbitrationLaw:
        "English Arbitration Act 1996, incorporating (with modification) UNCITRAL Model Law principles",
      evidenceRegime: "Civil Evidence Act 1995; Electronic Communications Act 2000",
      confidentialityDefault: "general_duty",
      feeScheduleType: "hourly",
      defaultCurrency: "GBP",
      dataResidencyRegion: "AWS eu-west-2 (London) or comparable UK/EU region",
      applicableDataProtectionLaw: "UK GDPR and the Data Protection Act 2018",
      breachNotificationHours: 72,
      rtlSupport: false,
      timelineRules: {
        type: "tribunal_directed",
        label: "LCIA Tribunal-Directed Timeline",
        reminderDaysBeforeDeadline: [30, 7],
      },
    },
    {
      profileCode: ProfileCode.ICC,
      displayName: "ICC (seat-neutral)",
      governingArbitrationLaw:
        "UNCITRAL Model Law principles as adopted at the chosen seat; ICC Rules of Arbitration govern procedure",
      evidenceRegime: "Governed by the curial law of the chosen seat",
      confidentialityDefault: "no_default",
      feeScheduleType: "ad_valorem",
      defaultCurrency: "USD",
      dataResidencyRegion: "Seat-dependent; defaults to an EU region where the seat is within the EU/EEA",
      applicableDataProtectionLaw:
        "The data-protection law of the chosen seat, e.g. EU/UK GDPR where the seat is within the EU/EEA/UK",
      breachNotificationHours: 72,
      rtlSupport: false,
      timelineRules: {
        type: "institutional_target",
        label: "ICC Article 31 Award Target",
        targetMonths: 6,
        anchorEvent: "terms_of_reference_signature",
        reminderDaysBeforeDeadline: [30, 7],
      },
    },
    {
      profileCode: ProfileCode.USA,
      displayName: "USA",
      governingArbitrationLaw:
        "Federal Arbitration Act, 9 U.S.C. §§ 1 et seq.; relevant State arbitration statutes where applicable",
      evidenceRegime: "Federal Rules of Evidence; ESIGN Act, 15 U.S.C. § 7001 et seq.",
      confidentialityDefault: "no_default",
      feeScheduleType: "ad_valorem",
      defaultCurrency: "USD",
      dataResidencyRegion: "AWS us-east-1 or comparable US region, subject to State-specific requirements",
      applicableDataProtectionLaw:
        "Applicable US State privacy law (e.g. CCPA) and sectoral federal law - no single federal statute applies generally",
      breachNotificationHours: 72,
      rtlSupport: false,
      timelineRules: {
        type: "tribunal_directed",
        label: "AAA-ICDR Tribunal-Directed Timeline",
        reminderDaysBeforeDeadline: [30, 7],
      },
    },
  ];

  const created: Record<string, string> = {};
  for (const p of profiles) {
    const row = await prisma.jurisdictionProfile.upsert({
      where: { profileCode: p.profileCode },
      update: p,
      create: p,
    });
    created[p.profileCode as string] = row.id;
  }
  return created;
}

async function seedFeatureFlags() {
  const flags: Array<{ key: string; enabled: boolean }> = [
    { key: "phase2-court-enforcement-tracker", enabled: true },
    { key: "phase2-compliance-breach", enabled: true },
    { key: "phase3-document-intelligence", enabled: true },
    // Phase 4 AI Layer is withheld pending the AI-governance sign-off and
    // pilot at Section 11.4 of the SOW/SRS - off by default on every fresh
    // install, an institution opts in explicitly from the admin console.
    { key: "phase4-ai-layer", enabled: false },
  ];
  for (const f of flags) {
    const exists = await prisma.featureFlag.findFirst({ where: { key: f.key, scope: "platform" } });
    if (!exists) {
      await prisma.featureFlag.create({ data: { key: f.key, scope: "platform", enabled: f.enabled } });
    }
  }
}

const DEMO_USERS: Array<{ email: string; fullName: string; role: (typeof SYSTEM_ROLES)[number] }> = [
  { email: "superadmin@odrpanel.local", fullName: "Sana Admin", role: "Super Admin" },
  { email: "registrar@odrpanel.local", fullName: "Rita Registrar", role: "Registrar" },
  { email: "appointing.authority@odrpanel.local", fullName: "Adrian Appointing", role: "Appointing Authority" },
  { email: "arbitrator@odrpanel.local", fullName: "Arvind Arbitrator", role: "Arbitrator" },
  { email: "presiding.arbitrator@odrpanel.local", fullName: "Priya Presiding", role: "Arbitrator" },
  { email: "co.arbitrator@odrpanel.local", fullName: "Chandra Co-Arbitrator", role: "Arbitrator" },
  { email: "emergency.arbitrator@odrpanel.local", fullName: "Emma Emergency", role: "Emergency Arbitrator" },
  { email: "tribunal.secretary@odrpanel.local", fullName: "Tariq Secretary", role: "Tribunal Secretary" },
  { email: "case.manager@odrpanel.local", fullName: "Carla Manager", role: "Case Manager" },
  { email: "claimant@odrpanel.local", fullName: "Priya Claimant", role: "Party" },
  { email: "respondent@odrpanel.local", fullName: "Rajesh Respondent", role: "Party" },
  { email: "counsel@odrpanel.local", fullName: "Cyrus Counsel", role: "Counsel" },
  { email: "auditor@odrpanel.local", fullName: "Alia Auditor", role: "Auditor" },
  { email: "compliance.officer@odrpanel.local", fullName: "Concetta Compliance", role: "Compliance Officer" },
  { email: "support.admin@odrpanel.local", fullName: "Sam Support", role: "Technical Support Administrator" },
  { email: "taxing.officer@odrpanel.local", fullName: "Tom Taxing", role: "Taxing Officer" },
  { email: "mediator@odrpanel.local", fullName: "Mira Mediator", role: "Mediator" },
  { email: "retention.officer@odrpanel.local", fullName: "Rehan Retention", role: "Records Retention Officer" },
  { email: "ombudsman@odrpanel.local", fullName: "Omar Ombudsman", role: "Ombudsman" },
  { email: "observer@odrpanel.local", fullName: "Olivia Observer", role: "Observer" },
];

async function seedUsers(roleIds: Record<string, string>) {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);
  const users: Record<string, string> = {};
  for (const u of DEMO_USERS) {
    const row = await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: {
        email: u.email,
        fullName: u.fullName,
        passwordHash,
        roleId: roleIds[u.role],
        institutionId: DEFAULT_INSTITUTION_ID,
        status: "active",
      },
    });
    users[u.email] = row.id;
  }
  return users;
}

async function seedTemplates(profileIds: Record<string, string>) {
  const templates: Array<{ jurisdictionProfileId: string | null; templateType: any; title: string; bodyMarkup: string }> = [
    {
      jurisdictionProfileId: null,
      templateType: "procedural_order_1",
      title: "Procedural Order No. 1 (generic)",
      bodyMarkup:
        "PROCEDURAL ORDER NO. 1\n\nReference: {{reference_number}}\nSeat: {{seat}}\nParties: {{claimant_name}} v. {{respondent_name}}\nTribunal: {{tribunal_composition}}\n\n1. Procedural timetable...\n2. Language of the proceedings...\n3. Confidentiality...",
    },
    {
      jurisdictionProfileId: profileIds.INDIA,
      templateType: "notice_of_arbitration",
      title: "Notice of Arbitration (India, ad hoc)",
      bodyMarkup:
        "NOTICE OF ARBITRATION\n\nTo: {{respondent_name}}\nFrom: {{claimant_name}}\n\nInvoking the arbitration clause at Clause __ of the agreement dated __, the Claimant hereby refers the following dispute to arbitration under the Arbitration and Conciliation Act, 1996...",
    },
    {
      jurisdictionProfileId: profileIds.ICC,
      templateType: "notice_of_arbitration",
      title: "ICC Request for Arbitration",
      bodyMarkup:
        "REQUEST FOR ARBITRATION (ICC Rules of Arbitration)\n\n1. Names and details of the parties.\n2. A description of the nature and circumstances of the dispute giving rise to the claims.\n3. A statement of the relief sought...",
    },
    {
      jurisdictionProfileId: profileIds.SIAC,
      templateType: "notice_of_arbitration",
      title: "SIAC Notice of Arbitration",
      bodyMarkup:
        "NOTICE OF ARBITRATION (SIAC Rules)\n\n1. A demand that the dispute be referred to arbitration.\n2. The names and contact details of the parties...",
    },
    {
      jurisdictionProfileId: null,
      templateType: "answer",
      title: "Answer / Response (generic)",
      bodyMarkup:
        "ANSWER TO NOTICE/REQUEST FOR ARBITRATION\n\nReference: {{reference_number}}\n\nThe Respondent responds as follows to the Claimant's Notice/Request...",
    },
  ];

  for (const t of templates) {
    const exists = await prisma.template.findFirst({ where: { title: t.title } });
    if (!exists) await prisma.template.create({ data: t as any });
  }
}

async function writeAuditRow(action: string, actorUserId: string, referenceId: string) {
  const last = await prisma.auditLogEntry.findFirst({ orderBy: { createdAt: "desc" }, select: { immutableHash: true } });
  const payload = JSON.stringify({ previousHash: last?.immutableHash ?? "GENESIS", action, actorUserId, referenceId, at: new Date().toISOString() });
  const immutableHash = crypto.createHash("sha256").update(payload).digest("hex");
  await prisma.auditLogEntry.create({ data: { action, actorUserId, referenceId, immutableHash } });
}

/**
 * A single richly-populated demo Reference so a first-time, non-technical
 * reviewer sees a working system immediately after installation, rather
 * than an empty shell. Touches most of the 23 modules at Section 5 of the
 * SOW/SRS. Safe to re-run - skipped if it already exists.
 */
async function seedDemoCase(users: Record<string, string>, profileIds: Record<string, string>) {
  const existing = await prisma.case.findUnique({ where: { referenceNumber: "ODR-DEMO-0001" } });
  if (existing) {
    console.log("Demo case already exists, skipping.");
    return;
  }

  const now = new Date();
  const kase = await prisma.case.create({
    data: {
      institutionId: DEFAULT_INSTITUTION_ID,
      referenceNumber: "ODR-DEMO-0001",
      title: "Meridian Infrastructure Pvt. Ltd. v. Coastal Developers Ltd.",
      jurisdictionProfileId: profileIds.INDIA,
      type: "institutional",
      seat: "New Delhi",
      competentCourt: "High Court of Delhi",
      ledgerCurrency: "INR",
      status: "hearings",
      timelineStartDate: now,
      timelineDeadline: addMonths(now, 12),
      confidentialityAccepted: true,
      fidicEnabled: true,
      aiEnabled: false,
      createdByUserId: users["registrar@odrpanel.local"],
    },
  });
  await writeAuditRow("case.created", users["registrar@odrpanel.local"], kase.id);

  // Tribunal - three-member, fully constituted and confirmed.
  const tribunal = await prisma.tribunal.create({
    data: { referenceId: kase.id, compositionType: "three_member", status: "constituted" },
  });
  await prisma.tribunalMember.createMany({
    data: [
      {
        tribunalId: tribunal.id,
        arbitratorUserId: users["arbitrator@odrpanel.local"],
        nominationSource: "claimant_nominated",
        isPresiding: false,
        disclosureText: "No circumstances giving rise to justifiable doubts as to independence or impartiality.",
        disclosureFiledAt: now,
        acceptedAt: now,
      },
      {
        tribunalId: tribunal.id,
        arbitratorUserId: users["co.arbitrator@odrpanel.local"],
        nominationSource: "respondent_nominated",
        isPresiding: false,
        disclosureText: "No circumstances giving rise to justifiable doubts as to independence or impartiality.",
        disclosureFiledAt: now,
        acceptedAt: now,
      },
      {
        tribunalId: tribunal.id,
        arbitratorUserId: users["presiding.arbitrator@odrpanel.local"],
        nominationSource: "co_arbitrator_nominated",
        isPresiding: true,
        disclosureText: "No circumstances giving rise to justifiable doubts as to independence or impartiality.",
        disclosureFiledAt: now,
        acceptedAt: now,
      },
    ],
  });

  // Parties, with designation labels computed the same way the app does.
  const claimant = await prisma.party.create({
    data: {
      referenceId: kase.id,
      designation: "claimant",
      sequenceNo: null,
      displayLabel: "Claimant",
      fullName: "Meridian Infrastructure Pvt. Ltd.",
      organisation: "Meridian Infrastructure Pvt. Ltd.",
      email: "claimant@odrpanel.local",
      phone: "+91 98100 00001",
      postalAddress: "12 Nehru Place, New Delhi",
      partyUserId: users["claimant@odrpanel.local"],
      representedByCounselUserId: users["counsel@odrpanel.local"],
      thirdPartyFunderDisclosed: false,
    },
  });
  const respondent = await prisma.party.create({
    data: {
      referenceId: kase.id,
      designation: "respondent",
      sequenceNo: null,
      displayLabel: "Respondent",
      fullName: "Coastal Developers Ltd.",
      organisation: "Coastal Developers Ltd.",
      email: "respondent@odrpanel.local",
      phone: "+91 98100 00002",
      postalAddress: "45 Marine Drive, Mumbai",
      partyUserId: users["respondent@odrpanel.local"],
      thirdPartyFunderDisclosed: false,
    },
  });

  for (const [userId, roleName] of [
    [users["claimant@odrpanel.local"], "Party"],
    [users["counsel@odrpanel.local"], "Counsel"],
    [users["respondent@odrpanel.local"], "Party"],
    [users["arbitrator@odrpanel.local"], "Arbitrator"],
    [users["co.arbitrator@odrpanel.local"], "Arbitrator"],
    [users["presiding.arbitrator@odrpanel.local"], "Arbitrator"],
    [users["registrar@odrpanel.local"], "Registrar"],
    [users["appointing.authority@odrpanel.local"], "Appointing Authority"],
    [users["case.manager@odrpanel.local"], "Case Manager"],
    [users["tribunal.secretary@odrpanel.local"], "Tribunal Secretary"],
  ] as const) {
    const role = await prisma.role.findUnique({ where: { name: roleName } });
    if (!role) continue;
    await prisma.referenceRoleAssignment.upsert({
      where: { referenceId_userId_roleId: { referenceId: kase.id, userId, roleId: role.id } },
      update: {},
      create: { referenceId: kase.id, userId, roleId: role.id },
    });
  }

  // Pleadings.
  await prisma.pleading.createMany({
    data: [
      {
        referenceId: kase.id,
        pleadingType: "statement_of_claim",
        title: "Statement of Claim",
        versionNo: 1,
        confidentialityFlag: true,
        filedByUserId: users["counsel@odrpanel.local"],
        status: "admitted",
        filedAt: subDays(now, 60),
      },
      {
        referenceId: kase.id,
        pleadingType: "statement_of_defence",
        title: "Statement of Defence",
        versionNo: 1,
        confidentialityFlag: true,
        filedByUserId: users["respondent@odrpanel.local"],
        status: "admitted",
        filedAt: subDays(now, 30),
      },
    ],
  });

  // Hearings: a completed CMC and an upcoming evidentiary hearing.
  await prisma.hearing.create({
    data: {
      referenceId: kase.id,
      hearingType: "case_management_conference",
      mode: "virtual",
      scheduledStart: subDays(now, 45),
      scheduledEnd: subDays(now, 45),
      venueOrLink: "simulated-video://local-evaluation-build/room/cmc-1",
      cybersecurityProtocolSignedOff: true,
      status: "completed",
      recordingRef: "cmc-1-recording.mp4",
    },
  });
  await prisma.hearing.create({
    data: {
      referenceId: kase.id,
      hearingType: "evidentiary",
      mode: "hybrid",
      scheduledStart: addDays(now, 21),
      cybersecurityProtocolSignedOff: true,
      status: "scheduled",
      venueOrLink: "simulated-video://local-evaluation-build/room/evidentiary-1",
    },
  });

  // Evidence.
  await prisma.evidence.create({
    data: {
      referenceId: kase.id,
      exhibitNo: "EX-1",
      title: "EPC Contract dated 4 January 2024",
      evidenceCategory: "documentary",
      integrityHash: crypto.createHash("sha256").update("demo-exhibit-1").digest("hex"),
      objectionStatus: "none",
      filedByUserId: users["counsel@odrpanel.local"],
      filedAt: subDays(now, 55),
    },
  });

  // Procedural Order No. 1, decomposed into directions.
  await prisma.proceduralDirection.createMany({
    data: [
      {
        referenceId: kase.id,
        proceduralOrderNo: 1,
        description: "Claimant to file Statement of Claim.",
        responsibleRole: "party",
        responsiblePartyId: claimant.id,
        dueDate: subDays(now, 60),
        status: "complied",
        phase: "single",
        createdByUserId: users["presiding.arbitrator@odrpanel.local"],
      },
      {
        referenceId: kase.id,
        proceduralOrderNo: 1,
        description: "Respondent to file Statement of Defence.",
        responsibleRole: "party",
        responsiblePartyId: respondent.id,
        dueDate: subDays(now, 30),
        status: "complied",
        phase: "single",
        createdByUserId: users["presiding.arbitrator@odrpanel.local"],
      },
      {
        referenceId: kase.id,
        proceduralOrderNo: 1,
        description: "Parties to exchange document production requests (Redfern Schedule).",
        responsibleRole: "counsel",
        dueDate: addDays(now, 7),
        status: "pending",
        phase: "single",
        createdByUserId: users["presiding.arbitrator@odrpanel.local"],
      },
    ],
  });

  // Cost ledger.
  await prisma.costLedgerEntry.createMany({
    data: [
      {
        referenceId: kase.id,
        entryType: "fee",
        feeModel: "ad_valorem",
        payerAllocation: "shared_equally",
        amount: 1500000,
        currency: "INR",
        description: "Tribunal fees (ad valorem, per institution schedule)",
        raisedByUserId: users["registrar@odrpanel.local"],
        status: "invoiced",
      },
      {
        referenceId: kase.id,
        entryType: "escrow",
        feeModel: "fixed_lump_sum",
        payerAllocation: "shared_equally",
        amount: 500000,
        currency: "INR",
        description: "Advance on costs, held in escrow",
        escrowReference: "ESCROW-DEMO-0001",
        raisedByUserId: users["registrar@odrpanel.local"],
        status: "paid",
      },
    ],
  });

  // Redfern Schedule row, mid-process.
  await prisma.redfernScheduleRow.create({
    data: {
      referenceId: kase.id,
      rowNo: 1,
      documentsRequested: "All internal correspondence regarding the extension-of-time claim, January-March 2024.",
      requestingReasons: "Directly relevant to causation of the delay in issue.",
      respondingObjection: "Overbroad; not proportionate to the amount in dispute.",
      requestingReply: "Narrowed to correspondence between the project managers only.",
      tribunalDecision: "pending",
    },
  });

  // FIDIC condition-precedent record (module enabled on this Reference).
  await prisma.fIDICDisputeReferral.create({
    data: {
      referenceId: kase.id,
      contractForm: "FIDIC Red Book",
      dabDaabReferralEvidenced: true,
      noticeOfDissatisfactionEvidenced: true,
      coolingOffEvidenced: false,
      engineerDeterminationLog: [{ text: "Engineer determined EOT claim partially valid (14 days).", at: subDays(now, 200).toISOString() }],
      dabDecisionLog: [{ text: "DAB upheld the Engineer's determination on 12 days.", at: subDays(now, 150).toISOString() }],
    },
  });

  // A published procedural Order.
  await prisma.order.create({
    data: {
      referenceId: kase.id,
      orderType: "procedural",
      title: "Procedural Order No. 1",
      contentText:
        "1. The procedural timetable at Annexure A is adopted.\n2. The language of the proceedings shall be English.\n3. The seat of arbitration is New Delhi.",
      draftedByUserId: users["tribunal.secretary@odrpanel.local"],
      publishedByUserId: users["presiding.arbitrator@odrpanel.local"],
      publishedAt: subDays(now, 62),
      status: "published",
    },
  });

  console.log(`Seeded demo Reference ${kase.referenceNumber}.`);
}

async function main() {
  console.log("Seeding institution...");
  await seedInstitution();

  console.log("Seeding roles...");
  const roleIds = await seedRoles();

  console.log("Seeding Jurisdiction Rule Profiles (Section 3.1 of the SOW/SRS)...");
  const profileIds = await seedJurisdictionProfiles();

  console.log("Seeding feature flags...");
  await seedFeatureFlags();

  console.log("Seeding demo user accounts (one per Platform role)...");
  const userIds = await seedUsers(roleIds);

  console.log("Seeding jurisdiction-specific templates...");
  await seedTemplates(profileIds);

  console.log("Seeding a populated demo Reference...");
  await seedDemoCase(userIds, profileIds);

  console.log("\nDone. Demo accounts (all use the same password):");
  console.log(`  Password: ${DEMO_PASSWORD}`);
  for (const u of DEMO_USERS) {
    console.log(`  ${u.role.padEnd(32)} ${u.email}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
