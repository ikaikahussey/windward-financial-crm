import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';

const pageMeta: Record<string, { title: string; description: string }> = {
  '/': {
    title: 'Windward Financial | Retirement Planning for Hawaii Public Employees',
    description: 'Family-owned financial services company serving Hawaii\'s public employees since 1990. Insurance, annuities, and 403(b) retirement plans.',
  },
  '/about': {
    title: 'About Us | Windward Financial',
    description: 'Learn about our history, our team, and our commitment to serving Hawaii\'s public employees.',
  },
  '/expertise': {
    title: 'Our Expertise | Windward Financial',
    description: 'Insurance, annuities, and 403(b) savings plans designed for Hawaii public employees.',
  },
  '/quality-commitment': {
    title: 'Quality Commitment | Windward Financial',
    description: 'Our mission, competitive advantages, and commitment to excellence in financial services.',
  },
  '/contact': {
    title: 'Contact Us | Windward Financial',
    description: 'Get in touch with Windward Financial for a free consultation about your retirement planning needs.',
  },
  '/schedule-an-appointment': {
    title: 'Schedule an Appointment | Windward Financial',
    description: 'Book a free consultation with our financial planning team.',
  },
  '/events': {
    title: 'Events | Windward Financial',
    description: 'Upcoming financial education events and workshops for Hawaii public employees.',
  },
  '/calculator': {
    title: 'Retirement Calculator | Windward Financial',
    description: 'Calculate your retirement readiness with our free retirement planning calculator.',
  },
  '/enroll': {
    title: 'Enroll | Windward Financial',
    description: 'Enroll in HomeHealth Care benefits and retirement planning services.',
  },
  '/blog': {
    title: 'Blog | Windward Financial',
    description: 'Financial planning tips, retirement insights, and news for Hawaii public employees.',
  },
  '/resources': {
    title: 'Resources | Windward Financial',
    description: 'Helpful links and resources for Hawaii public employees.',
  },
};

function SEO() {
  const { pathname } = useLocation();

  useEffect(() => {
    const meta = pageMeta[pathname] || pageMeta['/']!;
    document.title = meta.title;
    const descEl = document.querySelector('meta[name="description"]');
    if (descEl) descEl.setAttribute('content', meta.description);
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen">
      <SEO />
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
