import { utils, write } from 'xlsx';

/**
 * Parses the budget response into structured Excel rows.
 * Assumes bullet points like:
 * - Principal Investigator: $100,000/year — Leads research
 * - Research Assistant: $50,000/year — Supports data collection
 */
export function exportBudgetToExcel(budgetText: string): Blob {
  const lines = budgetText
    .split('\n')
    .filter(line => line.trim().startsWith('-')) // Only budget bullet points
    .map(line => line.replace(/^[-•]\s*/, ''));  // Remove leading bullet

  const rows = lines.map(line => {
    const [itemWithCost, justification] = line.split(/—|–|-/, 2); // Split on dash variants
    const itemMatch = itemWithCost?.match(/^(.*?):\s*\$?([\d,]+)(?:\/year)?/i);

    const item = itemMatch?.[1]?.trim() || itemWithCost?.trim() || '';
    const cost = itemMatch?.[2]?.trim() || '';
    const just = justification?.trim() || '';

    return {
      Item: item,
      Cost: `$${cost}`,
      Justification: just,
    };
  });

  const worksheet = utils.json_to_sheet(rows);
  const workbook = utils.book_new();
  utils.book_append_sheet(workbook, worksheet, 'Budget');

  const excelBuffer = write(workbook, { bookType: 'xlsx', type: 'array' });
  return new Blob([excelBuffer], { type: 'application/octet-stream' });
}
