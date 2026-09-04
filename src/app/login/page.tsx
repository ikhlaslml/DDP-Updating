import { LoginForm } from "./LoginForm";
import { BrandMarkIcon, BrandWordmark } from "@/components/login/BrandMark";
import { Database, Layers, ShieldCheck } from "lucide-react";
import { BRAND_COLORS } from "@/lib/brand-colors";

const POINTS = [
  { icon: Database, text: "Data warga dan keluarga yang terintegrasi" },
  { icon: Layers, text: "Pembaruan data yang fleksibel" },
  { icon: ShieldCheck, text: "Jaminan keamanan data" },
];

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const params = await searchParams;
  const callbackUrl = params.callbackUrl || "/";

  return (
    <div className="min-h-[100dvh] bg-[#F7F8FA] lg:grid lg:grid-cols-2">
      {/* Brand panel (hidden on small screens) */}
      <section
        aria-label="Informasi Data Desa Presisi"
        style={{ background: `linear-gradient(135deg, ${BRAND_COLORS.navy} 0%, #173B5E 52%, ${BRAND_COLORS.maroon} 100%)` }}
        className="relative hidden overflow-hidden px-11 py-12 text-white lg:flex lg:min-h-[100dvh] lg:flex-col lg:justify-between xl:px-14"
      >
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-sm">
            <BrandMarkIcon size={26} />
          </span>
          <div>
            <p className="text-lg font-extrabold leading-tight tracking-[-0.01em]">Data Desa Presisi</p>
            <p className="text-sm text-white/70">Sistem pembaruan data desa</p>
          </div>
        </div>

        <div className="max-w-[560px]">
          <h1 className="max-w-[560px] text-4xl font-extrabold leading-[1.14] tracking-[-0.025em] xl:text-[2.75rem]">
            Sistem Tata Kelola Data Desa
          </h1>
          <ul className="mt-10 space-y-4">
            {POINTS.map((p) => (
              <li key={p.text} className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/15">
                  <p.icon className="h-[18px] w-[18px]" />
                </span>
                <span className="text-[15px] text-white/90">{p.text}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="text-sm text-white/50">&copy; {new Date().getFullYear()} desapresisi.id</p>
      </section>

      {/* Form panel */}
      <main className="flex min-h-[100dvh] flex-col items-center justify-center px-5 py-10 sm:px-8 lg:px-12">
        {/* Mobile brand header */}
        <div className="mb-8 flex w-full max-w-[430px] items-center gap-2.5 lg:hidden">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-slate-200">
            <BrandMarkIcon size={22} />
          </span>
          <BrandWordmark />
        </div>

        <section
          aria-labelledby="login-title"
          className="w-full max-w-[430px] rounded-2xl border border-slate-100 bg-white p-7 shadow-[0_16px_42px_rgba(15,23,42,0.09)] sm:p-9"
        >
          <h2 id="login-title" className="text-2xl font-bold tracking-[-0.02em] text-slate-900">
            Login
          </h2>
          <p className="mb-7 mt-1 text-[15px] text-slate-500">Masuk ke dashboard desa Anda.</p>
          <LoginForm callbackUrl={callbackUrl} />
        </section>
      </main>
    </div>
  );
}
