import { baht, pct } from '../format';

export default function CategoryChart({ summary, onSelect, activeCategory }) {
  const ranked = [...summary]
    .filter((r) => Number(r.total) > 0)
    .sort((a, b) => Number(b.total) - Number(a.total))
    .slice(0, 12);
  const max = Math.max(...ranked.map((r) => Number(r.total)), 1);

  return (
    <div className="rounded-lg border border-[var(--blueprint-dim)]/40 bg-[var(--bg-panel)] p-5">
      <div className="flex items-baseline justify-between mb-4">
        <h2 className="text-sm font-semibold tracking-wide text-[var(--text)] uppercase">
          ต้นทุนตามรายการเครื่องจักร <span className="text-[var(--text-muted)] normal-case">(สูงสุด 12 อันดับ)</span>
        </h2>
        {activeCategory && (
          <button
            onClick={() => onSelect(null)}
            className="text-xs text-[var(--amber)] hover:underline font-mono-num"
          >
            ล้างตัวกรอง ×
          </button>
        )}
      </div>
      <div className="space-y-2.5">
        {ranked.map((r) => {
          const w = (Number(r.total) / max) * 100;
          const active = activeCategory === r.category;
          return (
            <button
              key={r.category}
              onClick={() => onSelect(active ? null : r.category)}
              className="w-full text-left group"
              title={`${r.category} — ${baht(r.total)} บาท (${pct(r.pct)})`}
            >
              <div className="flex justify-between text-xs mb-1">
                <span
                  className={`truncate max-w-[60%] ${active ? 'text-[var(--amber)] font-semibold' : 'text-[var(--text)]'}`}
                >
                  {r.category}
                </span>
                <span className="font-mono-num text-[var(--text-muted)] group-hover:text-[var(--text)]">
                  {baht(r.total)} ฿
                </span>
              </div>
              <div className="h-2 rounded-full bg-[var(--bg-panel-raised)] overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${Math.max(w, 1.5)}%`,
                    background: active
                      ? 'var(--amber)'
                      : 'linear-gradient(90deg, var(--blueprint-dim), var(--blueprint))',
                  }}
                />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
