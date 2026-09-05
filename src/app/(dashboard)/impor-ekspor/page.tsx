import { ImportForm } from "@/components/impor-ekspor/ImportForm";
import { PeriodExportControls } from "@/components/impor-ekspor/PeriodExportControls";

export default function ImporEksporPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Impor / Ekspor Data</h1>
      </div>

      <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
        <h2 className="mb-4 text-sm font-semibold text-slate-800">Impor Data</h2>
        <ImportForm />
      </section>

      <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
        <h2 className="mb-4 text-sm font-semibold text-slate-800">Ekspor Data</h2>
        <PeriodExportControls />
      </section>
    </div>
  );
}
