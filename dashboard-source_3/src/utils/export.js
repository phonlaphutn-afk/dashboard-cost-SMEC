import * as XLSX from 'xlsx-js-style';

// --- Brand colors (hex, no '#') ---
const BLUEPRINT = '2C4A7C';
const BLUEPRINT_LIGHT = 'DCE6F5';
const AMBER = 'F5A623';
const AMBER_LIGHT = 'FDEBCB';
const WHITE = 'FFFFFF';
const TEXT_DARK = '1A2233';
const ROW_ALT = 'F2F5FA';
const BORDER = { style: 'thin', color: { rgb: 'C7D2E0' } };

const headerStyle = {
  font: { bold: true, color: { rgb: WHITE }, sz: 11 },
  fill: { fgColor: { rgb: BLUEPRINT } },
  alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
  border: { top: BORDER, bottom: BORDER, left: BORDER, right: BORDER },
};

const titleStyle = {
  font: { bold: true, color: { rgb: WHITE }, sz: 14 },
  fill: { fgColor: { rgb: BLUEPRINT } },
  alignment: { horizontal: 'left', vertical: 'center' },
};

function cellStyle({ bold = false, alt = false, amount = false, color = TEXT_DARK, align = 'left' } = {}) {
  return {
    font: { bold, color: { rgb: color } },
    fill: { fgColor: { rgb: alt ? ROW_ALT : WHITE } },
    alignment: { horizontal: align, vertical: 'center' },
    border: { top: BORDER, bottom: BORDER, left: BORDER, right: BORDER },
    numFmt: amount ? '#,##0.00' : undefined,
  };
}

// Interpolates between blueprint (low) and amber (high) for a 0..1 ratio
function heatColor(ratio) {
  const a = [0x2c, 0x4a, 0x7c];
  const b = [0xf5, 0xa6, 0x23];
  const rgb = a.map((c, i) => Math.round(c + (b[i] - c) * ratio));
  return rgb.map((v) => v.toString(16).padStart(2, '0')).join('').toUpperCase();
}

function setCell(ws, addr, value, style) {
  ws[addr] = { v: value, t: typeof value === 'number' ? 'n' : 's', s: style };
}

function colLetter(n) {
  let s = '';
  n += 1;
  while (n > 0) {
    const m = (n - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

// Builds a "ภาพรวม" sheet: title + ranked table with an inline text-bar chart, color-graded by cost
function buildOverviewSheet(title, rows) {
  // rows: [{ label, total, sub }]
  const ws = {};
  const sorted = [...rows].sort((a, b) => b.total - a.total);
  const max = Math.max(...sorted.map((r) => r.total), 1);
  const BAR_WIDTH = 30;

  setCell(ws, 'A1', title, titleStyle);
  ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 3 } }];
  for (let c = 1; c < 4; c++) setCell(ws, `${colLetter(c)}1`, '', titleStyle);

  const headers = ['ลำดับ', 'รายการ', 'ต้นทุนรวม (บาท)', 'สัดส่วน / กราฟเปรียบเทียบ'];
  headers.forEach((h, i) => setCell(ws, `${colLetter(i)}3`, h, headerStyle));

  let grand = sorted.reduce((s, r) => s + r.total, 0);
  sorted.forEach((r, i) => {
    const row = i + 4;
    const alt = i % 2 === 1;
    const ratio = max ? r.total / max : 0;
    const barLen = Math.max(1, Math.round(ratio * BAR_WIDTH));
    const bar = '█'.repeat(barLen);
    const color = heatColor(ratio);

    setCell(ws, `A${row}`, i + 1, cellStyle({ alt, align: 'center' }));
    setCell(ws, `B${row}`, r.label, cellStyle({ alt, bold: true }));
    setCell(ws, `C${row}`, r.total, cellStyle({ alt, amount: true, align: 'right' }));
    setCell(ws, `D${row}`, `${bar}  ${grand ? ((r.total / grand) * 100).toFixed(1) : 0}%`, {
      font: { color: { rgb: color }, bold: true },
      fill: { fgColor: { rgb: alt ? ROW_ALT : WHITE } },
      alignment: { horizontal: 'left', vertical: 'center' },
      border: { top: BORDER, bottom: BORDER, left: BORDER, right: BORDER },
    });
  });

  const lastRow = sorted.length + 3;
  setCell(ws, `B${lastRow + 1}`, 'รวมทั้งหมด', cellStyle({ bold: true }));
  setCell(ws, `C${lastRow + 1}`, grand, cellStyle({ bold: true, amount: true, align: 'right', color: BLUEPRINT }));

  ws['!ref'] = `A1:D${lastRow + 1}`;
  ws['!cols'] = [{ wch: 8 }, { wch: 32 }, { wch: 18 }, { wch: 44 }];
  ws['!rows'] = [{ hpt: 26 }];
  return ws;
}

