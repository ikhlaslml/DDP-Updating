import { redirect } from "next/navigation";

export default function LegacyLetterHistoryPage() {
  redirect("/layanan-surat?tab=riwayat");
}
