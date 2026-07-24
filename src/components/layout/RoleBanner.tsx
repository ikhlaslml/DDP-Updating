"use client";

import { Eye } from "lucide-react";
import { useAuthInfo } from "@/components/providers/AuthInfo";

export function RoleBanner() {
  const { role } = useAuthInfo();
  if (role !== "pemerintah_desa") return null;
  return (
    <div className="flex items-center gap-2 border-b border-amber-100 bg-amber-50 px-4 py-2 text-xs text-amber-800 sm:px-6">
      <Eye className="h-3.5 w-3.5 shrink-0" />
      <span>
        Anda masuk sebagai <strong>Pemerintah Desa</strong> — mode lihat (read-only). Aksi ubah, tambah,
        hapus, gabungkan, dan terbitkan surat dinonaktifkan.
      </span>
    </div>
  );
}
