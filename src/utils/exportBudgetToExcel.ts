import * as XLSX from 'xlsx';

interface BudgetRow {
  Category: string;
  Item: string;
  Year1: string;
  Year2: string;
  Year3: string;
  Total: string;
}

export function exportBudgetToExcel(budgetText: string): Blob {
  const lines = budgetText.split('\n').map(line => line.trim()).filter(Boolean);

  const rows: BudgetRow[] = [];
  let currentCategory = '';
  let currentItem = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Detect new category like "Personnel:"
    if (!line.startsWith('-') && !line.includes(':')) {
      currentCategory = line;
      continue;
    }

    // Detect item line like "- Principal Investigator"
    if (line.startsWith('-')) {
      currentItem = line.replace(/^[-•]\s*/, '');
      const row: BudgetRow = {
        Category: currentCategory,
        Item: currentItem,
        Year1: '',
        Year2: '',
        Year3: '',
        Total: '',
      };

      // Look ahead for Year 1/2/3/Total lines
      while (i + 1 < lines.length && /^(Year \d|Total):/i.test(lines[i + 1])) {
        const nextLine = lines[++i];
        const [labelRaw, valueRaw] = nextLine.split(':');
        const label = labelRaw?.trim().toLowerCase();
        const value = valueRaw?.trim().replace(/\$/g, '') || '';

        if (label?.startsWith('year 1')) row.Year1 = value;
        else if (label?.startsWith('year 2')) row.Year2 = value;
        else if (label?.startsWith('year 3')) row.Year3 = value;
        else if (label?.startsWith('total')) row.Total = value;
      }

      rows.push(row);
    }
  }

  const worksheet = XLSX.utils.json_to_sheet(rows, {
    header: ['Category', 'Item', 'Year1', 'Year2', 'Year3', 'Total'],
  });

  // Format columns
  worksheet['!cols'] = [
    { wch: 20 },
    { wch: 30 },
    { wch: 15 },
    { wch: 15 },
    { wch: 15 },
    { wch: 15 },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'PAMS Budget');

  const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  return new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}
