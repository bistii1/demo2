// utils/exportBudgetToExcel.ts
import * as XLSX from 'xlsx';

interface BudgetRow {
  Category: string;
  Item: string;
  'Year 1': string;
  'Year 2': string;
  'Year 3'?: string;
  Total: string;
}

export function exportBudgetToExcel(budgetText: string): Blob {
  const lines = budgetText.split('\n');

  const rows: BudgetRow[] = [];
  let currentCategory = '';
  let currentItem: Partial<BudgetRow> = {};

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Detect and store category (e.g. "Personnel:")
    if (/^[A-Za-z\s&]+:$/.test(trimmed)) {
      currentCategory = trimmed.slice(0, -1); // Remove colon
    }

    // Item line (e.g. "- Research Staff")
    else if (/^- /.test(trimmed)) {
      if (currentItem.Item) rows.push(currentItem as BudgetRow);
      currentItem = {
        Category: currentCategory,
        Item: trimmed.replace(/^- /, ''),
        'Year 1': '',
        'Year 2': '',
        'Year 3': '',
        Total: ''
      };
    }

    // Yearly or Total cost lines
    else if (/^Year \d+:/.test(trimmed)) {
      const [label, value] = trimmed.split(':');
      if (currentItem) currentItem[label.trim() as keyof BudgetRow] = value.trim();
    } else if (/^Total:/.test(trimmed)) {
      const value = trimmed.split(':')[1]?.trim() || '';
      if (currentItem) currentItem.Total = value;
    }
  }

  // Push last item if exists
  if (currentItem.Item) {
    rows.push(currentItem as BudgetRow);
  }

  // Clean sheet generation
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'PAMS Budget');

  const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  return new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}
