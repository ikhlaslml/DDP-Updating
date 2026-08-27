import "server-only";

import PDFDocument from "pdfkit";
import type { getIssuedLetterDocument } from "@/lib/letter-document";

type LetterDocument = NonNullable<Awaited<ReturnType<typeof getIssuedLetterDocument>>>;

function display(value: unknown) {
  if (value instanceof Date) return value.toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" });
  return value === null || value === undefined || value === "" ? "-" : String(value);
}

export async function renderLetterPdf(document: LetterDocument) {
  const pdf = new PDFDocument({ size: "A4", margins: { top: 48, right: 58, bottom: 48, left: 58 }, info: { Title: `${document.templateNama} ${document.letter.nomor}` } });
  const chunks: Buffer[] = [];
  const completed = new Promise<Buffer>((resolve, reject) => {
    pdf.on("data", (chunk: Buffer) => chunks.push(Buffer.from(chunk)));
    pdf.on("end", () => resolve(Buffer.concat(chunks)));
    pdf.on("error", reject);
  });

  const settings = document.settings;
  pdf.font("Helvetica-Bold").fontSize(13).text(settings.kopBaris1 || "PEMERINTAH KABUPATEN", { align: "center" });
  pdf.text(settings.kopBaris2 || "KECAMATAN", { align: "center" });
  pdf.fontSize(17).text(settings.kopBaris3 || "DESA", { align: "center" });
  pdf.font("Helvetica").fontSize(8).text(settings.kopBaris4 || "Alamat desa", { align: "center" });
  const lineY = pdf.y + 6;
  pdf.moveTo(58, lineY).lineTo(537, lineY).lineWidth(2).stroke();
  pdf.moveTo(58, lineY + 3).lineTo(537, lineY + 3).lineWidth(0.5).stroke();
  pdf.y = lineY + 18;

  pdf.font("Helvetica-Bold").fontSize(12).text(document.templateNama.toLocaleUpperCase("id-ID"), { align: "center", underline: true });
  pdf.font("Helvetica").fontSize(10).text(`Nomor: ${document.letter.nomor}`, { align: "center" });
  pdf.moveDown(1.5).text(`Yang bertanda tangan di bawah ini, Kepala ${settings.kopBaris3 || "Desa"}, menerangkan bahwa:`, { align: "justify" });
  pdf.moveDown(0.8);
  const rows: [string, unknown][] = [
    ["Nama Lengkap", document.warga.nama], ["NIK", document.warga.nik], ["Jenis Kelamin", document.warga.jk],
    ["Tanggal Lahir", document.warga.tgl_lahir], ["Agama", document.warga.agama], ["Status Perkawinan", document.warga.status_kawin],
    ["Pekerjaan", document.warga.kerja_profesi], ["Alamat", document.warga.alamat],
  ];
  for (const [label, value] of rows) {
    const y = pdf.y;
    pdf.font("Helvetica").text(label, 78, y, { width: 120 });
    pdf.text(":", 198, y, { width: 12 });
    pdf.text(display(value), 214, y, { width: 300 });
    pdf.y = Math.max(pdf.y, y + 14);
  }
  pdf.moveDown(0.8).text(document.body, 58, pdf.y, { width: 479, align: "justify", lineGap: 2 });
  if (settings.penutup) pdf.moveDown(0.8).text(settings.penutup, { align: "justify" });
  pdf.moveDown(2);
  const village = settings.kopBaris3 || "Desa";
  const date = document.letter.createdAt.toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" });
  pdf.text(`${village}, ${date}\nKepala ${village},\n\n\n\n${settings.namaKepala || "Kepala Desa"}`, 330, pdf.y, { width: 190, align: "center" });
  if (settings.disclaimer) pdf.fontSize(7).fillColor("#64748b").text(settings.disclaimer, 58, 770, { width: 479, align: "center" });
  pdf.end();
  return completed;
}
