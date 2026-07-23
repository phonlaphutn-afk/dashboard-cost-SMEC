import { baht, pct } from '../format';

const BLUEPRINT = '#2c4a7c';
const AMBER = '#f5a623';

function heatColor(ratio) {
  const a = [0x2c, 0x4a, 0x7c];
  const b = [0xf5, 0xa6, 0x23];
  const rgb = a.map((c, i) => Math.round(c + (b[i] - c) * ratio));
  return `rgb(${rgb.join(',')})`;
}

// Simple horizontal bar chart built from SVG — renders fine in print/PDF (no external deps)
function ReportChart({ title, rows }) {
  const sorted = [...rows].sort((a, b) => b.total - a.total).slice(0, 15);
  const max = Math.max(...sorted.map((r) => r.total), 1);
  const rowH = 22;
  const chartW = 640;
  const labelW = 190;
  const barAreaW = chartW - labelW - 90;
  const h = sorted.length * rowH + 10;

  return (
    <div style={{ marginBottom: 16 }}>
      <h2>{title}</h2>
      <svg width={chartW} height={h} viewBox={`0 0 ${chartW} ${h}`} style={{ fontFamily: 'inherit' }}>
        {sorted.map((r, i) => {
          const y = i * rowH;
          const w = Math.max((r.total / max) * barAreaW, 2);
          const color = heatColor(r.total / max);
          return (
            <g key={r.label}>
              <text x={0} y={y + 15} fontSize="10" fill="#222">
                {r.label.length > 26 ? r.label.slice(0, 25) + '…' : r.label}
              </text>
              <rect x={labelW} y={y + 3} width={barAreaW} height={14} fill="#eee" rx="2" />
              <rect x={labelW} y={y + 3} width={w} height={14} fill={color} rx="2" />
              <text x={labelW + barAreaW + 6} y={y + 14} fontSize="9" fill="#333">
                {new Intl.NumberFormat('th-TH').format(Math.round(r.total))} ฿
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// Renders nothing on screen — only appears via @media print (see index.css .print-only).
// Used for the "Export PDF" flow: window.print() → user picks "Save as PDF" in the print dialog.
export default function PrintReport({ scope, project, summary, items }) {
  const title = scope === 'overview' ? 'ภาพรวมต้นทุนทุกโครงการ' : `ต้นทุนโครงการ: ${project}`;
  const grandTotal = items.reduce((s, r) => s + (Number(r.total) || 0), 0);

  const chartRows =
    scope === 'overview'
      ? Object.entries(
          summary.reduce((acc, s) => {
            acc[s.project] = (acc[s.project] || 0) + (Number(s.total) || 0);
            return acc;
          }, {})
        ).map(([label, total]) => ({ label, total }))
      : summary.map((s) => ({ label: s.category, total: Number(s.total) || 0 }));

  return (
    <div className="print-only">
      <div style={{ background: BLUEPRINT, color: '#fff', padding: '14px 18px', marginBottom: 14 }}>
        <h1 style={{ color: '#fff', margin: 0 }}>SIAMMAC ENGINEERING &amp; CONSTRUCTION</h1>
        <div style={{ fontSize: 12, opacity: 0.9, marginTop: 4 }}>
          {title} — พิมพ์เมื่อ {new Date().toLocaleString('th-TH')}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        <div style={{ flex: 1, background: '#eef3fb', borderLeft: `4px solid ${BLUEPRINT}`, padding: '8px 12px' }}>
          <div style={{ fontSize: 10, color: '#555' }}>ยอดรวม</div>
          <div style={{ fontSize: 16, fontWeight: 'bold', color: BLUEPRINT }}>{baht(grandTotal)} ฿</div>
        </div>
        <div style={{ flex: 1, background: '#fdf3e0', borderLeft: `4px solid ${AMBER}`, padding: '8px 12px' }}>
          <div style={{ fontSize: 10, color: '#555' }}>จำนวนรายการ</div>
          <div style={{ fontSize: 16, fontWeight: 'bold', color: '#8a5a00' }}>{items.length}</div>
        </div>
        <div style={{ flex: 1, background: '#eef3fb', borderLeft: `4px solid ${BLUEPRINT}`, padding: '8px 12px' }}>
          <div style={{ fontSize: 10, color: '#555' }}>จำนวนหมวดหมู่</div>
          <div style={{ fontSize: 16, fontWeight: 'bold', color: BLUEPRINT }}>{summary.length}</div>
        </div>
      </div>

      <ReportChart title={scope === 'overview' ? 'เปรียบเทียบต้นทุนแต่ละโครงการ' : 'เปรียบเทียบต้นทุนแต่ละหมวดหมู่'} rows={chartRows} />

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
            <tr key={i} style={i % 2 === 1 ? { background: '#f5f8fc' } : undefined}>
              <td>{s.project}</td>
              <td>{s.no}</td>
              <td>{s.category}</td>
              <td style={{ color: BLUEPRINT, fontWeight: 'bold' }}>{baht(s.total)}</td>
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
          {items.map((it, i) => (
            <tr key={it.id} style={i % 2 === 1 ? { background: '#f5f8fc' } : undefined}>
              <td>{it.project}</td>
              <td>{it.category}</td>
              <td>{it.item}</td>
              <td>{it.qty}</td>
              <td>{it.unit}</td>
              <td>{baht(it.unitPrice)}</td>
              <td style={{ color: AMBER, fontWeight: 'bold' }}>{baht(it.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
