import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import {
  MapPin,
  Users,
  Megaphone,
  Mail,
  Video,
  FileText,
  ArrowRight,
} from 'lucide-react';
import { PageHelp } from '@/components/PageHelp';

interface MarketingStats {
  total_districts: number;
  districts_with_contacts: number;
  active_campaigns: number;
  emails_sent: number;
  webinar_registrations: number;
  documents_sent: number;
}

export default function MarketingDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<MarketingStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<MarketingStats>('/api/marketing/stats')
      .then((d) => setStats(d))
      .catch(() => setStats(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="animate-pulse text-primary font-medium">Loading marketing dashboard...</div>;
  }

  const quickLinks = [
    { label: 'Districts', to: '/marketing/districts', icon: MapPin, description: 'Manage school districts and contacts' },
    { label: 'Campaigns', to: '/marketing/campaigns', icon: Megaphone, description: 'Create and manage email campaigns' },
    { label: 'Webinars', to: '/marketing/webinars', icon: Video, description: 'View webinar registrations' },
    { label: 'Ad Campaigns', to: '/marketing/ads', icon: FileText, description: 'Manage geo-targeted ad campaigns' },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-primary-dark">Marketing</h1>

      <PageHelp
        id="marketing"
        title="What is the Marketing module?"
        description="Top-of-funnel outreach: target school districts and government employers, run multi-channel campaigns, and track webinar / ad performance."
        tips={[
          'The stats row counts districts, district contacts, active campaigns, webinar registrants, and ad spend at a glance.',
          'Drill into Districts to manage Hawaii school + government employer rosters and per-employer contacts.',
          'Campaigns ties templates and webinars together into a multi-step outreach sequence.',
          'Ads tracks geo-targeted spend on Google / Meta / LinkedIn.',
        ]}
      />

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard
          icon={<MapPin className="h-5 w-5" />}
          label="Total Districts"
          value={stats?.total_districts ?? 0}
          color="bg-primary-light text-primary-dark"
        />
        <StatCard
          icon={<Users className="h-5 w-5" />}
          label="With Contacts"
          value={stats?.districts_with_contacts ?? 0}
          color="bg-blue-50 text-blue-700"
        />
        <StatCard
          icon={<Megaphone className="h-5 w-5" />}
          label="Active Campaigns"
          value={stats?.active_campaigns ?? 0}
          color="bg-green-50 text-green-700"
        />
        <StatCard
          icon={<Mail className="h-5 w-5" />}
          label="Emails Sent"
          value={stats?.emails_sent ?? 0}
          color="bg-amber-50 text-amber-700"
        />
        <StatCard
          icon={<Video className="h-5 w-5" />}
          label="Webinar Regs"
          value={stats?.webinar_registrations ?? 0}
          color="bg-indigo-50 text-indigo-700"
        />
        <StatCard
          icon={<FileText className="h-5 w-5" />}
          label="Documents Sent"
          value={stats?.documents_sent ?? 0}
          color="bg-violet-50 text-violet-700"
        />
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {quickLinks.map((link) => (
          <button
            key={link.to}
            onClick={() => navigate(link.to)}
            className="bg-white rounded-xl shadow-sm border border-sand-dark p-5 text-left hover:shadow-md transition group"
          >
            <div className="flex items-center justify-between mb-2">
              <link.icon className="h-5 w-5 text-primary" />
              <ArrowRight className="h-4 w-4 text-gray-300 group-hover:text-primary transition" />
            </div>
            <p className="font-semibold text-primary-dark">{link.label}</p>
            <p className="text-xs text-gray-500 mt-1">{link.description}</p>
          </button>
        ))}
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
