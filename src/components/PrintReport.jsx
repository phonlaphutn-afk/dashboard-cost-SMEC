import { baht, pct } from '../format';

const BLUEPRINT = '#2c4a7c';
const BLUEPRINT_DARK = '#132844';
const AMBER = '#f5a623';

function heatColor(ratio) {
  const a = [0x2c, 0x4a, 0x7c];
  const b = [0xf5, 0xa6, 0x23];
  const rgb = a.map((c, i) => Math.round(c + (b[i] - c) * ratio));
  return `rgb(${rgb.join(',')})`;
}

// Horizontal bar chart built from SVG — renders fine in print/PDF (no external deps).
// Full labels, no truncation — label column width sized to the longest label.
function TopBarChart({ title, rows, max: capMax = 10 }) {
  const sorted = [...rows].sort((a, b) => b.total - a.total).slice(0, capMax);
  const max = Math.max(...sorted.map((r) => r.total), 1);
  const rowH = 30;
  const valueW = 110;
  const barAreaW = 380;
  const longestLabel = Math.max(...sorted.map((r) => r.label.length), 10);
  const labelW = Math.min(300, Math.max(140, longestLabel * 7));
  const chartW = labelW + barAreaW + valueW;
  const h = sorted.length * rowH + 6;

  return (
    <div>
      <h2 style={{ marginBottom: 10 }}>{title}</h2>
      <svg width="100%" height={h} viewBox={`0 0 ${chartW} ${h}`} style={{ fontFamily: 'inherit' }}>
        {sorted.map((r, i) => {
          const y = i * rowH;
          const w = Math.max((r.total / max) * barAreaW, 3);
          const color = heatColor(r.total / max);
          return (
            <g key={`${r.label}-${i}`}>
              <text x={0} y={y + 20} fontSize="13" fill="#243449">
                {r.label}
              </text>
              <rect x={labelW} y={y + 5} width={barAreaW} height={19} rx="5" fill="#eef1f6" />
              <rect x={labelW} y={y + 5} width={w} height={19} rx="5" fill={color} />
              <text x={labelW + barAreaW + 10} y={y + 20} fontSize="12.5" fontWeight="700" fill="#1a2a3d">
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

function StatChip({ value, label }) {
  return (
    <div
      style={{
        background: 'rgba(255,255,255,0.1)',
        border: '1px solid rgba(255,255,255,0.18)',
        borderRadius: 14,
        padding: '12px 20px',
        minWidth: 120,
      }}
    >
      <div style={{ fontSize: 26, fontWeight: 800, color: '#fff' }}>{value}</div>
      <div style={{ fontSize: 11.5, opacity: 0.8, marginTop: 2 }}>{label}</div>
    </div>
  );
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

  const avgPerItem = items.length ? grandTotal / items.length : 0;
  const topRow = [...summary].sort((a, b) => Number(b.total) - Number(a.total))[0];
  const chartTitle =
    scope === 'overview'
      ? 'เปรียบเทียบต้นทุนแต่ละโครงการ'
      : scope === 'category'
      ? `รายการภายใน ${category} (Top 10)`
      : 'เปรียบเทียบต้นทุนแต่ละหมวดหมู่ / เครื่องจักร (Top 10)';

  // Overview / whole-project reports are a single at-a-glance summary page —
  // built to be screenshotted or saved as one image and sent straight to LINE.
  // No item tables, no page breaks: everything fits on one page by design.
  if (scope !== 'category') {
    return (
      <div className="print-only">
        <div
          style={{
            background: `linear-gradient(160deg, ${BLUEPRINT_DARK} 0%, ${BLUEPRINT} 60%, #24457a 100%)`,
            color: '#fff',
            borderRadius: 18,
            padding: '30px 34px',
            marginBottom: 18,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: 1.5, opacity: 0.85 }}>
                SIAMMAC ENGINEERING &amp; CONSTRUCTION
              </div>
              <div style={{ fontSize: 20, fontWeight: 700, marginTop: 4 }}>{title}</div>
            </div>
            <div style={{ fontSize: 11, opacity: 0.7, textAlign: 'right' }}>
              พิมพ์เมื่อ {new Date().toLocaleString('th-TH')}
            </div>
          </div>

          <div style={{ marginTop: 26 }}>
            <div style={{ fontSize: 14, opacity: 0.8, textTransform: 'uppercase', letterSpacing: 2 }}>
              ยอดรวมทั้งหมด
            </div>
            <div style={{ fontSize: 58, fontWeight: 800, color: AMBER, lineHeight: 1.05, marginTop: 4 }}>
              {baht(grandTotal)} <span style={{ fontSize: 32 }}>฿</span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12, marginTop: 20, flexWrap: 'wrap' }}>
            <StatChip value={items.length} label="รายการทั้งหมด" />
            <StatChip value={summary.length} label="หมวดหมู่ / เครื่องจักร" />
            <StatChip value={`${baht(avgPerItem)} ฿`} label="เฉลี่ยต่อรายการ" />
          </div>
        </div>

        {topRow && (
          <div
            style={{
              background: '#fdf3e0',
              borderRadius: 14,
              borderLeft: `7px solid ${AMBER}`,
              padding: '14px 20px',
              marginBottom: 18,
            }}
          >
            <div style={{ fontSize: 11.5, color: '#8a5a00', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700 }}>
              หมวดหมู่ที่ใช้ต้นทุนสูงสุด
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
              <div style={{ fontSize: 19, fontWeight: 700, color: '#222' }}>
                {topRow.project} — {topRow.category}
              </div>
              <div style={{ fontSize: 21, fontWeight: 800, color: '#8a5a00' }}>
                {baht(topRow.total)} ฿ <span style={{ fontSize: 12.5, fontWeight: 500, color: '#666' }}>({pct(topRow.pct)})</span>
              </div>
            </div>
          </div>
        )}

        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e4e9f2', padding: '18px 22px' }}>
          <TopBarChart title={chartTitle} rows={chartRows} max={10} />
        </div>

        <div
          style={{
            marginTop: 18,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            fontSize: 10.5,
            color: '#98a2b3',
          }}
        >
          <span
            style={{
              fontWeight: 700,
              color: '#fff',
              background: `linear-gradient(135deg, ${BLUEPRINT}, ${AMBER})`,
              padding: '3px 10px',
              borderRadius: 10,
              letterSpacing: 0.5,
            }}
          >
            ✨ AI-GENERATED
          </span>
          <span>จัดทำและวิเคราะห์ข้อมูลโดยระบบ AI Cost Dashboard (Powered by Claude · Anthropic)</span>
        </div>
      </div>
    );
  }

  // Category (single machine) scope — keep the detailed item table, since this
  // view is meant for procurement/build detail rather than an at-a-glance share.
  const showFullItems = true;
  const displayedItems = items;

  return (
    <div className="print-only">
      <div
        style={{
          background: `linear-gradient(160deg, ${BLUEPRINT_DARK} 0%, ${BLUEPRINT} 60%, #24457a 100%)`,
          color: '#fff',
          borderRadius: 18,
          padding: '26px 30px',
          marginBottom: 18,
        }}
      >
        <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: 1.5, opacity: 0.85 }}>
          SIAMMAC ENGINEERING &amp; CONSTRUCTION
        </div>
        <div style={{ fontSize: 18, fontWeight: 700, marginTop: 4 }}>{title}</div>
        <div style={{ fontSize: 11, opacity: 0.7, marginTop: 2 }}>พิมพ์เมื่อ {new Date().toLocaleString('th-TH')}</div>

        <div style={{ display: 'flex', gap: 12, marginTop: 18, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 40, fontWeight: 800, color: AMBER }}>
              {baht(grandTotal)} <span style={{ fontSize: 22 }}>฿</span>
            </div>
            <div style={{ fontSize: 11.5, opacity: 0.8 }}>ต้นทุนของ {category}</div>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 12 }}>
            <StatChip value={items.length} label="รายการ" />
          </div>
        </div>
      </div>

      <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e4e9f2', padding: '16px 20px', marginBottom: 16 }}>
        <TopBarChart title={chartTitle} rows={chartRows} max={10} />
      </div>

      <h2>
        {standalone ? 'รายการที่ต้องจัดซื้อ (ซื้อครั้งเดียวสร้าง 1 เครื่อง)' : 'รายการสินค้าทั้งหมด'}
      </h2>
      <table>
        <thead>
          <tr>
            <th>โครงการ</th>
            <th>หมวดหมู่</th>
            <th>รายการสินค้า</th>
            <th>{standalone ? 'จำนวนที่ต้องซื้อ' : 'จำนวน'}</th>
            <th>หน่วย</th>
            <th>ราคา/หน่วย</th>
            <th>{standalone ? 'ราคารวมที่ต้องจ่าย' : 'ราคารวม'}</th>
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
          marginTop: 18,
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