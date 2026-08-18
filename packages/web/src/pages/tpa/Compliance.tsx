import { useEffect, useState } from 'react';
import { apiRaw } from '@/lib/api';
import { cn } from '@/lib/utils';
import { PageHelp } from '@/components/PageHelp';
import { Download } from 'lucide-react';
import { downloadCsv, formatMoney } from '@/lib/sheet';

// apiRaw (camelCase passthrough) — this endpoint returns computed fields.
interface Row {
  participantId: number;
  firstName: string;
  lastName: string;
  status: string;
  employerName: string;
  planName: string;
  catchUpEligible: boolean;
  employeeDeferrals: string;
  totalContributions: string;
  deferralLimit: number;
  remaining: string;
  overLimit: boolean;
}
interface Report {
  year: number;
  limits: { deferral: number; catchUp: number; total: number };
  participants: Row[];
}

const YEARS = [2026, 2025, 2024];

export default function TpaCompliance() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    apiRaw
      .get<Report>(`/api/tpa/compliance?year=${year}`)
      .then(setReport)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load compliance report'))
      .finally(() => setLoading(false));
  }, [year]);

  const rows = report?.participants ?? [];
  const overCount = rows.filter((r) => r.overLimit).length;
  const totalDeferrals = rows.reduce((s, r) => s + parseFloat(r.employeeDeferrals), 0);

  function exportCsv() {
    downloadCsv(
      `compliance-${year}.csv`,
      ['Participant', 'Employer', 'Plan', 'Catch-Up Eligible', 'Employee Deferrals', 'Deferral Limit', 'Remaining', 'Over Limit'],
      rows.map((r) => [
        `${r.lastName}, ${r.firstName}`,
        r.employerName,
        r.planName,
        r.catchUpEligible ? 'Yes' : 'No',
        parseFloat(r.employeeDeferrals).toFixed(2),
        r.deferralLimit.toFixed(2),
        parseFloat(r.remaining).toFixed(2),
        r.overLimit ? 'YES' : '',
      ]),
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-primary-dark">
          TPA — Compliance
          {overCount > 0 && (
            <span className="ml-2 px-2 py-0.5 rounded-full text-sm bg-red-100 text-red-700 font-medium align-middle">
              {overCount} over limit
            </span>
          )}
        </h1>
        <div className="flex items-center gap-2">
          <select
            value={year}
            onChange={(e) => setYear(parseInt(e.target.value, 10))}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          <button
            onClick={exportCsv}
            className="flex items-center gap-2 border border-primary text-primary px-3 py-2 rounded-lg hover:bg-primary/5 transition text-sm font-medium"
          >
            <Download className="h-4 w-4" /> Export CSV
          </button>
        </div>
      </div>

      <PageHelp
        id="tpa-compliance"
        title="What lives on the Compliance page?"
        description="Elective deferral (402(g)) limit monitoring per participant, from the contributions recorded in remittance batches."
        tips={[
          'Deferrals count Employee Pre-Tax + Roth lines from batches whose pay date falls in the selected year.',
          'Participants with a birth date making them 50+ by year end automatically get the catch-up limit.',
          'Anyone highlighted red has exceeded their limit — stop deferrals and process a corrective distribution.',
          'Remember: the participant\'s limit is across ALL employers — this only sees what you administer.',
        ]}
      />

      {report && (
        <div className="text-sm text-gray-600 bg-white border border-sand-dark rounded-xl px-4 py-3">
          <span className="font-semibold text-primary-dark">{report.year} IRS limits:</span>{' '}
          elective deferral {formatMoney(report.limits.deferral)} · age-50 catch-up +{formatMoney(report.limits.catchUp)} ·
          total 415(c) {formatMoney(report.limits.total)}
        </div>
      )}

      {error && <div className="bg-coral-light text-coral p-3 rounded-lg text-sm">{error}</div>}

      <div className="bg-white rounded-xl shadow-sm border border-sand-dark overflow-x-auto">
        <table className="w-full text-sm min-w-[850px]">
          <thead>
            <tr className="border-b border-sand-dark bg-sand/50">
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Participant</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Plan</th>
              <th className="text-center px-4 py-3 font-semibold text-gray-600">Catch-Up</th>
              <th className="text-right px-4 py-3 font-semibold text-gray-600">Deferrals YTD</th>
              <th className="text-right px-4 py-3 font-semibold text-gray-600">Limit</th>
              <th className="text-right px-4 py-3 font-semibold text-gray-600">Remaining</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="text-center py-8 text-gray-400">Loading…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-8 text-gray-400">No participants yet</td></tr>
            ) : (
              rows.map((r) => (
                <tr
                  key={r.participantId}
                  className={cn('border-b border-sand-dark/50', r.overLimit ? 'bg-red-50' : 'hover:bg-sand/30')}
                >
                  <td className="px-4 py-3 font-medium text-primary-dark">{r.lastName}, {r.firstName}</td>
                  <td className="px-4 py-3 text-gray-600">{r.employerName} — {r.planName}</td>
                  <td className="px-4 py-3 text-center text-gray-600">{r.catchUpEligible ? 'Yes' : '—'}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatMoney(parseFloat(r.employeeDeferrals))}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-gray-600">{formatMoney(r.deferralLimit)}</td>
                  <td className={cn('px-4 py-3 text-right tabular-nums font-medium', r.overLimit ? 'text-red-600' : 'text-gray-700')}>
                    {r.overLimit ? `OVER by ${formatMoney(-parseFloat(r.remaining))}` : formatMoney(parseFloat(r.remaining))}
                  </td>
                </tr>
              ))
            )}
          </tbody>
          <tfoot>
            <tr className="bg-sand/50 border-t border-sand-dark">
              <td colSpan={3} className="px-4 py-3 font-semibold text-primary-dark">
                {rows.length} participant{rows.length === 1 ? '' : 's'}
              </td>
              <td className="px-4 py-3 text-right font-bold text-primary-dark tabular-nums">{formatMoney(totalDeferrals)}</td>
              <td colSpan={2}></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
