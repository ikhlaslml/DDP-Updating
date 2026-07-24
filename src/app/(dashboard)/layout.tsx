import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { MobileNav } from "@/components/layout/MobileNav";
import { RoleBanner } from "@/components/layout/RoleBanner";
import { AuthInfoProvider } from "@/components/providers/AuthInfo";

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
      <div className="min-h-screen bg-[#F7F7FB]">
        <Sidebar />
        <div className="lg:pl-64 flex min-h-screen flex-col">
          <Topbar />
          <RoleBanner />
          <MobileNav />
          <main className="flex-1 w-full mx-auto max-w-7xl px-4 sm:px-6 py-6">{children}</main>
        </div>
      </div>
    </AuthInfoProvider>
  );
}
