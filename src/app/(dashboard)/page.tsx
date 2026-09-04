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
  return match?.[1] ? `Kec. ${titleCase(cleanText(match[1]))}` : "";
}

function regencyName(...values: Array<string | null | undefined>) {
  for (const value of values) {
    const match = cleanText(value).match(/\b(KABUPATEN|KOTA)\s+([^,]+)/i);
    if (!match?.[2]) continue;
    const prefix = match[1].toLocaleUpperCase("id-ID") === "KOTA" ? "Kota" : "Kab.";
    return `${prefix} ${titleCase(cleanText(match[2]))}`;
  }
  return "";
}

async function regionalHeading() {
  const session = await auth();
  const desaId = session?.user?.desaId;
  if (!desaId) return "Ringkasan Desa";

  const [desa, pengaturan] = await Promise.all([
    prisma.desa.findUnique({ where: { id: desaId }, select: { nama: true } }),
    prisma.pengaturanDesa.findUnique({ where: { desaId }, select: { kopBaris1: true, kopBaris2: true, kopBaris3: true, kopBaris4: true } }),
  ]);

  const parts = [
    villageName(desa?.nama ?? pengaturan?.kopBaris3),
    subdistrictName(pengaturan?.kopBaris2),
    regencyName(pengaturan?.kopBaris1, pengaturan?.kopBaris4),
  ].filter(Boolean);

  return `${parts.join(", ")}.`;
}

export default async function DashboardHomePage() {
  const heading = await regionalHeading();

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-slate-900">{heading}</h1>
      <DashboardView />
    </div>
  );
}
