import "server-only";

import { prisma } from "@/lib/prisma";
import type { SuratSettings, Warga } from "@/components/surat/SuratPreview";

function parseObject<T>(value: string | null): Partial<T> {
  try {
    const parsed = JSON.parse(value ?? "{}");
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Partial<T> : {};
  } catch {
    return {};
  }
}

export async function getIssuedLetterDocument(id: string, desaId: string) {
  const letter = await prisma.suratTerbit.findFirst({ where: { id, desaId } });
  if (!letter) return null;
  const [currentSettings, currentResident, currentTemplate] = await Promise.all([
    letter.pengaturanSnapshot ? null : prisma.pengaturanDesa.findUnique({ where: { desaId } }),
    letter.wargaSnapshot || !letter.pendudukId ? null : prisma.penduduk.findFirst({ where: { id: letter.pendudukId, desaId } }),
    letter.isiSnapshot || !letter.templateId ? null : prisma.suratTemplate.findFirst({ where: { id: letter.templateId, desaId } }),
  ]);
  const settings = letter.pengaturanSnapshot
    ? parseObject<SuratSettings>(letter.pengaturanSnapshot)
    : (currentSettings ?? {}) as SuratSettings;
  const warga = letter.wargaSnapshot
    ? parseObject<Warga>(letter.wargaSnapshot)
    : (currentResident ?? { nama: letter.namaWarga, nik: letter.nik }) as Warga;
  const body = letter.isiSnapshot ?? currentTemplate?.isi
    ?.replace(/\{\{nama_desa\}\}/g, settings.kopBaris3 || "Desa")
    .replace(/\{\{keperluan\}\}/g, letter.keperluan || "________") ?? "";
  return {
    letter,
    settings: settings as SuratSettings,
    warga: warga as Warga,
    body,
    templateNama: letter.templateNama ?? currentTemplate?.nama ?? "Surat Keterangan",
  };
}
