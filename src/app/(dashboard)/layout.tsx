import { auth } from "@/auth";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { MobileNav } from "@/components/layout/MobileNav";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  return (
    <div className="min-h-screen bg-[#F7F7FB]">
      <Sidebar />
      <div className="lg:pl-64 flex min-h-screen flex-col">
        <Topbar email={session?.user?.email} />
        <MobileNav />
        <main className="flex-1 w-full mx-auto max-w-7xl px-4 sm:px-6 py-6">{children}</main>
      </div>
    </div>
  );
}
