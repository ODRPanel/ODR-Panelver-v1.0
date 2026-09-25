import "server-only";

/**
 * Stub LiquidText exchange-format adapter (Section 5.15(A) of the
 * SOW/SRS). LiquidText is a licensed third-party application; this local
 * build implements the Platform-native Native Canvas (Section 5.15(B)) in
 * full and stands this file in for the round-trip export/import path so
 * the workflow and audit trail are demonstrable without a LiquidText
 * account.
 */
export async function exportToLiquidTextFormat(annotationLayer: unknown): Promise<string> {
  return JSON.stringify({
    format: "simulated-liquidtext-exchange-v1",
    exportedAt: new Date().toISOString(),
    annotationLayer,
  });
}

export async function importFromLiquidTextFormat(exchangeFileContent: string): Promise<unknown> {
  const parsed = JSON.parse(exchangeFileContent);
  return parsed.annotationLayer ?? {};
}
