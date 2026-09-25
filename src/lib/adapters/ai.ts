import "server-only";
import type { AIRequestType } from "@prisma/client";

/**
 * Stub AI-Assisted Case Analysis provider (Module 5.16). The SOW/SRS gates
 * this module behind a Phase 4 AI-governance sign-off (Section 11.4) and
 * requires a private-tenant model instance with no training on Client
 * data - i.e. a paid, contractually-governed LLM deployment, not something
 * a local evaluation build can responsibly call out to. This stub produces
 * a clearly-labelled placeholder so the request -> review -> Accept/Edit/
 * Discard -> audit-log workflow can be fully exercised.
 *
 * To connect a real provider: call your model provider's API here (for
 * example the Claude API - see the `claude-api` skill/reference in this
 * workspace for request shapes) and return its text in place of the
 * placeholder below. Nothing else in the AI Layer needs to change.
 */
export async function runAiAnalysis(params: {
  requestType: AIRequestType;
  referenceTitle: string;
  inputDocumentCount: number;
}): Promise<string> {
  const templates: Record<AIRequestType, string> = {
    summary: `[SIMULATED AI OUTPUT - no live model connected] A summary of the ${params.inputDocumentCount} selected document(s) for "${params.referenceTitle}" would appear here. Connect a private-tenant model in src/lib/adapters/ai.ts to produce a real summary.`,
    chronology: `[SIMULATED AI OUTPUT - no live model connected] A chronology/timeline extracted from the ${params.inputDocumentCount} selected document(s) would appear here.`,
    draft_assist: `[SIMULATED AI OUTPUT - no live model connected] Proposed draft text for a procedural Order/direction would appear here. This is proposal-only text; it carries no adjudicatory authority and requires the Arbitrator's or Tribunal Secretary's affirmative review and acceptance before it enters the case record.`,
    conflict_flag: `[SIMULATED AI OUTPUT - no live model connected] A conflict/disclosure risk assessment against the applicable disclosure standard would appear here, for the Appointing Authority's review.`,
  };
  return templates[params.requestType];
}
