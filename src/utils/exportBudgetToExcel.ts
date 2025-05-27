import * as XLSX from 'xlsx';

export function exportBudgetToExcel(budgetText: string): Blob {
  // Split by newlines and filter only lines starting with bullet points
  const lines = budgetText
    .split('\n')
    .filter(line => line.trim().startsWith('-'))
    .map(line => line.replace(/^[-•]\s*/, ''));

  const rows = lines.map(line => {
    // Split on dash variants for justification (—, –, or -)
    const [itemWithCost, justification] = line.split(/—|–|-/).map(s => s?.trim() || '');

    // Extract item and cost using regex: "Item: $Cost"
    const match = itemWithCost.match(/^(.*?):\s*\$?([\d,]+)/);

    return {
      Item: match?.[1] || itemWithCost,
      Cost: match ? `$${match[2]}` : '',
      Justification: justification || '',
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Budget');

  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });

  return new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}
