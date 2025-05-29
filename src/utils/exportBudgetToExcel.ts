import * as XLSX from 'xlsx';

interface BudgetRow {
  Category: string;
  Item: string;
  Year1: string;
  Year2: string;
  Year3: string;
  Total: string;
}

export function exportBudgetToExcel(budgetText: string, formatPAMS = true): Blob {
  if (!formatPAMS) {
    throw new Error('Only formatPAMS is currently supported.');
  }

  const lines = budgetText.split('\n').map(line => line.trim()).filter(Boolean);

  const rows: BudgetRow[] = [];
  let currentCategory = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Detect category header
    if (!line.startsWith('-') && !line.includes(':')) {
      currentCategory = line.replace(/:$/, '');
      continue;
    }

    // Parse item
    if (line.startsWith('-')) {
      const itemName = line.replace(/^-/, '').trim();

      const row: BudgetRow = {
        Category: currentCategory,
        Item: itemName,
        Year1: '',
        Year2: '',
        Year3: '',
        Total: '',
      };

      // Check for next lines with Year1/2/3 and Total
      while (i + 1 < lines.length && /^(Year \d|Total):/i.test(lines[i + 1])) {
        const [label, value] = lines[++i].split(':').map(s => s.trim());
        const cleanValue = value?.replace(/\$/g, '') ?? '';

        if (/^Year 1/i.test(label)) row.Year1 = cleanValue;
        else if (/^Year 2/i.test(label)) row.Year2 = cleanValue;
        else if (/^Year 3/i.test(label)) row.Year3 = cleanValue;
        else if (/^Total/i.test(label)) row.Total = cleanValue;
      }

      rows.push(row);
    }
  }

  const worksheet = XLSX.utils.json_to_sheet(rows, {
    header: ['Category', 'Item', 'Year1', 'Year2', 'Year3', 'Total'],
  });

  // Set column widths
  worksheet['!cols'] = [
    { wch: 20 },
    { wch: 30 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
    { wch: 15 },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'PAMS Budget');

  const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  return new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}
