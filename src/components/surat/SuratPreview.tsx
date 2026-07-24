import { formatCell } from "@/lib/format";
import { mapping } from "@/lib/indikator";

export type SuratSettings = {
  namaKepala?: string | null;
  kopBaris1?: string | null;
  kopBaris2?: string | null;
  kopBaris3?: string | null;
  kopBaris4?: string | null;
  penutup?: string | null;
  disclaimer?: string | null;
};

export type Warga = {
  nama?: string | null;
  nik?: string | null;
  jk?: string | null;
  tgl_lahir?: string | null;
  agama?: string | null;
  status_kawin?: string | null;
  kerja_profesi?: string | null;
  alamat?: string | null;
};

function jkLabel(jk?: string | null) {
  if (jk === "L") return "Laki-laki";
  if (jk === "P") return "Perempuan";
  return "-";
}

export function SuratPreview({
  settings,
  templateNama,
  nomor,
  body,
  warga,
  tanggal,
}: {
  settings: SuratSettings;
  templateNama: string;
  nomor: string;
  body: string;
  warga: Warga;
  tanggal: string;
}) {
  const namaDesa = settings.kopBaris3 || "Desa";
  const rows: [string, string][] = [
    ["Nama Lengkap", warga.nama || "-"],
    ["NIK", warga.nik || "-"],
    ["Jenis Kelamin", jkLabel(warga.jk)],
    ["Tanggal Lahir", warga.tgl_lahir ? formatCell(warga.tgl_lahir, mapping.kolom["tgl_lahir"]) : "-"],
    ["Agama", warga.agama || "-"],
    ["Status Perkawinan", warga.status_kawin || "-"],
    ["Pekerjaan", warga.kerja_profesi || "-"],
    ["Alamat", warga.alamat || "-"],
  ];

  return (
    <div className="surat-sheet mx-auto max-w-[820px] bg-white px-10 py-8 text-slate-900" style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>
      {/* Kop surat */}
      <div className="border-b-4 border-double border-slate-900 pb-2 text-center">
        <p className="text-lg font-bold uppercase leading-tight">{settings.kopBaris1 || "PEMERINTAH KABUPATEN"}</p>
        <p className="text-lg font-bold uppercase leading-tight">{settings.kopBaris2 || "KECAMATAN"}</p>
        <p className="text-2xl font-extrabold uppercase leading-tight">{settings.kopBaris3 || "DESA"}</p>
        <p className="mt-1 text-xs">{settings.kopBaris4 || "Alamat desa"}</p>
      </div>

      <div className="mt-6 text-center">
        <p className="inline-block border-b-2 border-slate-900 text-base font-bold uppercase tracking-wide">{templateNama}</p>
        <p className="mt-1 text-sm">Nomor: {nomor}</p>
      </div>

      <p className="mt-6 text-sm leading-relaxed">
        Yang bertanda tangan di bawah ini, Kepala {namaDesa}, menerangkan bahwa:
      </p>

      <table className="mt-4 text-sm">
        <tbody>
          {rows.map(([k, v]) => (
            <tr key={k} className="align-top">
              <td className="w-44 py-0.5 pr-2">{k}</td>
              <td className="py-0.5 pr-2">:</td>
              <td className="py-0.5">{v}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <p className="mt-4 whitespace-pre-line text-sm leading-relaxed">{body}</p>
      {settings.penutup && <p className="mt-3 text-sm leading-relaxed">{settings.penutup}</p>}

      <div className="mt-10 flex justify-end">
        <div className="text-center text-sm">
          <p>{namaDesa}, {tanggal}</p>
          <p>Kepala {namaDesa},</p>
          <p className="my-8 italic text-slate-400">(Ttd Digital)</p>
          <p className="font-bold underline">{settings.namaKepala || "Kepala Desa"}</p>
        </div>
      </div>

      {settings.disclaimer && (
        <p className="mt-10 border-t border-dashed border-slate-300 pt-2 text-center text-[11px] italic text-slate-500">
          {settings.disclaimer}
        </p>
      )}
    </div>
  );
}
