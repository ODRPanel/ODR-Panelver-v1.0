// Configuration-driven role/permission engine (Annexure B, Section 2.3:
// "new roles are defined as data - a role definition plus a permission
// set - rather than requiring a code change or redeployment").
//
// MODULE_KEYS below are stable identifiers (not enums) precisely so that a
// Super Admin can regrant/revoke access to any module for any role from the
// admin console, purely as data, without touching this file. The DEFAULT_*
// tables here are only the seed data a fresh install starts from.

export const MODULE_KEYS = {
  CASE_INITIATION: "5.1", // Case Initiation, Onboarding, Tribunal Constitution
  PLEADINGS: "5.2",
  HEARINGS: "5.3",
  EVIDENCE: "5.4",
  ORDERS_AWARDS: "5.5",
  TIMELINE: "5.6",
  COSTS_FEES: "5.7",
  COMMUNICATION: "5.8",
  DOCUMENT_REPOSITORY: "5.9",
  SEARCH_MIS: "5.10",
  USER_ROLE_ACCESS: "5.11",
  AUDIT_TRAIL: "5.12",
  COURT_ENFORCEMENT: "5.13",
  COMPLIANCE_BREACH: "5.14",
  DOCUMENT_INTELLIGENCE: "5.15",
  AI_LAYER: "5.16",
  INTERIM_APPLICATIONS: "5.17",
  DIRECTIONS_CMC: "5.18",
  TEMPLATES: "5.19",
  COUNSEL_CLIENT: "5.20",
  REDFERN_SCHEDULE: "5.21",
  FIDIC: "5.22",
  CASE_MASTER_PANEL: "5.23",
  ADMIN: "admin", // System config, Jurisdiction Rule Profile admin, feature flags
  SUPPORT: "support", // Technical Support Administrator's scoped helpdesk console
  RETENTION: "retention", // Records Retention Officer's archival/purge console
} as const;

export type ModuleKey = (typeof MODULE_KEYS)[keyof typeof MODULE_KEYS];

export const ACTIONS = [
  "view",
  "create",
  "edit",
  "delete",
  "publish",
  "decide",
] as const;

export type Action = (typeof ACTIONS)[number];

export type PermissionSet = Partial<Record<ModuleKey, Action[]>>;

// The 17 Platform log-in roles at Section 4.1 of the SOW/SRS and the
// Annexure A-1 to A-17 role-journey series.
export const SYSTEM_ROLES = [
  "Super Admin",
  "Registrar",
  "Appointing Authority",
  "Arbitrator",
  "Emergency Arbitrator",
  "Tribunal Secretary",
  "Case Manager",
  "Party",
  "Counsel",
  "Auditor",
  "Compliance Officer",
  "Technical Support Administrator",
  "Taxing Officer",
  "Mediator",
  "Records Retention Officer",
  "Ombudsman",
  "Observer",
] as const;

export type SystemRoleName = (typeof SYSTEM_ROLES)[number];

const M = MODULE_KEYS;

