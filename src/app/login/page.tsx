import { LoginForm } from "./LoginForm";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const params = await searchParams;
  const callbackUrl = params.callbackUrl || "/";

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F7F7FB] px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl border border-slate-100 shadow-[0_1px_2px_rgba(16,24,40,0.04)] p-8">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-600 text-white font-bold mx-auto mb-4">
          D
        </div>
        <h1 className="text-2xl font-bold text-slate-900 text-center">Dashboard Kependudukan Desa</h1>
        <p className="text-sm text-slate-500 text-center mt-1 mb-6">Silakan login untuk melanjutkan</p>
        <LoginForm callbackUrl={callbackUrl} />
      </div>
    </div>
  );
}
