import { useState } from 'react';
import * as XLSX from 'xlsx-js-style';
import { baht } from '../format';

// --- Column header synonyms used to auto-detect an uploaded sheet's layout ---
const HEADER_MAP = {
  category: ['หมวดหมู่', 'เครื่องจักร', 'category', 'machine'],
  item: ['รายการสินค้า', 'รายการ', 'item', 'name', 'สินค้า'],
  qty: ['จำนวน', 'qty', 'quantity', 'จำนวนที่ใช้'],
  unit: ['หน่วย', 'unit'],
  unitPrice: ['ราคา/หน่วย', 'ราคาต่อหน่วย', 'unitprice', 'unit price', 'ราคา'],
};

function detectColumns(headerRow) {
  const map = {};
  headerRow.forEach((cell, i) => {
    const norm = String(cell || '').trim().toLowerCase();
    Object.entries(HEADER_MAP).forEach(([key, synonyms]) => {
      if (map[key] !== undefined) return;
      if (synonyms.some((s) => norm.includes(s.toLowerCase()))) map[key] = i;
    });
  });
  return map;
}

// Units that can only be counted in whole numbers — no half a bolt or a third of a washer.
const COUNT_UNITS = new Set(['ตัว', 'ชิ้น', 'อัน', 'ชุด', 'ตัว/ชิ้น']);
const isCountUnit = (unit) => COUNT_UNITS.has((unit || '').trim());

// Splits fullQty across n machines. Whole-number units round down then hand the leftover
// +1 to the first few machines so shares are always integers that still sum to fullQty.
// Other units (แผ่น, เส้น, กก. ...) can be cut/measured fractionally.
function splitWhole(fullQty, n, unit) {
  if (!n) return [];
  if (!isCountUnit(unit)) return new Array(n).fill(fullQty / n);
  const base = Math.floor(fullQty / n);
  const remainder = Math.round(fullQty - base * n);
  return Array.from({ length: n }, (_, i) => base + (i < remainder ? 1 : 0));
}

