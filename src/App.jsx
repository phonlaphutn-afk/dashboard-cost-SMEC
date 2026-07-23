import { useEffect, useMemo, useState } from 'react';
import seed from './data.json';
import * as api from './api';
import { baht } from './format';
import CategoryChart from './components/CategoryChart';
import ItemsTable from './components/ItemsTable';
import AddPanel from './components/AddPanel';

export default function App() {
  const [items, setItems] = useState(seed.items);
  const [summary, setSummary] = useState(seed.summary);
  const [activeCategory, setActiveCategory] = useState(null);
  const [live, setLive] = useState(api.isLive());
  const [syncedAt, setSyncedAt] = useState(null);
  const [loading, setLoading] = useState(false);

  const refresh = async () => {
    if (!api.isLive()) return;
    setLoading(true);
    try {
      const data = await api.fetchAll();
      setItems(data.items || []);
      setSummary(data.summary || []);
      setSyncedAt(new Date());
      setLive(true);
    } catch (err) {
      setLive(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const categories = useMemo(
    () => [...new Set(summary.map((s) => s.category))].sort((a, b) => a.localeCompare(b)),
    [summary]
  );

  const grandTotal = useMemo(() => items.reduce((s, r) => s + (Number(r.total) || 0), 0), [items]);
  const itemCount = items.length;
  const categoryCount = categories.length;
  const topCategory = useMemo(() => {
    const s = [...summary].sort((a, b) => Number(b.total) - Number(a.total))[0];
    return s;
  }, [summary]);

  const recalcLocalSummary = (nextItems) => {
    const totals = {};
    let grand = 0;
    nextItems.forEach((it) => {
      totals[it.category] = (totals[it.category] || 0) + (Number(it.total) || 0);
      grand += Number(it.total) || 0;
    });
    setSummary((prev) =>
      prev.map((s) => ({
        ...s,
        total: totals[s.category] || 0,
        pct: grand ? (totals[s.category] || 0) / grand : 0,
      }))
    );
  };

  const handleAddItem = async (form) => {
    const qty = Number(form.qty) || 0;
    const unitPrice = Number(form.unitPrice) || 0;
    const total = qty * unitPrice;
    if (api.isLive()) {
      const res = await api.addItem({ category: form.category, item: form.item, qty, unit: form.unit, unitPrice });
      await refresh();
      return res;
    }
    const nextItem = {
      id: Math.max(0, ...items.map((i) => i.id)) + 1,
      category: form.category,
      item: form.item,
      qty,
      unit: form.unit,
      unitPrice,
      total,
    };
    const nextItems = [...items, nextItem];
    setItems(nextItems);
    recalcLocalSummary(nextItems);
  };

  const handleAddCategory = async (category) => {
    if (api.isLive()) {
      const res = await api.addCategory(category);
      await refresh();
      return res;
    }
    setSummary((prev) => [...prev, { no: prev.length + 1, category, total: 0, pct: 0 }]);
  };

  const handleDelete = async (id) => {
    if (api.isLive()) {
      await api.deleteItem(id);
      await refresh();
      return;
    }
    const nextItems = items.filter((i) => i.id !== id);
    setItems(nextItems);
    recalcLocalSummary(nextItems);
  };

  return (
    <div className="min-h-screen">
      <header className="border-b border-[var(--blueprint-dim)]/40 bg-[var(--bg-panel)]/70 backdrop-blur sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--blueprint)] font-semibold">
              SIAMMAC ENGINEERING &amp; CONSTRUCTION
            </p>
            <h1 className="text-lg sm:text-xl font-semibold">ต้นทุนโครงการเครื่องจักร — เกรทเทสท์ อยุธยา</h1>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border ${
                live
                  ? 'border-[var(--success)]/50 text-[var(--success)]'
                  : 'border-[var(--amber)]/50 text-[var(--amber)]'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${live ? 'bg-[var(--success)]' : 'bg-[var(--amber)]'}`} />
              {loading ? 'กำลังซิงค์...' : live ? 'เชื่อมต่อ Google Sheet' : 'โหมดออฟไลน์ (ยังไม่เชื่อมต่อ)'}
            </span>
            {live && (
              <button
                onClick={refresh}
                className="text-[var(--text-muted)] hover:text-[var(--text)] border border-[var(--blueprint-dim)]/50 rounded-full px-3 py-1"
              >
                รีเฟรช
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-5 py-6 space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard label="ต้นทุนรวมทั้งหมด" value={`${baht(grandTotal)} ฿`} accent="amber" />
          <StatCard label="จำนวนรายการ" value={itemCount} />
          <StatCard label="จำนวนหมวดหมู่ / เครื่องจักร" value={categoryCount} />
          <StatCard
            label="หมวดหมู่ต้นทุนสูงสุด"
            value={topCategory ? topCategory.category : '—'}
            sub={topCategory ? `${baht(topCategory.total)} ฿` : ''}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <CategoryChart summary={summary} onSelect={setActiveCategory} activeCategory={activeCategory} />
            <AddPanel
              categories={categories}
              onAddItem={handleAddItem}
              onAddCategory={handleAddCategory}
              isLive={live}
            />
          </div>
          <div className="lg:col-span-3">
            <ItemsTable
              items={items}
              categories={categories}
              activeCategory={activeCategory}
              setActiveCategory={setActiveCategory}
              onDelete={handleDelete}
              canWrite
            />
          </div>
        </div>
      </main>

      <footer className="max-w-7xl mx-auto px-5 pb-8 pt-2 text-[11px] text-[var(--text-muted)]">
        {syncedAt ? `ซิงค์ล่าสุด ${syncedAt.toLocaleString('th-TH')}` : 'ข้อมูลเริ่มต้นจากไฟล์ Excel ที่อัปโหลด'}
      </footer>
    </div>
  );
}

function StatCard({ label, value, sub, accent }) {
  return (
    <div className="rounded-lg border border-[var(--blueprint-dim)]/40 bg-[var(--bg-panel)] p-4">
      <p className="text-[11px] uppercase tracking-wide text-[var(--text-muted)] mb-1 truncate">{label}</p>
      <p
        className={`text-xl font-semibold font-mono-num truncate ${accent === 'amber' ? 'text-[var(--amber)]' : 'text-[var(--text)]'}`}
      >
        {value}
      </p>
      {sub && <p className="text-xs text-[var(--text-muted)] font-mono-num truncate">{sub}</p>}
    </div>
  );
}
