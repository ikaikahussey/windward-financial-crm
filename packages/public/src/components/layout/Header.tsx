import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';

const navLinks = [
  { to: '/', label: 'Home' },
  { to: '/about', label: 'About' },
  { to: '/expertise', label: 'Expertise' },
  { to: '/quality-commitment', label: 'Quality Commitment' },
  { to: '/calculator', label: 'Calculator' },
  { to: '/events', label: 'Events' },
  { to: '/blog', label: 'Blog' },
  { to: '/resources', label: 'Resources' },
  { to: '/section-125', label: 'Section 125' },
  { to: '/contact', label: 'Contact' },
];

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="bg-primary-dark text-white sticky top-0 z-50 shadow-lg">
      <div className="container-wide mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <Link to="/" className="flex items-center shrink-0">
            <img src="/logo.png" alt="Windward Financial" className="h-14 w-auto brightness-0 invert" />
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-1">
            {navLinks.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    isActive
                      ? 'bg-primary text-white'
                      : 'text-primary-light hover:bg-primary/50 hover:text-white'
                  }`
                }
              >
                {label}
              </NavLink>
            ))}
            <Link to="/schedule-an-appointment" className="ml-2 bg-sand text-primary-dark text-sm font-semibold px-4 py-2 rounded-lg hover:bg-sand-dark transition-colors">
              Schedule
            </Link>
          </nav>

          {/* Hamburger */}
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

        {/* Mobile Nav */}
        {menuOpen && (
          <nav className="lg:hidden pb-4 border-t border-primary/30 pt-3 space-y-1">
            {navLinks.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                onClick={() => setMenuOpen(false)}
                className={({ isActive }) =>
                  `block px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                    isActive
                      ? 'bg-primary text-white'
                      : 'text-primary-light hover:bg-primary/50'
                  }`
                }
              >
                {label}
              </NavLink>
            ))}
            <Link
              to="/schedule-an-appointment"
              onClick={() => setMenuOpen(false)}
              className="block mx-4 mt-3 bg-sand text-primary-dark text-sm font-semibold px-4 py-2 rounded-lg text-center hover:bg-sand-dark transition-colors"
            >
              Schedule an Appointment
            </Link>
          </nav>
        )}
      </div>
    </header>
  );
}
