import { requireUser } from "@/lib/rbac";
import { getCaseForUserOr404 } from "@/lib/queries";
import { prisma } from "@/lib/prisma";
import { hasPermission, MODULE_KEYS } from "@/lib/permissions";
import { toggleAiEnabledAction, requestAiAnalysisAction, decideAiJobAction } from "@/actions/aiJob";
import { ErrorAlert, InfoAlert } from "@/components/ui/Alert";
import { StatusBadge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";

export default async function AiLayerPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { error?: string };
}) {
  const user = await requireUser();
  const kase = await getCaseForUserOr404(params.id, user);
  const canCreate = hasPermission(user.role.permissionSet, MODULE_KEYS.AI_LAYER, "create");
  const canDecide = hasPermission(user.role.permissionSet, MODULE_KEYS.AI_LAYER, "decide");
  const canEditCase = hasPermission(user.role.permissionSet, MODULE_KEYS.CASE_INITIATION, "edit");

  const [platformFlag, documents, jobs] = await Promise.all([
    prisma.featureFlag.findFirst({ where: { key: "phase4-ai-layer", scope: "platform" } }),
    prisma.documentRepositoryItem.findMany({ where: { referenceId: kase.id }, orderBy: { uploadedAt: "desc" } }),
    prisma.aIAnalysisJob.findMany({ where: { referenceId: kase.id }, orderBy: { createdAt: "desc" } }),
  ]);

  return (
    <div className="space-y-6">
      <ErrorAlert message={searchParams.error} />

      <InfoAlert>
        This module is the final phase of the roadmap (Phase 4) and is withheld from any Reference
        until an Institution opts in, per the AI-governance sign-off at Section 11.4. No AI output
        may substitute for the Tribunal&apos;s reasoning, and every action here is logged to the
        audit trail.
      </InfoAlert>

      {!platformFlag?.enabled ? (
        <InfoAlert>
          Platform-wide, the AI Layer feature flag is currently disabled. A Super Admin can enable
          it from Administration &rarr; Feature Flags once AI-governance sign-off is complete.
        </InfoAlert>
      ) : canEditCase ? (
        <div className="card p-6">
          <form action={toggleAiEnabledAction} className="flex items-center justify-between">
            <input type="hidden" name="referenceId" value={kase.id} />
            <p className="text-sm">AI Layer for this Reference: <strong>{kase.aiEnabled ? "Enabled" : "Disabled"}</strong></p>
            <button className="btn-secondary" type="submit">{kase.aiEnabled ? "Disable" : "Enable"} for this Reference</button>
          </form>
        </div>
      ) : null}

      {kase.aiEnabled && platformFlag?.enabled && (
        <>
          {canCreate && (
            <div className="card p-6">
              <h2 className="section-title mb-4">Request AI-Assisted Analysis</h2>
              <form action={requestAiAnalysisAction} className="space-y-4">
                <input type="hidden" name="referenceId" value={kase.id} />
                <div>
                  <label className="label" htmlFor="requestType">Request type</label>
                  <select className="input" id="requestType" name="requestType" required>
                    <option value="summary">Summarise selected documents</option>
                    <option value="chronology">Extract chronology/timeline</option>
                    <option value="draft_assist">Draft-assist a procedural Order</option>
                    <option value="conflict_flag">Conflict/disclosure risk flag</option>
                  </select>
                </div>
                <div>
                  <label className="label" htmlFor="inputDocumentIds">Input documents (Ctrl/Cmd-click to select several)</label>
                  <select className="input" id="inputDocumentIds" name="inputDocumentIds" multiple size={Math.min(6, Math.max(3, documents.length))}>
                    {documents.map((d) => (
                      <option key={d.id} value={d.id}>{d.fileName}</option>
                    ))}
                  </select>
                </div>
                <button className="btn-primary" type="submit">Request analysis</button>
              </form>
            </div>
          )}

          <div className="card p-6">
            <h2 className="section-title mb-4">AI Requests</h2>
            {jobs.length === 0 ? (
              <EmptyState title="No AI requests yet" />
            ) : (
              <div className="space-y-4">
                {jobs.map((j) => (
                  <div key={j.id} className="rounded-md border-2 border-purple-200 bg-purple-50 p-4">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold uppercase text-purple-700">AI-generated - {j.requestType.replace(/_/g, " ")}</p>
                      <StatusBadge status={j.decision} />
                    </div>
                    <pre className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{j.outputText}</pre>
                    {j.decision === "pending" && canDecide && (
                      <div className="mt-3 flex flex-wrap gap-2 border-t border-purple-200 pt-3">
                        <form action={decideAiJobAction}>
                          <input type="hidden" name="jobId" value={j.id} />
                          <input type="hidden" name="referenceId" value={kase.id} />
                          <input type="hidden" name="decision" value="accepted" />
                          <button className="text-xs font-medium text-emerald-700 hover:underline" type="submit">Accept</button>
                        </form>
                        <form action={decideAiJobAction} className="flex items-center gap-1">
                          <input type="hidden" name="jobId" value={j.id} />
                          <input type="hidden" name="referenceId" value={kase.id} />
                          <input type="hidden" name="decision" value="edited_and_accepted" />
                          <input className="input py-1 text-xs" name="editedText" placeholder="Edited text" />
                          <button className="text-xs font-medium text-brand-700 hover:underline" type="submit">Edit &amp; Accept</button>
                        </form>
                        <form action={decideAiJobAction}>
                          <input type="hidden" name="jobId" value={j.id} />
                          <input type="hidden" name="referenceId" value={kase.id} />
                          <input type="hidden" name="decision" value="discarded" />
                          <button className="text-xs font-medium text-red-700 hover:underline" type="submit">Discard</button>
                        </form>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
