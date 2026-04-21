import { useState, useEffect, FormEvent } from 'react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import type { User } from '@/types';
import { Settings as SettingsIcon, Users, Wifi, Plus, Edit2, X, Check } from 'lucide-react';

export default function Settings() {
  const [tab, setTab] = useState<'general' | 'users' | 'quo'>('general');

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-primary-dark">Settings</h1>

      <div className="flex gap-1 bg-white rounded-lg p-1 shadow-sm border border-sand-dark w-fit">
        <button onClick={() => setTab('general')} className={cn('flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition', tab === 'general' ? 'bg-primary text-white' : 'text-gray-600 hover:bg-sand')}>
          <SettingsIcon className="h-4 w-4" /> General
        </button>
        <button onClick={() => setTab('users')} className={cn('flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition', tab === 'users' ? 'bg-primary text-white' : 'text-gray-600 hover:bg-sand')}>
          <Users className="h-4 w-4" /> Users
        </button>
        <button onClick={() => setTab('quo')} className={cn('flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition', tab === 'quo' ? 'bg-primary text-white' : 'text-gray-600 hover:bg-sand')}>
          <Wifi className="h-4 w-4" /> Quo Integration
        </button>
      </div>

      {tab === 'general' && <GeneralSettings />}
      {tab === 'users' && <UsersSettings />}
      {tab === 'quo' && <QuoSettings />}
    </div>
  );
}

