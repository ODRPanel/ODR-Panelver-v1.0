import { PrismaClient, ProfileCode } from "@prisma/client";
import bcrypt from "bcryptjs";
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
  await seedUsers(roleIds);

  console.log("Seeding jurisdiction-specific templates...");
  await seedTemplates(profileIds);

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
