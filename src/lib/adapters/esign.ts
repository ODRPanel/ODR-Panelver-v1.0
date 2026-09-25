import "server-only";
import crypto from "crypto";

/**
 * Stub e-signature adapter (Section 7.2 of the SOW/SRS: "Must support the
 * e-signature/e-record standard of every profile, e.g. ESIGN Act for USA,
 * eIDAS-equivalent for LCIA/EU-seated ICC"). This local build produces an
 * internal, non-repudiation-style hash binding the signer, the document and
 * the time - sufficient to demonstrate the Order/Award publish workflow's
 * mechanics, but NOT a legally recognised e-signature. A production
 * deployment replaces this file with a licensed e-signature provider
 * (e.g. DocuSign, Adobe Sign) before any live Award is published.
 */
export async function applyElectronicSignature(params: {
  documentContent: string;
  signerUserId: string;
  signerName: string;
}): Promise<{ signatureId: string; signedAt: Date; method: string }> {
  const signedAt = new Date();
  const signatureId = crypto
    .createHash("sha256")
    .update(`${params.documentContent}|${params.signerUserId}|${signedAt.toISOString()}`)
    .digest("hex");

  return { signatureId, signedAt, method: "internal-simulated-non-repudiation-hash" };
}