function GeneralSettings() {
  const [form, setForm] = useState({
    company_name: 'Windward Financial',
    company_phone: '(888) 894-1884',
    scheduling_link: '',
    smtp_host: '',
    smtp_port: '587',
    smtp_user: '',
    smtp_password: '',
    smtp_from_email: '',
    smtp_from_name: '',
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api.get<any>('/api/settings/general').then((d) => {
      if (d) setForm((prev) => ({ ...prev, ...d }));
    }).catch(() => { });
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.patch('/api/settings/general', form);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch { }
    setSaving(false);
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-sand-dark p-6 max-w-2xl">
      <h2 className="text-lg font-semibold text-primary-dark mb-4">General Settings</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
          <input value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Company Phone</label>
            <input value={form.company_phone} onChange={(e) => setForm({ ...form, company_phone: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Scheduling Link</label>
            <input value={form.scheduling_link} onChange={(e) => setForm({ ...form, scheduling_link: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" placeholder="https://calendly.com/..." />
          </div>
        </div>

        <hr className="border-sand-dark" />
        <h3 className="text-md font-semibold text-gray-700">SMTP Email Settings</h3>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">SMTP Host</label>
            <input value={form.smtp_host} onChange={(e) => setForm({ ...form, smtp_host: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" placeholder="smtp.gmail.com" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">SMTP Port</label>
            <input value={form.smtp_port} onChange={(e) => setForm({ ...form, smtp_port: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">SMTP Username</label>
            <input value={form.smtp_user} onChange={(e) => setForm({ ...form, smtp_user: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">SMTP Password</label>
            <input type="password" value={form.smtp_password} onChange={(e) => setForm({ ...form, smtp_password: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">From Email</label>
            <input value={form.smtp_from_email} onChange={(e) => setForm({ ...form, smtp_from_email: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">From Name</label>
            <input value={form.smtp_from_name} onChange={(e) => setForm({ ...form, smtp_from_name: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button type="submit" disabled={saving} className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark disabled:opacity-50">
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
          {saved && <span className="text-sm text-green-600 flex items-center gap-1"><Check className="h-4 w-4" /> Saved</span>}
        </div>
      </form>
    </div>
  );
}

function UsersSettings() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditor, setShowEditor] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  function loadUsers() {
    api.get<{ users: User[] }>('/api/users')
      .then((d) => setUsers(d.users || []))
      .catch(() => setUsers([]))
      .finally(() => setLoading(false));
  }

  useEffect(() => { loadUsers(); }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-primary-dark">Users</h2>
        <button
          onClick={() => { setEditingUser(null); setShowEditor(true); }}
          className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-dark transition text-sm font-medium"
        >
          <Plus className="h-4 w-4" /> Add User
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-sand-dark overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">Loading...</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-sand-dark bg-sand/50">
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Name</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Email</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Role</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Status</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-sand-dark/50">
                  <td className="px-4 py-3 font-medium">{u.name}</td>
                  <td className="px-4 py-3 text-gray-600">{u.email}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-primary-light text-primary-dark capitalize">{u.role}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', u.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500')}>
                      {u.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => { setEditingUser(u); setShowEditor(true); }} className="text-gray-400 hover:text-primary">
                      <Edit2 className="h-4 w-4 inline" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showEditor && (
        <UserEditor
          user={editingUser}
          onClose={() => setShowEditor(false)}
          onSaved={() => { setShowEditor(false); loadUsers(); }}
        />
      )}
    </div>
  );
}

function UserEditor({ user, onClose, onSaved }: { user: User | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    role: user?.role || 'agent',
    phone: user?.phone || '',
    password: '',
    is_active: user?.is_active ?? true,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (user) {
        const payload: any = { ...form };
        if (!payload.password) delete payload.password;
        await api.patch(`/api/users/${user.id}`, payload);
      } else {
        await api.post('/api/users', form);
      }
      onSaved();
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
          <h2 className="text-lg font-bold text-primary-dark">{user ? 'Edit User' : 'Add User'}</h2>
          <button onClick={onClose}><X className="h-5 w-5 text-gray-400" /></button>
        </div>
        {error && <div className="bg-coral-light text-coral p-3 rounded-lg text-sm mb-4">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
            <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
            <input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{user ? 'New Password (leave blank to keep)' : 'Password *'}</label>
            <input type="password" required={!user} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
              <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as 'admin' | 'agent' | 'viewer' })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white">
                <option value="admin">Admin</option>
                <option value="agent">Agent</option>
                <option value="viewer">Viewer</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
          </div>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="rounded border-gray-300 text-primary" />
            <span className="text-sm text-gray-700">Active</span>
          </label>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600">Cancel</button>
            <button type="submit" disabled={saving} className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark disabled:opacity-50">
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function QuoSettings() {
  const [apiKey, setApiKey] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [registering, setRegistering] = useState(false);
  const [registerResult, setRegisterResult] = useState<string | null>(null);
  const [phoneAssignments, setPhoneAssignments] = useState<{ phone: string; agent_id: string }[]>([]);
  const [agents, setAgents] = useState<User[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get<any>('/api/settings/quo').then((d) => {
      if (d?.api_key) setApiKey(d.api_key);
      if (d?.phone_assignments) setPhoneAssignments(d.phone_assignments);
    }).catch(() => { });
    api.get<{ users: User[] }>('/api/users').then((d) => setAgents(d.users || [])).catch(() => { });
  }, []);

  async function testConnection() {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await api.post<{ success: boolean; message: string }>('/api/settings/quo/test', { api_key: apiKey });
      setTestResult(res.success ? 'Connection successful!' : res.message);
    } catch (err: any) {
      setTestResult(`Failed: ${err.message}`);
    } finally {
      setTesting(false);
    }
  }

  async function registerWebhooks() {
    setRegistering(true);
    setRegisterResult(null);
    try {
      const res = await api.post<{ success: boolean; message: string }>('/api/settings/quo/webhooks');
      setRegisterResult(res.success ? 'Webhooks registered!' : res.message);
    } catch (err: any) {
      setRegisterResult(`Failed: ${err.message}`);
    } finally {
      setRegistering(false);
    }
  }

  async function savePhoneAssignments() {
    setSaving(true);
    try {
      await api.patch('/api/settings/quo', { api_key: apiKey, phone_assignments: phoneAssignments });
    } catch { }
    setSaving(false);
  }

  function addPhoneRow() {
    setPhoneAssignments([...phoneAssignments, { phone: '', agent_id: '' }]);
  }

  function updatePhoneRow(idx: number, field: string, value: string) {
    const updated = [...phoneAssignments];
    (updated[idx] as any)[field] = value;
    setPhoneAssignments(updated);
  }

  function removePhoneRow(idx: number) {
    setPhoneAssignments(phoneAssignments.filter((_, i) => i !== idx));
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* API Key */}
      <div className="bg-white rounded-xl shadow-sm border border-sand-dark p-6">
        <h2 className="text-lg font-semibold text-primary-dark mb-4">Quo Phone Integration</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">API Key</label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="Enter Quo API key..."
            />
          </div>
          <div className="flex gap-3">
            <button
              onClick={testConnection}
              disabled={testing || !apiKey}
              className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark disabled:opacity-50"
            >
              {testing ? 'Testing...' : 'Test Connection'}
            </button>
            <button
              onClick={registerWebhooks}
              disabled={registering}
              className="px-4 py-2 bg-white border border-primary text-primary rounded-lg text-sm font-medium hover:bg-primary-light disabled:opacity-50"
            >
              {registering ? 'Registering...' : 'Register Webhooks'}
            </button>
          </div>
          {testResult && (
            <p className={cn('text-sm', testResult.includes('successful') ? 'text-green-600' : 'text-coral')}>{testResult}</p>
          )}
          {registerResult && (
            <p className={cn('text-sm', registerResult.includes('registered') ? 'text-green-600' : 'text-coral')}>{registerResult}</p>
          )}
        </div>
      </div>

      {/* Phone Number -> Agent Assignment */}
      <div className="bg-white rounded-xl shadow-sm border border-sand-dark p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-md font-semibold text-gray-700">Phone Number to Agent Assignment</h3>
          <button onClick={addPhoneRow} className="flex items-center gap-1 text-sm text-primary hover:text-primary-dark">
            <Plus className="h-4 w-4" /> Add
          </button>
        </div>
        <div className="space-y-2">
          {phoneAssignments.map((row, idx) => (
            <div key={idx} className="flex gap-3 items-center">
              <input
                value={row.phone}
                onChange={(e) => updatePhoneRow(idx, 'phone', e.target.value)}
                placeholder="Phone number"
                className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              <select
                value={row.agent_id}
                onChange={(e) => updatePhoneRow(idx, 'agent_id', e.target.value)}
                className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white"
              >
                <option value="">Select agent...</option>
                {agents.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
              <button onClick={() => removePhoneRow(idx)} className="text-gray-400 hover:text-coral">
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
          {phoneAssignments.length === 0 && (
            <p className="text-sm text-gray-400">No phone assignments configured</p>
          )}
        </div>
        <button
          onClick={savePhoneAssignments}
          disabled={saving}
          className="mt-4 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Assignments'}
        </button>
      </div>
    </div>
  );
}