function buildTableSheet(headers, rows, opts = {}) {
  const ws = {};
  headers.forEach((h, i) => setCell(ws, `${colLetter(i)}1`, h, headerStyle));
  rows.forEach((r, ri) => {
    const alt = ri % 2 === 1;
    r.forEach((val, ci) => {
      const isAmount = opts.amountCols && opts.amountCols.includes(ci);
      setCell(
        ws,
        `${colLetter(ci)}${ri + 2}`,
        val,
        cellStyle({ alt, amount: isAmount, align: isAmount ? 'right' : 'left' })
      );
    });
  });
  ws['!ref'] = `A1:${colLetter(headers.length - 1)}${rows.length + 1}`;
  ws['!cols'] = headers.map((_, i) => ({ wch: opts.widths?.[i] || 16 }));
  ws['!freeze'] = { xSplit: 0, ySplit: 1 };
  return ws;
}

function downloadWorkbook(wb, filename) {
  XLSX.writeFile(wb, filename);
}

const itemRow = (it) => [it.id, it.project, it.category, it.item, it.qty, it.unit, it.unitPrice, it.total];
const summaryRow = (s) => [s.project, s.no, s.category, s.total, `${(Number(s.pct) * 100).toFixed(2)}%`];

// Export a single machine/category within a project: header row + Items sheet
export function exportCategoryToExcel(project, category, items, summaryRow) {
  const wb = XLSX.utils.book_new();

  const total = summaryRow ? Number(summaryRow.total) || 0 : items.reduce((s, r) => s + (Number(r.total) || 0), 0);
  const overviewRows = [{ label: category, total }];
  const oSheet = buildOverviewSheet(`ต้นทุน: ${category} (${project})`, overviewRows);
  XLSX.utils.book_append_sheet(wb, oSheet, 'สรุป');

  const iSheet = buildTableSheet(
    ['ID', 'โครงการ', 'หมวดหมู่', 'รายการสินค้า', 'จำนวน', 'หน่วย', 'ราคา/หน่วย', 'ราคารวม'],
    items.map(itemRow),
    { amountCols: [6, 7], widths: [6, 20, 18, 34, 10, 10, 14, 14] }
  );
  XLSX.utils.book_append_sheet(wb, iSheet, 'Items');

  downloadWorkbook(wb, `ต้นทุน-${project}-${category}.xlsx`);
}

// Export the currently selected project: overview chart sheet + Summary sheet + Items sheet
export function exportProjectToExcel(project, items, summary) {
  const wb = XLSX.utils.book_new();

  const overviewRows = summary.map((s) => ({ label: s.category, total: Number(s.total) || 0 }));
  const oSheet = buildOverviewSheet(`ภาพรวมต้นทุน: ${project}`, overviewRows);
  XLSX.utils.book_append_sheet(wb, oSheet, 'ภาพรวม');

  const sSheet = buildTableSheet(
    ['โครงการ', 'ลำดับ', 'รายการ', 'ต้นทุนรวม (บาท)', 'สัดส่วน (%)'],
    summary.map(summaryRow),
    { amountCols: [3], widths: [20, 8, 26, 18, 12] }
  );
  XLSX.utils.book_append_sheet(wb, sSheet, 'Summary');

  const iSheet = buildTableSheet(
    ['ID', 'โครงการ', 'หมวดหมู่', 'รายการสินค้า', 'จำนวน', 'หน่วย', 'ราคา/หน่วย', 'ราคารวม'],
    items.map(itemRow),
    { amountCols: [6, 7], widths: [6, 20, 18, 34, 10, 10, 14, 14] }
  );
  XLSX.utils.book_append_sheet(wb, iSheet, 'Items');

  downloadWorkbook(wb, `ต้นทุน-${project}.xlsx`);
}

// Export everything: overview chart sheet (all projects) + Summary + Items across all projects
export function exportAllToExcel(allSummary, allItems) {
  const totalsByProject = {};
  allSummary.forEach((s) => {
    totalsByProject[s.project] = (totalsByProject[s.project] || 0) + (Number(s.total) || 0);
  });
  const overviewRows = Object.entries(totalsByProject).map(([label, total]) => ({ label, total }));

  const wb = XLSX.utils.book_new();
  const oSheet = buildOverviewSheet('ภาพรวมต้นทุนทุกโครงการ', overviewRows);
  XLSX.utils.book_append_sheet(wb, oSheet, 'ภาพรวม');

  const sSheet = buildTableSheet(
    ['โครงการ', 'ลำดับ', 'รายการ', 'ต้นทุนรวม (บาท)', 'สัดส่วน (%)'],
    allSummary.map(summaryRow),
    { amountCols: [3], widths: [20, 8, 26, 18, 12] }
  );
  XLSX.utils.book_append_sheet(wb, sSheet, 'Summary ทุกโครงการ');

  const iSheet = buildTableSheet(
    ['ID', 'โครงการ', 'หมวดหมู่', 'รายการสินค้า', 'จำนวน', 'หน่วย', 'ราคา/หน่วย', 'ราคารวม'],
    allItems.map(itemRow),
    { amountCols: [6, 7], widths: [6, 20, 18, 34, 10, 10, 14, 14] }
  );
  XLSX.utils.book_append_sheet(wb, iSheet, 'Items ทุกโครงการ');

  downloadWorkbook(wb, 'ต้นทุนทุกโครงการ.xlsx');
}
