// Map a route pathname to a stable, human-friendly label that can be used for
// staff-comments grouping, analytics aggregation, and the feedback widget.
// Dynamic segments (numeric ids) are normalized to ":id" so e.g.
// "/contacts/123" and "/contacts/456" share a single label.

const STATIC_LABELS: Record<string, string> = {
  '/': 'Dashboard',
  '/contacts': 'Contacts',
  '/contacts/:id': 'Contact Detail',
  '/pipeline': 'Pipeline',
  '/tasks': 'Tasks',
  '/templates': 'Templates',
  '/sequences': 'Sequences',
  '/appointments': 'Appointments',
  '/communications': 'Communications',
  '/reports': 'Reports',
  '/settings': 'Settings',
  '/users': 'Users',
  '/events': 'Events',
  '/marketing': 'Marketing — Dashboard',
  '/marketing/districts': 'Marketing — Districts',
  '/marketing/districts/:id': 'Marketing — District Detail',
  '/marketing/campaigns': 'Marketing — Campaigns',
  '/marketing/campaigns/:id': 'Marketing — Campaign Detail',
  '/marketing/webinars': 'Marketing — Webinars',
  '/marketing/ads': 'Marketing — Ads',
  '/operations/quo': 'Operations — Quo Status',
  '/operations/leads': 'Operations — Lead Scoring',
  '/operations/automation': 'Operations — Automation Activity',
  '/operations/feedback': 'Operations — Staff Feedback',
  '/operations/analytics': 'Operations — Analytics',
  '/changelog': 'Changelog',
  '/login': 'Login',
};

/**
 * Replace numeric path segments with ":id" so that detail pages collapse to
 * a single bucket for analytics + comments.
 */
export function normalizePath(pathname: string): string {
  return (
    '/' +
    pathname
      .split('/')
      .filter(Boolean)
      .map((seg) => (/^\d+$/.test(seg) ? ':id' : seg))
      .join('/')
  );
}

export function labelForPath(pathname: string): string {
  const norm = normalizePath(pathname);
  if (STATIC_LABELS[norm]) return STATIC_LABELS[norm];
  // Fallback: title-case the last segment.
  const last = norm.split('/').filter(Boolean).pop() || 'Home';
  return last
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
