import { PendudukTable } from "@/components/penduduk/PendudukTable";

export default function PendudukPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 mb-4">Data Penduduk</h1>
      <PendudukTable />
    </div>
  );
}
