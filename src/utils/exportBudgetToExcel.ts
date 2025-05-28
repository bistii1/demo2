import * as XLSX from 'xlsx';

export function exportBudgetToExcel(budgetText: string): Blob {
  const lines = budgetText.split('\n');

  let currentCategory = '';
  const rows: {
    Category: string;
    Item: string;
    Year1: string;
    Year2: string;
    Year3: string;
    Total: string;
    Justification: string;
  }[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Skip empty lines
    if (!line) continue;

    // Category headers (e.g., "Personnel", "Equipment")
    if (
      /^[A-Z][A-Za-z\s&]+:$/.test(line) ||               // Ends with colon
      /^[A-Z][A-Za-z\s&]+$/.test(line)                   // Uppercase, no colon
    ) {
      currentCategory = line.replace(/:$/, '').trim();
      continue;
    }

    // Budget item with cost data
    const isYearLine = /year\s*1/i.test(line);
    const isItemLine = line.startsWith('-') || /^[A-Z]/.test(line);

    if (isItemLine && !isYearLine) {
      const item = line.replace(/^[-•]\s*/, '');

      let justification = '';
      let year1 = '', year2 = '', year3 = '', total = '';

      // Look ahead for year and justification lines
      while (i + 1 < lines.length && lines[i + 1].match(/Year\s*\d/i)) {
        const yearLine = lines[++i];
        const yearMatch = yearLine.match(/Year\s*1:\s*\$?([\d,]+)/i);
        if (yearMatch) year1 = `$${yearMatch[1]}`;

        const year2Match = yearLine.match(/Year\s*2:\s*\$?([\d,]+)/i);
        if (year2Match) year2 = `$${year2Match[1]}`;

        const year3Match = yearLine.match(/Year\s*3:\s*\$?([\d,]+)/i);
        if (year3Match) year3 = `$${year3Match[1]}`;

        const totalMatch = yearLine.match(/Total:\s*\$?([\d,]+)/i);
        if (totalMatch) total = `$${totalMatch[1]}`;
      }

      // Look ahead for justification
      while (i + 1 < lines.length && lines[i + 1].startsWith('Justification')) {
        justification += lines[++i].replace(/^Justification[:\-]?\s*/i, '').trim() + ' ';
      }

      rows.push({
        Category: currentCategory,
        Item: item,
        Year1: year1,
        Year2: year2,
        Year3: year3,
        Total: total,
        Justification: justification.trim(),
      });
    }
  }

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'PAMS Budget');

  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  return new Blob([excelBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}
