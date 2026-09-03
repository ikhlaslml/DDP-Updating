import {
  LayoutDashboard,
  Users,
  History,
  FileText,
  Landmark,
  Building2,
  FileSpreadsheet,
  MapPinned,
} from "lucide-react";

export const NAV_SECTIONS = [
  {
    label: "Ringkasan",
    items: [{ href: "/", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    label: "Data Desa",
    items: [
      { href: "/penduduk", label: "Data Kependudukan", icon: Users },
      { href: "/riwayat", label: "Riwayat Data", icon: History },
      { href: "/penambahan-titik-sarpras", label: "Peta Sarana Desa", icon: MapPinned },
    ],
  },
  {
    label: "Pelayanan",
    items: [
      { href: "/layanan-surat", label: "Layanan Surat", icon: FileText },
      { href: "/layanan-pbb", label: "Layanan PBB", icon: Landmark },
    ],
  },
  {
    label: "Administrasi",
    items: [
      { href: "/pengaturan", label: "Administrasi Desa", icon: Building2 },
      { href: "/impor-ekspor", label: "Impor & Ekspor", icon: FileSpreadsheet },
    ],
  },
];
