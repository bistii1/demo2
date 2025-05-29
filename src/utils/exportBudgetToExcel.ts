import * as XLSX from 'xlsx';

// updated function
export async function exportBudgetToExcelFromTemplate(
  templateArrayBuffer: ArrayBuffer,
  structuredBudget: Record<string, {
    Year1: number;
    Year2: number;
    Year3: number;
    Total: number;
    Justification: string;
  }>
): Promise<Blob> {
  const workbook = XLSX.read(templateArrayBuffer, { type: 'array' });

  const targetSheetName = 'PAMS Budget';
  let worksheet = workbook.Sheets[targetSheetName];

  if (!worksheet) {
    worksheet = XLSX.utils.json_to_sheet([], { header: ['Category', 'Year1', 'Year2', 'Year3', 'Total', 'Justification'] });
    XLSX.utils.book_append_sheet(workbook, worksheet, targetSheetName);
  }

  const existingData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as (string | number)[][];
  const startingRow = existingData.length;

  const rows = Object.entries(structuredBudget).map(([category, data]) => ({
    Category: category,
    Year1: data.Year1,
    Year2: data.Year2,
    Year3: data.Year3,
    Total: data.Total,
    Justification: data.Justification,
  }));

  XLSX.utils.sheet_add_json(worksheet, rows, {
    skipHeader: true,
    origin: `A${startingRow + 1}`,
  });

  const excelBuffer = XLSX.write(workbook, {
    bookType: 'xlsx',
    type: 'array',
  });

  return new Blob([excelBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

