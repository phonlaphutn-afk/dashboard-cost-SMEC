import { useState } from 'react';
import { baht, pct } from '../format';

export default function CategoryChart({ summary, onSelect, activeCategory, emptyCategories, onDeleteCategory }) {
  const ranked = [...summary].sort((a, b) => Number(b.total) - Number(a.total));
  const max = Math.max(...ranked.map((r) => Number(r.total)), 1);
  const [deletingName, setDeletingName] = useState(null);
  const [deleteError, setDeleteError] = useState('');

  const remove = async (category, e) => {
    e.stopPropagation(); // don't trigger the row's onSelect
    if (!onDeleteCategory) return;
    setDeleteError('');
    setDeletingName(category);
    try {
      await onDeleteCategory(category);
    } catch {
      setDeleteError(`ลบ "${category}" ไม่สำเร็จ — อาจมีรายการข้างในแล้ว`);
    } finally {
      setDeletingName(null);
    }
  };

  return (
    <div className="rounded-lg border border-[var(--blueprint-dim)]/40 bg-[var(--bg-panel)] p-5">
      <div className="flex items-baseline justify-between mb-4">
        <h2 className="text-sm font-semibold tracking-wide text-[var(--text)] uppercase">
          ต้นทุนตามรายการเครื่องจักร <span className="text-[var(--text-muted)] normal-case">({ranked.length} รายการ)</span>
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
      <div className="space-y-2.5 max-h-[480px] overflow-y-auto pr-1">
        {ranked.map((r) => {
          const w = (Number(r.total) / max) * 100;
          const active = activeCategory === r.category;
          const isEmpty = emptyCategories && emptyCategories.includes(r.category);
          return (
            <div key={r.category} className="group">
              <button
                onClick={() => onSelect(active ? null : r.category)}
                className="w-full text-left"
                title={`${r.category} — ${baht(r.total)} บาท (${pct(r.pct)})`}
              >
                <div className="flex justify-between items-center text-xs mb-1">
                  <span
                    className={`truncate max-w-[45%] ${active ? 'text-[var(--amber)] font-semibold' : 'text-[var(--text)]'}`}
                  >
                    {r.category}
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="font-mono-num text-[var(--text-muted)] group-hover:text-[var(--text)]">
                      {baht(r.total)} ฿
                    </span>
                    {isEmpty && onDeleteCategory && (
                      <button
                        onClick={(e) => remove(r.category, e)}
                        disabled={deletingName === r.category}
                        title="หมวดนี้ยังว่างอยู่ — ลบได้"
                        className="text-[var(--danger)] hover:underline text-[11px] disabled:opacity-50 font-semibold"
                      >
                        {deletingName === r.category ? 'กำลังลบ...' : 'ลบ'}
                      </button>
                    )}
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
            </div>
          );
        })}
      </div>
      {deleteError && <p className="text-xs text-[var(--danger)] mt-3">{deleteError}</p>}
    </div>
  );
}