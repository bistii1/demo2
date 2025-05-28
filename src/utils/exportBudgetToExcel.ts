import * as XLSX from 'xlsx';

export function exportBudgetToExcel(budgetText: string): Blob {
  const lines = budgetText
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.startsWith('-'));

  const rows: { Category: string; Description: string }[] = [];

  lines.forEach(line => {
    const clean = line.replace(/^[-•]\s*/, '');
    const [left] = clean.split(/—|–|-/).map(s => s.trim());
    const categoryMatch = left.match(/^([^:]+):\s*(.+)$/);

    const category = categoryMatch?.[1] || 'Uncategorized';
    const description = categoryMatch?.[2] || left;

    rows.push({
      Category: category,
      Description: description,
    });
  });

  const worksheet = XLSX.utils.json_to_sheet(rows, {
    header: ['Category', 'Description'],
  });

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'PAMS Budget');

  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });

  return new Blob([excelBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}
