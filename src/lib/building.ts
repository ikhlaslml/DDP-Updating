import { z } from "zod";

export const NON_RESIDENTIAL_CATEGORIES = [
  "Kandang",
  "Sarang Walet",
  "WC/Dapur/Garasi",
  "Sekolah",
  "Tempat Ibadah",
  "Rumah Kebun",
  "Makam",
  "Fasilitas Kesehatan",
  "Warung/Kios/Toko",
  "Lumbung/Gudang/Pondok",
  "Kantor",
  "Gubuk/Pos/Gazebo/Alang",
  "Pasar",
  "Tempat Usaha",
  "Rumah Kosong",
  "Bangunan Lain",
] as const;

const pointSchema = z.object({
  lat: z.number().min(-11).max(6),
  lng: z.number().min(95).max(141),
});

const personPayloadSchema = z.record(z.string(), z.unknown());

export const buildingSubmissionSchema = z
  .object({
    building: z.object({
      jenis: z.enum(["BERPENGHUNI", "TIDAK_BERPENGHUNI"]),
      kategori: z.enum(NON_RESIDENTIAL_CATEGORIES).nullable().optional(),
      keterangan: z.string().trim().max(500).nullable().optional(),
      fotoUrl: z.string().max(1_400_000).nullable().optional(),
      dusun: z.string().trim().min(1, "Dusun wajib diisi"),
      rw: z.coerce.number().int().min(0),
      rt: z.coerce.number().int().min(0),
      alamat: z.string().trim().max(500).nullable().optional(),
      points: z.array(pointSchema).min(3).max(100),
    }),
    head: personPayloadSchema.nullable().optional(),
    members: z.array(personPayloadSchema).max(30).default([]),
  })
  .superRefine((value, ctx) => {
    if (value.building.jenis === "BERPENGHUNI" && !value.head) {
      ctx.addIssue({ code: "custom", path: ["head"], message: "Data kepala keluarga wajib diisi" });
    }
    if (value.building.jenis === "TIDAK_BERPENGHUNI" && !value.building.kategori) {
      ctx.addIssue({ code: "custom", path: ["building", "kategori"], message: "Kategori bangunan wajib dipilih" });
    }
    if (value.building.jenis === "TIDAK_BERPENGHUNI" && !value.building.keterangan?.trim()) {
      ctx.addIssue({ code: "custom", path: ["building", "keterangan"], message: "Nama atau jenis spesifik wajib diisi" });
    }
    if (value.building.jenis === "TIDAK_BERPENGHUNI" && !value.building.fotoUrl?.startsWith("data:image/")) {
      ctx.addIssue({ code: "custom", path: ["building", "fotoUrl"], message: "Foto bangunan wajib diunggah" });
    }
  });

export type SpatialPoint = z.infer<typeof pointSchema>;

function orientation(a: SpatialPoint, b: SpatialPoint, c: SpatialPoint) {
  return (b.lng - a.lng) * (c.lat - a.lat) - (b.lat - a.lat) * (c.lng - a.lng);
}

const GEOMETRY_EPSILON = 1e-14;

function onSegment(a: SpatialPoint, b: SpatialPoint, point: SpatialPoint) {
  return (
    Math.abs(orientation(a, b, point)) <= GEOMETRY_EPSILON &&
    point.lng >= Math.min(a.lng, b.lng) - GEOMETRY_EPSILON &&
    point.lng <= Math.max(a.lng, b.lng) + GEOMETRY_EPSILON &&
    point.lat >= Math.min(a.lat, b.lat) - GEOMETRY_EPSILON &&
    point.lat <= Math.max(a.lat, b.lat) + GEOMETRY_EPSILON
  );
}

function intersects(a: SpatialPoint, b: SpatialPoint, c: SpatialPoint, d: SpatialPoint) {
  const o1 = orientation(a, b, c);
  const o2 = orientation(a, b, d);
  const o3 = orientation(c, d, a);
  const o4 = orientation(c, d, b);
  if (o1 * o2 < 0 && o3 * o4 < 0) return true;
  return (
    (Math.abs(o1) <= GEOMETRY_EPSILON && onSegment(a, b, c)) ||
    (Math.abs(o2) <= GEOMETRY_EPSILON && onSegment(a, b, d)) ||
    (Math.abs(o3) <= GEOMETRY_EPSILON && onSegment(c, d, a)) ||
    (Math.abs(o4) <= GEOMETRY_EPSILON && onSegment(c, d, b))
  );
}

export function validateAndSerializePolygon(points: SpatialPoint[]) {
  const unique = new Set(points.map((point) => `${point.lat.toFixed(7)},${point.lng.toFixed(7)}`));
  if (unique.size < 3) throw new Error("Polygon membutuhkan minimal tiga titik berbeda");
  if (unique.size !== points.length) throw new Error("Setiap sudut polygon harus berupa titik yang berbeda");

  for (let i = 0; i < points.length; i += 1) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    for (let j = i + 1; j < points.length; j += 1) {
      if (Math.abs(i - j) <= 1 || (i === 0 && j === points.length - 1)) continue;
      const c = points[j];
      const d = points[(j + 1) % points.length];
      if (intersects(a, b, c, d)) throw new Error("Garis polygon tidak boleh saling berpotongan");
    }
  }

  // Translate the polygon near the origin before applying the shoelace
  // formula. Roof footprints are tiny compared with absolute WGS84 values;
  // using 110.x / -7.x directly causes catastrophic floating-point
  // cancellation and can move the centroid hundreds of metres.
  const origin = points[0];
  let twiceArea = 0;
  let localCentroidLng = 0;
  let localCentroidLat = 0;
  for (let i = 0; i < points.length; i += 1) {
    const current = points[i];
    const next = points[(i + 1) % points.length];
    const currentLng = current.lng - origin.lng;
    const currentLat = current.lat - origin.lat;
    const nextLng = next.lng - origin.lng;
    const nextLat = next.lat - origin.lat;
    const cross = currentLng * nextLat - nextLng * currentLat;
    twiceArea += cross;
    localCentroidLng += (currentLng + nextLng) * cross;
    localCentroidLat += (currentLat + nextLat) * cross;
  }
  if (Math.abs(twiceArea) < 1e-12) throw new Error("Luas polygon tidak boleh nol");
  const centroidLng = origin.lng + localCentroidLng / (3 * twiceArea);
  const centroidLat = origin.lat + localCentroidLat / (3 * twiceArea);

  const ring = [...points.map((point) => [point.lng, point.lat]), [points[0].lng, points[0].lat]];
  return {
    centroidLat,
    centroidLng,
    polygon: JSON.stringify({ type: "Polygon", coordinates: [ring] }),
  };
}
