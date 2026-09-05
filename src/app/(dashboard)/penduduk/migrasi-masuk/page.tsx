import Link from "next/link";
import { Building2, UserPlus, UsersRound } from "lucide-react";

const paths = [
  { href: "/penduduk/migrasi-masuk/anggota", title: "Anggota ke Keluarga Lama", icon: UserPlus, color: "bg-orange-50 text-orange-600" },
  { href: "/penduduk/migrasi-masuk/kepala", title: "Keluarga ke Bangunan Lama", icon: UsersRound, color: "bg-emerald-50 text-emerald-600" },
  { href: "/penduduk/migrasi-masuk/bangunan", title: "Keluarga dan Bangunan Baru", icon: Building2, color: "bg-indigo-50 text-indigo-600" },
];

export default function MigrasiMasukPage() {
  return (
    <div className="space-y-6">
      <div>
        <Link href="/penduduk" className="text-sm font-medium text-indigo-600 hover:underline">&larr; Kembali ke Data Kependudukan</Link>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">Migrasi Masuk</h1>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {paths.map((path) => {
          const Icon = path.icon;
          return <Link key={path.href} href={path.href} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md"><span className={`flex h-12 w-12 items-center justify-center rounded-2xl ${path.color}`}><Icon className="h-6 w-6" /></span><h2 className="mt-4 font-bold text-slate-900">{path.title}</h2></Link>;
        })}
      </div>
    </div>
  );
}
