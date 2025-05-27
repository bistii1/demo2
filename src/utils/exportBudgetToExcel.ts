import * as XLSX from 'xlsx';

export function exportBudgetToExcel(budgetText: string) {
  // Try to extract a bullet list and justification
  const [bulletPart, ...rest] = budgetText.split(/\n\n+/);
  const bulletLines = bulletPart
    .split('\n')
    .map(line => line.replace(/^[-•*]\s*/, '').trim())
    .filter(Boolean);

  const justification = rest.join('\n\n').trim();

  const data = bulletLines.map((line, index) => ({
    Item: line,
    Justification: index === 0 ? justification : '', // only on first row
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Budget');

  const excelBuffer = XLSX.write(workbook, {
    bookType: 'xlsx',
    type: 'array',
  });

  return new Blob([excelBuffer], {
    type:
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}
