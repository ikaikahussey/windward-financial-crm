import { useState } from 'react';

interface NavLink {
  href: string;
  label: string;
}

interface Props {
  navLinks: NavLink[];
  currentPath: string;
}

export default function MobileMenu({ navLinks, currentPath }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div className="lg:hidden">
      <button
        onClick={() => setOpen(!open)}
        className="p-2 rounded-md hover:bg-primary/50 transition-colors text-white"
        aria-label="Toggle menu"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          {open ? (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          )}
        </svg>
      </button>

      {open && (
        <nav className="absolute left-0 right-0 top-20 bg-primary-dark border-t border-primary/30 px-4 pb-4 pt-3 space-y-1 shadow-lg">
          {navLinks.map(({ href, label }) => {
            const linkPath = href.replace(/\/$/, '') || '/';
            const isActive = linkPath === currentPath;
            return (
              <a
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className={`block px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  isActive
                    ? 'bg-primary text-white'
                    : 'text-primary-light hover:bg-primary/50'
                }`}
              >
                {label}
              </a>
            );
          })}
          <a
            href="/schedule-an-appointment"
            onClick={() => setOpen(false)}
            className="block mx-0 mt-3 bg-sand text-primary-dark text-sm font-semibold px-4 py-2 rounded-lg text-center hover:bg-sand-dark transition-colors"
          >
            Schedule an Appointment
          </a>
        </nav>
      )}
    </div>
  );
}
