import {
  LayoutDashboard,
  Users,
  History,
  Mail,
  Landmark,
  Settings,
  FileSpreadsheet,
} from "lucide-react";

export const NAV = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/penduduk", label: "Data Kependudukan", icon: Users },
  { href: "/riwayat", label: "Riwayat Data", icon: History },
  { href: "/layanan-surat", label: "Layanan Surat", icon: Mail },
  { href: "/layanan-pbb", label: "Layanan PBB", icon: Landmark },
  { href: "/pengaturan", label: "Pengaturan", icon: Settings },
  { href: "/impor-ekspor", label: "Impor / Ekspor", icon: FileSpreadsheet },
];
