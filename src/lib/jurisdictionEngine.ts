import "server-only";
import { addMonths, addHours } from "date-fns";
import type { JurisdictionProfile } from "@prisma/client";

/**
 * The Jurisdiction Rule Engine (Section 7.1 of the SOW/SRS; Section 2.1 of
 * Annexure B) - a dedicated service resolving, for every Reference, the
 * timeline rule-set from its JurisdictionProfile record rather than any
 * module hard-coding jurisdiction logic. Adding a seventh jurisdiction
 * (Section 3.3 of the SOW/SRS) means adding a JurisdictionProfile row with
 * a `timelineRules` shape below - no code change.
 */

export type TimelineRules = {
  type: "statutory" | "institutional_target" | "tribunal_directed";
  label: string;
  targetMonths?: number;
  consentExtensionMonths?: number;
  courtOrInstitutionExtensionAuthority?: string;
  anchorEvent?: "constitution" | "terms_of_reference_signature";
  reminderDaysBeforeDeadline: number[];
};

export function getTimelineRules(profile: JurisdictionProfile): TimelineRules {
  return profile.timelineRules as unknown as TimelineRules;
}

/** Computes the Reference's applicable timeline deadline/target from its
 * profile, or null where the profile has no fixed date (tribunal-directed
 * profiles - Section 5.6 of the SOW/SRS). */
export function computeTimelineDeadline(
  profile: JurisdictionProfile,
  startDate: Date,
): Date | null {
  const rules = getTimelineRules(profile);
  if (rules.type === "tribunal_directed" || !rules.targetMonths) return null;
  return addMonths(startDate, rules.targetMonths);
}

export function computeConsentExtendedDeadline(
  profile: JurisdictionProfile,
  currentDeadline: Date,
): Date | null {
  const rules = getTimelineRules(profile);
  if (!rules.consentExtensionMonths) return null;
  return addMonths(currentDeadline, rules.consentExtensionMonths);
}

export function computeBreachNotificationDeadline(
  profile: JurisdictionProfile,
  detectedAt: Date,
): Date {
  return addHours(detectedAt, profile.breachNotificationHours);
}

/** Days remaining until a deadline, used to drive the escalating
 * neutral/amber/red banner treatment (Annexure B, Section 1.3). */
export function daysUntil(date: Date | null): number | null {
  if (!date) return null;
  const ms = date.getTime() - Date.now();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

export function deadlineUrgency(daysRemaining: number | null): "none" | "neutral" | "amber" | "red" {
  if (daysRemaining === null) return "none";
  if (daysRemaining < 0) return "red";
  if (daysRemaining <= 7) return "red";
  if (daysRemaining <= 30) return "amber";
  return "neutral";
}

/** Default expedited timeline (days) for an Interim Application under
 * Module 5.17, configurable per profile rather than fixed platform-wide. */
export function getInterimApplicationTimeline(profile: JurisdictionProfile): {
  oppositionDays: number;
  decisionDays: number;
} {
  const rules = getTimelineRules(profile);
  // Institutions running an expedited/emergency track target faster
  // turnaround; ad hoc/tribunal-directed profiles default to a slightly
  // longer, still-expedited window.
  if (rules.type === "institutional_target") {
    return { oppositionDays: 7, decisionDays: 14 };
  }
  return { oppositionDays: 10, decisionDays: 21 };
}
