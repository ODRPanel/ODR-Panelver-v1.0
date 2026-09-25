-- CreateEnum
CREATE TYPE "ProfileCode" AS ENUM ('INDIA', 'DIAC', 'SIAC', 'LCIA', 'ICC', 'USA');

-- CreateEnum
CREATE TYPE "ConfidentialityDefault" AS ENUM ('confidential_by_default', 'general_duty', 'no_default');

-- CreateEnum
CREATE TYPE "FeeScheduleType" AS ENUM ('ad_valorem', 'hourly', 'institution_own');

-- CreateEnum
CREATE TYPE "InstitutionType" AS ENUM ('institutional', 'ad_hoc_platform');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('active', 'suspended', 'pending');

-- CreateEnum
CREATE TYPE "CaseType" AS ENUM ('ad_hoc', 'institutional');

-- CreateEnum
CREATE TYPE "CaseStatus" AS ENUM ('constitution', 'pleadings', 'hearings', 'award', 'post_award', 'closed');

-- CreateEnum
CREATE TYPE "RoleApplicability" AS ENUM ('ad_hoc', 'institutional', 'both');

-- CreateEnum
CREATE TYPE "PartyDesignation" AS ENUM ('claimant', 'applicant', 'respondent', 'counter_claimant', 'cross_claimant', 'cross_respondent');

-- CreateEnum
CREATE TYPE "TribunalCompositionType" AS ENUM ('sole', 'three_member', 'five_member', 'other_odd_number');

-- CreateEnum
CREATE TYPE "TribunalStatus" AS ENUM ('nominating', 'constituted', 'reconstituted');

-- CreateEnum
CREATE TYPE "NominationSource" AS ENUM ('claimant_nominated', 'respondent_nominated', 'co_arbitrator_nominated', 'institution_appointed', 'party_agreed_sole');

-- CreateEnum
CREATE TYPE "PleadingType" AS ENUM ('statement_of_claim', 'statement_of_defence', 'counter_claim', 'reply', 'rejoinder', 'challenge_application', 'application', 'other');

-- CreateEnum
CREATE TYPE "PleadingStatus" AS ENUM ('draft', 'filed', 'admitted', 'rejected');

-- CreateEnum
CREATE TYPE "HearingType" AS ENUM ('case_management_conference', 'procedural', 'evidentiary', 'final');

-- CreateEnum
CREATE TYPE "HearingMode" AS ENUM ('in_person', 'virtual', 'hybrid');

-- CreateEnum
CREATE TYPE "HearingStatus" AS ENUM ('scheduled', 'completed', 'adjourned', 'cancelled');

-- CreateEnum
CREATE TYPE "EvidenceCategory" AS ENUM ('documentary', 'expert_report', 'witness_statement');

-- CreateEnum
CREATE TYPE "ObjectionStatus" AS ENUM ('none', 'raised', 'ruled');

-- CreateEnum
CREATE TYPE "OrderType" AS ENUM ('procedural', 'interim', 'award', 'consent_award', 'correction', 'interpretation', 'additional_award');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('draft', 'published');

-- CreateEnum
CREATE TYPE "CostEntryType" AS ENUM ('fee', 'expense', 'escrow', 'security_for_costs');

-- CreateEnum
CREATE TYPE "FeeModel" AS ENUM ('ad_valorem', 'hourly', 'per_sitting', 'fixed_lump_sum', 'ad_hoc', 'institution_own');

-- CreateEnum
CREATE TYPE "PayerAllocation" AS ENUM ('claimant', 'respondent', 'shared_equally', 'apportioned_by_tribunal', 'costs_follow_event_pending');

-- CreateEnum
CREATE TYPE "CostEntryStatus" AS ENUM ('raised', 'invoiced', 'paid', 'disputed', 'under_review', 'resolved');

-- CreateEnum
CREATE TYPE "CourtProvisionType" AS ENUM ('interim_relief', 'appointment', 'evidence_assistance', 'timeline_extension', 'challenge_setaside', 'enforcement', 'appeal');

-- CreateEnum
CREATE TYPE "CourtStatus" AS ENUM ('filed', 'pending', 'disposed', 'stayed');

-- CreateEnum
CREATE TYPE "BreachSeverity" AS ENUM ('low', 'medium', 'high', 'critical');

-- CreateEnum
CREATE TYPE "BreachStatus" AS ENUM ('open', 'notified', 'closed');

