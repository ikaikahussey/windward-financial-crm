import { useState, useEffect, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import type { Task, User, Contact } from '@/types';

interface CampaignOption {
  id: string | number;
  name: string;
}
import { Plus, X, CheckSquare, Clock, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { PageHelp } from '@/components/PageHelp';

export default function Tasks() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [agents, setAgents] = useState<User[]>([]);
  const [contactOptions, setContactOptions] = useState<Contact[]>([]);
  const [campaignOptions, setCampaignOptions] = useState<CampaignOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'mine' | 'all'>('mine');
  const [filterPriority, setFilterPriority] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterDue, setFilterDue] = useState('');
  const [showCreate, setShowCreate] = useState(false);

  function loadTasks() {
    const params = new URLSearchParams();
    if (tab === 'mine' && user) params.set('assigned_to', user.id);
    if (filterPriority) params.set('priority', filterPriority);
    if (filterType) params.set('type', filterType);
    if (filterStatus) params.set('status', filterStatus);
    if (filterDue) params.set('due', filterDue);

    api
      .get<{ tasks: Task[] }>(`/api/tasks?${params}`)
      .then((d) => setTasks(d.tasks || []))
      .catch(() => setTasks([]))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadTasks();
  }, [tab, filterPriority, filterType, filterStatus, filterDue]);

  // Pickers and agents only need to load once on mount.
  useEffect(() => {
    api.get<{ users: User[] }>('/api/users').then((d) => setAgents(d.users || [])).catch(() => {});
    api
      .get<{ contacts: Contact[] }>('/api/contacts?limit=500')
      .then((d) => setContactOptions(d.contacts || []))
      .catch(() => setContactOptions([]));
    // /api/marketing/campaigns returns a raw array today, not a wrapped
     // object. Accept both shapes so a future shape change doesn't break us.
    api
      .get<CampaignOption[] | { campaigns: CampaignOption[] }>('/api/marketing/campaigns')
      .then((d) => {
        const list = Array.isArray(d) ? d : (d?.campaigns ?? []);
        setCampaignOptions(list);
      })
      .catch(() => setCampaignOptions([]));
  }, []);

  async function toggleComplete(task: Task) {
    const newStatus = task.status === 'completed' ? 'pending' : 'completed';
    await api.patch(`/api/tasks/${task.id}`, { status: newStatus });
    loadTasks();
  }

  const priorityBadge: Record<string, string> = {
    urgent: 'bg-red-100 text-red-700',
    high: 'bg-orange-100 text-orange-700',
    medium: 'bg-yellow-100 text-yellow-700',
    low: 'bg-gray-100 text-gray-600',
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-primary-dark">Tasks</h1>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-dark transition text-sm font-medium"
        >
          <Plus className="h-4 w-4" /> Add Task
        </button>
      </div>

      <PageHelp
        id="tasks"
        title="What are Tasks?"
        description="Personal task list for follow-ups, calls, emails, and reviews. Anything you need to remember to do for a contact lives here."
        tips={[
          'Add a task with a title, optional contact link, type (call / email / meeting / review), priority, and due date.',
          'Check the box to mark complete. Filter to Today / Overdue / All to focus on what needs attention right now.',
          'Tasks attached to a contact also appear on that contact\'s detail page in the Tasks card.',
          'Some tasks are created automatically by stage automations — those still show up here for whoever is assigned.',
        ]}
      />

      {/* Tabs */}
      <div className="flex gap-1 bg-white rounded-lg p-1 shadow-sm border border-sand-dark w-fit">
        <button
          onClick={() => setTab('mine')}
          className={cn('px-4 py-2 rounded-md text-sm font-medium transition', tab === 'mine' ? 'bg-primary text-white' : 'text-gray-600 hover:bg-sand')}
        >
          My Tasks
        </button>
        <button
          onClick={() => setTab('all')}
          className={cn('px-4 py-2 rounded-md text-sm font-medium transition', tab === 'all' ? 'bg-primary text-white' : 'text-gray-600 hover:bg-sand')}
        >
          All Tasks
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white">
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <select value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white">
          <option value="">All Priority</option>
          <option value="urgent">Urgent</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white">
          <option value="">All Types</option>
          <option value="follow_up">Follow Up</option>
          <option value="call">Call</option>
          <option value="email">Email</option>
          <option value="meeting">Meeting</option>
          <option value="review">Review</option>
          <option value="other">Other</option>
        </select>
        <select value={filterDue} onChange={(e) => setFilterDue(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white">
          <option value="">All Dates</option>
          <option value="today">Due Today</option>
          <option value="overdue">Overdue</option>
          <option value="week">This Week</option>
        </select>
      </div>

      {/* Task List */}
      <div className="bg-white rounded-xl shadow-sm border border-sand-dark overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">Loading...</div>
        ) : tasks.length === 0 ? (
          <div className="p-8 text-center text-gray-400">No tasks found</div>
        ) : (
          <div className="divide-y divide-sand-dark/50">
            {tasks.map((task) => (
              <div key={task.id} className="flex items-center gap-4 px-4 py-3 hover:bg-sand/30 transition">
                <input
                  type="checkbox"
                  checked={task.status === 'completed'}
                  onChange={() => toggleComplete(task)}
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className={cn('text-sm font-medium', task.status === 'completed' && 'line-through text-gray-400')}>
                      {task.title}
                    </p>
                    <span className={cn('px-1.5 py-0.5 rounded text-xs font-medium', priorityBadge[task.priority])}>
                      {task.priority}
                    </span>
                    <span className="px-1.5 py-0.5 rounded text-xs bg-sand text-gray-600 capitalize">
                      {task.type.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="flex gap-3 mt-0.5 text-xs text-gray-500">
                    {task.contact && (
                      <button
                        onClick={() => navigate(`/contacts/${task.contact_id}`)}
                        className="text-primary hover:underline"
                      >
                        {task.contact.first_name} {task.contact.last_name}
                      </button>
                    )}
                    {task.campaign && (
                      <button
                        onClick={() => navigate(`/marketing/campaigns/${task.campaign?.id}`)}
                        className="text-primary hover:underline"
                      >
                        Campaign: {task.campaign.name}
                      </button>
                    )}
                    {task.assigned_to && <span>Assigned: {task.assigned_to.name}</span>}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  {task.due_date && (
                    <p className={cn('text-xs', new Date(task.due_date) < new Date() && task.status !== 'completed' ? 'text-coral font-medium' : 'text-gray-500')}>
                      {format(new Date(task.due_date), 'MMM d, yyyy')}
                    </p>
                  )}
                  <span className={cn('text-xs', {
                    'text-green-600': task.status === 'completed',
                    'text-amber-600': task.status === 'pending',
                    'text-gray-400': task.status === 'cancelled',
                  })}>
                    {task.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Task Dialog */}
      {showCreate && (
        <CreateTaskDialog
          agents={agents}
          contacts={contactOptions}
          campaigns={campaignOptions}
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); loadTasks(); }}
        />
      )}
    </div>
  );
}

function CreateTaskDialog({
  agents,
  contacts,
  campaigns,
  onClose,
  onCreated,
}: {
  agents: User[];
  contacts: Contact[];
  campaigns: CampaignOption[];
  onClose: () => void;
  onCreated: () => void;
}) {
  // "Related to" is a single radio: a task can be tied to a contact OR a
  // campaign, not both. Tasks with neither are also valid.
  const [relatedKind, setRelatedKind] = useState<'none' | 'contact' | 'campaign'>('none');
  const [form, setForm] = useState({
    title: '',
    description: '',
    type: 'follow_up',
    priority: 'medium',
    due_date: '',
    assigned_to_id: '',
    contact_id: '',
    campaign_id: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload: Record<string, unknown> = { ...form };
      // Only one of contact_id / campaign_id is sent based on the radio choice.
      if (relatedKind !== 'contact') delete payload.contact_id;
      if (relatedKind !== 'campaign') delete payload.campaign_id;
      // Strip empty strings so the API doesn't try to coerce them.
      for (const k of Object.keys(payload)) {
        if (payload[k] === '' || payload[k] === undefined) delete payload[k];
      }
      await api.post('/api/tasks', payload);
      onCreated();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-primary-dark">Add Task</h2>
          <button onClick={onClose}><X className="h-5 w-5 text-gray-400" /></button>
        </div>
        {error && <div className="bg-coral-light text-coral p-3 rounded-lg text-sm mb-4">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
            <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white">
                <option value="follow_up">Follow Up</option>
                <option value="call">Call</option>
                <option value="email">Email</option>
                <option value="meeting">Meeting</option>
                <option value="review">Review</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
              <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white">
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
            <input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Related To</label>
            <div className="flex gap-3 mb-2 text-sm">
              {(['none', 'contact', 'campaign'] as const).map((k) => (
                <label key={k} className="flex items-center gap-1.5 cursor-pointer capitalize">
                  <input
                    type="radio"
                    name="related-kind"
                    checked={relatedKind === k}
                    onChange={() => setRelatedKind(k)}
                    className="text-primary"
                  />
                  {k}
                </label>
              ))}
            </div>
            {relatedKind === 'contact' && (
              <select
                value={form.contact_id}
                onChange={(e) => setForm({ ...form, contact_id: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white"
              >
                <option value="">Select contact...</option>
                {contacts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.first_name} {c.last_name}
                    {c.email ? ` — ${c.email}` : ''}
                  </option>
                ))}
              </select>
            )}
            {relatedKind === 'campaign' && (
              <select
                value={form.campaign_id}
                onChange={(e) => setForm({ ...form, campaign_id: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white"
              >
                <option value="">Select campaign...</option>
                {campaigns.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Assigned To</label>
            <select value={form.assigned_to_id} onChange={(e) => setForm({ ...form, assigned_to_id: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white">
              <option value="">Select agent...</option>
              {agents.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600">Cancel</button>
            <button type="submit" disabled={saving} className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark disabled:opacity-50">
              {saving ? 'Creating...' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
