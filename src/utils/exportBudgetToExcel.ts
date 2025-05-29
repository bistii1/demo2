import * as XLSX from 'xlsx';

export function exportBudgetToExcel(budgetText: string, formatPAMS?: boolean): Blob {
  if (!formatPAMS) {
    throw new Error('This function only supports formatPAMS = true for now.');
  }

  const lines = budgetText.split('\n').map(line => line.trim()).filter(Boolean);

  const rows: any[] = [];
  let currentCategory = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Category Header
    if (!line.startsWith('-') && !line.includes(':')) {
      currentCategory = line.replace(/:$/, '');
      rows.push({ Category: currentCategory, Item: '', Year1: '', Year2: '', Year3: '', Total: '' });
    }

    // Budget Item
    else if (line.startsWith('-')) {
      const item = line.replace(/^-/, '').trim();
      rows.push({ Category: '', Item: item, Year1: '', Year2: '', Year3: '', Total: '' });

      // Look ahead for year values
      while (i + 1 < lines.length && /^Year \d+:/.test(lines[i + 1])) {
        const yearLine = lines[++i];
        const [yearLabel, amount] = yearLine.split(':').map(s => s.trim());
        const yearKey = yearLabel.replace(/\s+/g, ''); // e.g., "Year1"

        if (rows[rows.length - 1]) {
          rows[rows.length - 1][yearKey] = amount;
        }
      }

      // Look ahead for total
      if (i + 1 < lines.length && lines[i + 1].startsWith('Total:')) {
        const totalLine = lines[++i];
        const total = totalLine.split(':')[1]?.trim() || '';
        if (rows[rows.length - 1]) {
          rows[rows.length - 1].Total = total;
        }
      }
    }
  }

  const worksheet = XLSX.utils.json_to_sheet(rows, {
    header: ['Category', 'Item', 'Year1', 'Year2', 'Year3', 'Total'],
    skipHeader: false,
  });

  // Adjust column widths
  const columnWidths = [
    { wch: 20 }, // Category
    { wch: 30 }, // Item
    { wch: 12 }, // Year1
    { wch: 12 }, // Year2
    { wch: 12 }, // Year3
    { wch: 15 }, // Total
  ];
  worksheet['!cols'] = columnWidths;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'PAMS Budget');

  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  return new Blob([excelBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}
