import * as XLSX from 'xlsx';

type BudgetItem = {
  Category: string;
  Item: string;
  Year1: number;
  Year2: number;
  Total: number;
};

export function exportBudgetToExcel(budgetText: string): Blob {
  const lines = budgetText.split('\n').map(l => l.trim()).filter(Boolean);

  const items: BudgetItem[] = [];
  let currentCategory = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Detect category headers like "Personnel:", "Equipment:", etc.
    if (/^[A-Z].+:$/.test(line)) {
      currentCategory = line.replace(':', '');
      continue;
    }

    // Detect item lines like "- Principal Investigator"
    if (line.startsWith('-')) {
      const itemName = line.replace(/^-\s*/, '');
      const year1 = parseDollar(lines[i + 1]);
      const year2 = parseDollar(lines[i + 2]);
      const total = parseDollar(lines[i + 3]);

      items.push({
        Category: currentCategory,
        Item: itemName,
        Year1: year1,
        Year2: year2,
        Total: total,
      });

      i += 3; // Skip next 3 lines as they’ve been processed
    }
  }

  // Prepare sheet data
  const header = ['Category', 'Item', 'Year 1', 'Year 2', 'Total'];
  const rows = [header, ...items.map(item => [
    item.Category,
    item.Item,
    item.Year1,
    item.Year2,
    item.Total,
  ])];

  const worksheet = XLSX.utils.aoa_to_sheet(rows);

  // Auto width
  const colWidths = header.map(() => ({ wch: 25 }));
  worksheet['!cols'] = colWidths;

  // Create workbook
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'PAMS Budget');

  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  return new Blob([excelBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

function parseDollar(line: string): number {
  const match = line.match(/\$([\d,]+)/);
  if (!match) return 0;
  return parseInt(match[1].replace(/,/g, ''), 10);
}