export default function AddPanel({ categories, emptyCategories, onAddItem, onAddSharedItem, onAddCategory, onDeleteCategory, isLive }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState('item'); // 'item' | 'shared' | 'category' | 'import'

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-full rounded-lg border-2 border-dashed border-[var(--amber)]/60 bg-[var(--amber-dim)]/10 hover:bg-[var(--amber-dim)]/20 transition p-6 flex flex-col items-center justify-center gap-2 text-center"
      >
        <span className="w-10 h-10 rounded-full bg-[var(--amber)] text-[#1a1200] text-2xl font-bold flex items-center justify-center">
          +
        </span>
        <span className="text-[var(--amber)] font-semibold">เพิ่มข้อมูล</span>
        <span className="text-xs text-[var(--text-muted)]">เพิ่มรายการทีละอัน, แบ่งใช้หลายเครื่องจักร, สร้างหมวดหมู่ใหม่, หรือนำเข้าจากไฟล์</span>
      </button>

      {open && (
        <AddDataModal
          tab={tab}
          setTab={setTab}
          categories={categories}
          emptyCategories={emptyCategories}
          onAddItem={onAddItem}
          onAddSharedItem={onAddSharedItem}
          onAddCategory={onAddCategory}
          onDeleteCategory={onDeleteCategory}
          isLive={isLive}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

function AddDataModal({ tab, setTab, categories, emptyCategories, onAddItem, onAddSharedItem, onAddCategory, onDeleteCategory, isLive, onClose }) {
  const inputClass =
    'w-full bg-[var(--bg-panel-raised)] border border-[var(--blueprint-dim)]/50 rounded-md px-3 py-2.5 text-sm placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--blueprint)]';
  const labelClass = 'text-xs text-[var(--text-muted)] mb-1 block';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[var(--bg-panel)] border border-[var(--blueprint-dim)]/50 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--blueprint-dim)]/30 sticky top-0 bg-[var(--bg-panel)] z-10">
          <h2 className="text-lg font-semibold">เพิ่มข้อมูล</h2>
          <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text)] text-2xl leading-none">
            ×
          </button>
        </div>

        <div className="flex gap-1 px-6 pt-4 flex-wrap">
          {[
            ['item', 'รายการใหม่'],
            ['shared', 'แบ่งใช้หลายเครื่องจักร'],
            ['category', 'หมวดหมู่ใหม่ (Sheet ใหม่)'],
            ['import', 'นำเข้าจากไฟล์ Excel / CSV'],
          ].map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`px-4 py-2 text-sm rounded-t-md ${
                tab === key
                  ? 'bg-[var(--blueprint)] text-[#04101f] font-semibold'
                  : 'text-[var(--text-muted)] hover:text-[var(--text)]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="p-6 pt-5">
          {!isLive && (
            <p className="text-xs text-[var(--amber)] bg-[var(--amber-dim)]/20 border border-[var(--amber-dim)]/50 rounded-md px-3 py-2 mb-5">
              ยังไม่ได้เชื่อมต่อ Google Sheet — ข้อมูลที่เพิ่มจะแสดงผลชั่วคราวในเบราว์เซอร์นี้เท่านั้น
            </p>
          )}

          {tab === 'item' && (
            <ItemForm categories={categories} onAddItem={onAddItem} inputClass={inputClass} labelClass={labelClass} onDone={onClose} />
          )}
          {tab === 'shared' && (
            <SharedItemForm categories={categories} onAddSharedItem={onAddSharedItem} inputClass={inputClass} labelClass={labelClass} onDone={onClose} />
          )}
          {tab === 'category' && (
            <CategoryForm
              onAddCategory={onAddCategory}
              emptyCategories={emptyCategories}
              onDeleteCategory={onDeleteCategory}
              inputClass={inputClass}
              labelClass={labelClass}
              onDone={onClose}
            />
          )}
          {tab === 'import' && (
            <ImportTab categories={categories} onAddItem={onAddItem} onAddCategory={onAddCategory} onDone={onClose} />
          )}
        </div>
      </div>
    </div>
  );
}

function ItemForm({ categories, onAddItem, inputClass, labelClass, onDone }) {
  const [form, setForm] = useState({ category: categories[0] || '', item: '', qty: '', unit: '', unitPrice: '' });
  const [status, setStatus] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.category || !form.item) return;
    setStatus('saving');
    try {
      await onAddItem(form);
      setForm({ ...form, item: '', qty: '', unit: '', unitPrice: '' });
      setStatus('saved');
      setTimeout(() => setStatus(null), 1500);
    } catch {
      setStatus('error');
      setTimeout(() => setStatus(null), 2000);
    }
  };

  return (
    <form onSubmit={submit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div className="sm:col-span-2">
        <label className={labelClass}>หมวดหมู่ / เครื่องจักร</label>
        <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className={inputClass}>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>
      <div className="sm:col-span-2">
        <label className={labelClass}>รายการสินค้า</label>
        <input
          value={form.item}
          onChange={(e) => setForm({ ...form, item: e.target.value })}
          placeholder="เช่น แผ่นสแตนเลส 5x10 หนา 3 มิล"
          className={inputClass}
          required
        />
      </div>
      <div>
        <label className={labelClass}>จำนวนที่ใช้</label>
        <input value={form.qty} onChange={(e) => setForm({ ...form, qty: e.target.value })} type="number" step="any" className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>หน่วย</label>
        <input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} placeholder="แผ่น / เส้น / ตัว" className={inputClass} />
      </div>
      <div className="sm:col-span-2">
        <label className={labelClass}>ราคา/หน่วย (บาท)</label>
        <input value={form.unitPrice} onChange={(e) => setForm({ ...form, unitPrice: e.target.value })} type="number" step="any" className={inputClass} />
      </div>
      <button
        type="submit"
        className="sm:col-span-2 mt-1 bg-[var(--amber)] text-[#1a1200] font-semibold rounded-md px-4 py-3 text-sm hover:brightness-110 transition"
      >
        {status === 'saving' ? 'กำลังบันทึก...' : 'บันทึกรายการ'}
      </button>
      {status === 'saved' && <p className="sm:col-span-2 text-xs text-[var(--success)]">บันทึกเรียบร้อย ✓</p>}
      {status === 'error' && <p className="sm:col-span-2 text-xs text-[var(--danger)]">บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง</p>}
    </form>
  );
}

function SharedItemForm({ categories, onAddSharedItem, inputClass, labelClass, onDone }) {
  const [item, setItem] = useState('');
  const [fullQty, setFullQty] = useState('');
  const [unit, setUnit] = useState('');
  const [unitPrice, setUnitPrice] = useState('');
  const [selected, setSelected] = useState([]); // category names chosen
  const [splitMethod, setSplitMethod] = useState('equal'); // 'equal' | 'custom'
  const [customQty, setCustomQty] = useState({}); // category -> qty string
  const [status, setStatus] = useState(null);

  const toggleCategory = (cat) => {
    setSelected((prev) => (prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]));
  };

  const fullQtyNum = Number(fullQty) || 0;
  const equalShares = splitWhole(fullQtyNum, selected.length, unit); // array aligned with `selected`
  const allocatedTotal = selected.reduce((sum, cat, idx) => {
    const q = splitMethod === 'equal' ? equalShares[idx] || 0 : Number(customQty[cat]) || 0;
    return sum + q;
  }, 0);
  const mismatch = selected.length > 0 && Math.abs(allocatedTotal - fullQtyNum) > 0.001;
  const fullCost = fullQtyNum * (Number(unitPrice) || 0);

  const submit = async (e) => {
    e.preventDefault();
    if (!item || !selected.length || !fullQtyNum) return;
    setStatus('saving');
    try {
      const allocations = selected.map((cat, idx) => ({
        category: cat,
        qty: splitMethod === 'equal' ? equalShares[idx] || 0 : Number(customQty[cat]) || 0,
      }));
      await onAddSharedItem({ item, fullQty: fullQtyNum, unit, unitPrice: Number(unitPrice) || 0, allocations });
      setItem('');
      setFullQty('');
      setUnit('');
      setUnitPrice('');
      setSelected([]);
      setCustomQty({});
      setStatus('saved');
      setTimeout(() => setStatus(null), 1500);
    } catch {
      setStatus('error');
      setTimeout(() => setStatus(null), 2000);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="rounded-md border border-[var(--blueprint-dim)]/50 bg-[var(--bg-panel-raised)] p-3 text-xs text-[var(--text-muted)] leading-relaxed">
        ใช้แท็บนี้เมื่อซื้อของมา 1 รายการ (เช่น แผ่นเหล็ก 9 มิล 1 แผ่น) แล้วตัดแบ่งไปใช้กับเครื่องจักรหลายตัว —
        ระบบจะหารต้นทุนให้ตามจริง ไม่นับซ้ำเต็มราคาในแต่ละเครื่อง แต่ยังเก็บ "ราคาเต็ม" ไว้อ้างอิงว่าถ้าทำเครื่องเดียวต้องซื้อเท่าไหร่
      </div>

      <div>
        <label className={labelClass}>รายการสินค้า (ของที่ซื้อจริง)</label>
        <input value={item} onChange={(e) => setItem(e.target.value)} placeholder="เช่น แผ่นเหล็ก 9 มิล" className={inputClass} required />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className={labelClass}>จำนวนที่ซื้อจริงทั้งหมด</label>
          <input value={fullQty} onChange={(e) => setFullQty(e.target.value)} type="number" step="any" className={inputClass} required />
        </div>
        <div>
          <label className={labelClass}>หน่วย</label>
          <input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="แผ่น" className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>ราคา/หน่วย (บาท)</label>
          <input value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)} type="number" step="any" className={inputClass} />
        </div>
      </div>

      {fullQtyNum > 0 && Number(unitPrice) > 0 && (
        <p className="text-xs text-[var(--text-muted)]">
          ราคาเต็มของรายการนี้: <span className="text-[var(--amber)] font-mono-num">{baht(fullCost)} ฿</span> (ถ้าต้องซื้อคนเดียวไม่แบ่งใคร)
        </p>
      )}

      <div>
        <label className={labelClass}>เลือกเครื่องจักรที่ใช้ร่วมกัน</label>
        <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto rounded-md border border-[var(--blueprint-dim)]/40 p-2">
          {categories.map((c) => (
            <button
              type="button"
              key={c}
              onClick={() => toggleCategory(c)}
              className={`px-2.5 py-1 text-xs rounded-full border ${
                selected.includes(c)
                  ? 'bg-[var(--amber)] text-[#1a1200] border-[var(--amber)] font-semibold'
                  : 'border-[var(--blueprint-dim)]/50 text-[var(--text-muted)] hover:text-[var(--text)]'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {selected.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <label className={labelClass + ' mb-0'}>วิธีแบ่งยอด</label>
            <div className="flex text-xs rounded-md overflow-hidden border border-[var(--blueprint-dim)]/50">
              <button
                type="button"
                onClick={() => setSplitMethod('equal')}
                className={`px-3 py-1 ${splitMethod === 'equal' ? 'bg-[var(--blueprint)] text-[#04101f] font-semibold' : 'text-[var(--text-muted)]'}`}
              >
                หารเท่ากัน
              </button>
              <button
                type="button"
                onClick={() => setSplitMethod('custom')}
                className={`px-3 py-1 ${splitMethod === 'custom' ? 'bg-[var(--blueprint)] text-[#04101f] font-semibold' : 'text-[var(--text-muted)]'}`}
              >
                กำหนดเอง
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            {selected.map((cat, idx) => (
              <div key={cat} className="flex items-center justify-between gap-2 text-sm bg-[var(--bg-panel-raised)] rounded-md px-3 py-1.5">
                <span className="truncate">{cat}</span>
                {splitMethod === 'equal' ? (
                  <span className="font-mono-num text-[var(--text-muted)]">
                    {isCountUnit(unit) ? equalShares[idx] : (equalShares[idx] || 0).toFixed(3)} {unit}
                  </span>
                ) : (
                  <input
                    value={customQty[cat] ?? ''}
                    onChange={(e) => setCustomQty({ ...customQty, [cat]: e.target.value })}
                    type="number"
                    step="any"
                    placeholder="0"
                    className="w-24 bg-[var(--bg-panel)] border border-[var(--blueprint-dim)]/50 rounded px-2 py-1 text-xs text-right focus:outline-none focus:ring-1 focus:ring-[var(--blueprint)]"
                  />
                )}
              </div>
            ))}
          </div>

          {splitMethod === 'equal' && isCountUnit(unit) && (
            <p className="text-[11px] text-[var(--text-muted)] mt-1">
              หน่วยนับเป็นชิ้น จึงปัดเป็นจำนวนเต็ม (เศษที่เหลือจะได้เพิ่มให้บางเครื่องจักร 1 หน่วย)
            </p>
          )}

          <p className={`text-xs mt-2 ${mismatch ? 'text-[var(--danger)]' : 'text-[var(--text-muted)]'}`}>
            รวมที่แบ่งแล้ว: {allocatedTotal.toFixed(3)} / {fullQtyNum} {unit}
            {mismatch && ' — ยอดรวมไม่เท่ากับจำนวนที่ซื้อจริง ตรวจสอบอีกครั้ง'}
          </p>
        </div>
      )}

      <button
        type="submit"
        disabled={!item || !selected.length || !fullQtyNum}
        className="w-full bg-[var(--amber)] text-[#1a1200] font-semibold rounded-md px-4 py-3 text-sm hover:brightness-110 transition disabled:opacity-50"
      >
        {status === 'saving' ? 'กำลังบันทึก...' : `บันทึก แบ่งใช้ ${selected.length || 0} เครื่องจักร`}
      </button>
      {status === 'saved' && <p className="text-xs text-[var(--success)]">บันทึกเรียบร้อย ✓</p>}
      {status === 'error' && <p className="text-xs text-[var(--danger)]">บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง</p>}
    </form>
  );
}

