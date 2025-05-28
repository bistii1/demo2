// utils/exportBudgetToExcel.ts
import * as XLSX from 'xlsx';

export function exportBudgetToExcel(budgetText: string): Blob {
  const lines = budgetText.split('\n');

  const rows: any[] = [];
  let currentCategory = '';
  let currentItem: any = {};

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed) continue;

    // Detect category (e.g., "Personnel:")
    if (/^[A-Za-z\s&]+:$/.test(trimmed)) {
      currentCategory = trimmed.slice(0, -1); // remove colon
    }

    // Detect item line (e.g., "- Principal Investigator")
    else if (/^- /.test(trimmed)) {
      if (Object.keys(currentItem).length > 0) {
        rows.push(currentItem);
      }
      currentItem = {
        Category: currentCategory,
        Item: trimmed.replace(/^- /, ''),
        'Year 1': '',
        'Year 2': '',
        'Total': '',
      };
    }

    // Detect year or total cost lines
    else if (/^Year \d+:/.test(trimmed)) {
      const [label, value] = trimmed.split(':');
      if (currentItem) currentItem[label.trim()] = value.trim();
    } else if (/^Total:/.test(trimmed)) {
      const value = trimmed.split(':')[1]?.trim();
      if (currentItem) currentItem['Total'] = value;
    }
  }

  if (Object.keys(currentItem).length > 0) {
    rows.push(currentItem);
  }

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'PAMS Budget');

  const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  return new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}