export const DEFAULT_ROLE_PERMISSIONS: Record<SystemRoleName, PermissionSet> = {
  // System-configuration role only; no substantive role in any Reference;
  // read-only on the audit trail (Annexure A-1, Section 2).
  "Super Admin": {
    [M.ADMIN]: ["view", "create", "edit", "delete"],
    [M.USER_ROLE_ACCESS]: ["view", "create", "edit", "delete"],
    [M.AUDIT_TRAIL]: ["view"],
  },

  // Administers but does not decide (Annexure A-2).
  Registrar: {
    [M.CASE_INITIATION]: ["view", "create", "edit"],
    [M.PLEADINGS]: ["view"],
    [M.HEARINGS]: ["view", "create", "edit"],
    [M.EVIDENCE]: ["view"],
    [M.ORDERS_AWARDS]: ["view"],
    [M.TIMELINE]: ["view"],
    [M.COSTS_FEES]: ["view", "create", "edit"],
    [M.COMMUNICATION]: ["view", "create", "edit"],
    [M.DOCUMENT_REPOSITORY]: ["view", "create", "edit"],
    [M.SEARCH_MIS]: ["view"],
    [M.USER_ROLE_ACCESS]: ["view", "create", "edit"],
    [M.AUDIT_TRAIL]: ["view"],
    [M.INTERIM_APPLICATIONS]: ["view"],
    [M.DIRECTIONS_CMC]: ["view", "create", "edit"],
    [M.TEMPLATES]: ["view", "create"],
    [M.REDFERN_SCHEDULE]: ["view"],
    [M.FIDIC]: ["view", "create", "edit"],
    [M.CASE_MASTER_PANEL]: ["view"],
    [M.COURT_ENFORCEMENT]: ["view", "create", "edit"],
    [M.COMPLIANCE_BREACH]: ["view"],
  },

  // Decides; does not administer (Annexure A-3).
  "Appointing Authority": {
    [M.CASE_INITIATION]: ["view", "edit", "decide"],
    [M.ORDERS_AWARDS]: ["view", "decide"],
    [M.CASE_MASTER_PANEL]: ["view"],
  },

  // Conducts the Reference; sole publish authority (Annexure A-4).
  Arbitrator: {
    [M.CASE_INITIATION]: ["view", "create", "edit"],
    [M.PLEADINGS]: ["view", "edit"],
    [M.HEARINGS]: ["view", "create", "edit"],
    [M.EVIDENCE]: ["view", "edit", "decide"],
    [M.ORDERS_AWARDS]: ["view", "create", "edit", "publish"],
    [M.TIMELINE]: ["view"],
    [M.COSTS_FEES]: ["view"],
    [M.COMMUNICATION]: ["view"],
    [M.DOCUMENT_REPOSITORY]: ["view", "create"],
    [M.SEARCH_MIS]: ["view"],
    [M.DOCUMENT_INTELLIGENCE]: ["view", "create", "edit"],
    [M.AI_LAYER]: ["view", "create", "decide"],
    [M.INTERIM_APPLICATIONS]: ["view", "decide"],
    [M.DIRECTIONS_CMC]: ["view", "create", "edit"],
    [M.TEMPLATES]: ["view", "create"],
    [M.REDFERN_SCHEDULE]: ["view", "decide"],
    [M.FIDIC]: ["view", "decide"],
    [M.CASE_MASTER_PANEL]: ["view"],
    [M.COURT_ENFORCEMENT]: ["view"],
  },

  // Pre-constitution urgent relief only (Annexure A-5).
  "Emergency Arbitrator": {
    [M.COURT_ENFORCEMENT]: ["view", "create", "decide"],
    [M.CASE_MASTER_PANEL]: ["view"],
  },

  // Drafts but does not publish (Annexure A-6).
  "Tribunal Secretary": {
    [M.CASE_INITIATION]: ["view", "edit"],
    [M.PLEADINGS]: ["view", "create", "edit"],
    [M.HEARINGS]: ["view", "create", "edit"],
    [M.EVIDENCE]: ["view", "create"],
    [M.ORDERS_AWARDS]: ["view", "create", "edit"],
    [M.DOCUMENT_REPOSITORY]: ["view", "create"],
    [M.DIRECTIONS_CMC]: ["view", "create", "edit"],
    [M.TEMPLATES]: ["view", "create"],
    [M.CASE_MASTER_PANEL]: ["view"],
  },

  // Coordination and full costs/fee-ledger administration (Annexure A-7).
  "Case Manager": {
    [M.CASE_INITIATION]: ["view", "edit"],
    [M.PLEADINGS]: ["view"],
    [M.HEARINGS]: ["view"],
    [M.EVIDENCE]: ["view"],
    [M.ORDERS_AWARDS]: ["view"],
    [M.TIMELINE]: ["view", "edit"],
    [M.COSTS_FEES]: ["view", "create", "edit"],
    [M.INTERIM_APPLICATIONS]: ["view"],
    [M.DIRECTIONS_CMC]: ["view"],
    [M.CASE_MASTER_PANEL]: ["view"],
  },

  // Files own pleadings; views progress and own costs (Annexure A-8).
  Party: {
    [M.CASE_INITIATION]: ["view"],
    [M.PLEADINGS]: ["view", "create"],
    [M.HEARINGS]: ["view"],
    [M.EVIDENCE]: ["view", "create"],
    [M.ORDERS_AWARDS]: ["view"],
    [M.COSTS_FEES]: ["view"],
    [M.COMMUNICATION]: ["view"],
    [M.DOCUMENT_REPOSITORY]: ["view", "create"],
    [M.INTERIM_APPLICATIONS]: ["view", "create"],
    [M.COUNSEL_CLIENT]: ["view", "create"],
    [M.REDFERN_SCHEDULE]: ["view", "create"],
    [M.CASE_MASTER_PANEL]: ["view"],
  },

  // Files on behalf of a Party; may trigger Case Initiation (Annexure A-9).
  Counsel: {
    [M.CASE_INITIATION]: ["view", "create", "edit"],
    [M.PLEADINGS]: ["view", "create", "edit"],
    [M.HEARINGS]: ["view"],
    [M.EVIDENCE]: ["view", "create"],
    [M.ORDERS_AWARDS]: ["view"],
    [M.COSTS_FEES]: ["view"],
    [M.COMMUNICATION]: ["view"],
    [M.DOCUMENT_REPOSITORY]: ["view", "create"],
    [M.DOCUMENT_INTELLIGENCE]: ["view", "create", "edit"],
    [M.INTERIM_APPLICATIONS]: ["view", "create"],
    [M.TEMPLATES]: ["view", "create"],
    [M.COUNSEL_CLIENT]: ["view", "create"],
    [M.REDFERN_SCHEDULE]: ["view", "create"],
    [M.FIDIC]: ["view", "create"],
    [M.CASE_MASTER_PANEL]: ["view"],
    [M.COURT_ENFORCEMENT]: ["view", "create"],
  },

  // View-only compliance oversight across every module; never Counsel-Client
  // content (Section 5.20 of the SOW/SRS: "never visible to the Auditor's
  // case-content view").
  Auditor: {
    [M.CASE_INITIATION]: ["view"],
    [M.PLEADINGS]: ["view"],
    [M.HEARINGS]: ["view"],
    [M.EVIDENCE]: ["view"],
    [M.ORDERS_AWARDS]: ["view"],
    [M.TIMELINE]: ["view"],
    [M.COSTS_FEES]: ["view"],
    [M.COMMUNICATION]: ["view"],
    [M.DOCUMENT_REPOSITORY]: ["view"],
    [M.SEARCH_MIS]: ["view"],
    [M.USER_ROLE_ACCESS]: ["view"],
    [M.AUDIT_TRAIL]: ["view"],
    [M.COURT_ENFORCEMENT]: ["view"],
    [M.COMPLIANCE_BREACH]: ["view"],
    [M.DOCUMENT_INTELLIGENCE]: ["view"],
    [M.AI_LAYER]: ["view"],
    [M.INTERIM_APPLICATIONS]: ["view"],
    [M.DIRECTIONS_CMC]: ["view"],
    [M.TEMPLATES]: ["view"],
    [M.REDFERN_SCHEDULE]: ["view"],
    [M.FIDIC]: ["view"],
    [M.CASE_MASTER_PANEL]: ["view"],
  },

  "Compliance Officer": {
    [M.COMPLIANCE_BREACH]: ["view", "create", "edit", "decide"],
    [M.AUDIT_TRAIL]: ["view"],
    [M.CASE_MASTER_PANEL]: ["view"],
  },

  // Scoped system/helpdesk access without case-content visibility
  // (Annexure A-1, Section 7.8; new role split out of Super Admin).
  "Technical Support Administrator": {
    [M.SUPPORT]: ["view", "edit"],
    [M.USER_ROLE_ACCESS]: ["view", "edit"],
  },

  "Taxing Officer": {
    [M.COSTS_FEES]: ["view", "decide"],
  },

  Mediator: {
    [M.ORDERS_AWARDS]: ["view", "create"],
    [M.CASE_MASTER_PANEL]: ["view"],
  },

  "Records Retention Officer": {
    [M.RETENTION]: ["view", "edit"],
    [M.AUDIT_TRAIL]: ["view"],
  },

  Ombudsman: {
    [M.COMPLIANCE_BREACH]: ["view", "decide"],
  },

  // View-only hearing access, no filing rights.
  Observer: {
    [M.HEARINGS]: ["view"],
    [M.CASE_MASTER_PANEL]: ["view"],
  },
};

export function hasPermission(
  permissionSet: PermissionSet | null | undefined,
  moduleKey: ModuleKey | string,
  action: Action,
): boolean {
  if (!permissionSet) return false;
  const grants = (permissionSet as Record<string, Action[]>)[moduleKey];
  return Array.isArray(grants) && grants.includes(action);
}
