import type { PartyDesignation } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * Standardised Party designation nomenclature (Section 4.3 of the
 * SOW/SRS): every screen, pleading header and notice displays a Party by
 * this computed label, never a free-text label a user might enter
 * inconsistently across filings (Annexure B, Section 3.3).
 */
const DESIGNATION_WORDS: Record<PartyDesignation, string> = {
  claimant: "Claimant",
  applicant: "Applicant",
  respondent: "Respondent",
  counter_claimant: "Counter-Claimant",
  cross_claimant: "Cross-Claimant",
  cross_respondent: "Cross-Respondent",
};

export function designationLabel(designation: PartyDesignation, sequenceNo: number | null): string {
  const word = DESIGNATION_WORDS[designation];
  return sequenceNo ? `${word} ${sequenceNo}` : word;
}

/**
 * Onboards a new Party under Section 4.3's sequential-numbering rule:
 * designations are numbered only once more than one Party sits on the same
 * side. Adding a second Party of a designation retroactively numbers the
 * first as "1" so the label never drifts (Annexure B, Section 3.3:
 * "computed, not separately entered").
 */
export async function assignNextPartySequence(
  referenceId: string,
  designation: PartyDesignation,
): Promise<{ sequenceNo: number | null; displayLabel: string; retro?: { partyId: string; sequenceNo: number; displayLabel: string } }> {
  const existing = await prisma.party.findMany({
    where: { referenceId, designation },
    orderBy: { createdAt: "asc" },
  });

  if (existing.length === 0) {
    return { sequenceNo: null, displayLabel: designationLabel(designation, null) };
  }

  if (existing.length === 1 && existing[0].sequenceNo === null) {
    // Retroactively number the first Party of this designation.
    return {
      sequenceNo: 2,
      displayLabel: designationLabel(designation, 2),
      retro: {
        partyId: existing[0].id,
        sequenceNo: 1,
        displayLabel: designationLabel(designation, 1),
      },
    };
  }

  const maxSeq = Math.max(...existing.map((p) => p.sequenceNo ?? 1));
  return { sequenceNo: maxSeq + 1, displayLabel: designationLabel(designation, maxSeq + 1) };
}
