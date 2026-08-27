import { redirect } from "next/navigation";

export default function LegacyServiceHistoryPage() {
  redirect("/layanan-surat?tab=riwayat");
}
