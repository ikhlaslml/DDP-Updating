export type UploadedMedia = {
  id: string;
  url: string;
  mimeType: string;
  sizeBytes: number;
};

export async function compressRespondentPhoto(file: File) {
  if (!file.type.startsWith("image/")) throw new Error("Pilih berkas foto yang valid.");
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const maxDimension = 1280;
  const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Perangkat tidak dapat memproses foto.");
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.78));
  if (!blob) throw new Error("Foto gagal dikompresi.");
  if (blob.size > 1_500_000) throw new Error("Foto masih terlalu besar setelah kompresi.");
  return new File([blob], `${file.name.replace(/\.[^.]+$/, "") || "responden"}.jpg`, {
    type: "image/jpeg",
    lastModified: Date.now(),
  });
}

export async function uploadMedia(file: File, purpose: "RESPONDEN" | "LOGO_DESA" | "TANDA_TANGAN") {
  const form = new FormData();
  form.set("file", file);
  form.set("purpose", purpose);
  const response = await fetch("/api/media", { method: "POST", body: form });
  const json = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(json.error ?? "Media gagal diunggah.");
  return json.data as UploadedMedia;
}
