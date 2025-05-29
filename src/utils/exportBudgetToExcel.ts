import * as XLSX from 'xlsx';

type BudgetRow = {
  Category: string;
  Item: string;
  Year1: string;
  Year2: string;
  Year3: string;
  Total: string;
};

export function exportBudgetToExcel(budgetText: string): Blob {
  const lines = budgetText.split('\n');

  const rows: BudgetRow[] = [];
  let currentCategory = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (line.endsWith(':') && !line.startsWith('-')) {
      currentCategory = line.replace(':', '');
    } else if (line.startsWith('-')) {
      const itemLine = line.replace(/^-+\s*/, '');
      const item = itemLine;
      let year1 = '', year2 = '', year3 = '', total = '';

      // Read the following lines to get year-wise costs
      for (let j = i + 1; j < lines.length; j++) {
        const costLine = lines[j].trim();
        if (costLine.startsWith('Year 1:')) year1 = costLine.split('$')[1]?.trim() || '';
        else if (costLine.startsWith('Year 2:')) year2 = costLine.split('$')[1]?.trim() || '';
        else if (costLine.startsWith('Year 3:')) year3 = costLine.split('$')[1]?.trim() || '';
        else if (costLine.startsWith('Total:')) {
          total = costLine.split('$')[1]?.trim() || '';
          i = j; // move main index to end of this block
          break;
        }
      }

      rows.push({
        Category: currentCategory,
        Item: item,
        Year1: year1,
        Year2: year2,
        Year3: year3,
        Total: total,
      });
    }
  }

  const worksheet = XLSX.utils.json_to_sheet(rows, {
    header: ['Category', 'Item', 'Year1', 'Year2', 'Year3', 'Total'],
  });

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'PAMS Budget');

  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  return new Blob([excelBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}
