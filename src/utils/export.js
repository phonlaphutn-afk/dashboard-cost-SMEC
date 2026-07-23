import * as XLSX from 'xlsx';

function downloadWorkbook(wb, filename) {
  XLSX.writeFile(wb, filename);
}

const itemHeaders = ['ID', 'โครงการ', 'หมวดหมู่', 'รายการสินค้า', 'จำนวน', 'หน่วย', 'ราคา/หน่วย', 'ราคารวม'];
const summaryHeaders = ['โครงการ', 'ลำดับ', 'รายการ', 'ต้นทุนรวม (บาท)', 'สัดส่วน (%)'];

const itemRow = (it) => [it.id, it.project, it.category, it.item, it.qty, it.unit, it.unitPrice, it.total];
const summaryRow = (s) => [s.project, s.no, s.category, s.total, `${(Number(s.pct) * 100).toFixed(2)}%`];

// Export the currently selected project: one Summary sheet + one Items sheet
export function exportProjectToExcel(project, items, summary) {
  const wb = XLSX.utils.book_new();
  const sSheet = XLSX.utils.aoa_to_sheet([summaryHeaders, ...summary.map(summaryRow)]);
  const iSheet = XLSX.utils.aoa_to_sheet([itemHeaders, ...items.map(itemRow)]);
  XLSX.utils.book_append_sheet(wb, sSheet, 'Summary');
  XLSX.utils.book_append_sheet(wb, iSheet, 'Items');
  downloadWorkbook(wb, `ต้นทุน-${project}.xlsx`);
}

// Export everything: one overview sheet (project totals) + one Items sheet across all projects
export function exportAllToExcel(allSummary, allItems) {
  const totalsByProject = {};
  allSummary.forEach((s) => {
    totalsByProject[s.project] = (totalsByProject[s.project] || 0) + (Number(s.total) || 0);
  });
  const overviewRows = Object.entries(totalsByProject).map(([project, total], i) => [i + 1, project, total]);
  const wb = XLSX.utils.book_new();
  const oSheet = XLSX.utils.aoa_to_sheet([['ลำดับ', 'โครงการ', 'ต้นทุนรวม (บาท)'], ...overviewRows]);
  const sSheet = XLSX.utils.aoa_to_sheet([summaryHeaders, ...allSummary.map(summaryRow)]);
  const iSheet = XLSX.utils.aoa_to_sheet([itemHeaders, ...allItems.map(itemRow)]);
  XLSX.utils.book_append_sheet(wb, oSheet, 'ภาพรวมโครงการ');
  XLSX.utils.book_append_sheet(wb, sSheet, 'Summary ทุกโครงการ');
  XLSX.utils.book_append_sheet(wb, iSheet, 'Items ทุกโครงการ');
  downloadWorkbook(wb, 'ต้นทุนทุกโครงการ.xlsx');
}
