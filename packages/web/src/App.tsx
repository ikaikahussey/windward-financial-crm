import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import Sidebar from '@/components/Sidebar';
import Login from '@/pages/Login';
import Dashboard from '@/pages/Dashboard';
import Contacts from '@/pages/Contacts';
import ContactDetail from '@/pages/ContactDetail';
import Pipeline from '@/pages/Pipeline';
import Tasks from '@/pages/Tasks';
import Templates from '@/pages/Templates';
import Sequences from '@/pages/Sequences';
import Appointments from '@/pages/Appointments';
import Communications from '@/pages/Communications';
import Reports from '@/pages/Reports';
import Settings from '@/pages/Settings';
import Events from '@/pages/Events';
import MarketingDashboard from '@/pages/marketing/Dashboard';
import MarketingDistricts from '@/pages/marketing/Districts';
import MarketingCampaigns from '@/pages/marketing/Campaigns';
import MarketingCampaignDetail from '@/pages/marketing/CampaignDetail';
import MarketingWebinars from '@/pages/marketing/Webinars';
import MarketingDistrictDetail from '@/pages/marketing/DistrictDetail';
import MarketingAds from '@/pages/marketing/Ads';
import QuoStatus from '@/pages/operations/QuoStatus';
import LeadScoring from '@/pages/operations/LeadScoring';
import AutomationActivity from '@/pages/operations/AutomationActivity';

function AdminOnly({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  if (user?.role !== 'admin') return <Navigate to="/" replace />;
  return <>{children}</>;
}

export default function App() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-sand">
        <div className="animate-pulse text-primary text-xl font-semibold">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-sand p-6">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/contacts" element={<Contacts />} />
          <Route path="/contacts/:id" element={<ContactDetail />} />
          <Route path="/pipeline" element={<Pipeline />} />
          <Route path="/tasks" element={<Tasks />} />
          <Route path="/templates" element={<Templates />} />
          <Route path="/sequences" element={<Sequences />} />
          <Route path="/appointments" element={<Appointments />} />
          <Route path="/communications" element={<Communications />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/events" element={<Events />} />
          <Route path="/marketing" element={<MarketingDashboard />} />
          <Route path="/marketing/districts" element={<MarketingDistricts />} />
          <Route path="/marketing/districts/:id" element={<MarketingDistrictDetail />} />
          <Route path="/marketing/campaigns" element={<MarketingCampaigns />} />
          <Route path="/marketing/campaigns/:id" element={<MarketingCampaignDetail />} />
          <Route path="/marketing/webinars" element={<MarketingWebinars />} />
          <Route path="/marketing/ads" element={<MarketingAds />} />
          <Route
            path="/operations/quo"
            element={
              <AdminOnly>
                <QuoStatus />
              </AdminOnly>
            }
          />
          <Route
            path="/operations/leads"
            element={
              <AdminOnly>
                <LeadScoring />
              </AdminOnly>
            }
          />
          <Route
            path="/operations/automation"
            element={
              <AdminOnly>
                <AutomationActivity />
              </AdminOnly>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}
