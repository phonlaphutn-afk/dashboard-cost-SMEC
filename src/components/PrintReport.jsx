import { baht, pct } from '../format';

// Renders nothing on screen — only appears via @media print (see index.css .print-only).
// Used for the "Export PDF" flow: window.print() → user picks "Save as PDF" in the print dialog.
export default function PrintReport({ scope, project, summary, items }) {
  const title = scope === 'overview' ? 'ภาพรวมต้นทุนทุกโครงการ' : `ต้นทุนโครงการ: ${project}`;
  const grandTotal = items.reduce((s, r) => s + (Number(r.total) || 0), 0);

  return (
    <div className="print-only">
      <h1>SIAMMAC ENGINEERING &amp; CONSTRUCTION</h1>
      <div className="meta">
        {title} — พิมพ์เมื่อ {new Date().toLocaleString('th-TH')} — ยอดรวม {baht(grandTotal)} ฿ ({items.length} รายการ)
      </div>

      <h2>สรุปตามหมวดหมู่ / เครื่องจักร</h2>
      <table>
        <thead>
          <tr>
            <th>โครงการ</th>
            <th>ลำดับ</th>
            <th>รายการ</th>
            <th>ต้นทุนรวม (บาท)</th>
            <th>สัดส่วน</th>
          </tr>
        </thead>
        <tbody>
          {summary.map((s, i) => (
            <tr key={i}>
              <td>{s.project}</td>
              <td>{s.no}</td>
              <td>{s.category}</td>
              <td>{baht(s.total)}</td>
              <td>{pct(s.pct)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2>รายการสินค้าทั้งหมด</h2>
      <table>
        <thead>
          <tr>
            <th>โครงการ</th>
            <th>หมวดหมู่</th>
            <th>รายการสินค้า</th>
            <th>จำนวน</th>
            <th>หน่วย</th>
            <th>ราคา/หน่วย</th>
            <th>ราคารวม</th>
          </tr>
        </thead>
        <tbody>
          {items.map((it) => (
            <tr key={it.id}>
              <td>{it.project}</td>
              <td>{it.category}</td>
              <td>{it.item}</td>
              <td>{it.qty}</td>
              <td>{it.unit}</td>
              <td>{baht(it.unitPrice)}</td>
              <td>{baht(it.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
