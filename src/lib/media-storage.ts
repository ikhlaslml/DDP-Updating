import "server-only";

import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { put } from "@vercel/blob";

const LOCAL_ROOT = path.join(process.cwd(), ".data", "uploads");

const EXTENSION: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/svg+xml": "svg",
};

export type StoredMedia = {
  provider: "vercel-blob" | "local";
  storageKey: string;
  storageUrl: string;
};

function safeLocalPath(storageKey: string) {
  const resolved = path.resolve(LOCAL_ROOT, storageKey);
  const root = path.resolve(LOCAL_ROOT) + path.sep;
  if (!resolved.startsWith(root)) throw new Error("Lokasi media lokal tidak valid");
  return resolved;
}

export async function storePrivateMedia(file: File, desaId: string, purpose: string): Promise<StoredMedia> {
  const extension = EXTENSION[file.type];
  if (!extension) throw new Error("Tipe media tidak didukung");
  const storageKey = `${desaId}/${purpose.toLocaleLowerCase("en-US")}/${randomUUID()}.${extension}`;
  const token = process.env.BLOB_READ_WRITE_TOKEN?.trim();

  if (token) {
    const blob = await put(storageKey, file, {
      access: "private",
      token,
      addRandomSuffix: false,
      contentType: file.type,
      cacheControlMaxAge: 60 * 60 * 24 * 30,
    });
    return { provider: "vercel-blob", storageKey: blob.pathname, storageUrl: blob.url };
  }

  if (process.env.VERCEL) {
    throw new Error("Private Blob belum terhubung. Konfigurasikan BLOB_READ_WRITE_TOKEN.");
  }
  const localPath = safeLocalPath(storageKey);
  await mkdir(path.dirname(localPath), { recursive: true });
  await writeFile(localPath, Buffer.from(await file.arrayBuffer()));
  return { provider: "local", storageKey, storageUrl: `local://${storageKey}` };
}

export async function readPrivateMedia(asset: {
  provider: string;
  storageKey: string;
  storageUrl: string;
}) {
  if (asset.provider === "local") {
    return readFile(safeLocalPath(asset.storageKey));
  }
  if (asset.provider !== "vercel-blob") throw new Error("Provider media tidak dikenal");
  const token = process.env.BLOB_READ_WRITE_TOKEN?.trim();
  if (!token) throw new Error("Token private Blob tidak tersedia");
  const response = await fetch(asset.storageUrl, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Media Blob tidak dapat dibaca (HTTP ${response.status})`);
  return Buffer.from(await response.arrayBuffer());
}
