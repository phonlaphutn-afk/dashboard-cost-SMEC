import { useMemo, useState } from 'react';
import { baht } from '../format';

export default function ItemsTable({ items, categories, activeCategory, setActiveCategory, onDelete, canWrite }) {
  const [query, setQuery] = useState('');
  const [sortKey, setSortKey] = useState('total');
  const [sortDir, setSortDir] = useState('desc');

  const filtered = useMemo(() => {
    let rows = items;
    if (activeCategory) rows = rows.filter((r) => r.category === activeCategory);
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      rows = rows.filter(
        (r) =>
          String(r.item).toLowerCase().includes(q) ||
          String(r.category).toLowerCase().includes(q) ||
          String(r.unit || '').toLowerCase().includes(q)
      );
    }
    const sorted = [...rows].sort((a, b) => {
      const av = a[sortKey],
        bv = b[sortKey];
      const cmp = typeof av === 'string' ? String(av).localeCompare(String(bv)) : Number(av) - Number(bv);
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return sorted;
  }, [items, activeCategory, query, sortKey, sortDir]);

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const Th = ({ k, children, className = '' }) => (
    <th
      onClick={() => toggleSort(k)}
      className={`px-3 py-2 text-left cursor-pointer select-none text-[11px] uppercase tracking-wide text-[var(--text-muted)] hover:text-[var(--text)] ${className}`}
    >
      {children} {sortKey === k ? (sortDir === 'asc' ? '↑' : '↓') : ''}
    </th>
  );

  return (
    <div className="rounded-lg border border-[var(--blueprint-dim)]/40 bg-[var(--bg-panel)]">
      <div className="p-4 flex flex-col sm:flex-row gap-3 sm:items-center border-b border-[var(--blueprint-dim)]/30">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="ค้นหารายการ, หมวดหมู่, หน่วย..."
          className="flex-1 bg-[var(--bg-panel-raised)] border border-[var(--blueprint-dim)]/50 rounded-md px-3 py-2 text-sm placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--blueprint)]"
        />
        <select
          value={activeCategory || ''}
          onChange={(e) => setActiveCategory(e.target.value || null)}
          className="bg-[var(--bg-panel-raised)] border border-[var(--blueprint-dim)]/50 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--blueprint)]"
        >
          <option value="">ทุกหมวดหมู่</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <span className="text-xs text-[var(--text-muted)] font-mono-num whitespace-nowrap">
          {filtered.length} / {items.length} รายการ
        </span>
      </div>

      <div className="overflow-x-auto max-h-[520px] overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-[var(--bg-panel)] z-10">
            <tr className="border-b border-[var(--blueprint-dim)]/30">
              <Th k="category">หมวดหมู่</Th>
              <Th k="item">รายการสินค้า</Th>
              <Th k="qty" className="text-right">
                จำนวน
              </Th>
              <th className="px-3 py-2 text-left text-[11px] uppercase tracking-wide text-[var(--text-muted)]">
                หน่วย
              </th>
              <Th k="unitPrice" className="text-right">
                ราคา/หน่วย
              </Th>
              <Th k="total" className="text-right">
                ราคารวม
              </Th>
              {canWrite && <th className="px-3 py-2" />}
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr
                key={r.id}
                className="border-b border-[var(--blueprint-dim)]/15 hover:bg-[var(--bg-panel-raised)]/60"
              >
                <td className="px-3 py-2 text-[var(--text-muted)]">{r.category}</td>
                <td className="px-3 py-2">{r.item}</td>
                <td className="px-3 py-2 text-right font-mono-num">{r.qty ?? '—'}</td>
                <td className="px-3 py-2 text-[var(--text-muted)]">{r.unit || '—'}</td>
                <td className="px-3 py-2 text-right font-mono-num">{baht(r.unitPrice)}</td>
                <td className="px-3 py-2 text-right font-mono-num text-[var(--amber)]">{baht(r.total)}</td>
                {canWrite && (
                  <td className="px-3 py-2 text-right">
                    <button
                      onClick={() => onDelete(r.id)}
                      className="text-[var(--danger)] hover:underline text-xs"
                    >
                      ลบ
                    </button>
                  </td>
                )}
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-10 text-center text-[var(--text-muted)]">
                  ไม่พบรายการที่ตรงกับการค้นหา
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
