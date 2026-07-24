import type { Metadata } from "next";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/layout/AppShell";
import { AuthInfoProvider } from "@/components/providers/AuthInfo";

// Per-tenant browser tab title (icon comes from src/app/icon.svg).
export async function generateMetadata(): Promise<Metadata> {
  const session = await auth();
  const desa = session?.user?.desaId
    ? await prisma.desa.findUnique({ where: { id: session.user.desaId }, select: { nama: true } })
    : null;
  const nama = desa?.nama ?? "Data Desa Presisi";
  return { title: `${nama} — Data Desa Presisi` };
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const desa = session?.user?.desaId
    ? await prisma.desa.findUnique({ where: { id: session.user.desaId } })
    : null;

  const info = {
    role: session?.user?.role ?? "operator",
    desaNama: desa?.nama ?? "Data Desa Presisi",
    email: session?.user?.email ?? "",
  };

  return (
    <AuthInfoProvider value={info}>
      <AppShell>{children}</AppShell>
    </AuthInfoProvider>
  );
}
