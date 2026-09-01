import { baht, pct } from '../format';

// A qualitative palette that stays in the app's blueprint/amber family but adds a
// few more distinguishable hues for a multi-slice donut (industrial gauge feel).
const SLICE_COLORS = ['#4c8dff', '#f5a623', '#34d399', '#a78bfa', '#f87171', '#22d3ee', '#fb923c', '#94a3b8'];

export default function CategoryDonut({ summary, onSelect, activeCategory, title }) {
  const ranked = [...summary].filter((r) => Number(r.total) > 0).sort((a, b) => Number(b.total) - Number(a.total));
  const top = ranked.slice(0, 6);
  const restTotal = ranked.slice(6).reduce((s, r) => s + Number(r.total), 0);
  const slices = restTotal > 0 ? [...top, { category: 'อื่นๆ', total: restTotal, __rest: true }] : top;
  const grandTotal = slices.reduce((s, r) => s + Number(r.total), 0) || 1;

  const size = 160;
  const strokeWidth = 22;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  let cumulative = 0;
  const arcs = slices.map((s, i) => {
    const fraction = Number(s.total) / grandTotal;
    const dash = fraction * circumference;
    const offset = -cumulative * circumference;
    cumulative += fraction;
    return { ...s, color: SLICE_COLORS[i % SLICE_COLORS.length], dash, offset };
  });

  if (!slices.length) {
    return (
      <div className="rounded-xl border border-[var(--blueprint-dim)]/40 bg-[var(--bg-panel)] p-5 flex items-center justify-center h-64 text-sm text-[var(--text-muted)]">
        ยังไม่มีข้อมูลต้นทุนให้แสดง
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[var(--blueprint-dim)]/40 bg-[var(--bg-panel)] p-5">
      <h2 className="text-sm font-semibold tracking-wide text-[var(--text)] uppercase mb-4">{title || 'สัดส่วนต้นทุนตามหมวดหมู่'}</h2>
      <div className="flex flex-col sm:flex-row items-center gap-6">
        <div className="relative shrink-0" style={{ width: size, height: size }}>
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
            <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--bg-panel-raised)" strokeWidth={strokeWidth} />
            {arcs.map((a) => (
              <circle
                key={a.category}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={a.color}
                strokeWidth={strokeWidth}
                strokeDasharray={`${a.dash} ${circumference - a.dash}`}
                strokeDashoffset={a.offset}
                opacity={!a.__rest && activeCategory && activeCategory !== a.category ? 0.35 : 1}
                style={{ cursor: a.__rest ? 'default' : 'pointer', transition: 'opacity 0.15s' }}
                onClick={() => !a.__rest && onSelect && onSelect(activeCategory === a.category ? null : a.category)}
              />
            ))}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">รวม</span>
            <span className="text-sm font-bold font-mono-num text-[var(--text)]">{baht(grandTotal)} ฿</span>
          </div>
        </div>
        <div className="flex-1 w-full space-y-1.5 min-w-0">
          {arcs.map((a) => (
            <button
              key={a.category}
              onClick={() => !a.__rest && onSelect && onSelect(activeCategory === a.category ? null : a.category)}
              disabled={a.__rest}
              className={`w-full flex items-center justify-between gap-2 text-xs px-2 py-1 rounded-md ${
                activeCategory === a.category ? 'bg-[var(--bg-panel-raised)]' : 'hover:bg-[var(--bg-panel-raised)]/60'
              } ${a.__rest ? 'cursor-default' : ''}`}
            >
              <span className="flex items-center gap-2 min-w-0">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: a.color }} />
                <span className="truncate text-[var(--text)]">{a.category}</span>
              </span>
              <span className="font-mono-num text-[var(--text-muted)] whitespace-nowrap">
                {pct(a.total / grandTotal)}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}