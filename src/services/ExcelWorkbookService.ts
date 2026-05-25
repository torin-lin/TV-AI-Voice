type ExcelRow = Record<string, string | number | boolean | null | undefined>;
type ExcelJSModule = typeof import('exceljs');

async function loadExcelJS(): Promise<ExcelJSModule> {
  return import('exceljs');
}

function downloadBlob(blob: Blob, filename: string): void {
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function cellToText(value: unknown): string {
  if (value == null) return '';
  if (value instanceof Date) return value.toLocaleString('zh-CN');
  if (typeof value === 'object') {
    const richText = (value as { richText?: Array<{ text?: string }> }).richText;
    if (Array.isArray(richText)) return richText.map((item) => item.text || '').join('');
    const text = (value as { text?: string }).text;
    if (text) return text;
    const result = (value as { result?: unknown }).result;
    if (result != null) return cellToText(result);
  }
  return String(value);
}

export async function exportRowsToExcel(
  rows: ExcelRow[],
  filename: string,
  sheetName: string,
  widths: number[],
): Promise<void> {
  const ExcelJS = await loadExcelJS();
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(sheetName);
  const headers = Object.keys(rows[0] || {});
  worksheet.columns = headers.map((header, index) => ({
    header,
    key: header,
    width: widths[index] || 16,
  }));
  worksheet.addRows(rows);
  worksheet.getRow(1).font = { bold: true };

  const buffer = await workbook.xlsx.writeBuffer();
  downloadBlob(
    new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
    filename,
  );
}

export async function readFirstWorksheetRows(file: File): Promise<Record<string, string>[]> {
  const ExcelJS = await loadExcelJS();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(await file.arrayBuffer());
  const worksheet = workbook.worksheets[0];
  if (!worksheet) return [];

  const headers: string[] = [];
  worksheet.getRow(1).eachCell({ includeEmpty: true }, (cell, colNumber) => {
    headers[colNumber - 1] = cellToText(cell.value).trim();
  });

  const rows: Record<string, string>[] = [];
  worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber === 1) return;
    const item: Record<string, string> = {};
    headers.forEach((header, index) => {
      if (!header) return;
      item[header] = cellToText(row.getCell(index + 1).value);
    });
    if (Object.values(item).some((value) => value.trim())) rows.push(item);
  });
  return rows;
}
