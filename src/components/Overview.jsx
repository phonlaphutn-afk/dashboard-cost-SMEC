import { useEffect, useMemo, useState } from 'react';
import { baht } from '../format';

const PRESETS_KEY = 'costDashboard_projectGroups';

function loadPresets() {
  try {
    const raw = localStorage.getItem(PRESETS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function savePresets(presets) {
  try {
    localStorage.setItem(PRESETS_KEY, JSON.stringify(presets));
  } catch {
    // ignore storage errors (e.g. private browsing)
  }
}

export default function Overview({ allSummary, allItems, projects, selected, setSelected, onSelectProject, onSetProjectGroup }) {
  const filteredSummary = useMemo(() => allSummary.filter((s) => selected.includes(s.project)), [allSummary, selected]);
  const filteredItems = useMemo(() => allItems.filter((i) => selected.includes(i.project)), [allItems, selected]);

  // Groups defined in the Sheet's "กลุ่มโครงการหลัก (Group)" column — e.g. every
  // sub-project of the same real job (Greatest, etc.) tagged with the same group name.
  // Shared across every device/browser since it lives in the Sheet, not localStorage.
  const sheetGroups = useMemo(() => {
    const map = {};
    allSummary.forEach((s) => {
      if (!s.group) return;
      if (!map[s.group]) map[s.group] = new Set();
      map[s.group].add(s.project);
    });
    return Object.entries(map)
      .map(([name, set]) => ({ name, projects: [...set] }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [allSummary]);

  const [presets, setPresets] = useState([]);
  const [savingName, setSavingName] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [editingGroupFor, setEditingGroupFor] = useState(null);
  const [groupInput, setGroupInput] = useState('');

  // Current group (if any) already set for each project, so the edit box opens pre-filled
  const projectGroupMap = useMemo(() => {
    const map = {};
    allSummary.forEach((s) => {
      if (s.group && !map[s.project]) map[s.project] = s.group;
    });
    return map;
  }, [allSummary]);

  const startEditGroup = (project, e) => {
    e.stopPropagation();
    setEditingGroupFor(project);
    setGroupInput(projectGroupMap[project] || '');
  };

  const saveGroup = async (project, e) => {
    e.stopPropagation();
    if (!onSetProjectGroup) return;
    await onSetProjectGroup(project, groupInput.trim());
    setEditingGroupFor(null);
  };

  useEffect(() => {
    setPresets(loadPresets());
  }, []);

  const projectTotals = useMemo(() => {
    const totals = {};
    const counts = {};
    filteredSummary.forEach((s) => {
      totals[s.project] = (totals[s.project] || 0) + (Number(s.total) || 0);
    });
    filteredItems.forEach((it) => {
      counts[it.project] = (counts[it.project] || 0) + 1;
    });
    return Object.keys(totals)
      .map((project) => ({ project, total: totals[project], items: counts[project] || 0 }))
      .sort((a, b) => b.total - a.total);
  }, [filteredSummary, filteredItems]);

  const grandTotal = projectTotals.reduce((s, p) => s + p.total, 0);
  const max = Math.max(...projectTotals.map((p) => p.total), 1);
  const totalItems = filteredItems.length;

  const toggleProject = (p) => {
    setSelected((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]));
  };

  const allSelected = selected.length === projects.length;

  const applyPreset = (preset) => {
    // Only keep projects that still exist, in case one was renamed/removed since saving
    setSelected(preset.projects.filter((p) => projects.includes(p)));
  };

  const saveCurrentAsPreset = () => {
    const name = newGroupName.trim();
    if (!name || !selected.length) return;
    const next = [...presets.filter((p) => p.name !== name), { name, projects: selected }];
    setPresets(next);
    savePresets(next);
    setNewGroupName('');
    setSavingName(false);
  };

  const deletePreset = (name) => {
    const next = presets.filter((p) => p.name !== name);
    setPresets(next);
    savePresets(next);
  };

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-[var(--blueprint-dim)]/40 bg-[var(--bg-panel)] p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold tracking-wide uppercase">เลือกโครงการที่จะรวมในรายงาน</h2>
          <button
            onClick={() => setSelected(allSelected ? [] : projects)}
            className="text-xs text-[var(--amber)] hover:underline"
          >
            {allSelected ? 'ล้างทั้งหมด' : 'เลือกทั้งหมด'}
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {projects.map((p) => (
            <button
              key={p}
              onClick={() => toggleProject(p)}
              className={`px-3 py-1.5 text-xs rounded-full border ${
                selected.includes(p)
                  ? 'bg-[var(--amber)] text-[#1a1200] border-[var(--amber)] font-semibold'
                  : 'border-[var(--blueprint-dim)]/50 text-[var(--text-muted)] hover:text-[var(--text)]'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
        {selected.length === 0 && (
          <p className="text-xs text-[var(--danger)] mt-2">ยังไม่ได้เลือกโครงการ — เลือกอย่างน้อย 1 โครงการเพื่อดูรายงาน</p>
        )}

        {/* Groups defined directly in the Google Sheet — shared across every device */}
        {sheetGroups.length > 0 && (
          <div className="mt-4 pt-4 border-t border-[var(--blueprint-dim)]/30">
            <h3 className="text-xs font-semibold tracking-wide uppercase text-[var(--text-muted)] mb-2">
              กลุ่มโครงการ (จากชีต)
            </h3>
            <div className="flex flex-wrap gap-2">
              {sheetGroups.map((g) => (
                <button
                  key={g.name}
                  onClick={() => setSelected(g.projects.filter((p) => projects.includes(p)))}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-full border border-[var(--success)]/50 text-[var(--success)] hover:bg-[var(--bg-panel-raised)] font-semibold"
                >
                  🏷️ {g.name} <span className="text-[var(--text-muted)] font-normal">({g.projects.length})</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Saved project-group presets: click once to re-apply a combination instead of
            re-selecting the same set of chips every time (e.g. every "Greatest" job that
            got split across several project names). */}
        <div className="mt-4 pt-4 border-t border-[var(--blueprint-dim)]/30">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-semibold tracking-wide uppercase text-[var(--text-muted)]">
              กลุ่มที่บันทึกไว้เอง (เฉพาะเครื่องนี้)
            </h3>
            {!savingName ? (
              <button
                onClick={() => setSavingName(true)}
                disabled={!selected.length}
                className="text-xs text-[var(--blueprint)] hover:underline disabled:opacity-40 disabled:cursor-not-allowed"
              >
                + บันทึกตัวที่เลือกเป็นกลุ่ม
              </button>
            ) : (
              <div className="flex items-center gap-1.5">
                <input
                  autoFocus
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && saveCurrentAsPreset()}
                  placeholder="ชื่อกลุ่ม เช่น Greatest รวม"
                  className="bg-[var(--bg-panel-raised)] border border-[var(--blueprint-dim)]/50 rounded-md px-2.5 py-1 text-xs w-52 focus:outline-none focus:ring-2 focus:ring-[var(--blueprint)]"
                />
                <button onClick={saveCurrentAsPreset} className="text-[var(--success)] text-xs px-2 py-1">
                  บันทึก
                </button>
                <button
                  onClick={() => {
                    setSavingName(false);
                    setNewGroupName('');
                  }}
                  className="text-[var(--text-muted)] text-xs px-1"
                >
                  ×
                </button>
              </div>
            )}
          </div>

          {presets.length === 0 ? (
            <p className="text-xs text-[var(--text-muted)]">
              ยังไม่มีกลุ่มที่บันทึกไว้ — เลือกโครงการที่ต้องการรวมกันด้านบน แล้วกด "บันทึกตัวที่เลือกเป็นกลุ่ม"
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {presets.map((preset) => (
                <span
                  key={preset.name}
                  className="inline-flex items-center gap-1.5 pl-3 pr-1.5 py-1.5 text-xs rounded-full border border-[var(--blueprint)]/50 text-[var(--blueprint)] hover:bg-[var(--bg-panel-raised)]"
                >
                  <button onClick={() => applyPreset(preset)} className="font-semibold">
                    📁 {preset.name} <span className="text-[var(--text-muted)] font-normal">({preset.projects.length})</span>
                  </button>
                  <button
                    onClick={() => deletePreset(preset.name)}
                    title="ลบกลุ่มนี้"
                    className="text-[var(--text-muted)] hover:text-[var(--danger)] w-4 h-4 flex items-center justify-center"
                  >
                    ✕
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <StatCard label={`ต้นทุนรวม (${selected.length} โครงการที่เลือก)`} value={`${baht(grandTotal)} ฿`} accent="amber" />
        <StatCard label="จำนวนโครงการที่เลือก" value={projectTotals.length} />
        <StatCard label="จำนวนรายการรวม" value={totalItems} />
      </div>

      <div className="rounded-lg border border-[var(--blueprint-dim)]/40 bg-[var(--bg-panel)] p-5">
        <h2 className="text-sm font-semibold tracking-wide uppercase mb-4">
          เปรียบเทียบต้นทุนแต่ละโครงการ <span className="text-[var(--text-muted)] normal-case">(คลิกเพื่อดูรายละเอียด)</span>
        </h2>
        <div className="space-y-3">
          {projectTotals.map((p) => {
            const w = (p.total / max) * 100;
            const currentGroup = projectGroupMap[p.project];
            return (
              <div key={p.project} className="group">
                <div className="flex justify-between items-center text-sm mb-1 gap-2">
                  <button onClick={() => onSelectProject(p.project)} className="flex-1 text-left flex items-center gap-2 min-w-0">
                    <span className="text-[var(--text)] group-hover:text-[var(--amber)] font-medium truncate">
                      {p.project}
                    </span>
                    {currentGroup && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--success)]/15 text-[var(--success)] whitespace-nowrap">
                        🏷️ {currentGroup}
                      </span>
                    )}
                  </button>
                  {onSetProjectGroup &&
                    (editingGroupFor === p.project ? (
                      <span className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <input
                          autoFocus
                          value={groupInput}
                          onChange={(e) => setGroupInput(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && saveGroup(p.project, e)}
                          placeholder="ชื่อกลุ่ม"
                          className="bg-[var(--bg-panel-raised)] border border-[var(--blueprint-dim)]/50 rounded-md px-2 py-0.5 text-xs w-24 focus:outline-none focus:ring-1 focus:ring-[var(--blueprint)]"
                        />
                        <button onClick={(e) => saveGroup(p.project, e)} className="text-[var(--success)] text-xs px-1">
                          ✓
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingGroupFor(null);
                          }}
                          className="text-[var(--text-muted)] text-xs px-1"
                        >
                          ×
                        </button>
                      </span>
                    ) : (
                      <button
                        onClick={(e) => startEditGroup(p.project, e)}
                        className="text-[10px] text-[var(--text-muted)] hover:text-[var(--blueprint)] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        {currentGroup ? 'แก้กลุ่ม' : '+ ตั้งกลุ่ม'}
                      </button>
                    ))}
                  <span className="font-mono-num text-[var(--text-muted)] whitespace-nowrap">
                    {baht(p.total)} ฿ <span className="text-[var(--text-muted)]">· {p.items} รายการ</span>
                  </span>
                </div>
                <button onClick={() => onSelectProject(p.project)} className="w-full text-left">
                  <div className="h-3 rounded-full bg-[var(--bg-panel-raised)] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[var(--blueprint-dim)] to-[var(--blueprint)] group-hover:from-[var(--amber-dim)] group-hover:to-[var(--amber)] transition-all"
                      style={{ width: `${Math.max(w, 1.5)}%` }}
                    />
                  </div>
                </button>
              </div>
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