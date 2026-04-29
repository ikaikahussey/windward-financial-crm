import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import type { PipelineStage } from '@/types';
import { Calendar, TrendingUp, Users, DollarSign } from 'lucide-react';
import { PageHelp } from '@/components/PageHelp';

interface ReportData {
  pipeline_funnel: { stage: PipelineStage; label: string; count: number }[];
  lead_sources: { source: string; count: number; converted: number }[];
  agent_activity: { agent_name: string; contacts: number; calls: number; appointments: number; closed: number }[];
  revenue_pipeline: { stage: string; count: number; estimated_value: number }[];
}

const STAGE_LABELS: Record<PipelineStage, string> = {
  'New Lead': 'New Lead',
  'Contacted': 'Contacted',
  'Consultation Scheduled': 'Consultation Scheduled',
  'Consultation Completed': 'Consultation Completed',
  'Proposal Sent': 'Proposal Sent',
  'Application Submitted': 'Application Submitted',
  'Policy Issued': 'Policy Issued',
  'Active Client': 'Active Client',
  'Lost / Not Now': 'Lost / Not Now',
};

const STAGE_COLORS: Record<string, string> = {
  'New Lead': 'bg-blue-500',
  'Contacted': 'bg-sky-500',
  'Consultation Scheduled': 'bg-indigo-500',
  'Consultation Completed': 'bg-violet-500',
  'Proposal Sent': 'bg-amber-500',
  'Application Submitted': 'bg-orange-500',
  'Policy Issued': 'bg-emerald-500',
  'Active Client': 'bg-green-500',
  'Lost / Not Now': 'bg-gray-500',
};

