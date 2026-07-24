import { LoginForm } from "./LoginForm";
import { BrandMarkIcon, BrandWordmark } from "@/components/login/BrandMark";
import { HeroGraphic, HeroBackdrop } from "@/components/login/HeroGraphic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const params = await searchParams;
  const callbackUrl = params.callbackUrl || "/";

  return (
    <div className="relative min-h-screen bg-[#F5F6F8] overflow-hidden">
      <HeroBackdrop />

      <div className="relative mx-auto flex min-h-screen max-w-7xl flex-col px-6 lg:px-10">
        <header className="flex items-center gap-3 py-6">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white border border-slate-200 shadow-sm">
            <BrandMarkIcon size={26} />
          </span>
          <BrandWordmark />
        </header>

        <main className="flex flex-1 items-center">
          <div className="grid w-full grid-cols-1 lg:grid-cols-2 items-center gap-12">
            

            <div className="relative w-full max-w-sm mx-auto lg:mx-0 lg:justify-self-end">
              <HeroGraphic className="hidden lg:block pointer-events-none absolute -top-20 -left-20 w-56 h-56 opacity-80" />
              <div className="relative bg-white rounded-2xl border border-slate-100 shadow-[0_1px_2px_rgba(16,24,40,0.04)] p-8">
                <h2 className="text-xl font-bold text-slate-900">Login Data Desa Presisi</h2>
                <p className="text-sm text-slate-500 mt-1 mb-6">
                  Silakan login untuk melanjutkan
                </p>
                <LoginForm callbackUrl={callbackUrl} />
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
