import Link from "next/link";
import { auth } from "@/auth";
import { LogoutButton } from "@/components/LogoutButton";

const NAV = [
  { href: "/", label: "Ringkasan" },
  { href: "/penduduk", label: "Data Penduduk" },
  { href: "/peta", label: "Peta Sebaran" },
  { href: "/impor-ekspor", label: "Impor / Ekspor" },
];

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-slate-200 bg-white sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-8">
            <Link href="/" className="font-bold text-slate-900 whitespace-nowrap">
              Dashboard Desa
            </Link>
            <nav className="hidden md:flex items-center gap-1">
              {NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <span className="hidden sm:inline text-sm text-slate-500">{session?.user?.email}</span>
            <LogoutButton />
          </div>
        </div>
        <nav className="md:hidden flex items-center gap-1 px-4 pb-2 overflow-x-auto">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="px-3 py-1.5 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 whitespace-nowrap"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6">{children}</main>
    </div>
  );
}
