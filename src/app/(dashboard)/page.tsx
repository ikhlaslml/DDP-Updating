import { DashboardView } from "@/components/dashboard/DashboardView";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

function cleanText(value: string | null | undefined) {
  return value?.replace(/\s+/g, " ").trim().replace(/[.,]+$/, "") ?? "";
}

function titleCase(value: string) {
  return value
    .toLocaleLowerCase("id-ID")
    .replace(/(^|[\s-])(\p{L})/gu, (_match, prefix: string, letter: string) => `${prefix}${letter.toLocaleUpperCase("id-ID")}`);
}

function villageName(value: string | null | undefined) {
  const name = titleCase(cleanText(value));
  if (!name) return "Desa";
  return /^(Desa|Kelurahan)\b/i.test(name) ? name : `Desa ${name}`;
}

function subdistrictName(value: string | null | undefined) {
  const match = cleanText(value).match(/\bKECAMATAN\s+(.+)/i);
  return match?.[1] ? `Kecamatan ${titleCase(cleanText(match[1]))}` : "";
}

function regencyName(...values: Array<string | null | undefined>) {
  for (const value of values) {
    const match = cleanText(value).match(/\b(KABUPATEN|KOTA)\s+([^,]+)/i);
    if (!match?.[2]) continue;
    const prefix = match[1].toLocaleUpperCase("id-ID") === "KOTA" ? "Kota" : "Kabupaten";
    return `${prefix} ${titleCase(cleanText(match[2]))}`;
  }
  return "";
}

function regionName(value: string | null | undefined, prefix: "Kecamatan" | "Kabupaten" | "Provinsi") {
  const region = titleCase(cleanText(value));
  if (!region) return "";
  return new RegExp(`^${prefix}\\b`, "i").test(region) ? region : `${prefix} ${region}`;
}

async function dashboardProfile() {
  const session = await auth();
  const desaId = session?.user?.desaId;
  if (!desaId) return { name: "Ringkasan Desa", tahunPendataan: null, location: "" };

  const [desa, pengaturan] = await Promise.all([
    prisma.desa.findUnique({
      where: { id: desaId },
      select: { nama: true, kecamatan: true, kabupatenKota: true, provinsi: true, tahunPendataan: true },
    }),
    prisma.pengaturanDesa.findUnique({ where: { desaId }, select: { kopBaris1: true, kopBaris2: true, kopBaris3: true, kopBaris4: true } }),
  ]);

  const location = [
    regionName(desa?.kecamatan, "Kecamatan") || subdistrictName(pengaturan?.kopBaris2),
    regionName(desa?.kabupatenKota, "Kabupaten") || regencyName(pengaturan?.kopBaris1, pengaturan?.kopBaris4),
    regionName(desa?.provinsi, "Provinsi"),
  ].filter(Boolean).join(", ");

  return {
    name: villageName(desa?.nama ?? pengaturan?.kopBaris3),
    tahunPendataan: desa?.tahunPendataan ?? null,
    location: location ? `${location}.` : "",
  };
}

export default async function DashboardHomePage() {
  const profile = await dashboardProfile();

  return (
    <div>
      <header className="mb-6 sm:mb-7">
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{profile.name}</h1>
          {profile.tahunPendataan ? (
            <span
              aria-label={`Tahun pendataan ${profile.tahunPendataan}`}
              className="inline-flex min-h-7 items-center rounded-lg bg-indigo-600 px-2.5 py-1 text-xs font-bold tabular-nums text-white shadow-sm shadow-indigo-200"
            >
              {profile.tahunPendataan}
            </span>
          ) : null}
        </div>
        {profile.location ? <p className="mt-1.5 text-sm text-slate-500 sm:text-base">{profile.location}</p> : null}
      </header>
      <DashboardView />
    </div>
  );
}
