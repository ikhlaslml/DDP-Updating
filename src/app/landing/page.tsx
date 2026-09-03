import Link from "next/link";
import { Database, Layers, Map, ShieldCheck } from "lucide-react";

const FEATURES = [
  { icon: Database, title: "Data Warga dan Keluarga", desc: "Data sensus disusun dalam enam kelompok indikator." },
  { icon: Layers, title: "Pembaruan Data", desc: "Setiap perubahan dicatat dan diterapkan setelah diperiksa." },
  { icon: Map, title: "Peta dan Ringkasan", desc: "Lihat sebaran keluarga serta ringkasan kondisi warga." },
  { icon: ShieldCheck, title: "Akses Sesuai Peran", desc: "Data setiap desa dikelola terpisah sesuai tugas pengguna." },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 via-white to-white text-slate-900">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white font-bold">D</div>
          <span className="text-lg font-bold tracking-tight">Data Desa Presisi</span>
        </div>
        <Link href="/login" className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700">
          Masuk
        </Link>
      </header>

      <main className="mx-auto max-w-6xl px-6">
        <section className="py-16 text-center sm:py-24">
          <p className="inline-block rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-700">
            desapresisi.id
          </p>
          <h1 className="mx-auto mt-5 max-w-3xl text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">
            Sistem pembaruan data warga desa
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-slate-600">
            Catat perubahan penduduk, lihat sebaran keluarga, dan siapkan data desa yang rapi dalam satu tempat.
          </p>
          <div className="mt-8 flex items-center justify-center gap-3">
            <Link href="/login" className="rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white hover:bg-indigo-700">
              Masuk ke Dashboard Desa
            </Link>
            <a href="#fitur" className="rounded-xl border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">
              Lihat Fitur
            </a>
          </div>
          <p className="mt-4 text-xs text-slate-400">
            Contoh alamat desa: desa-setu.desapresisi.id &middot; desa-gunung-putri.desapresisi.id
          </p>
        </section>

        <section id="fitur" className="grid grid-cols-1 gap-5 pb-24 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f) => (
            <div key={f.title} className="rounded-2xl border border-slate-100 bg-white p-6 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-base font-bold">{f.title}</h3>
              <p className="mt-1.5 text-sm text-slate-600">{f.desc}</p>
            </div>
          ))}
        </section>
      </main>

      <footer className="border-t border-slate-100 py-8 text-center text-sm text-slate-400">
        © {new Date().getFullYear()} Data Desa Presisi · desapresisi.id
      </footer>
    </div>
  );
}