-- CreateEnum
CREATE TYPE "GrievanceAgainst" AS ENUM ('institution', 'arbitrator');

-- CreateEnum
CREATE TYPE "GrievanceStatus" AS ENUM ('open', 'investigating', 'resolved');

-- CreateEnum
CREATE TYPE "WorkspaceType" AS ENUM ('native_canvas', 'liquidtext_export');

-- CreateEnum
CREATE TYPE "VisibilityScope" AS ENUM ('tribunal_only', 'shared');

-- CreateEnum
CREATE TYPE "AIRequestType" AS ENUM ('summary', 'chronology', 'draft_assist', 'conflict_flag');

-- CreateEnum
CREATE TYPE "AIDecision" AS ENUM ('pending', 'accepted', 'edited_and_accepted', 'discarded');

-- CreateEnum
CREATE TYPE "DocumentCategory" AS ENUM ('pleading', 'evidence', 'order', 'template', 'general', 'counsel_client_promoted');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('in_platform', 'email', 'post', 'whatsapp', 'sms', 'process_server');

-- CreateEnum
CREATE TYPE "FeedbackStatus" AS ENUM ('new', 'triaged', 'scheduled', 'shipped');

-- CreateEnum
CREATE TYPE "InterimApplicationType" AS ENUM ('interim_measure_to_tribunal', 'other');

-- CreateEnum
CREATE TYPE "InterimDecision" AS ENUM ('pending', 'granted', 'refused', 'varied');

-- CreateEnum
CREATE TYPE "DirectionStatus" AS ENUM ('pending', 'complied', 'overdue', 'varied');

-- CreateEnum
CREATE TYPE "DirectionPhase" AS ENUM ('single', 'jurisdiction', 'liability', 'quantum');

-- CreateEnum
CREATE TYPE "ResponsibleRoleType" AS ENUM ('tribunal', 'party', 'counsel', 'registrar', 'other');

-- CreateEnum
CREATE TYPE "TemplateType" AS ENUM ('notice_of_arbitration', 'answer', 'procedural_order_1', 'terms_of_reference', 'institution_form', 'custom');

-- CreateEnum
CREATE TYPE "RedfernDecision" AS ENUM ('pending', 'produce', 'refuse', 'produce_with_conditions');

-- CreateEnum
CREATE TYPE "FeatureFlagScope" AS ENUM ('platform', 'institution', 'reference');