function CategoryForm({ onAddCategory, emptyCategories, onDeleteCategory, inputClass, labelClass, onDone }) {
  const [name, setName] = useState('');
  const [status, setStatus] = useState(null);
  const [deletingName, setDeletingName] = useState(null);
  const [deleteError, setDeleteError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setStatus('saving');
    try {
      await onAddCategory(name.trim());
      setName('');
      setStatus('saved');
      setTimeout(() => setStatus(null), 1200);
    } catch {
      setStatus('error');
      setTimeout(() => setStatus(null), 2000);
    }
  };

  const remove = async (category) => {
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
    <div className="space-y-5">
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className={labelClass}>ชื่อหมวดหมู่ / เครื่องจักรใหม่</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="เช่น Vibrating Screen" className={inputClass} required />
        </div>
        <button type="submit" className="bg-[var(--blueprint)] text-[#04101f] font-semibold rounded-md px-4 py-3 text-sm hover:brightness-110 transition">
          {status === 'saving' ? 'กำลังสร้าง...' : 'สร้างหมวดหมู่ใหม่'}
        </button>
        {status === 'saved' && <p className="text-xs text-[var(--success)]">สร้างหมวดหมู่เรียบร้อย ✓</p>}
        {status === 'error' && <p className="text-xs text-[var(--danger)]">สร้างไม่สำเร็จ ลองใหม่อีกครั้ง</p>}
      </form>

      {emptyCategories && emptyCategories.length > 0 && (
        <div className="pt-4 border-t border-[var(--blueprint-dim)]/30">
          <p className={labelClass}>หมวดหมู่ที่ยังว่างอยู่ (ลบได้)</p>
          <p className="text-xs text-[var(--text-muted)] mb-2">
            ยังไม่มีรายการข้างใน — ลบได้เลยถ้าสร้างผิดหรือไม่ได้ใช้แล้ว
          </p>
          <div className="space-y-1.5">
            {emptyCategories.map((cat) => (
              <div
                key={cat}
                className="flex items-center justify-between bg-[var(--bg-panel-raised)] rounded-md px-3 py-1.5 text-sm"
              >
                <span className="truncate">{cat}</span>
                <button
                  onClick={() => remove(cat)}
                  disabled={deletingName === cat}
                  className="text-[var(--danger)] hover:underline text-xs disabled:opacity-50"
                >
                  {deletingName === cat ? 'กำลังลบ...' : 'ลบ'}
                </button>
              </div>
            ))}
          </div>
          {deleteError && <p className="text-xs text-[var(--danger)] mt-2">{deleteError}</p>}
        </div>
      )}
    </div>
  );
}

