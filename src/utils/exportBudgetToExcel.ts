import * as XLSX from 'xlsx';

export function exportBudgetToExcel(budgetText: string): Blob {
  const lines = budgetText
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.startsWith('-'));

  const rows: { Category: string; Description: string; Year1: string; Year2: string; Year3: string; Total: string }[] = [];

  lines.forEach(line => {
    // Example line: "- Personnel: 1 Scientist ($100,000/year) — Supports research activities"
    const clean = line.replace(/^[-•]\s*/, '');
    const [left, justification] = clean.split(/—|–|-/).map(s => s.trim());
    const categoryMatch = left.match(/^([^:]+):\s*(.+)$/);
    const category = categoryMatch?.[1] || 'Uncategorized';
    const description = categoryMatch?.[2] || '';

    rows.push({
      Category: category,
      Description: description,
      Year1: '', // Could be parsed further from numbers if standardized
      Year2: '',
      Year3: '',
      Total: '',
    });
  });

  const worksheet = XLSX.utils.json_to_sheet(rows, {
    header: ['Category', 'Description', 'Year1', 'Year2', 'Year3', 'Total'],
  });

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'PAMS Budget');

  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });

  return new Blob([excelBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}
