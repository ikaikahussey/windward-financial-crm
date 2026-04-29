import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import type { Contact, User, PipelineStage } from '@/types';
import { Search, GripVertical } from 'lucide-react';
import { differenceInDays } from 'date-fns';

const STAGES: { key: PipelineStage; label: string; color: string; bg: string }[] = [
  { key: 'New Lead', label: 'New Lead', color: 'border-blue-400', bg: 'bg-blue-50' },
  { key: 'Contacted', label: 'Contacted', color: 'border-sky-400', bg: 'bg-sky-50' },
  { key: 'Consultation Scheduled', label: 'Consult Sched.', color: 'border-indigo-400', bg: 'bg-indigo-50' },
  { key: 'Consultation Completed', label: 'Consult Done', color: 'border-violet-400', bg: 'bg-violet-50' },
  { key: 'Proposal Sent', label: 'Proposal Sent', color: 'border-amber-400', bg: 'bg-amber-50' },
  { key: 'Application Submitted', label: 'App. Submitted', color: 'border-orange-400', bg: 'bg-orange-50' },
  { key: 'Policy Issued', label: 'Policy Issued', color: 'border-emerald-400', bg: 'bg-emerald-50' },
  { key: 'Active Client', label: 'Active Client', color: 'border-green-400', bg: 'bg-green-50' },
  { key: 'Lost / Not Now', label: 'Lost / Not Now', color: 'border-gray-400', bg: 'bg-gray-50' },
];

export default function Pipeline() {
  const navigate = useNavigate();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [agents, setAgents] = useState<User[]>([]);
  const [search, setSearch] = useState('');
  const [filterAgent, setFilterAgent] = useState('');
  const [activeContact, setActiveContact] = useState<Contact | null>(null);
  const [loading, setLoading] = useState(true);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  function loadContacts() {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (filterAgent) params.set('agent_id', filterAgent);
    params.set('limit', '500');

    api
      .get<{ contacts: Contact[] }>(`/api/contacts?${params}`)
      .then((d) => setContacts(d.contacts || []))
      .catch(() => setContacts([]))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadContacts();
    api.get<{ users: User[] }>('/api/users').then((d) => setAgents(d.users || [])).catch(() => {});
  }, [search, filterAgent]);

  const grouped: Record<PipelineStage, Contact[]> = {} as any;
  STAGES.forEach((s) => (grouped[s.key] = []));
  contacts.forEach((c) => {
    if (grouped[c.pipeline_stage]) grouped[c.pipeline_stage].push(c);
  });

  function handleDragStart(event: DragStartEvent) {
    const c = contacts.find((x) => x.id === event.active.id);
    setActiveContact(c || null);
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveContact(null);
    const { active, over } = event;
    if (!over) return;

    const overId = String(over.id);
    // Check if dropped on a stage column
    const targetStage = STAGES.find((s) => s.key === overId);
    if (!targetStage) return;

    const contactId = String(active.id);
    const contact = contacts.find((c) => c.id === contactId);
    if (!contact || contact.pipeline_stage === targetStage.key) return;

    // Optimistic update
    setContacts((prev) =>
      prev.map((c) => (c.id === contactId ? { ...c, pipeline_stage: targetStage.key } : c))
    );

    try {
      await api.patch(`/api/contacts/${contactId}/stage`, { stage: targetStage.key });
    } catch {
      loadContacts();
    }
  }

  return (
    <div className="space-y-4 h-full flex flex-col">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-primary-dark">Pipeline</h1>
        <div className="flex gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white"
            />
          </div>
          <select
            value={filterAgent}
            onChange={(e) => setFilterAgent(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white"
          >
            <option value="">All Agents</option>
            {agents.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="animate-pulse text-primary">Loading pipeline...</div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div className="flex-1 overflow-x-auto">
            <div className="flex gap-3 min-w-max h-full pb-4">
              {STAGES.map((stage) => (
                <StageColumn
                  key={stage.key}
                  stage={stage}
                  contacts={grouped[stage.key]}
                  onCardClick={(id) => navigate(`/contacts/${id}`)}
                />
              ))}
            </div>
          </div>
          <DragOverlay>
            {activeContact && <PipelineCard contact={activeContact} isDragging />}
          </DragOverlay>
        </DndContext>
      )}
    </div>
  );
}

function StageColumn({
  stage,
  contacts,
  onCardClick,
}: {
  stage: { key: PipelineStage; label: string; color: string; bg: string };
  contacts: Contact[];
  onCardClick: (id: string) => void;
}) {
  return (
    <div className="w-[200px] flex flex-col" id={stage.key}>
      <div className={cn('border-t-4 rounded-t-lg px-3 py-2', stage.color, stage.bg)}>
        <h3 className="text-xs font-semibold text-gray-700">{stage.label}</h3>
        <span className="text-xs text-gray-500">{contacts.length}</span>
      </div>
      <SortableContext items={contacts.map((c) => c.id)} strategy={verticalListSortingStrategy} id={stage.key}>
        <div
          className="flex-1 bg-gray-50/50 p-2 space-y-2 min-h-[200px] overflow-y-auto rounded-b-lg border border-t-0 border-gray-200"
          data-stage={stage.key}
          id={stage.key}
        >
          {contacts.map((c) => (
            <DraggableCard key={c.id} contact={c} onClick={() => onCardClick(c.id)} />
          ))}
        </div>
      </SortableContext>
    </div>
  );
}

function DraggableCard({ contact, onClick }: { contact: Contact; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: contact.id,
    data: { type: 'contact', stage: contact.pipeline_stage },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} onClick={onClick}>
      <PipelineCard contact={contact} />
    </div>
  );
}

function PipelineCard({ contact, isDragging }: { contact: Contact; isDragging?: boolean }) {
  const daysInStage = contact.stage_changed_at
    ? differenceInDays(new Date(), new Date(contact.stage_changed_at))
    : 0;

  return (
    <div
      className={cn(
        'bg-white rounded-lg p-3 shadow-sm border border-gray-100 cursor-pointer hover:shadow-md transition text-xs',
        isDragging && 'shadow-lg ring-2 ring-primary/30'
      )}
    >
      <div className="flex items-start justify-between gap-1">
        <p className="font-semibold text-gray-800 truncate">
          {contact.first_name} {contact.last_name}
        </p>
        <GripVertical className="h-3 w-3 text-gray-300 shrink-0" />
      </div>
      {contact.employment_type && (
        <p className="text-gray-500 capitalize mt-0.5">{contact.employment_type.replace('_', ' ')}</p>
      )}
      {contact.island && (
        <p className="text-gray-400 capitalize">{contact.island.replace('_', ' ')}</p>
      )}
      <p className="text-gray-400 mt-1">{daysInStage}d in stage</p>
    </div>
  );
}
