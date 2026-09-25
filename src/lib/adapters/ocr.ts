import "server-only";

/** Stub OCR / full-text-search extraction adapter (Section 7.2 of the
 * SOW/SRS - "Arabic-script OCR required for DIAC-seated matters"). A
 * production deployment replaces this with a licensed OCR engine (e.g.
 * AWS Textract, Azure Document Intelligence, Tesseract with Arabic
 * language packs). */
export async function extractTextStub(fileName: string): Promise<string> {
  return `[OCR not configured in this local evaluation build - "${fileName}" was stored but not text-indexed. Wire a real OCR provider in src/lib/adapters/ocr.ts before relying on full-text search over scanned documents.]`;
}
