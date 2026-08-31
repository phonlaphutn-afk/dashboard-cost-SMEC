import { useMemo, useState } from 'react';
import { baht } from '../format';

export default function TransferHistory({ transfers }) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    if (!query.trim()) return transfers;
    const q = query.trim().toLowerCase();
    return transfers.filter(
      (t) =>
        String(t.item).toLowerCase().includes(q) ||
        String(t.fromProject).toLowerCase().includes(q) ||
        String(t.toProject).toLowerCase().includes(q) ||
        String(t.fromCategory).toLowerCase().includes(q) ||
        String(t.toCategory).toLowerCase().includes(q) ||
        String(t.note || '').toLowerCase().includes(q)
    );
  }, [transfers, query]);

  const totalValue = filtered.reduce((s, t) => s + (Number(t.value) || 0), 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <StatCard label="จำนวนครั้งที่โยกย้าย" value={filtered.length} />
        <StatCard label="มูลค่ารวมที่โยกย้าย" value={`${baht(totalValue)} ฿`} accent="amber" />
        <StatCard label="รายการทั้งหมดในประวัติ" value={transfers.length} />
      </div>

      <div className="rounded-lg border border-[var(--blueprint-dim)]/40 bg-[var(--bg-panel)]">
        <div className="p-4 border-b border-[var(--blueprint-dim)]/30">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ค้นหารายการ, โครงการต้นทาง/ปลายทาง, หมายเหตุ..."
            className="w-full bg-[var(--bg-panel-raised)] border border-[var(--blueprint-dim)]/50 rounded-md px-3 py-2 text-sm placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--blueprint)]"
          />
        </div>
        <div className="overflow-x-auto max-h-[560px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-[var(--bg-panel)] z-10">
              <tr className="border-b border-[var(--blueprint-dim)]/30">
                <th className="px-3 py-2 text-left text-[11px] uppercase tracking-wide text-[var(--text-muted)]">วันที่</th>
                <th className="px-3 py-2 text-left text-[11px] uppercase tracking-wide text-[var(--text-muted)]">รายการ</th>
                <th className="px-3 py-2 text-right text-[11px] uppercase tracking-wide text-[var(--text-muted)]">จำนวน</th>
                <th className="px-3 py-2 text-left text-[11px] uppercase tracking-wide text-[var(--text-muted)]">จาก</th>
                <th className="px-3 py-2 text-left text-[11px] uppercase tracking-wide text-[var(--text-muted)]">ไปที่</th>
                <th className="px-3 py-2 text-right text-[11px] uppercase tracking-wide text-[var(--text-muted)]">มูลค่า</th>
                <th className="px-3 py-2 text-left text-[11px] uppercase tracking-wide text-[var(--text-muted)]">หมายเหตุ</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => (
                <tr key={t.id} className="border-b border-[var(--blueprint-dim)]/15 hover:bg-[var(--bg-panel-raised)]/60">
                  <td className="px-3 py-2 text-[var(--text-muted)] whitespace-nowrap font-mono-num text-xs">
                    {t.timestamp ? new Date(t.timestamp).toLocaleString('th-TH') : '—'}
                  </td>
                  <td className="px-3 py-2">{t.item}</td>
                  <td className="px-3 py-2 text-right font-mono-num">
                    {t.qty} {t.unit}
                  </td>
                  <td className="px-3 py-2 text-[var(--text-muted)]">
                    {t.fromProject}
                    <span className="block text-xs">{t.fromCategory}</span>
                  </td>
                  <td className="px-3 py-2 text-[var(--text)]">
                    {t.toProject}
                    <span className="block text-xs text-[var(--text-muted)]">{t.toCategory}</span>
                  </td>
                  <td className="px-3 py-2 text-right font-mono-num text-[var(--amber)]">{baht(t.value)}</td>
                  <td className="px-3 py-2 text-[var(--text-muted)]">{t.note || '—'}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-3 py-10 text-center text-[var(--text-muted)]">
                    {transfers.length === 0 ? 'ยังไม่มีประวัติการโยกย้าย' : 'ไม่พบรายการที่ตรงกับการค้นหา'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
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
