import * as XLSX from 'xlsx';

// updated function
export async function exportBudgetToExcelFromTemplate(
  templateArrayBuffer: ArrayBuffer,
  budgetText: string
): Promise<Blob> {
  // Step 1: Read the existing workbook
  const workbook = XLSX.read(templateArrayBuffer, { type: 'array' });

  // Step 2: Parse the AI-generated budget summary text
  const lines = budgetText.split('\n');
  let currentCategory = '';
  const rows: {
    Category: string;
    Item: string;
    Year1: string;
    Year2: string;
    Year3: string;
    Total: string;
  }[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (line.endsWith(':') && !line.startsWith('-')) {
      currentCategory = line.replace(':', '');
    } else if (line.startsWith('-')) {
      const itemLine = line.replace(/^-+\s*/, '');
      let year1 = '', year2 = '', year3 = '', total = '';

      for (let j = i + 1; j < lines.length; j++) {
        const costLine = lines[j].trim();
        if (costLine.startsWith('Year 1:')) year1 = costLine.split('$')[1]?.trim() || '';
        else if (costLine.startsWith('Year 2:')) year2 = costLine.split('$')[1]?.trim() || '';
        else if (costLine.startsWith('Year 3:')) year3 = costLine.split('$')[1]?.trim() || '';
        else if (costLine.startsWith('Total:')) {
          total = costLine.split('$')[1]?.trim() || '';
          i = j;
          break;
        }
      }

      rows.push({
        Category: currentCategory,
        Item: itemLine,
        Year1: year1,
        Year2: year2,
        Year3: year3,
        Total: total,
      });
    }
  }

  // Step 3: Decide which sheet(s) to update in the template
  const targetSheetName = 'PAMS Budget'; // or 'Summary Budget' or whatever sheet you want
  let worksheet = workbook.Sheets[targetSheetName];

  if (!worksheet) {
    // Create if doesn't exist
    worksheet = XLSX.utils.json_to_sheet([], { header: ['Category', 'Item', 'Year1', 'Year2', 'Year3', 'Total'] });
    XLSX.utils.book_append_sheet(workbook, worksheet, targetSheetName);
  }

  // Step 4: Append data to worksheet (starting below existing rows)
  const existingData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[]; // raw row data
  const startingRow = existingData.length;

  XLSX.utils.sheet_add_json(worksheet, rows, {
    skipHeader: true,
    origin: `A${startingRow + 1}`,
  });

  // Step 5: Export final workbook
  const excelBuffer = XLSX.write(workbook, {
    bookType: 'xlsx', // use 'xlsm' if you want to preserve macros (XLSX library support is limited here)
    type: 'array',
  });

  return new Blob([excelBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}
