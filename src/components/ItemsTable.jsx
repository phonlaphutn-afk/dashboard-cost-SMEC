import { useMemo, useState } from 'react';
import { baht } from '../format';

function SharedBadge({ row, items }) {
  const [open, setOpen] = useState(false);
  const siblings = items.filter((i) => i.sharedGroup && i.sharedGroup === row.sharedGroup);
  const fullCost = (Number(row.fullQty) || 0) * (Number(row.unitPrice) || 0);

  return (
    <span className="relative inline-block ml-1.5 align-middle">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title="รายการนี้แบ่งใช้ร่วมกับเครื่องจักรอื่น"
        className="text-[10px] px-1.5 py-0.5 rounded-full border border-[var(--amber)]/60 text-[var(--amber)] hover:bg-[var(--amber)]/10"
      >
        🔗 แบ่งใช้
      </button>
      {open && (
        <div className="absolute z-20 left-0 top-full mt-1 w-64 bg-[var(--bg-panel-raised)] border border-[var(--blueprint-dim)]/60 rounded-md shadow-xl p-3 text-xs">
          <p className="text-[var(--text-muted)] mb-1.5">
            ซื้อจริง {row.fullQty} {row.unit} · ราคาเต็ม{' '}
            <span className="text-[var(--amber)] font-mono-num">{baht(fullCost)} ฿</span> (ถ้าทำเครื่องเดียว)
          </p>
          <p className="text-[var(--text)] font-semibold mb-1">แบ่งใช้ {siblings.length} เครื่องจักร:</p>
          <ul className="space-y-0.5">
            {siblings.map((s) => (
              <li key={s.id} className="flex justify-between">
                <span className="truncate mr-2">{s.category}</span>
                <span className="font-mono-num text-[var(--text-muted)]">
                  {s.qty} {s.unit} · {baht(s.total)} ฿
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </span>
  );
}

export default function ItemsTable({ items, categories, activeCategory, setActiveCategory, onDelete, onUpdate, canWrite }) {
  const [query, setQuery] = useState('');
  const [sortKey, setSortKey] = useState('total');
  const [sortDir, setSortDir] = useState('desc');
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [saving, setSaving] = useState(false);

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

  const startEdit = (r) => {
    setEditingId(r.id);
    setEditForm({ category: r.category, item: r.item, qty: r.qty ?? '', unit: r.unit ?? '', unitPrice: r.unitPrice ?? '' });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm(null);
  };

  const saveEdit = async (id) => {
    setSaving(true);
    try {
      await onUpdate(id, editForm);
      setEditingId(null);
      setEditForm(null);
    } finally {
      setSaving(false);
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

  const inputClass =
    'w-full bg-[var(--bg-panel-raised)] border border-[var(--blueprint-dim)]/60 rounded px-1.5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-[var(--blueprint)]';

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
              {canWrite && <th className="px-3 py-2 whitespace-nowrap">จัดการ</th>}
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => {
              const isEditing = editingId === r.id;
              return (
                <tr
                  key={r.id}
                  className={`border-b border-[var(--blueprint-dim)]/15 ${isEditing ? 'bg-[var(--bg-panel-raised)]' : 'hover:bg-[var(--bg-panel-raised)]/60'}`}
                >
                  {isEditing ? (
                    <>
                      <td className="px-2 py-1.5">
                        <select
                          value={editForm.category}
                          onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                          className={inputClass}
                        >
                          {!categories.includes(editForm.category) && (
                            <option value={editForm.category}>{editForm.category}</option>
                          )}
                          {categories.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-2 py-1.5">
                        <input
                          value={editForm.item}
                          onChange={(e) => setEditForm({ ...editForm, item: e.target.value })}
                          className={inputClass}
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <input
                          type="number"
                          step="any"
                          value={editForm.qty}
                          onChange={(e) => setEditForm({ ...editForm, qty: e.target.value })}
                          className={`${inputClass} text-right`}
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <input
                          value={editForm.unit}
                          onChange={(e) => setEditForm({ ...editForm, unit: e.target.value })}
                          className={inputClass}
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <input
                          type="number"
                          step="any"
                          value={editForm.unitPrice}
                          onChange={(e) => setEditForm({ ...editForm, unitPrice: e.target.value })}
                          className={`${inputClass} text-right`}
                        />
                      </td>
                      <td className="px-3 py-1.5 text-right font-mono-num text-[var(--amber)]">
                        {baht((Number(editForm.qty) || 0) * (Number(editForm.unitPrice) || 0))}
                      </td>
                      <td className="px-2 py-1.5 text-right whitespace-nowrap">
                        <button
                          onClick={() => saveEdit(r.id)}
                          disabled={saving}
                          className="text-[var(--success)] hover:underline text-xs mr-2"
                        >
                          {saving ? '...' : 'บันทึก'}
                        </button>
                        <button onClick={cancelEdit} className="text-[var(--text-muted)] hover:underline text-xs">
                          ยกเลิก
                        </button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-3 py-2 text-[var(--text-muted)]">{r.category}</td>
                      <td className="px-3 py-2">
                        {r.item}
                        {r.sharedGroup && <SharedBadge row={r} items={items} />}
                      </td>
                      <td className="px-3 py-2 text-right font-mono-num">{r.qty ?? '—'}</td>
                      <td className="px-3 py-2 text-[var(--text-muted)]">{r.unit || '—'}</td>
                      <td className="px-3 py-2 text-right font-mono-num">{baht(r.unitPrice)}</td>
                      <td className="px-3 py-2 text-right font-mono-num text-[var(--amber)]">{baht(r.total)}</td>
                      {canWrite && (
                        <td className="px-3 py-2 text-right whitespace-nowrap">
                          <button
                            onClick={() => startEdit(r)}
                            className="text-[var(--blueprint)] hover:underline text-xs mr-2"
                          >
                            แก้ไข
                          </button>
                          <button
                            onClick={() => onDelete(r.id)}
                            className="text-[var(--danger)] hover:underline text-xs"
                          >
                            ลบ
                          </button>
                        </td>
                      )}
                    </>
                  )}
                </tr>
              );
            })}
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
