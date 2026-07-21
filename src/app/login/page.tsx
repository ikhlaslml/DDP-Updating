import { LoginForm } from "./LoginForm";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const params = await searchParams;
  const callbackUrl = params.callbackUrl || "/";

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-sm bg-white rounded-xl shadow p-8">
        <h1 className="text-2xl font-bold text-slate-900 text-center">Dashboard Kependudukan Desa</h1>
        <p className="text-sm text-slate-500 text-center mt-1 mb-6">Silakan login untuk melanjutkan</p>
        <LoginForm callbackUrl={callbackUrl} />
      </div>
    </div>
  );
}
