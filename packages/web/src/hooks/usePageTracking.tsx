import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { analyticsApi } from '@/lib/staff-feedback-api';
import { labelForPath, normalizePath } from '@/lib/page-labels';

const SESSION_STORAGE_KEY = 'wf-analytics-session-id';

function getSessionId(): string {
  try {
    let id = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!id) {
      id =
        (crypto.randomUUID && crypto.randomUUID()) ||
        `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      sessionStorage.setItem(SESSION_STORAGE_KEY, id);
    }
    return id;
  } catch {
    return `${Date.now()}`;
  }
}

/**
 * Track route changes. On navigation we send a `track` event for the page we
 * were just on (with duration), and start the timer for the new page. The
 * very last page is flushed via the visibilitychange / pagehide listener.
 */
export function usePageTracking(enabled: boolean) {
  const location = useLocation();
  const lastEntry = useRef<{
    pagePath: string;
    pageLabel: string;
    startedAt: number;
  } | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const sessionId = getSessionId();

    function flush(entry: typeof lastEntry.current) {
      if (!entry) return;
      const durationMs = Math.max(0, Date.now() - entry.startedAt);
      // Fire-and-forget; failures are silent so analytics never breaks UX.
      analyticsApi
        .track({
          pagePath: entry.pagePath,
          pageLabel: entry.pageLabel,
          sessionId,
          durationMs,
          referrer: document.referrer || null,
        })
        .catch(() => {});
    }

    // Flush previous page when navigating.
    flush(lastEntry.current);

    const normalized = normalizePath(location.pathname);
    lastEntry.current = {
      pagePath: normalized,
      pageLabel: labelForPath(location.pathname),
      startedAt: Date.now(),
    };
  }, [location.pathname, enabled]);

  // Best-effort flush on tab close / visibility change.
  useEffect(() => {
    if (!enabled) return;

    function onHide() {
      const entry = lastEntry.current;
      if (!entry) return;
      const payload = {
        pagePath: entry.pagePath,
        pageLabel: entry.pageLabel,
        sessionId: getSessionId(),
        durationMs: Math.max(0, Date.now() - entry.startedAt),
        referrer: document.referrer || null,
      };
      // sendBeacon doesn't include credentials cookies on all browsers and the
      // backend requires auth, so we fall back to fetch with keepalive.
      try {
        fetch('/api/analytics/track', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          keepalive: true,
          body: JSON.stringify(payload),
        }).catch(() => {});
      } catch {
        // ignore
      }
    }

    window.addEventListener('pagehide', onHide);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') onHide();
    });

    return () => {
      window.removeEventListener('pagehide', onHide);
    };
  }, [enabled]);
}
