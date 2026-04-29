import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import type { CallLog, SmsMessage, User } from '@/types';
import { Phone, MessageSquare, PhoneIncoming, PhoneOutgoing, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { format } from 'date-fns';
import { PageHelp } from '@/components/PageHelp';

export default function Communications() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<'calls' | 'messages'>('calls');
  const [calls, setCalls] = useState<CallLog[]>([]);
  const [messages, setMessages] = useState<SmsMessage[]>([]);
  const [agents, setAgents] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterAgent, setFilterAgent] = useState('');
  const [filterDirection, setFilterDirection] = useState('');

  function loadData() {
    setLoading(true);
    const params = new URLSearchParams();
    if (filterAgent) params.set('agent_id', filterAgent);
    if (filterDirection) params.set('direction', filterDirection);

    if (tab === 'calls') {
      api.get<{ calls: CallLog[] }>(`/api/calls?${params}`)
        .then((d) => setCalls(d.calls || []))
        .catch(() => setCalls([]))
        .finally(() => setLoading(false));
    } else {
      api.get<{ messages: SmsMessage[] }>(`/api/messages?${params}`)
        .then((d) => setMessages(d.messages || []))
        .catch(() => setMessages([]))
        .finally(() => setLoading(false));
    }
  }

  useEffect(() => {
    loadData();
    api.get<{ users: User[] }>('/api/users').then((d) => setAgents(d.users || [])).catch(() => {});
  }, [tab, filterAgent, filterDirection]);

  function formatDuration(seconds?: number) {
    if (!seconds) return '-';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-primary-dark">Communications</h1>

      <PageHelp
        id="communications"
        title="What are Communications?"
        description="Unified inbox of calls and SMS synced from Quo (OpenPhone). Inbound and outbound activity lands here in real time via webhooks."
        tips={[
          'Toggle between Calls and Messages with the tabs.',
          'Calls show direction (in/out), duration, and AI summary + transcription when OpenPhone has them.',
          'Click an agent or contact name to filter to just their conversations.',
          'If a call shows "Unmatched" the caller\'s phone didn\'t match any contact — fix it by adding the number to their record.',
        ]}
      />

      {/* Tabs */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1 bg-white rounded-lg p-1 shadow-sm border border-sand-dark">
          <button
            onClick={() => setTab('calls')}
            className={cn('flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition', tab === 'calls' ? 'bg-primary text-white' : 'text-gray-600 hover:bg-sand')}
          >
            <Phone className="h-4 w-4" /> Calls
          </button>
          <button
            onClick={() => setTab('messages')}
            className={cn('flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition', tab === 'messages' ? 'bg-primary text-white' : 'text-gray-600 hover:bg-sand')}
          >
            <MessageSquare className="h-4 w-4" /> Messages
          </button>
        </div>
        <div className="flex gap-3">
          <select value={filterDirection} onChange={(e) => setFilterDirection(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white">
            <option value="">All Directions</option>
            <option value="inbound">Inbound</option>
            <option value="outbound">Outbound</option>
          </select>
          <select value={filterAgent} onChange={(e) => setFilterAgent(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white">
            <option value="">All Agents</option>
            {agents.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>
      </div>

      {/* Content */}
      <div className="bg-white rounded-xl shadow-sm border border-sand-dark overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">Loading...</div>
        ) : tab === 'calls' ? (
          /* Calls Table */
          calls.length === 0 ? (
            <div className="p-8 text-center text-gray-400">No calls found</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-sand-dark bg-sand/50">
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Contact</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Agent</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Direction</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Duration</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Status</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">AI Summary</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Time</th>
                </tr>
              </thead>
              <tbody>
                {calls.map((call) => (
                  <tr
                    key={call.id}
                    onClick={() => call.contact_id && navigate(`/contacts/${call.contact_id}`)}
                    className="border-b border-sand-dark/50 hover:bg-sand/30 cursor-pointer transition"
                  >
                    <td className="px-4 py-3 font-medium text-primary-dark">
                      {call.contact ? `${call.contact.first_name} ${call.contact.last_name}` : call.phone_number || 'Unknown'}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{call.agent?.name || '-'}</td>
                    <td className="px-4 py-3">
                      {call.direction === 'inbound' ? (
                        <span className="flex items-center gap-1 text-blue-600"><PhoneIncoming className="h-4 w-4" /> In</span>
                      ) : (
                        <span className="flex items-center gap-1 text-green-600"><PhoneOutgoing className="h-4 w-4" /> Out</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{formatDuration(call.duration_seconds)}</td>
                    <td className="px-4 py-3">
                      <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', {
                        'bg-green-100 text-green-700': call.status === 'completed',
                        'bg-red-100 text-red-600': call.status === 'missed',
                        'bg-amber-100 text-amber-700': call.status === 'voicemail',
                        'bg-gray-100 text-gray-500': call.status === 'busy',
                      })}>
                        {call.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs max-w-[200px] truncate">
                      {call.ai_summary || '-'}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {format(new Date(call.created_at), 'MMM d, h:mm a')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        ) : (
          /* Messages Table */
          messages.length === 0 ? (
            <div className="p-8 text-center text-gray-400">No messages found</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-sand-dark bg-sand/50">
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Contact</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Direction</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Message</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Status</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Time</th>
                </tr>
              </thead>
              <tbody>
                {messages.map((msg) => (
                  <tr
                    key={msg.id}
                    onClick={() => msg.contact_id && navigate(`/contacts/${msg.contact_id}`)}
                    className="border-b border-sand-dark/50 hover:bg-sand/30 cursor-pointer transition"
                  >
                    <td className="px-4 py-3 font-medium text-primary-dark">
                      {msg.contact ? `${msg.contact.first_name} ${msg.contact.last_name}` : msg.phone_number || 'Unknown'}
                    </td>
                    <td className="px-4 py-3">
                      {msg.direction === 'inbound' ? (
                        <span className="flex items-center gap-1 text-blue-600"><ArrowDownLeft className="h-4 w-4" /> In</span>
                      ) : (
                        <span className="flex items-center gap-1 text-green-600"><ArrowUpRight className="h-4 w-4" /> Out</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600 max-w-[300px] truncate">{msg.body}</td>
                    <td className="px-4 py-3">
                      <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', {
                        'bg-green-100 text-green-700': msg.status === 'delivered',
                        'bg-blue-100 text-blue-600': msg.status === 'sent',
                        'bg-red-100 text-red-600': msg.status === 'failed',
                        'bg-gray-100 text-gray-500': msg.status === 'received',
                      })}>
                        {msg.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {format(new Date(msg.created_at), 'MMM d, h:mm a')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        )}
      </div>
    </div>
  );
}
