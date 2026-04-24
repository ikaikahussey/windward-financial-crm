import { useState } from 'react';

const navLinks = [
  { to: '/', label: 'Home' },
  { to: '/about', label: 'About' },
  { to: '/expertise', label: 'Expertise' },
  { to: '/quality-commitment', label: 'Quality Commitment' },
  { to: '/calculator', label: 'Calculator' },
  { to: '/events', label: 'Events' },
  { to: '/resources', label: 'Resources' },
  { to: '/contact', label: 'Contact' },
];

export default function Header({ currentPath }: { currentPath?: string }) {
  const [menuOpen, setMenuOpen] = useState(false);

  const isActive = (to: string) => {
    if (!currentPath) return false;
    if (to === '/') return currentPath === '/';
    return currentPath === to || currentPath.startsWith(`${to}/`);
  };

  return (
    <header className="bg-primary-dark text-white sticky top-0 z-50 shadow-lg">
      <div className="container-wide mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          <a href="/" className="flex items-center shrink-0">
            <img src="/logo.png" alt="Windward Financial" className="h-14 w-auto brightness-0 invert" />
          </a>

          <nav className="hidden lg:flex items-center gap-1">
            {navLinks.map(({ to, label }) => (
              <a
                key={to}
                href={to}
                className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  isActive(to)
                    ? 'bg-primary text-white'
                    : 'text-primary-light hover:bg-primary/50 hover:text-white'
                }`}
              >
                {label}
              </a>
            ))}
            <a
              href="/schedule-an-appointment"
              className="ml-2 bg-sand text-primary-dark text-sm font-semibold px-4 py-2 rounded-lg hover:bg-sand-dark transition-colors"
            >
              Schedule
            </a>
          </nav>

          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="lg:hidden p-2 rounded-md hover:bg-primary/50 transition-colors"
            aria-label="Toggle menu"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {menuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {menuOpen && (
          <nav className="lg:hidden pb-4 border-t border-primary/30 pt-3 space-y-1">
            {navLinks.map(({ to, label }) => (
              <a
                key={to}
                href={to}
                className={`block px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  isActive(to) ? 'bg-primary text-white' : 'text-primary-light hover:bg-primary/50'
                }`}
              >
                {label}
              </a>
            ))}
            <a
              href="/schedule-an-appointment"
              className="block mx-4 mt-3 bg-sand text-primary-dark text-sm font-semibold px-4 py-2 rounded-lg text-center hover:bg-sand-dark transition-colors"
            >
              Schedule an Appointment
            </a>
          </nav>
        )}
      </div>
    </header>
  );
}