export default function Reports() {
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  function loadReports() {
    const params = new URLSearchParams();
    if (dateFrom) params.set('from', dateFrom);
    if (dateTo) params.set('to', dateTo);

    api
      .get<ReportData>(`/api/reports?${params}`)
      .then((d) => setData(d))
      .catch(() => {
        // Use dashboard stats as fallback
        api.get<any>('/api/dashboard/stats').then((stats) => {
          if (stats?.by_stage) {
            const funnel = Object.entries(stats.by_stage).map(([stage, count]) => ({
              stage: stage as PipelineStage,
              label: STAGE_LABELS[stage as PipelineStage] || stage,
              count: count as number,
            }));
            setData({
              pipeline_funnel: funnel,
              lead_sources: [],
              agent_activity: [],
              revenue_pipeline: [],
            });
          }
        }).catch(() => {});
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => { loadReports(); }, [dateFrom, dateTo]);

  if (loading) return <div className="animate-pulse text-primary">Loading reports...</div>;

  const maxFunnelCount = Math.max(1, ...(data?.pipeline_funnel?.map((s) => s.count) || [1]));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-primary-dark">Reports</h1>
        <div className="flex items-center gap-3">
          <Calendar className="h-4 w-4 text-gray-400" />
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white"
            placeholder="From"
          />
          <span className="text-gray-400">to</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white"
            placeholder="To"
          />
        </div>
      </div>

      <PageHelp
        id="reports"
        title="What are Reports?"
        description="Executive view of pipeline funnel, lead sources, agent activity, and revenue. Useful for weekly reviews."
        tips={[
          'Filter by date range using the From/To pickers in the header.',
          'The Pipeline Funnel shows conversion volume from New Lead through Active Client.',
          'Lead Sources compares total volume vs converted count per source — use this to decide where to invest more.',
          'Agent Activity shows calls, appointments, and closes per agent over the selected window.',
        ]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pipeline Funnel */}
        <div className="bg-white rounded-xl shadow-sm border border-sand-dark p-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold text-primary-dark">Pipeline Funnel</h2>
          </div>
          <div className="space-y-3">
            {(data?.pipeline_funnel || []).map((stage) => (
              <div key={stage.stage}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-gray-700">{stage.label}</span>
                  <span className="font-semibold text-primary-dark">{stage.count}</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-6">
                  <div
                    className={cn('h-6 rounded-full transition-all', STAGE_COLORS[stage.stage] || 'bg-primary')}
                    style={{ width: `${Math.max(2, (stage.count / maxFunnelCount) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
            {(!data?.pipeline_funnel || data.pipeline_funnel.length === 0) && (
              <p className="text-sm text-gray-400">No pipeline data available</p>
            )}
          </div>
        </div>

        {/* Lead Sources */}
        <div className="bg-white rounded-xl shadow-sm border border-sand-dark p-6">
          <div className="flex items-center gap-2 mb-4">
            <Users className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold text-primary-dark">Lead Sources</h2>
          </div>
          {(data?.lead_sources || []).length === 0 ? (
            <p className="text-sm text-gray-400">No lead source data available</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-sand-dark">
                  <th className="text-left py-2 font-semibold text-gray-600">Source</th>
                  <th className="text-right py-2 font-semibold text-gray-600">Leads</th>
                  <th className="text-right py-2 font-semibold text-gray-600">Converted</th>
                  <th className="text-right py-2 font-semibold text-gray-600">Rate</th>
                </tr>
              </thead>
              <tbody>
                {data?.lead_sources.map((src) => (
                  <tr key={src.source} className="border-b border-sand-dark/50">
                    <td className="py-2 capitalize">{src.source || 'Unknown'}</td>
                    <td className="py-2 text-right">{src.count}</td>
                    <td className="py-2 text-right">{src.converted}</td>
                    <td className="py-2 text-right font-medium text-primary">
                      {src.count > 0 ? `${Math.round((src.converted / src.count) * 100)}%` : '0%'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Agent Activity */}
        <div className="bg-white rounded-xl shadow-sm border border-sand-dark p-6">
          <div className="flex items-center gap-2 mb-4">
            <Users className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold text-primary-dark">Agent Activity</h2>
          </div>
          {(data?.agent_activity || []).length === 0 ? (
            <p className="text-sm text-gray-400">No agent activity data available</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-sand-dark">
                  <th className="text-left py-2 font-semibold text-gray-600">Agent</th>
                  <th className="text-right py-2 font-semibold text-gray-600">Contacts</th>
                  <th className="text-right py-2 font-semibold text-gray-600">Calls</th>
                  <th className="text-right py-2 font-semibold text-gray-600">Appts</th>
                  <th className="text-right py-2 font-semibold text-gray-600">Closed</th>
                </tr>
              </thead>
              <tbody>
                {data?.agent_activity.map((agent) => (
                  <tr key={agent.agent_name} className="border-b border-sand-dark/50">
                    <td className="py-2 font-medium">{agent.agent_name}</td>
                    <td className="py-2 text-right">{agent.contacts}</td>
                    <td className="py-2 text-right">{agent.calls}</td>
                    <td className="py-2 text-right">{agent.appointments}</td>
                    <td className="py-2 text-right text-green-600 font-medium">{agent.closed}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Revenue Pipeline */}
        <div className="bg-white rounded-xl shadow-sm border border-sand-dark p-6">
          <div className="flex items-center gap-2 mb-4">
            <DollarSign className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold text-primary-dark">Revenue Pipeline</h2>
          </div>
          {(data?.revenue_pipeline || []).length === 0 ? (
            <p className="text-sm text-gray-400">No revenue data available</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-sand-dark">
                  <th className="text-left py-2 font-semibold text-gray-600">Stage</th>
                  <th className="text-right py-2 font-semibold text-gray-600">Count</th>
                  <th className="text-right py-2 font-semibold text-gray-600">Est. Value</th>
                </tr>
              </thead>
              <tbody>
                {data?.revenue_pipeline.map((row) => (
                  <tr key={row.stage} className="border-b border-sand-dark/50">
                    <td className="py-2 capitalize">{row.stage.replace('_', ' ')}</td>
                    <td className="py-2 text-right">{row.count}</td>
                    <td className="py-2 text-right font-medium text-primary">${row.estimated_value.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
