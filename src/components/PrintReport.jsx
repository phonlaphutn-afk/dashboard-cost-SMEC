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
            <g key={`${r.label}-${i}`}>
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

// Picks the top-N highest-value items within each project+category group.
// Used to keep the printed item table readable when a report spans many
// categories (overview / whole-project scope) — full detail is only shown
// when the report is already scoped to a single category.
function topItemsByGroup(items, n = 5) {
  const groups = {};
  items.forEach((it) => {
    const key = `${it.project}||${it.category}`;
    (groups[key] = groups[key] || []).push(it);
  });
  const picked = [];
  Object.values(groups).forEach((arr) => {
    [...arr]
      .sort((a, b) => (Number(b.total) || 0) - (Number(a.total) || 0))
      .slice(0, n)
      .forEach((it) => picked.push(it));
  });
  return picked;
}

// Renders nothing on screen — only appears via @media print (see index.css .print-only).
// Used for the "Export PDF" flow: window.print() → user picks "Save as PDF" in the print dialog.
export default function PrintReport({ scope, project, category, standalone, summary, items }) {
  const title =
    scope === 'overview'
      ? 'ภาพรวมต้นทุนทุกโครงการ'
      : scope === 'category'
      ? `เครื่องจักร: ${category} — โครงการ: ${project}${standalone ? ' (ต้นทุนกรณีผลิตเครื่องเดียว)' : ''}`
      : `ต้นทุนโครงการ: ${project}`;
  const grandTotal = items.reduce((s, r) => s + (Number(r.total) || 0), 0);

  const chartRows =
    scope === 'overview'
      ? Object.entries(
          summary.reduce((acc, s) => {
            acc[s.project] = (acc[s.project] || 0) + (Number(s.total) || 0);
            return acc;
          }, {})
        ).map(([label, total]) => ({ label, total }))
      : scope === 'category'
      ? items.map((it) => ({ label: it.item, total: Number(it.total) || 0 }))
      : summary.map((s) => ({ label: s.category, total: Number(s.total) || 0 }));

  // Full detail only when the report is already scoped to one machine/category —
  // otherwise show just the top items per category so the printout stays readable.
  const showFullItems = scope === 'category';
  const TOP_N = 5;
  const displayedItems = showFullItems ? items : topItemsByGroup(items, TOP_N);

  return (
    <div className="print-only">
      <div style={{ background: BLUEPRINT, color: '#fff', padding: '12px 20px' }}>
        <h1 style={{ color: '#fff', margin: 0, fontSize: 18 }}>SIAMMAC ENGINEERING &amp; CONSTRUCTION</h1>
        <div style={{ fontSize: 11, opacity: 0.85, marginTop: 2 }}>
          {title} — พิมพ์เมื่อ {new Date().toLocaleString('th-TH')}
        </div>
      </div>

      {/* Hero summary — the number that matters most, made impossible to miss */}
      <div
        style={{
          background: `linear-gradient(135deg, ${BLUEPRINT} 0%, #1a3155 100%)`,
          color: '#fff',
          padding: '26px 24px',
          marginBottom: 18,
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 16,
        }}
      >
        <div>
          <div style={{ fontSize: 12, opacity: 0.8, textTransform: 'uppercase', letterSpacing: 1.5 }}>
            ยอดรวมทั้งหมด
          </div>
          <div style={{ fontSize: 46, fontWeight: 800, color: AMBER, lineHeight: 1.1, marginTop: 4 }}>
            {baht(grandTotal)} <span style={{ fontSize: 26 }}>฿</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 28 }}>
          <div>
            <div style={{ fontSize: 24, fontWeight: 700 }}>{items.length}</div>
            <div style={{ fontSize: 11, opacity: 0.8 }}>รายการทั้งหมด</div>
          </div>
          <div>
            <div style={{ fontSize: 24, fontWeight: 700 }}>{summary.length}</div>
            <div style={{ fontSize: 11, opacity: 0.8 }}>หมวดหมู่ / เครื่องจักร</div>
          </div>
        </div>
      </div>

      <ReportChart
        title={
          scope === 'overview'
            ? 'เปรียบเทียบต้นทุนแต่ละโครงการ'
            : scope === 'category'
            ? `รายการภายใน ${category}`
            : 'เปรียบเทียบต้นทุนแต่ละหมวดหมู่'
        }
        rows={chartRows}
      />

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

      <h2>
        {scope === 'category' && standalone
          ? 'รายการที่ต้องจัดซื้อ (ซื้อครั้งเดียวสร้าง 1 เครื่อง)'
          : showFullItems
          ? 'รายการสินค้าทั้งหมด'
          : `รายการมูลค่าสูงสุด ${TOP_N} อันดับต่อหมวดหมู่`}
      </h2>
      {!showFullItems && (
        <p style={{ fontSize: 10, color: '#777', marginTop: -6, marginBottom: 8 }}>
          แสดงเฉพาะรายการที่มียอดสูงสุด {TOP_N} รายการของแต่ละหมวดหมู่ (จากทั้งหมด {items.length} รายการ) —
          ดูรายละเอียดครบทุกรายการได้โดยเลือกดูทีละหมวดหมู่/เครื่องจักร
        </p>
      )}
      <table>
        <thead>
          <tr>
            <th>โครงการ</th>
            <th>หมวดหมู่</th>
            <th>รายการสินค้า</th>
            <th>{scope === 'category' && standalone ? 'จำนวนที่ต้องซื้อ' : 'จำนวน'}</th>
            <th>หน่วย</th>
            <th>ราคา/หน่วย</th>
            <th>{scope === 'category' && standalone ? 'ราคารวมที่ต้องจ่าย' : 'ราคารวม'}</th>
          </tr>
        </thead>
        <tbody>
          {displayedItems.map((it, i) => (
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

      <div
        style={{
          marginTop: 22,
          paddingTop: 10,
          borderTop: '1px dashed #ccc',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          fontSize: 10,
          color: '#888',
        }}
      >
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            color: '#fff',
            background: `linear-gradient(135deg, ${BLUEPRINT}, ${AMBER})`,
            padding: '2px 8px',
            borderRadius: 10,
            letterSpacing: 0.5,
          }}
        >
          ✨ AI-GENERATED
        </span>
        <span>รายงานนี้จัดทำและวิเคราะห์ข้อมูลโดยระบบ AI Cost Dashboard (Powered by Claude · Anthropic)</span>
      </div>
    </div>
  );
}