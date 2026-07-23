import { useMemo } from 'react';
import { baht } from '../format';

export default function Overview({ allSummary, allItems, onSelectProject }) {
  const projectTotals = useMemo(() => {
    const totals = {};
    const counts = {};
    allSummary.forEach((s) => {
      totals[s.project] = (totals[s.project] || 0) + (Number(s.total) || 0);
    });
    allItems.forEach((it) => {
      counts[it.project] = (counts[it.project] || 0) + 1;
    });
    return Object.keys(totals)
      .map((project) => ({ project, total: totals[project], items: counts[project] || 0 }))
      .sort((a, b) => b.total - a.total);
  }, [allSummary, allItems]);

  const grandTotal = projectTotals.reduce((s, p) => s + p.total, 0);
  const max = Math.max(...projectTotals.map((p) => p.total), 1);
  const totalItems = allItems.length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <StatCard label="ต้นทุนรวมทุกโครงการ" value={`${baht(grandTotal)} ฿`} accent="amber" />
        <StatCard label="จำนวนโครงการ" value={projectTotals.length} />
        <StatCard label="จำนวนรายการรวม" value={totalItems} />
      </div>

      <div className="rounded-lg border border-[var(--blueprint-dim)]/40 bg-[var(--bg-panel)] p-5">
        <h2 className="text-sm font-semibold tracking-wide uppercase mb-4">
          เปรียบเทียบต้นทุนแต่ละโครงการ <span className="text-[var(--text-muted)] normal-case">(คลิกเพื่อดูรายละเอียด)</span>
        </h2>
        <div className="space-y-3">
          {projectTotals.map((p) => {
            const w = (p.total / max) * 100;
            return (
              <button
                key={p.project}
                onClick={() => onSelectProject(p.project)}
                className="w-full text-left group"
              >
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-[var(--text)] group-hover:text-[var(--amber)] font-medium">
                    {p.project}
                  </span>
                  <span className="font-mono-num text-[var(--text-muted)] group-hover:text-[var(--text)]">
                    {baht(p.total)} ฿ <span className="text-[var(--text-muted)]">· {p.items} รายการ</span>
                  </span>
                </div>
                <div className="h-3 rounded-full bg-[var(--bg-panel-raised)] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[var(--blueprint-dim)] to-[var(--blueprint)] group-hover:from-[var(--amber-dim)] group-hover:to-[var(--amber)] transition-all"
                    style={{ width: `${Math.max(w, 1.5)}%` }}
                  />
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, accent }) {
  return (
    <div className="rounded-lg border border-[var(--blueprint-dim)]/40 bg-[var(--bg-panel)] p-4">
      <p className="text-[11px] uppercase tracking-wide text-[var(--text-muted)] mb-1 truncate">{label}</p>
      <p
        className={`text-xl font-semibold font-mono-num truncate ${accent === 'amber' ? 'text-[var(--amber)]' : 'text-[var(--text)]'}`}
      >
        {value}
      </p>
    </div>
  );
}
