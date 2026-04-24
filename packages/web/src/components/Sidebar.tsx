import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Users,
  Kanban,
  CheckSquare,
  Calendar,
  CalendarDays,
  MessageSquare,
  Mail,
  BarChart3,
  Target,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';

const mainLinks = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/contacts', icon: Users, label: 'Contacts' },
  { to: '/pipeline', icon: Kanban, label: 'Pipeline' },
  { to: '/tasks', icon: CheckSquare, label: 'Tasks' },
  { to: '/appointments', icon: Calendar, label: 'Appointments' },
  { to: '/events', icon: CalendarDays, label: 'Events' },
  { to: '/communications', icon: MessageSquare, label: 'Communications' },
  { to: '/templates', icon: Mail, label: 'Templates' },
  { to: '/reports', icon: BarChart3, label: 'Reports' },
];

const marketingLinks = [
  { to: '/marketing', label: 'Dashboard' },
  { to: '/marketing/districts', label: 'Districts' },
  { to: '/marketing/campaigns', label: 'Campaigns' },
  { to: '/marketing/webinars', label: 'Webinars' },
  { to: '/marketing/ads', label: 'Ad Campaigns' },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [marketingOpen, setMarketingOpen] = useState(false);
  const location = useLocation();

  const isMarketingActive = location.pathname.startsWith('/marketing');

  const navContent = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-4 py-5 border-b border-primary-dark/30">
        <img src="/logo.png" alt="Windward Financial" className="h-10 w-auto brightness-0 invert" />
        <p className="text-xs text-primary-light/70 mt-1.5">Admin CRM</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
        {mainLinks.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.to === '/'}
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary-light/20 text-white'
                  : 'text-primary-light/70 hover:bg-primary-dark/50 hover:text-white'
              )
            }
          >
            <link.icon className="h-4 w-4 shrink-0" />
            {link.label}
          </NavLink>
        ))}

        {/* Marketing Section */}
        <button
          onClick={() => setMarketingOpen(!marketingOpen)}
          className={cn(
            'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors w-full',
            isMarketingActive
              ? 'bg-primary-light/20 text-white'
              : 'text-primary-light/70 hover:bg-primary-dark/50 hover:text-white'
          )}
        >
          <Target className="h-4 w-4 shrink-0" />
          <span className="flex-1 text-left">Marketing</span>
          {marketingOpen || isMarketingActive ? (
            <ChevronDown className="h-3 w-3" />
          ) : (
            <ChevronRight className="h-3 w-3" />
          )}
        </button>
        {(marketingOpen || isMarketingActive) && (
          <div className="ml-7 space-y-0.5">
            {marketingLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to === '/marketing'}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  cn(
                    'block px-3 py-2 rounded-md text-sm transition-colors',
                    isActive
                      ? 'text-white bg-primary-dark/50'
                      : 'text-primary-light/60 hover:text-white hover:bg-primary-dark/30'
                  )
                }
              >
                {link.label}
              </NavLink>
            ))}
          </div>
        )}

        <NavLink
          to="/settings"
          onClick={() => setMobileOpen(false)}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
              isActive
                ? 'bg-primary-light/20 text-white'
                : 'text-primary-light/70 hover:bg-primary-dark/50 hover:text-white'
            )
          }
        >
          <Settings className="h-4 w-4 shrink-0" />
          Settings
        </NavLink>
      </nav>

      {/* User section */}
      <div className="border-t border-primary-dark/30 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="min-w-0">
            <p className="text-sm font-medium text-white truncate">{user?.name}</p>
            <p className="text-xs text-primary-light/60 truncate">{user?.role}</p>
          </div>
          <button
            onClick={logout}
            className="p-2 rounded-lg text-primary-light/60 hover:text-white hover:bg-primary-dark/50 transition-colors"
            title="Logout"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-primary text-white shadow-lg"
      >
        {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-30"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed lg:static inset-y-0 left-0 z-40 w-64 bg-primary-dark transition-transform duration-200',
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {navContent}
      </aside>
    </>
  );
}
