import { LoginForm } from "./LoginForm";
import { BrandMarkIcon, BrandWordmark } from "@/components/login/BrandMark";
import { Database, Layers, ShieldCheck } from "lucide-react";

const POINTS = [
  { icon: Database, text: "Data sensus DDP lengkap per desa" },
  { icon: Layers, text: "Pembaruan berperiode T0/T1 yang tertelusur" },
  { icon: ShieldCheck, text: "Multi-tenant & peran akses aman" },
];

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const params = await searchParams;
  const callbackUrl = params.callbackUrl || "/";

  return (
    <div className="min-h-screen bg-[#F5F6F8] lg:grid lg:grid-cols-2">
      {/* Brand panel (hidden on small screens) */}
      <div className="relative hidden overflow-hidden bg-gradient-to-br from-[#122A44] to-[#7A1F2E] p-10 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white">
            <BrandMarkIcon size={26} />
          </span>
          <div>
            <p className="text-lg font-extrabold leading-tight">Data Desa Presisi</p>
            <p className="text-xs text-white/70">Solusi Satu Data Indonesia</p>
          </div>
        </div>

        <div className="max-w-md">
          <h1 className="text-3xl font-extrabold leading-tight">
            Dashboard Kependudukan Desa berbasis Data Desa Presisi
          </h1>
          <ul className="mt-8 space-y-4">
            {POINTS.map((p) => (
              <li key={p.text} className="flex items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/15">
                  <p.icon className="h-4.5 w-4.5" />
                </span>
                <span className="text-sm text-white/90">{p.text}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="text-xs text-white/50">© {new Date().getFullYear()} desapresisi.id</p>
      </div>

      {/* Form panel */}
      <div className="flex min-h-screen flex-col items-center justify-center px-5 py-10 sm:px-8">
        {/* Mobile brand header */}
        <div className="mb-8 flex items-center gap-2.5 lg:hidden">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-slate-200">
            <BrandMarkIcon size={22} />
          </span>
          <BrandWordmark />
        </div>

        <div className="w-full max-w-sm rounded-2xl border border-slate-100 bg-white p-6 shadow-[0_4px_24px_rgba(16,24,40,0.06)] sm:p-8">
          <h2 className="text-xl font-bold text-slate-900">Login</h2>
          <p className="mb-6 mt-1 text-sm text-slate-500">Masuk ke dashboard desa Anda.</p>
          <LoginForm callbackUrl={callbackUrl} />
        </div>

        <p className="mt-6 max-w-sm text-center text-xs text-slate-400">
          Tiap desa memiliki subdomain sendiri, mis. <span className="font-medium text-slate-500">desa-setu.desapresisi.id</span>
        </p>
      </div>
    </div>
  );
}
