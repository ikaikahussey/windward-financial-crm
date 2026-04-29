import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import type { DashboardStats, Activity, Task, PipelineStage, Contact } from '@/types';
import {
  Users,
  CheckSquare,
  AlertTriangle,
  Calendar,
  Clock,
  ArrowRight,
  GripVertical,
} from 'lucide-react';
import { format } from 'date-fns';

const STAGES: { key: PipelineStage; label: string; color: string }[] = [
  { key: 'New Lead', label: 'New Lead', color: 'bg-blue-100 text-blue-800' },
  { key: 'Contacted', label: 'Contacted', color: 'bg-sky-100 text-sky-800' },
  { key: 'Consultation Scheduled', label: 'Consult Scheduled', color: 'bg-indigo-100 text-indigo-800' },
  { key: 'Consultation Completed', label: 'Consult Completed', color: 'bg-violet-100 text-violet-800' },
  { key: 'Proposal Sent', label: 'Proposal Sent', color: 'bg-amber-100 text-amber-800' },
  { key: 'Application Submitted', label: 'Application Sent', color: 'bg-orange-100 text-orange-800' },
  { key: 'Policy Issued', label: 'Policy Issued', color: 'bg-emerald-100 text-emerald-800' },
  { key: 'Active Client', label: 'Active Client', color: 'bg-green-100 text-green-800' },
  { key: 'Lost / Not Now', label: 'Lost / Not Now', color: 'bg-gray-100 text-gray-800' },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [todayTasks, setTodayTasks] = useState<Task[]>([]);
  const [pipelineContacts, setPipelineContacts] = useState<Record<PipelineStage, Contact[]>>({} as any);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get<any>('/api/dashboard/stats').catch(() => null),
      api.get<any>('/api/dashboard/recent-activity').catch(() => []),
      api.get<any>('/api/tasks?due=today&status=pending').catch(() => ({ tasks: [] })),
      api.get<any>('/api/contacts?limit=200').catch(() => ({ contacts: [] })),
    ]).then(([s, a, t, c]) => {
      // Map API camelCase to frontend snake_case
      if (s) {
        const byStage: Record<string, number> = {};
        const stageRows = Array.isArray(s.contactsPerStage) ? s.contactsPerStage : (s.contactsPerStage?.rows ?? []);
        stageRows.forEach((r: any) => {
          const key = r.stage;
          byStage[key] = (byStage[key] || 0) + (r.count || 0);
        });
        setStats({
          total_contacts: s.totalContacts ?? s.total_contacts ?? 0,
          by_stage: byStage as any,
          tasks_due_today: s.tasksDueToday ?? s.tasks_due_today ?? 0,
          overdue_tasks: s.overdueTasks ?? s.overdue_tasks ?? 0,
          appointments_this_week: s.appointmentsThisWeek ?? s.appointments_this_week ?? 0,
        });
      }

      // API returns array directly or { activities: [...] }
      const rawActivities = Array.isArray(a) ? a : (a?.activities ?? []);
      setActivities(rawActivities.map((r: any) => ({
        id: r.id,
        contact_id: r.contactId ?? r.contact_id,
        user_id: r.userId ?? r.user_id,
        user: r.userName ? { name: r.userName } : r.user,
        type: r.activityType ?? r.type ?? 'note',
        title: r.subject ?? r.title ?? '',
        description: r.body ?? r.description,
        created_at: r.createdAt ?? r.created_at,
      })));

      // Tasks may be array or { tasks: [...] }
      const rawTasks = Array.isArray(t) ? t : (t?.tasks ?? []);
      setTodayTasks(rawTasks);

      // Contacts may be array or { contacts: [...] }
      const rawContacts = Array.isArray(c) ? c : (c?.contacts ?? []);
      // Group contacts by stage for mini kanban
      const grouped: Record<string, Contact[]> = {};
      STAGES.forEach((st) => (grouped[st.key] = []));
      rawContacts.forEach((contact: any) => {
        const stage = contact.pipeline_stage ?? contact.pipelineStage;
        if (stage && grouped[stage]) {
          grouped[stage].push(contact);
        }
      });
      setPipelineContacts(grouped as Record<PipelineStage, Contact[]>);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return <div className="animate-pulse text-primary font-medium">Loading dashboard...</div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-primary-dark">Dashboard</h1>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard
          icon={<Users className="h-5 w-5" />}
          label="Total Contacts"
          value={stats?.total_contacts ?? 0}
          color="bg-primary-light text-primary-dark"
        />
        <StatCard
          icon={<CheckSquare className="h-5 w-5" />}
          label="Tasks Due Today"
          value={stats?.tasks_due_today ?? 0}
          color="bg-amber-50 text-amber-700"
        />
        <StatCard
          icon={<AlertTriangle className="h-5 w-5" />}
          label="Overdue Tasks"
          value={stats?.overdue_tasks ?? 0}
          color="bg-coral-light text-coral"
        />
        <StatCard
          icon={<Calendar className="h-5 w-5" />}
          label="Appointments (Week)"
          value={stats?.appointments_this_week ?? 0}
          color="bg-blue-50 text-blue-700"
        />
        <StatCard
          icon={<Users className="h-5 w-5" />}
          label="New Leads"
          value={stats?.by_stage?.['New Lead'] ?? 0}
          color="bg-indigo-50 text-indigo-700"
        />
      </div>

      {/* Mini Kanban */}
      <div className="bg-white rounded-xl shadow-sm border border-sand-dark p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-primary-dark">Pipeline Overview</h2>
          <button
            onClick={() => navigate('/pipeline')}
            className="text-sm text-primary hover:text-primary-dark flex items-center gap-1"
          >
            View Full Pipeline <ArrowRight className="h-3 w-3" />
          </button>
        </div>
        <div className="grid grid-cols-9 gap-2 overflow-x-auto">
          {STAGES.map((stage) => (
            <div key={stage.key} className="min-w-[120px]">
              <div className={cn('text-xs font-medium px-2 py-1 rounded-t-lg text-center', stage.color)}>
                {stage.label} ({pipelineContacts[stage.key]?.length ?? 0})
              </div>
              <div className="bg-gray-50 rounded-b-lg p-1 space-y-1 min-h-[80px] max-h-[200px] overflow-y-auto">
                {(pipelineContacts[stage.key] || []).slice(0, 5).map((c) => (
                  <div
                    key={c.id}
                    onClick={() => navigate(`/contacts/${c.id}`)}
                    className="bg-white p-1.5 rounded text-xs cursor-pointer hover:shadow-sm border border-gray-100 transition"
                  >
                    <p className="font-medium truncate">
                      {c.first_name} {c.last_name}
                    </p>
                    {c.island && <p className="text-gray-400 capitalize">{c.island.replace('_', ' ')}</p>}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-sand-dark p-4">
          <h2 className="text-lg font-semibold text-primary-dark mb-4">Recent Activity</h2>
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {activities.length === 0 && (
              <p className="text-sm text-gray-400">No recent activity</p>
            )}
            {activities.map((a) => (
              <div key={a.id} className="flex gap-3 items-start">
                <div className="mt-1">
                  <div className="h-2 w-2 rounded-full bg-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800">{a.title}</p>
                  {a.description && (
                    <p className="text-xs text-gray-500 truncate">{a.description}</p>
                  )}
                  <p className="text-xs text-gray-400 mt-0.5">
                    {format(new Date(a.created_at), 'MMM d, h:mm a')}
                    {a.user && ` - ${a.user.name}`}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Tasks Due Today */}
        <div className="bg-white rounded-xl shadow-sm border border-sand-dark p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-primary-dark">Tasks Due Today</h2>
            <button
              onClick={() => navigate('/tasks')}
              className="text-sm text-primary hover:text-primary-dark"
            >
              View All
            </button>
          </div>
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {todayTasks.length === 0 && (
              <p className="text-sm text-gray-400">No tasks due today</p>
            )}
            {todayTasks.map((t) => (
              <div
                key={t.id}
                className="flex items-start gap-2 p-2 rounded-lg hover:bg-sand transition cursor-pointer"
                onClick={() => t.contact_id && navigate(`/contacts/${t.contact_id}`)}
              >
                <Clock className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{t.title}</p>
                  {t.contact && (
                    <p className="text-xs text-gray-500">
                      {t.contact.first_name} {t.contact.last_name}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-sand-dark p-4">
      <div className={cn('inline-flex items-center justify-center h-10 w-10 rounded-lg mb-2', color)}>
        {icon}
      </div>
      <p className="text-2xl font-bold text-primary-dark">{value}</p>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
    </div>
  );
}
