import { useEffect, useMemo, useState } from 'react';
import seed from './data.json';
import * as api from './api';
import { baht } from './format';
import CategoryChart from './components/CategoryChart';
import ItemsTable from './components/ItemsTable';
import AddPanel from './components/AddPanel';
import Overview from './components/Overview';
import PrintReport from './components/PrintReport';
import { exportProjectToExcel, exportAllToExcel } from './utils/export';

export default function App() {
  const [allItems, setAllItems] = useState(seed.items);
  const [allSummary, setAllSummary] = useState(seed.summary);
  const [activeCategory, setActiveCategory] = useState(null);
  const [activeProject, setActiveProject] = useState(seed.summary[0]?.project || '');
  const [view, setView] = useState('overview'); // 'overview' | 'project'
  const [live, setLive] = useState(api.isLive());
  const [syncedAt, setSyncedAt] = useState(null);
  const [loading, setLoading] = useState(false);

  const refresh = async () => {
    if (!api.isLive()) return;
    setLoading(true);
    try {
      const data = await api.fetchAll();
      setAllItems(data.items || []);
      setAllSummary(data.summary || []);
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

  useEffect(() => {
    const projects = [...new Set(allSummary.map((s) => s.project))];
    if (projects.length && !projects.includes(activeProject)) {
      setActiveProject(projects[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allSummary]);

  const projects = useMemo(
    () => [...new Set(allSummary.map((s) => s.project))].sort((a, b) => a.localeCompare(b)),
    [allSummary]
  );

  const summary = useMemo(() => allSummary.filter((s) => s.project === activeProject), [allSummary, activeProject]);
  const items = useMemo(() => allItems.filter((i) => i.project === activeProject), [allItems, activeProject]);

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

  const categoryItems = useMemo(
    () => (activeCategory ? items.filter((i) => i.category === activeCategory) : items),
    [items, activeCategory]
  );
  const categoryTotal = useMemo(
    () => categoryItems.reduce((s, r) => s + (Number(r.total) || 0), 0),
    [categoryItems]
  );
  const categoryShare = grandTotal ? categoryTotal / grandTotal : 0;

  const recalcLocalSummary = (nextItems) => {
    const totals = {};
    let grand = 0;
    nextItems
      .filter((it) => it.project === activeProject)
      .forEach((it) => {
        totals[it.category] = (totals[it.category] || 0) + (Number(it.total) || 0);
        grand += Number(it.total) || 0;
      });
    setAllSummary((prev) =>
      prev.map((s) =>
        s.project === activeProject
          ? { ...s, total: totals[s.category] || 0, pct: grand ? (totals[s.category] || 0) / grand : 0 }
          : s
      )
    );
  };

  const handleAddItem = async (form) => {
    const qty = Number(form.qty) || 0;
    const unitPrice = Number(form.unitPrice) || 0;
    const total = qty * unitPrice;
    if (api.isLive()) {
      const res = await api.addItem({
        project: activeProject,
        category: form.category,
        item: form.item,
        qty,
        unit: form.unit,
        unitPrice,
      });
      await refresh();
      return res;
    }
    const nextItem = {
      id: Math.max(0, ...allItems.map((i) => i.id)) + 1,
      project: activeProject,
      category: form.category,
      item: form.item,
      qty,
      unit: form.unit,
      unitPrice,
      total,
    };
    const nextItems = [...allItems, nextItem];
    setAllItems(nextItems);
    recalcLocalSummary(nextItems);
  };

  const handleAddCategory = async (category) => {
    if (api.isLive()) {
      const res = await api.addCategory(activeProject, category);
      await refresh();
      return res;
    }
    setAllSummary((prev) => [
      ...prev,
      { project: activeProject, no: prev.filter((s) => s.project === activeProject).length + 1, category, total: 0, pct: 0 },
    ]);
  };

  const handleAddProject = async (projectName, firstCategory) => {
    if (api.isLive()) {
      const res = await api.addProject(projectName, firstCategory);
      await refresh();
      setActiveProject(projectName);
      setView('project');
      return res;
    }
    setAllSummary((prev) => [...prev, { project: projectName, no: 1, category: firstCategory || 'ทั่วไป', total: 0, pct: 0 }]);
    setActiveProject(projectName);
    setView('project');
  };

  const handleDelete = async (id) => {
    if (api.isLive()) {
      await api.deleteItem(id);
      await refresh();
      return;
    }
    const nextItems = allItems.filter((i) => i.id !== id);
    setAllItems(nextItems);
    recalcLocalSummary(nextItems);
  };

  const goToProject = (project) => {
    setActiveProject(project);
    setActiveCategory(null);
    setView('project');
  };

  const handleExportExcel = () => {
    if (view === 'overview') exportAllToExcel(allSummary, allItems);
    else exportProjectToExcel(activeProject, items, summary);
  };

  const handleExportPdf = () => window.print();

  return (
    <div className="min-h-screen">
      <header className="border-b border-[var(--blueprint-dim)]/40 bg-[var(--bg-panel)]/70 backdrop-blur sticky top-0 z-20 no-print">
        <div className="max-w-7xl mx-auto px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--blueprint)] font-semibold">
              SIAMMAC ENGINEERING &amp; CONSTRUCTION
            </p>
            <h1 className="text-lg sm:text-xl font-semibold">ต้นทุนโครงการเครื่องจักร</h1>
          </div>
          <div className="flex items-center gap-2 text-xs flex-wrap">
            <button
              onClick={() => setView('overview')}
              className={`px-3 py-1 rounded-full border text-xs ${
                view === 'overview'
                  ? 'border-[var(--amber)] text-[var(--amber)] bg-[var(--amber-dim)]/20'
                  : 'border-[var(--blueprint-dim)]/50 text-[var(--text-muted)] hover:text-[var(--text)]'
              }`}
            >
              ภาพรวมทุกโครงการ
            </button>
            <ProjectSelector
              projects={projects}
              activeProject={activeProject}
              setActiveProject={(p) => {
                setActiveProject(p);
                setActiveCategory(null);
                setView('project');
              }}
              onAddProject={handleAddProject}
            />
            <div className="flex items-center gap-1 border-l border-[var(--blueprint-dim)]/40 pl-2 ml-1">
              <button
                onClick={handleExportExcel}
                title="ส่งออกเป็น Excel"
                className="text-[var(--text-muted)] hover:text-[var(--text)] border border-[var(--blueprint-dim)]/50 rounded-full px-3 py-1"
              >
                Excel
              </button>
              <button
                onClick={handleExportPdf}
                title="พิมพ์ / บันทึกเป็น PDF"
                className="text-[var(--text-muted)] hover:text-[var(--text)] border border-[var(--blueprint-dim)]/50 rounded-full px-3 py-1"
              >
                PDF
              </button>
            </div>
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

      <main className="max-w-7xl mx-auto px-5 py-6 space-y-6 no-print">
        {view === 'overview' ? (
          <Overview allSummary={allSummary} allItems={allItems} onSelectProject={goToProject} />
        ) : (
          <>
            <div className="flex items-center gap-2 text-[var(--text-muted)] text-sm flex-wrap">
              <span className="text-[var(--blueprint)]">●</span>
              <span>
                กำลังดูโครงการ: <span className="text-[var(--text)] font-semibold">{activeProject || '—'}</span>
              </span>
              {activeCategory && (
                <>
                  <span className="text-[var(--blueprint-dim)]">/</span>
                  <span>
                    เครื่องจักร: <span className="text-[var(--amber)] font-semibold">{activeCategory}</span>
                  </span>
                  <button
                    onClick={() => setActiveCategory(null)}
                    className="text-[var(--amber)] hover:underline text-xs ml-1"
                  >
                    ดูทั้งโครงการ ×
                  </button>
                </>
              )}
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <StatCard
                label={activeCategory ? `ต้นทุนของ ${activeCategory}` : 'ต้นทุนรวมทั้งหมด'}
                value={`${baht(activeCategory ? categoryTotal : grandTotal)} ฿`}
                accent="amber"
              />
              <StatCard label="จำนวนรายการ" value={activeCategory ? categoryItems.length : itemCount} />
              {activeCategory ? (
                <StatCard label="สัดส่วนต่อโครงการ" value={`${(categoryShare * 100).toFixed(1)}%`} />
              ) : (
                <StatCard label="จำนวนหมวดหมู่ / เครื่องจักร" value={categoryCount} />
              )}
              {activeCategory ? (
                <StatCard
                  label="ราคาเฉลี่ยต่อรายการ"
                  value={`${baht(categoryItems.length ? categoryTotal / categoryItems.length : 0)} ฿`}
                />
              ) : (
                <StatCard
                  label="หมวดหมู่ต้นทุนสูงสุด"
                  value={topCategory ? topCategory.category : '—'}
                  sub={topCategory ? `${baht(topCategory.total)} ฿` : ''}
                />
              )}
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
          </>
        )}
      </main>

      <footer className="max-w-7xl mx-auto px-5 pb-8 pt-2 text-[11px] text-[var(--text-muted)] no-print">
        {syncedAt ? `ซิงค์ล่าสุด ${syncedAt.toLocaleString('th-TH')}` : 'ข้อมูลเริ่มต้นจากไฟล์ Excel ที่อัปโหลด'}
      </footer>

      <PrintReport
        scope={view}
        project={activeProject}
        summary={view === 'overview' ? allSummary : summary}
        items={view === 'overview' ? allItems : items}
      />
    </div>
  );
}

function ProjectSelector({ projects, activeProject, setActiveProject, onAddProject }) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    await onAddProject(name.trim());
    setName('');
    setAdding(false);
  };

  if (adding) {
    return (
      <form onSubmit={submit} className="flex items-center gap-1.5">
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="ชื่อโครงการใหม่"
          className="bg-[var(--bg-panel-raised)] border border-[var(--blueprint-dim)]/50 rounded-md px-2.5 py-1 text-xs w-40 focus:outline-none focus:ring-2 focus:ring-[var(--blueprint)]"
        />
        <button type="submit" className="text-[var(--success)] text-xs px-2 py-1">
          บันทึก
        </button>
        <button type="button" onClick={() => setAdding(false)} className="text-[var(--text-muted)] text-xs px-1">
          ×
        </button>
      </form>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <select
        value={activeProject}
        onChange={(e) => setActiveProject(e.target.value)}
        className="bg-[var(--bg-panel-raised)] border border-[var(--blueprint-dim)]/50 rounded-md px-2.5 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-[var(--blueprint)] max-w-[160px]"
      >
        {projects.map((p) => (
          <option key={p} value={p}>
            {p}
          </option>
        ))}
      </select>
      <button
        onClick={() => setAdding(true)}
        title="เพิ่มโครงการใหม่"
        className="text-[var(--blueprint)] border border-[var(--blueprint-dim)]/50 rounded-md w-6 h-6 flex items-center justify-center text-sm hover:bg-[var(--bg-panel-raised)]"
      >
        +
      </button>
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