function ImportTab({ categories, onAddItem, onAddCategory, onDone }) {
  const [rows, setRows] = useState(null); // parsed { category, item, qty, unit, unitPrice }[]
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState('');
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    setRows(null);
    setDone(false);
    setFileName(file.name);
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
      if (!raw.length) throw new Error('ไฟล์ว่างเปล่า');

      const headerRow = raw[0];
      const cols = detectColumns(headerRow);
      if (cols.item === undefined) {
        setError('หาคอลัมน์ "รายการสินค้า" ไม่เจอ — ตรวจสอบว่าแถวแรกของไฟล์เป็นหัวตาราง เช่น หมวดหมู่, รายการสินค้า, จำนวน, หน่วย, ราคา/หน่วย');
        return;
      }
      const dataRows = raw.slice(1);
      const parsed = dataRows
        .filter((r) => r[cols.item] !== '' && r[cols.item] != null)
        .map((r) => ({
          category: cols.category !== undefined ? String(r[cols.category] || '').trim() : '',
          item: String(r[cols.item] || '').trim(),
          qty: cols.qty !== undefined ? r[cols.qty] : '',
          unit: cols.unit !== undefined ? String(r[cols.unit] || '').trim() : '',
          unitPrice: cols.unitPrice !== undefined ? r[cols.unitPrice] : '',
        }));
      if (!parsed.length) {
        setError('ไม่พบข้อมูลในไฟล์ (ตรวจสอบว่ามีแถวข้อมูลต่อจากหัวตาราง)');
        return;
      }
      setRows(parsed);
    } catch (err) {
      setError('อ่านไฟล์ไม่สำเร็จ: ' + err.message);
    }
  };

  const runImport = async () => {
    if (!rows) return;
    setImporting(true);
    setProgress(0);
    const existingCats = new Set(categories);
    const newCats = new Set();
    rows.forEach((r) => {
      if (r.category && !existingCats.has(r.category)) newCats.add(r.category);
    });
    for (const cat of newCats) {
      try {
        await onAddCategory(cat);
      } catch {
        // ignore if it already exists by the time we get here
      }
    }
    let ok = 0;
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      try {
        await onAddItem({
          category: r.category || categories[0] || 'ทั่วไป',
          item: r.item,
          qty: r.qty,
          unit: r.unit,
          unitPrice: r.unitPrice,
        });
        ok++;
      } catch {
        // continue on individual row failure
      }
      setProgress(i + 1);
    }
    setImporting(false);
    setDone(true);
    setRows(null);
  };

  return (
    <div className="space-y-4">
      <div className="rounded-md border border-[var(--blueprint-dim)]/50 bg-[var(--bg-panel-raised)] p-4 text-xs text-[var(--text-muted)] leading-relaxed">
        รองรับไฟล์ .xlsx, .xls, .csv — แถวแรกต้องเป็นหัวตาราง โดยตั้งชื่อคอลัมน์ให้มีคำเหล่านี้อยู่ (ไทยหรืออังกฤษก็ได้): <br />
        <span className="text-[var(--text)]">หมวดหมู่, รายการสินค้า, จำนวน, หน่วย, ราคา/หน่วย</span>
      </div>

      <input
        type="file"
        accept=".xlsx,.xls,.csv"
        onChange={handleFile}
        className="block w-full text-sm text-[var(--text-muted)] file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:bg-[var(--blueprint)] file:text-[#04101f] file:font-semibold file:cursor-pointer"
      />

      {error && <p className="text-xs text-[var(--danger)]">{error}</p>}

      {rows && (
        <>
          <p className="text-sm">
            พบ <span className="text-[var(--amber)] font-semibold">{rows.length}</span> รายการในไฟล์ "{fileName}" — ตัวอย่าง 8 แถวแรก:
          </p>
          <div className="overflow-x-auto max-h-56 overflow-y-auto rounded-md border border-[var(--blueprint-dim)]/40">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-[var(--bg-panel-raised)]">
                <tr>
                  <th className="px-2 py-1.5 text-left">หมวดหมู่</th>
                  <th className="px-2 py-1.5 text-left">รายการสินค้า</th>
                  <th className="px-2 py-1.5 text-right">จำนวน</th>
                  <th className="px-2 py-1.5 text-left">หน่วย</th>
                  <th className="px-2 py-1.5 text-right">ราคา/หน่วย</th>
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 8).map((r, i) => (
                  <tr key={i} className="border-t border-[var(--blueprint-dim)]/20">
                    <td className="px-2 py-1.5 text-[var(--text-muted)]">{r.category || '—'}</td>
                    <td className="px-2 py-1.5">{r.item}</td>
                    <td className="px-2 py-1.5 text-right font-mono-num">{r.qty || '—'}</td>
                    <td className="px-2 py-1.5 text-[var(--text-muted)]">{r.unit || '—'}</td>
                    <td className="px-2 py-1.5 text-right font-mono-num">{r.unitPrice ? baht(r.unitPrice) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button
            onClick={runImport}
            disabled={importing}
            className="w-full bg-[var(--amber)] text-[#1a1200] font-semibold rounded-md px-4 py-3 text-sm hover:brightness-110 transition disabled:opacity-60"
          >
            {importing ? `กำลังนำเข้า ${progress}/${rows.length}...` : `นำเข้าทั้งหมด ${rows.length} รายการ`}
          </button>
        </>
      )}

      {done && <p className="text-sm text-[var(--success)]">นำเข้าข้อมูลเรียบร้อย ✓ ปิดหน้าต่างนี้เพื่อดูผลลัพธ์</p>}
    </div>
  );
}
