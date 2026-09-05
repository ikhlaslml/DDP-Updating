import "server-only";

type BuildingPhotoResponse = {
  id?: unknown;
  kode?: unknown;
  kode_deskel?: unknown;
  jenis?: unknown;
  created_at?: unknown;
  updated_at?: unknown;
  foto?: unknown;
  fotopath?: unknown;
};

export type DdpBuildingPhoto = {
  id: string;
  kode: string;
  kodeDeskel: string;
  jenis: string | null;
  updatedAt: string | null;
  photoUrl: string;
};

function safePhotoUrl(value: unknown) {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.hostname !== "storage.googleapis.com") return null;
    return url.toString();
  } catch {
    return null;
  }
}

export async function fetchDdpBuildingPhoto(code: number, kodeDeskel: string): Promise<DdpBuildingPhoto | null> {
  const baseUrl = (process.env.DDP_CORE_API_BASE_URL ?? "https://core.desapresisi.id").replace(/\/$/, "");
  const endpoint = new URL("/api/v1/foto-bangunan", `${baseUrl}/`);
  endpoint.searchParams.set("kode", String(code));
  endpoint.searchParams.set("kode_deskel", kodeDeskel);

  const response = await fetch(endpoint, {
    headers: { Accept: "application/json" },
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error("Foto bangunan tidak dapat diambil saat ini");
  const payload = await response.json() as unknown;
  if (!Array.isArray(payload)) throw new Error("Data foto bangunan tidak valid");

  const matches = payload
    .filter((row): row is BuildingPhotoResponse => Boolean(row && typeof row === "object"))
    .filter((row) => String(row.kode ?? "") === String(code) && String(row.kode_deskel ?? "") === kodeDeskel)
    .map((row) => ({ row, photoUrl: safePhotoUrl(row.foto) }))
    .filter((entry): entry is { row: BuildingPhotoResponse; photoUrl: string } => Boolean(entry.photoUrl))
    .sort((left, right) => String(right.row.updated_at ?? "").localeCompare(String(left.row.updated_at ?? "")));
  const selected = matches[0];
  if (!selected) return null;
  return {
    id: String(selected.row.id ?? ""),
    kode: String(selected.row.kode),
    kodeDeskel: String(selected.row.kode_deskel),
    jenis: typeof selected.row.jenis === "string" ? selected.row.jenis : null,
    updatedAt: typeof selected.row.updated_at === "string" ? selected.row.updated_at : null,
    photoUrl: selected.photoUrl,
  };
}