-- CreateTable
CREATE TABLE "Institution" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "InstitutionType" NOT NULL DEFAULT 'institutional',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Institution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Role" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "applicability" "RoleApplicability" NOT NULL DEFAULT 'both',
    "permissionSet" JSONB NOT NULL,
    "isSystem" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT,
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "mfaEnabled" BOOLEAN NOT NULL DEFAULT false,
    "mfaSecret" TEXT,
    "status" "UserStatus" NOT NULL DEFAULT 'active',
    "tokenVersion" INTEGER NOT NULL DEFAULT 0,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReferenceRoleAssignment" (
    "id" TEXT NOT NULL,
    "referenceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "applicability" "RoleApplicability" NOT NULL DEFAULT 'both',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReferenceRoleAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JurisdictionProfile" (
    "id" TEXT NOT NULL,
    "profileCode" "ProfileCode" NOT NULL,
    "displayName" TEXT NOT NULL,
    "governingArbitrationLaw" TEXT NOT NULL,
    "evidenceRegime" TEXT NOT NULL,
    "confidentialityDefault" "ConfidentialityDefault" NOT NULL,
    "feeScheduleType" "FeeScheduleType" NOT NULL,
    "defaultCurrency" TEXT NOT NULL,
    "dataResidencyRegion" TEXT NOT NULL,
    "uiLanguageDefault" TEXT NOT NULL DEFAULT 'en',
    "rtlSupport" BOOLEAN NOT NULL DEFAULT false,
    "applicableDataProtectionLaw" TEXT NOT NULL,
    "breachNotificationHours" INTEGER NOT NULL DEFAULT 72,
    "timelineRules" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JurisdictionProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Case" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT,
    "referenceNumber" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "jurisdictionProfileId" TEXT NOT NULL,
    "type" "CaseType" NOT NULL,
    "seat" TEXT,
    "competentCourt" TEXT,
    "ledgerCurrency" TEXT NOT NULL,
    "status" "CaseStatus" NOT NULL DEFAULT 'constitution',
    "timelineStartDate" TIMESTAMP(3),
    "timelineDeadline" TIMESTAMP(3),
    "retentionPeriodMonths" INTEGER,
    "fidicEnabled" BOOLEAN NOT NULL DEFAULT false,
    "aiEnabled" BOOLEAN NOT NULL DEFAULT false,
    "confidentialityAccepted" BOOLEAN NOT NULL DEFAULT false,
    "createdByUserId" TEXT NOT NULL,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Case_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Party" (
    "id" TEXT NOT NULL,
    "referenceId" TEXT NOT NULL,
    "designation" "PartyDesignation" NOT NULL,
    "sequenceNo" INTEGER,
    "displayLabel" TEXT NOT NULL,
    "partyUserId" TEXT,
    "representedByCounselUserId" TEXT,
    "fullName" TEXT NOT NULL,
    "organisation" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "postalAddress" TEXT,
    "thirdPartyFunderDisclosed" BOOLEAN NOT NULL DEFAULT false,
    "thirdPartyFunderDetails" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Party_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tribunal" (
    "id" TEXT NOT NULL,
    "referenceId" TEXT NOT NULL,
    "compositionType" "TribunalCompositionType" NOT NULL,
    "status" "TribunalStatus" NOT NULL DEFAULT 'nominating',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tribunal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TribunalMember" (
    "id" TEXT NOT NULL,
    "tribunalId" TEXT NOT NULL,
    "arbitratorUserId" TEXT NOT NULL,
    "nominationSource" "NominationSource" NOT NULL,
    "nominatedByPartyId" TEXT,
    "isPresiding" BOOLEAN NOT NULL DEFAULT false,
    "disclosureText" TEXT,
    "disclosureFiledAt" TIMESTAMP(3),
    "acceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TribunalMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pleading" (
    "id" TEXT NOT NULL,
    "referenceId" TEXT NOT NULL,
    "pleadingType" "PleadingType" NOT NULL,
    "title" TEXT NOT NULL,
    "versionNo" INTEGER NOT NULL DEFAULT 1,
    "confidentialityFlag" BOOLEAN NOT NULL DEFAULT true,
    "filedByUserId" TEXT NOT NULL,
    "documentId" TEXT,
    "status" "PleadingStatus" NOT NULL DEFAULT 'filed',
    "filedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Pleading_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Hearing" (
    "id" TEXT NOT NULL,
    "referenceId" TEXT NOT NULL,
    "hearingType" "HearingType" NOT NULL DEFAULT 'procedural',
    "mode" "HearingMode" NOT NULL DEFAULT 'virtual',
    "scheduledStart" TIMESTAMP(3) NOT NULL,
    "scheduledEnd" TIMESTAMP(3),
    "venueOrLink" TEXT,
    "interpreterRequired" BOOLEAN NOT NULL DEFAULT false,
    "interpreterLanguage" TEXT,
    "observerAccess" BOOLEAN NOT NULL DEFAULT false,
    "cybersecurityProtocolSignedOff" BOOLEAN NOT NULL DEFAULT false,
    "recordingRef" TEXT,
    "transcriptRef" TEXT,
    "transcriptHash" TEXT,
    "status" "HearingStatus" NOT NULL DEFAULT 'scheduled',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Hearing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Evidence" (
    "id" TEXT NOT NULL,
    "referenceId" TEXT NOT NULL,
    "exhibitNo" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "evidenceCategory" "EvidenceCategory" NOT NULL DEFAULT 'documentary',
    "documentId" TEXT,
    "integrityHash" TEXT,
    "objectionStatus" "ObjectionStatus" NOT NULL DEFAULT 'none',
    "objectionText" TEXT,
    "rulingText" TEXT,
    "filedByUserId" TEXT NOT NULL,
    "filedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Evidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "referenceId" TEXT NOT NULL,
    "orderType" "OrderType" NOT NULL,
    "title" TEXT NOT NULL,
    "versionNo" INTEGER NOT NULL DEFAULT 1,
    "documentId" TEXT,
    "contentText" TEXT,
    "draftedByUserId" TEXT NOT NULL,
    "publishedByUserId" TEXT,
    "publishedAt" TIMESTAMP(3),
    "status" "OrderStatus" NOT NULL DEFAULT 'draft',
    "dissentText" TEXT,
    "majorityText" TEXT,
    "settlementRefId" TEXT,
    "interestRatePreAward" DOUBLE PRECISION,
    "interestRatePostAward" DOUBLE PRECISION,
    "enforcementCurrency" TEXT,
    "costsApportionmentText" TEXT,
    "aiAssisted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Settlement" (
    "id" TEXT NOT NULL,
    "referenceId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "settledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recordedByUserId" TEXT NOT NULL,

    CONSTRAINT "Settlement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CostLedgerEntry" (
    "id" TEXT NOT NULL,
    "referenceId" TEXT NOT NULL,
    "entryType" "CostEntryType" NOT NULL,
    "feeModel" "FeeModel" NOT NULL,
    "payerAllocation" "PayerAllocation" NOT NULL,
    "linkedHearingId" TEXT,
    "amount" DECIMAL(14,2) NOT NULL,
    "currency" TEXT NOT NULL,
    "escrowReference" TEXT,
    "linkedOrderId" TEXT,
    "description" TEXT,
    "status" "CostEntryStatus" NOT NULL DEFAULT 'raised',
    "raisedByUserId" TEXT NOT NULL,
    "raisedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CostLedgerEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CourtProceeding" (
    "id" TEXT NOT NULL,
    "referenceId" TEXT NOT NULL,
    "provisionType" "CourtProvisionType" NOT NULL,
    "provisionReference" TEXT,
    "courtOrBody" TEXT NOT NULL,
    "courtCaseNo" TEXT,
    "status" "CourtStatus" NOT NULL DEFAULT 'filed',
    "impactOnTimeline" TEXT,
    "nycArticleVGround" TEXT,
    "filedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "disposedAt" TIMESTAMP(3),

    CONSTRAINT "CourtProceeding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BreachIncident" (
    "id" TEXT NOT NULL,
    "referenceId" TEXT,
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "clientNotifiedAt" TIMESTAMP(3),
    "regulatorNotifiedAt" TIMESTAMP(3),
    "severity" "BreachSeverity" NOT NULL,
    "description" TEXT NOT NULL,
    "remediationNote" TEXT,
    "status" "BreachStatus" NOT NULL DEFAULT 'open',
    "ownerUserId" TEXT NOT NULL,
    "notificationDeadlineAt" TIMESTAMP(3),

    CONSTRAINT "BreachIncident_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GrievanceTicket" (
    "id" TEXT NOT NULL,
    "referenceId" TEXT,
    "raisedByUserId" TEXT NOT NULL,
    "against" "GrievanceAgainst" NOT NULL,
    "subject" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "GrievanceStatus" NOT NULL DEFAULT 'open',
    "investigatedByUserId" TEXT,
    "outcomeText" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GrievanceTicket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LiquidTextWorkspace" (
    "id" TEXT NOT NULL,
    "referenceId" TEXT NOT NULL,
    "workspaceType" "WorkspaceType" NOT NULL DEFAULT 'native_canvas',
    "title" TEXT NOT NULL,
    "sourceDocumentId" TEXT,
    "annotationLayer" JSONB NOT NULL,
    "versionNo" INTEGER NOT NULL DEFAULT 1,
    "visibilityScope" "VisibilityScope" NOT NULL DEFAULT 'tribunal_only',
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LiquidTextWorkspace_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIAnalysisJob" (
    "id" TEXT NOT NULL,
    "referenceId" TEXT NOT NULL,
    "requestType" "AIRequestType" NOT NULL,
    "inputDocumentIds" TEXT[],
    "outputText" TEXT,
    "decision" "AIDecision" NOT NULL DEFAULT 'pending',
    "decidedByUserId" TEXT,
    "requestedByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedAt" TIMESTAMP(3),

    CONSTRAINT "AIAnalysisJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentRepositoryItem" (
    "id" TEXT NOT NULL,
    "referenceId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "sha256Hash" TEXT NOT NULL,
    "confidentialityFlag" BOOLEAN NOT NULL DEFAULT true,
    "translationCertified" BOOLEAN NOT NULL DEFAULT false,
    "category" "DocumentCategory" NOT NULL DEFAULT 'general',
    "uploadedByUserId" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentRepositoryItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "referenceId" TEXT,
    "recipientPartyId" TEXT,
    "recipientUserId" TEXT,
    "channel" "NotificationChannel" NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "contentRefType" TEXT,
    "contentRefId" TEXT,
    "dispatchedAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "readAt" TIMESTAMP(3),
    "proofOfServiceRef" TEXT,
    "deemedServiceDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLogEntry" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT,
    "referenceId" TEXT,
    "action" TEXT NOT NULL,
    "actorUserId" TEXT,
    "entityType" TEXT,
    "entityId" TEXT,
    "metadata" JSONB,
    "immutableHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLogEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeedbackTicket" (
    "id" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "submittedByUserId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "FeedbackStatus" NOT NULL DEFAULT 'new',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FeedbackTicket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InterimApplication" (
    "id" TEXT NOT NULL,
    "referenceId" TEXT NOT NULL,
    "applicationType" "InterimApplicationType" NOT NULL DEFAULT 'interim_measure_to_tribunal',
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "filedByPartyId" TEXT NOT NULL,
    "filedByUserId" TEXT NOT NULL,
    "filedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "oppositionDueAt" TIMESTAMP(3),
    "decisionDueAt" TIMESTAMP(3),
    "oppositionText" TEXT,
    "decision" "InterimDecision" NOT NULL DEFAULT 'pending',
    "decisionText" TEXT,
    "decidedAt" TIMESTAMP(3),
    "securityOrderedLedgerId" TEXT,

    CONSTRAINT "InterimApplication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProceduralDirection" (
    "id" TEXT NOT NULL,
    "referenceId" TEXT NOT NULL,
    "proceduralOrderNo" INTEGER NOT NULL DEFAULT 1,
    "supersedesOrderNo" INTEGER,
    "description" TEXT NOT NULL,
    "responsibleRole" "ResponsibleRoleType" NOT NULL DEFAULT 'tribunal',
    "responsiblePartyId" TEXT,
    "dueDate" TIMESTAMP(3),
    "status" "DirectionStatus" NOT NULL DEFAULT 'pending',
    "phase" "DirectionPhase" NOT NULL DEFAULT 'single',
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProceduralDirection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Template" (
    "id" TEXT NOT NULL,
    "jurisdictionProfileId" TEXT,
    "templateType" "TemplateType" NOT NULL,
    "title" TEXT NOT NULL,
    "ownerInstitutionId" TEXT,
    "bodyMarkup" TEXT NOT NULL,
    "versionNo" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Template_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CounselClientMessage" (
    "id" TEXT NOT NULL,
    "referenceId" TEXT NOT NULL,
    "counselUserId" TEXT NOT NULL,
    "clientPartyId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CounselClientMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CounselClientDocument" (
    "id" TEXT NOT NULL,
    "referenceId" TEXT NOT NULL,
    "counselUserId" TEXT NOT NULL,
    "clientPartyId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "promotedToRepositoryItemId" TEXT,

    CONSTRAINT "CounselClientDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RedfernScheduleRow" (
    "id" TEXT NOT NULL,
    "referenceId" TEXT NOT NULL,
    "rowNo" INTEGER NOT NULL,
    "documentsRequested" TEXT NOT NULL,
    "requestingReasons" TEXT NOT NULL,
    "respondingObjection" TEXT,
    "requestingReply" TEXT,
    "tribunalDecision" "RedfernDecision" NOT NULL DEFAULT 'pending',
    "productionDueDate" TIMESTAMP(3),
    "producedEvidenceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RedfernScheduleRow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FIDICDisputeReferral" (
    "id" TEXT NOT NULL,
    "referenceId" TEXT NOT NULL,
    "contractForm" TEXT NOT NULL,
    "dabDaabReferralEvidenced" BOOLEAN NOT NULL DEFAULT false,
    "noticeOfDissatisfactionEvidenced" BOOLEAN NOT NULL DEFAULT false,
    "coolingOffEvidenced" BOOLEAN NOT NULL DEFAULT false,
    "engineerDeterminationLog" JSONB NOT NULL DEFAULT '[]',
    "dabDecisionLog" JSONB NOT NULL DEFAULT '[]',
    "eotClaimLog" JSONB NOT NULL DEFAULT '[]',
    "variationOrderLog" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FIDICDisputeReferral_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeatureFlag" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "scope" "FeatureFlagScope" NOT NULL DEFAULT 'platform',
    "institutionId" TEXT,
    "referenceId" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeatureFlag_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Role_name_key" ON "Role"("name");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "ReferenceRoleAssignment_referenceId_userId_roleId_key" ON "ReferenceRoleAssignment"("referenceId", "userId", "roleId");

-- CreateIndex
CREATE UNIQUE INDEX "JurisdictionProfile_profileCode_key" ON "JurisdictionProfile"("profileCode");

-- CreateIndex
CREATE UNIQUE INDEX "Case_referenceNumber_key" ON "Case"("referenceNumber");

-- CreateIndex
CREATE INDEX "Party_referenceId_idx" ON "Party"("referenceId");

-- CreateIndex
CREATE UNIQUE INDEX "Tribunal_referenceId_key" ON "Tribunal"("referenceId");

-- CreateIndex
CREATE UNIQUE INDEX "TribunalMember_tribunalId_arbitratorUserId_key" ON "TribunalMember"("tribunalId", "arbitratorUserId");

-- CreateIndex
CREATE INDEX "Pleading_referenceId_idx" ON "Pleading"("referenceId");

-- CreateIndex
CREATE INDEX "Hearing_referenceId_idx" ON "Hearing"("referenceId");

-- CreateIndex
CREATE UNIQUE INDEX "Evidence_referenceId_exhibitNo_key" ON "Evidence"("referenceId", "exhibitNo");

-- CreateIndex
CREATE INDEX "Order_referenceId_idx" ON "Order"("referenceId");

-- CreateIndex
CREATE INDEX "CostLedgerEntry_referenceId_idx" ON "CostLedgerEntry"("referenceId");

-- CreateIndex
CREATE INDEX "CourtProceeding_referenceId_idx" ON "CourtProceeding"("referenceId");

-- CreateIndex
CREATE INDEX "BreachIncident_referenceId_idx" ON "BreachIncident"("referenceId");

-- CreateIndex
CREATE INDEX "LiquidTextWorkspace_referenceId_idx" ON "LiquidTextWorkspace"("referenceId");

-- CreateIndex
CREATE INDEX "AIAnalysisJob_referenceId_idx" ON "AIAnalysisJob"("referenceId");

-- CreateIndex
CREATE INDEX "DocumentRepositoryItem_referenceId_idx" ON "DocumentRepositoryItem"("referenceId");

-- CreateIndex
CREATE INDEX "Notification_referenceId_idx" ON "Notification"("referenceId");

-- CreateIndex
CREATE INDEX "AuditLogEntry_referenceId_idx" ON "AuditLogEntry"("referenceId");

-- CreateIndex
CREATE INDEX "AuditLogEntry_institutionId_idx" ON "AuditLogEntry"("institutionId");

-- CreateIndex
CREATE INDEX "InterimApplication_referenceId_idx" ON "InterimApplication"("referenceId");

-- CreateIndex
CREATE INDEX "ProceduralDirection_referenceId_idx" ON "ProceduralDirection"("referenceId");

-- CreateIndex
CREATE INDEX "CounselClientMessage_referenceId_counselUserId_clientPartyI_idx" ON "CounselClientMessage"("referenceId", "counselUserId", "clientPartyId");

-- CreateIndex
CREATE INDEX "CounselClientDocument_referenceId_counselUserId_clientParty_idx" ON "CounselClientDocument"("referenceId", "counselUserId", "clientPartyId");

-- CreateIndex
CREATE UNIQUE INDEX "RedfernScheduleRow_referenceId_rowNo_key" ON "RedfernScheduleRow"("referenceId", "rowNo");

-- CreateIndex
CREATE UNIQUE INDEX "FIDICDisputeReferral_referenceId_key" ON "FIDICDisputeReferral"("referenceId");

-- CreateIndex
CREATE UNIQUE INDEX "FeatureFlag_key_scope_institutionId_referenceId_key" ON "FeatureFlag"("key", "scope", "institutionId", "referenceId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferenceRoleAssignment" ADD CONSTRAINT "ReferenceRoleAssignment_referenceId_fkey" FOREIGN KEY ("referenceId") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferenceRoleAssignment" ADD CONSTRAINT "ReferenceRoleAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferenceRoleAssignment" ADD CONSTRAINT "ReferenceRoleAssignment_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Case" ADD CONSTRAINT "Case_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Case" ADD CONSTRAINT "Case_jurisdictionProfileId_fkey" FOREIGN KEY ("jurisdictionProfileId") REFERENCES "JurisdictionProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Case" ADD CONSTRAINT "Case_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Party" ADD CONSTRAINT "Party_referenceId_fkey" FOREIGN KEY ("referenceId") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Party" ADD CONSTRAINT "Party_partyUserId_fkey" FOREIGN KEY ("partyUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Party" ADD CONSTRAINT "Party_representedByCounselUserId_fkey" FOREIGN KEY ("representedByCounselUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tribunal" ADD CONSTRAINT "Tribunal_referenceId_fkey" FOREIGN KEY ("referenceId") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TribunalMember" ADD CONSTRAINT "TribunalMember_tribunalId_fkey" FOREIGN KEY ("tribunalId") REFERENCES "Tribunal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TribunalMember" ADD CONSTRAINT "TribunalMember_arbitratorUserId_fkey" FOREIGN KEY ("arbitratorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TribunalMember" ADD CONSTRAINT "TribunalMember_nominatedByPartyId_fkey" FOREIGN KEY ("nominatedByPartyId") REFERENCES "Party"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pleading" ADD CONSTRAINT "Pleading_referenceId_fkey" FOREIGN KEY ("referenceId") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pleading" ADD CONSTRAINT "Pleading_filedByUserId_fkey" FOREIGN KEY ("filedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pleading" ADD CONSTRAINT "Pleading_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "DocumentRepositoryItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Hearing" ADD CONSTRAINT "Hearing_referenceId_fkey" FOREIGN KEY ("referenceId") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evidence" ADD CONSTRAINT "Evidence_referenceId_fkey" FOREIGN KEY ("referenceId") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evidence" ADD CONSTRAINT "Evidence_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "DocumentRepositoryItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evidence" ADD CONSTRAINT "Evidence_filedByUserId_fkey" FOREIGN KEY ("filedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_referenceId_fkey" FOREIGN KEY ("referenceId") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "DocumentRepositoryItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_draftedByUserId_fkey" FOREIGN KEY ("draftedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_publishedByUserId_fkey" FOREIGN KEY ("publishedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_settlementRefId_fkey" FOREIGN KEY ("settlementRefId") REFERENCES "Settlement"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Settlement" ADD CONSTRAINT "Settlement_referenceId_fkey" FOREIGN KEY ("referenceId") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Settlement" ADD CONSTRAINT "Settlement_recordedByUserId_fkey" FOREIGN KEY ("recordedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CostLedgerEntry" ADD CONSTRAINT "CostLedgerEntry_referenceId_fkey" FOREIGN KEY ("referenceId") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CostLedgerEntry" ADD CONSTRAINT "CostLedgerEntry_linkedHearingId_fkey" FOREIGN KEY ("linkedHearingId") REFERENCES "Hearing"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CostLedgerEntry" ADD CONSTRAINT "CostLedgerEntry_linkedOrderId_fkey" FOREIGN KEY ("linkedOrderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CostLedgerEntry" ADD CONSTRAINT "CostLedgerEntry_raisedByUserId_fkey" FOREIGN KEY ("raisedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourtProceeding" ADD CONSTRAINT "CourtProceeding_referenceId_fkey" FOREIGN KEY ("referenceId") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BreachIncident" ADD CONSTRAINT "BreachIncident_referenceId_fkey" FOREIGN KEY ("referenceId") REFERENCES "Case"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BreachIncident" ADD CONSTRAINT "BreachIncident_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GrievanceTicket" ADD CONSTRAINT "GrievanceTicket_referenceId_fkey" FOREIGN KEY ("referenceId") REFERENCES "Case"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GrievanceTicket" ADD CONSTRAINT "GrievanceTicket_raisedByUserId_fkey" FOREIGN KEY ("raisedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GrievanceTicket" ADD CONSTRAINT "GrievanceTicket_investigatedByUserId_fkey" FOREIGN KEY ("investigatedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiquidTextWorkspace" ADD CONSTRAINT "LiquidTextWorkspace_referenceId_fkey" FOREIGN KEY ("referenceId") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiquidTextWorkspace" ADD CONSTRAINT "LiquidTextWorkspace_sourceDocumentId_fkey" FOREIGN KEY ("sourceDocumentId") REFERENCES "DocumentRepositoryItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiquidTextWorkspace" ADD CONSTRAINT "LiquidTextWorkspace_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIAnalysisJob" ADD CONSTRAINT "AIAnalysisJob_referenceId_fkey" FOREIGN KEY ("referenceId") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIAnalysisJob" ADD CONSTRAINT "AIAnalysisJob_decidedByUserId_fkey" FOREIGN KEY ("decidedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIAnalysisJob" ADD CONSTRAINT "AIAnalysisJob_requestedByUserId_fkey" FOREIGN KEY ("requestedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentRepositoryItem" ADD CONSTRAINT "DocumentRepositoryItem_referenceId_fkey" FOREIGN KEY ("referenceId") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentRepositoryItem" ADD CONSTRAINT "DocumentRepositoryItem_uploadedByUserId_fkey" FOREIGN KEY ("uploadedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_referenceId_fkey" FOREIGN KEY ("referenceId") REFERENCES "Case"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLogEntry" ADD CONSTRAINT "AuditLogEntry_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLogEntry" ADD CONSTRAINT "AuditLogEntry_referenceId_fkey" FOREIGN KEY ("referenceId") REFERENCES "Case"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLogEntry" ADD CONSTRAINT "AuditLogEntry_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeedbackTicket" ADD CONSTRAINT "FeedbackTicket_submittedByUserId_fkey" FOREIGN KEY ("submittedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterimApplication" ADD CONSTRAINT "InterimApplication_referenceId_fkey" FOREIGN KEY ("referenceId") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterimApplication" ADD CONSTRAINT "InterimApplication_filedByPartyId_fkey" FOREIGN KEY ("filedByPartyId") REFERENCES "Party"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterimApplication" ADD CONSTRAINT "InterimApplication_filedByUserId_fkey" FOREIGN KEY ("filedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterimApplication" ADD CONSTRAINT "InterimApplication_securityOrderedLedgerId_fkey" FOREIGN KEY ("securityOrderedLedgerId") REFERENCES "CostLedgerEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProceduralDirection" ADD CONSTRAINT "ProceduralDirection_referenceId_fkey" FOREIGN KEY ("referenceId") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProceduralDirection" ADD CONSTRAINT "ProceduralDirection_responsiblePartyId_fkey" FOREIGN KEY ("responsiblePartyId") REFERENCES "Party"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProceduralDirection" ADD CONSTRAINT "ProceduralDirection_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Template" ADD CONSTRAINT "Template_jurisdictionProfileId_fkey" FOREIGN KEY ("jurisdictionProfileId") REFERENCES "JurisdictionProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Template" ADD CONSTRAINT "Template_ownerInstitutionId_fkey" FOREIGN KEY ("ownerInstitutionId") REFERENCES "Institution"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CounselClientMessage" ADD CONSTRAINT "CounselClientMessage_referenceId_fkey" FOREIGN KEY ("referenceId") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CounselClientMessage" ADD CONSTRAINT "CounselClientMessage_counselUserId_fkey" FOREIGN KEY ("counselUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CounselClientMessage" ADD CONSTRAINT "CounselClientMessage_clientPartyId_fkey" FOREIGN KEY ("clientPartyId") REFERENCES "Party"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CounselClientDocument" ADD CONSTRAINT "CounselClientDocument_referenceId_fkey" FOREIGN KEY ("referenceId") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CounselClientDocument" ADD CONSTRAINT "CounselClientDocument_counselUserId_fkey" FOREIGN KEY ("counselUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CounselClientDocument" ADD CONSTRAINT "CounselClientDocument_clientPartyId_fkey" FOREIGN KEY ("clientPartyId") REFERENCES "Party"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CounselClientDocument" ADD CONSTRAINT "CounselClientDocument_promotedToRepositoryItemId_fkey" FOREIGN KEY ("promotedToRepositoryItemId") REFERENCES "DocumentRepositoryItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RedfernScheduleRow" ADD CONSTRAINT "RedfernScheduleRow_referenceId_fkey" FOREIGN KEY ("referenceId") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RedfernScheduleRow" ADD CONSTRAINT "RedfernScheduleRow_producedEvidenceId_fkey" FOREIGN KEY ("producedEvidenceId") REFERENCES "Evidence"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FIDICDisputeReferral" ADD CONSTRAINT "FIDICDisputeReferral_referenceId_fkey" FOREIGN KEY ("referenceId") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeatureFlag" ADD CONSTRAINT "FeatureFlag_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE SET NULL ON UPDATE CASCADE;
