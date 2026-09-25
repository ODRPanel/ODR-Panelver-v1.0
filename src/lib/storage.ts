import "server-only";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import crypto from "crypto";

/**
 * Minimal local-disk object storage standing in for the encrypted,
 * regional object storage at Section 7.1 of the SOW/SRS ("Data Layer").
 * For a real production, multi-region deployment this module is the single
 * place to swap in S3/Azure Blob per data-residency region - every caller
 * only depends on this function's return shape, not on the filesystem.
 */

function storageRoot(): string {
  return path.resolve(process.cwd(), process.env.STORAGE_DIR || "./storage");
}

export async function saveUploadedFile(
  referenceId: string,
  file: File,
): Promise<{
  storagePath: string;
  sha256Hash: string;
  sizeBytes: number;
  mimeType: string;
  fileName: string;
}> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const sha256Hash = crypto.createHash("sha256").update(buffer).digest("hex");

  const dir = path.join(storageRoot(), referenceId);
  await mkdir(dir, { recursive: true });

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storedName = `${crypto.randomUUID()}-${safeName}`;
  const fullPath = path.join(dir, storedName);
  await writeFile(fullPath, buffer);

  return {
    storagePath: path.join(referenceId, storedName),
    sha256Hash,
    sizeBytes: buffer.byteLength,
    mimeType: file.type || "application/octet-stream",
    fileName: file.name,
  };
}

export function absoluteStoragePath(storagePath: string): string {
  return path.join(storageRoot(), storagePath);
}
