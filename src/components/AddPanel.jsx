import { useState } from 'react';

export default function AddPanel({ categories, onAddItem, onAddCategory, isLive }) {
  const [mode, setMode] = useState('item'); // 'item' | 'category'
  const [form, setForm] = useState({ category: categories[0] || '', item: '', qty: '', unit: '', unitPrice: '' });
  const [newCategory, setNewCategory] = useState('');
  const [status, setStatus] = useState(null);

  const submitItem = async (e) => {
    e.preventDefault();
    if (!form.category || !form.item) return;
    setStatus('saving');
    try {
      await onAddItem({
        category: form.category,
        item: form.item,
        qty: form.qty,
        unit: form.unit,
        unitPrice: form.unitPrice,
      });
      setForm({ ...form, item: '', qty: '', unit: '', unitPrice: '' });
      setStatus('saved');
    } catch (err) {
      setStatus('error');
    } finally {
      setTimeout(() => setStatus(null), 2000);
    }
  };

  const submitCategory = async (e) => {
    e.preventDefault();
    if (!newCategory.trim()) return;
    setStatus('saving');
    try {
      await onAddCategory(newCategory.trim());
      setNewCategory('');
      setStatus('saved');
      setMode('item');
    } catch (err) {
      setStatus('error');
    } finally {
      setTimeout(() => setStatus(null), 2000);
    }
  };

  const inputClass =
    'w-full bg-[var(--bg-panel-raised)] border border-[var(--blueprint-dim)]/50 rounded-md px-3 py-2 text-sm placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--blueprint)]';

  return (
    <div className="rounded-lg border border-[var(--blueprint-dim)]/40 bg-[var(--bg-panel)] p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold tracking-wide uppercase">เพิ่มข้อมูล</h2>
        <div className="flex text-xs rounded-md overflow-hidden border border-[var(--blueprint-dim)]/50">
          <button
            onClick={() => setMode('item')}
            className={`px-3 py-1.5 ${mode === 'item' ? 'bg-[var(--blueprint)] text-[#04101f] font-semibold' : 'text-[var(--text-muted)]'}`}
          >
            รายการใหม่
          </button>
          <button
            onClick={() => setMode('category')}
            className={`px-3 py-1.5 ${mode === 'category' ? 'bg-[var(--blueprint)] text-[#04101f] font-semibold' : 'text-[var(--text-muted)]'}`}
          >
            หมวดหมู่ใหม่ (Sheet ใหม่)
          </button>
        </div>
      </div>

      {!isLive && (
        <p className="text-xs text-[var(--amber)] bg-[var(--amber-dim)]/20 border border-[var(--amber-dim)]/50 rounded-md px-3 py-2 mb-4">
          ยังไม่ได้เชื่อมต่อ Google Sheet — ข้อมูลที่เพิ่มจะแสดงผลชั่วคราวในเบราว์เซอร์นี้เท่านั้น (ดูวิธีเชื่อมต่อใน README)
        </p>
      )}

      {mode === 'item' ? (
        <form onSubmit={submitItem} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2">
            <label className="text-xs text-[var(--text-muted)]">หมวดหมู่ / เครื่องจักร</label>
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className={inputClass}
            >
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs text-[var(--text-muted)]">รายการสินค้า</label>
            <input
              value={form.item}
              onChange={(e) => setForm({ ...form, item: e.target.value })}
              placeholder="เช่น แผ่นสแตนเลส 5x10 หนา 3 มิล"
              className={inputClass}
              required
            />
          </div>
          <div>
            <label className="text-xs text-[var(--text-muted)]">จำนวนที่ใช้</label>
            <input
              value={form.qty}
              onChange={(e) => setForm({ ...form, qty: e.target.value })}
              type="number"
              step="any"
              className={inputClass}
            />
          </div>
          <div>
            <label className="text-xs text-[var(--text-muted)]">หน่วย</label>
            <input
              value={form.unit}
              onChange={(e) => setForm({ ...form, unit: e.target.value })}
              placeholder="แผ่น / เส้น / ตัว"
              className={inputClass}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs text-[var(--text-muted)]">ราคา/หน่วย (บาท)</label>
            <input
              value={form.unitPrice}
              onChange={(e) => setForm({ ...form, unitPrice: e.target.value })}
              type="number"
              step="any"
              className={inputClass}
            />
          </div>
          <button
            type="submit"
            className="sm:col-span-2 mt-1 bg-[var(--amber)] text-[#1a1200] font-semibold rounded-md px-4 py-2 text-sm hover:brightness-110 transition"
          >
            {status === 'saving' ? 'กำลังบันทึก...' : 'บันทึกรายการ'}
          </button>
          {status === 'saved' && <p className="sm:col-span-2 text-xs text-[var(--success)]">บันทึกเรียบร้อย ✓</p>}
          {status === 'error' && <p className="sm:col-span-2 text-xs text-[var(--danger)]">บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง</p>}
        </form>
      ) : (
        <form onSubmit={submitCategory} className="space-y-3">
          <div>
            <label className="text-xs text-[var(--text-muted)]">ชื่อหมวดหมู่ / เครื่องจักรใหม่</label>
            <input
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              placeholder="เช่น Vibrating Screen"
              className={inputClass}
              required
            />
          </div>
          <button
            type="submit"
            className="bg-[var(--blueprint)] text-[#04101f] font-semibold rounded-md px-4 py-2 text-sm hover:brightness-110 transition"
          >
            {status === 'saving' ? 'กำลังสร้าง...' : 'สร้างหมวดหมู่ใหม่'}
          </button>
          {status === 'saved' && <p className="text-xs text-[var(--success)]">สร้างหมวดหมู่เรียบร้อย ✓</p>}
          {status === 'error' && <p className="text-xs text-[var(--danger)]">สร้างไม่สำเร็จ ลองใหม่อีกครั้ง</p>}
        </form>
      )}
    </div>
  );
}
