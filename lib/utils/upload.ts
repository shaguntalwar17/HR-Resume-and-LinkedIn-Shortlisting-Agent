import { promises as fs } from "node:fs";
import path from "node:path";
import { put } from "@vercel/blob";
import { v4 as uuidv4 } from "uuid";

import { getServerEnv } from "@/lib/config/server-env";

const MAX_FILE_SIZE_MB = getServerEnv().MAX_RESUME_FILE_MB;
const ALLOWED_EXTENSIONS = new Set(["pdf", "docx", "txt"]);

type StorageProvider = "local" | "vercel_blob";

function resolveStorageProvider(): StorageProvider {
  const rawProvider = (process.env.RESUME_STORAGE_PROVIDER ?? "auto").toLowerCase();
  if (rawProvider === "local") return "local";
  if (rawProvider === "vercel_blob") return "vercel_blob";
  return process.env.BLOB_READ_WRITE_TOKEN ? "vercel_blob" : "local";
}

export function validateResumeFile(file: File) {
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!ALLOWED_EXTENSIONS.has(extension)) {
    throw new Error(`Unsupported file type for ${file.name}.`);
  }

  const maxBytes = MAX_FILE_SIZE_MB * 1024 * 1024;
  if (file.size > maxBytes) {
    throw new Error(`${file.name} exceeds ${MAX_FILE_SIZE_MB} MB size limit.`);
  }
}

export async function saveResumeFile(file: File) {
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "txt";
  const fileName = `${uuidv4()}.${extension}`;
  const storageProvider = resolveStorageProvider();

  if (storageProvider === "vercel_blob") {
    const access = (process.env.VERCEL_BLOB_ACCESS ?? "private") as "public" | "private";
    const blob = await put(`resumes/${fileName}`, file, {
      access,
      addRandomSuffix: false,
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });
    return blob.url;
  }

  const uploadsDir = path.join(process.cwd(), "public", "uploads");
  const filePath = path.join(uploadsDir, fileName);
  await fs.mkdir(uploadsDir, { recursive: true });
  const bytes = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(filePath, bytes);
  return `/uploads/${fileName}`;
}
