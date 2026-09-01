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
  const { groupList, ungroupedProjects, projectGroupMap } = useMemo(() => {
    const map = {}; // group -> Set(project)
    const groupOf = {}; // project -> group
    allSummary.forEach((s) => {
      if (!s.group) return;
      if (!map[s.group]) map[s.group] = new Set();
      map[s.group].add(s.project);
      if (!groupOf[s.project]) groupOf[s.project] = s.group;
    });
    const groups = Object.entries(map)
      .map(([name, set]) => ({ name, projects: [...set].filter((p) => projects.includes(p)) }))
      .filter((g) => g.projects.length)
      .sort((a, b) => a.name.localeCompare(b.name));
    const ungrouped = projects.filter((p) => !groupOf[p]);
    return { groupList: groups, ungroupedProjects: ungrouped, projectGroupMap: groupOf };
  }, [allSummary, projects]);

  const [presets, setPresets] = useState([]);
  const [savingName, setSavingName] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [editingGroupFor, setEditingGroupFor] = useState(null);
  const [groupInput, setGroupInput] = useState('');
  const [expandedGroups, setExpandedGroups] = useState({}); // group name -> bool, collapsed by default
  const [showAllUngrouped, setShowAllUngrouped] = useState(false);

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

  // A group is "on" once every one of its member projects is selected
  const isGroupSelected = (group) => group.projects.every((p) => selected.includes(p));
  const toggleGroup = (group) => {
    if (isGroupSelected(group)) {
      setSelected((prev) => prev.filter((p) => !group.projects.includes(p)));
    } else {
      setSelected((prev) => [...new Set([...prev, ...group.projects])]);
    }
  };
  const toggleExpanded = (name) => setExpandedGroups((prev) => ({ ...prev, [name]: !prev[name] }));

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

  const visibleUngrouped = showAllUngrouped ? ungroupedProjects : ungroupedProjects.slice(0, 10);

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

        {/* Groups collapse to one row each so this stays usable with many groups —
            click the row to select/deselect the whole group, click the arrow to peek
            inside and toggle individual projects within it. */}
        {groupList.length > 0 && (
          <div className="space-y-1.5 mb-2">
            {groupList.map((g) => {
              const on = isGroupSelected(g);
              const expanded = !!expandedGroups[g.name];
              const partiallyOn = !on && g.projects.some((p) => selected.includes(p));
              return (
                <div key={g.name} className="rounded-md border border-[var(--blueprint-dim)]/40 overflow-hidden">
                  <div
                    className={`flex items-center gap-2 px-3 py-2 cursor-pointer ${
                      on ? 'bg-[var(--success)]/15' : partiallyOn ? 'bg-[var(--amber-dim)]/10' : 'bg-[var(--bg-panel-raised)]'
                    }`}
                    onClick={() => toggleGroup(g)}
                  >
                    <span
                      className={`w-4 h-4 rounded flex items-center justify-center text-[10px] border shrink-0 ${
                        on
                          ? 'bg-[var(--success)] border-[var(--success)] text-[#04150e]'
                          : partiallyOn
                          ? 'border-[var(--amber)] text-[var(--amber)]'
                          : 'border-[var(--blueprint-dim)]/60 text-transparent'
                      }`}
                    >
                      {on ? '✓' : partiallyOn ? '–' : ''}
                    </span>
                    <span className={`text-sm font-semibold flex-1 ${on ? 'text-[var(--success)]' : 'text-[var(--text)]'}`}>
                      🏷️ {g.name}
                    </span>
                    <span className="text-xs text-[var(--text-muted)]">{g.projects.length} โครงการ</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleExpanded(g.name);
                      }}
                      className="text-xs text-[var(--text-muted)] hover:text-[var(--text)] w-5 h-5 flex items-center justify-center"
                      title={expanded ? 'ย่อ' : 'ดูรายชื่อโครงการในกลุ่ม'}
                    >
                      {expanded ? '▲' : '▼'}
                    </button>
                  </div>
                  {expanded && (
                    <div className="p-2.5 bg-[var(--bg-panel)] space-y-1">
                      {g.projects.map((p) => (
                        <div key={p} className="flex items-center justify-between gap-2 text-xs px-2 py-1 rounded hover:bg-[var(--bg-panel-raised)]">
                          <button
                            onClick={() => toggleProject(p)}
                            className={`flex-1 text-left truncate ${selected.includes(p) ? 'text-[var(--amber)] font-medium' : 'text-[var(--text-muted)]'}`}
                          >
                            {selected.includes(p) ? '● ' : '○ '}
                            {p}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Ungrouped projects: still a flat chip list (assign them a group above to tidy this up) */}
        {ungroupedProjects.length > 0 && (
          <div className={groupList.length > 0 ? 'pt-3 mt-1 border-t border-[var(--blueprint-dim)]/30' : ''}>
            {groupList.length > 0 && (
              <p className="text-xs text-[var(--text-muted)] mb-2">โครงการที่ยังไม่มีกลุ่ม</p>
            )}
            <div className="flex flex-wrap gap-2">
              {visibleUngrouped.map((p) => (
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
              {ungroupedProjects.length > 10 && (
                <button
                  onClick={() => setShowAllUngrouped((v) => !v)}
                  className="px-3 py-1.5 text-xs rounded-full border border-[var(--blueprint-dim)]/50 text-[var(--blueprint)] hover:bg-[var(--bg-panel-raised)]"
                >
                  {showAllUngrouped ? 'ย่อ' : `+${ungroupedProjects.length - 10} เพิ่มเติม`}
                </button>
              )}
            </div>
          </div>
        )}

        {selected.length === 0 && (
          <p className="text-xs text-[var(--danger)] mt-2">ยังไม่ได้เลือกโครงการ — เลือกอย่างน้อย 1 โครงการเพื่อดูรายงาน</p>
        )}

        {/* Saved project-group presets: for ad-hoc combos that don't match an official Sheet group */}
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
        <StatCard label={`ต้นทุนรวม (${selected.length} โครงการที่เลือก)`} value={`${baht(grandTotal)} ฿`} accent="amber" icon="💰" />
        <StatCard label="จำนวนโครงการที่เลือก" value={projectTotals.length} icon="🗂️" />
        <StatCard label="จำนวนรายการรวม" value={totalItems} icon="📦" />
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

function StatCard({ label, value, accent, icon }) {
  const accentColor = accent === 'amber' ? 'var(--amber)' : 'var(--blueprint)';
  return (
    <div className="rounded-xl border border-[var(--blueprint-dim)]/40 bg-[var(--bg-panel)] p-4 flex items-start gap-3">
      {icon && (
        <span
          className="w-9 h-9 rounded-lg flex items-center justify-center text-base shrink-0"
          style={{ background: `${accentColor}1f`, color: accentColor }}
        >
          {icon}
        </span>
      )}
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-wide text-[var(--text-muted)] mb-1 truncate">{label}</p>
        <p
          className={`text-xl font-semibold font-mono-num truncate ${accent === 'amber' ? 'text-[var(--amber)]' : 'text-[var(--text)]'}`}
        >
          {value}
        </p>
      </div>
    </div>
  );
}