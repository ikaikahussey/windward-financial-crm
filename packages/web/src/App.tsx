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
import CmsPages from '@/pages/cms/Pages';
import CmsTestimonials from '@/pages/cms/Testimonials';
import CmsTeam from '@/pages/cms/Team';
import CmsEvents from '@/pages/cms/Events';
import CmsBlog from '@/pages/cms/Blog';
import CmsSubscribers from '@/pages/cms/Subscribers';
import MarketingDashboard from '@/pages/marketing/Dashboard';
import MarketingDistricts from '@/pages/marketing/Districts';
import MarketingCampaigns from '@/pages/marketing/Campaigns';
import MarketingCampaignDetail from '@/pages/marketing/CampaignDetail';
import MarketingWebinars from '@/pages/marketing/Webinars';
import MarketingAds from '@/pages/marketing/Ads';

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
          <Route path="/cms/pages" element={<CmsPages />} />
          <Route path="/cms/testimonials" element={<CmsTestimonials />} />
          <Route path="/cms/team" element={<CmsTeam />} />
          <Route path="/cms/events" element={<CmsEvents />} />
          <Route path="/cms/blog" element={<CmsBlog />} />
          <Route path="/cms/subscribers" element={<CmsSubscribers />} />
          <Route path="/marketing" element={<MarketingDashboard />} />
          <Route path="/marketing/districts" element={<MarketingDistricts />} />
          <Route path="/marketing/campaigns" element={<MarketingCampaigns />} />
          <Route path="/marketing/campaigns/:id" element={<MarketingCampaignDetail />} />
          <Route path="/marketing/webinars" element={<MarketingWebinars />} />
          <Route path="/marketing/ads" element={<MarketingAds />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}
