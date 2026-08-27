import "server-only";

import ExcelJS from "exceljs";

function safeSheetName(value: string) {
  return value.replace(/[\\/*?:[\]]/g, "-").slice(0, 31) || "Data";
}

export async function readExcelTextRows(
  bytes: Buffer,
  limits: { maxRows?: number; maxColumns?: number } = {}
) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(bytes as never);
  const worksheet = workbook.worksheets[0];
  if (!worksheet) throw new Error("Berkas Excel tidak memiliki sheet");
  const maxRows = limits.maxRows ?? 10_001;
  const maxColumns = limits.maxColumns ?? 300;
  if (worksheet.rowCount > maxRows || worksheet.columnCount > maxColumns) {
    throw new Error(`Berkas Excel melebihi batas ${maxRows - 1} baris atau ${maxColumns} kolom`);
  }
  const rows: string[][] = [];
  for (let rowNumber = 1; rowNumber <= worksheet.rowCount; rowNumber += 1) {
    const row = worksheet.getRow(rowNumber);
    const values: string[] = [];
    for (let column = 1; column <= worksheet.columnCount; column += 1) {
      values.push(row.getCell(column).text);
    }
    rows.push(values);
  }
  return rows;
}

export async function writeExcelRows(sheetName: string, rows: unknown[][]) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "DDP Updating";
  workbook.created = new Date();
  const worksheet = workbook.addWorksheet(safeSheetName(sheetName));
  worksheet.addRows(rows as never[][]);
  worksheet.views = [{ state: "frozen", ySplit: 1 }];
  if (rows[0]?.length) {
    worksheet.getRow(1).font = { bold: true };
    worksheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: rows[0].length } };
  }
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer as ArrayBuffer);
}
