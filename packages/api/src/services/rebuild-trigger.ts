export interface RebuildResult {
  configured: boolean;
  triggered: boolean;
  status?: number;
  error?: string;
}

/**
 * POST to the configured rebuild webhook (typically a Railway deploy hook
 * for the public Astro site). When REBUILD_WEBHOOK_URL is unset, returns
 * `{configured: false, triggered: false}` so callers can surface the state.
 *
 * Failures are caught and reported in the result rather than thrown, since
 * automatic callers (event create/update/delete) shouldn't fail just
 * because the public-site rebuild hook is down.
 */
export async function triggerRebuild(reason: string): Promise<RebuildResult> {
  const url = process.env.REBUILD_WEBHOOK_URL;
  if (!url) return { configured: false, triggered: false };

  try {
    const res = await fetch(url, { method: 'POST' });
    console.log(`[rebuild] triggered (${reason}) → ${res.status}`);
    if (!res.ok) {
      return {
        configured: true,
        triggered: false,
        status: res.status,
        error: `Webhook returned ${res.status}`,
      };
    }
    return { configured: true, triggered: true, status: res.status };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[rebuild] failed:', err);
    return { configured: true, triggered: false, error: msg };
  }
}

export function isRebuildConfigured(): boolean {
  return Boolean(process.env.REBUILD_WEBHOOK_URL);
}
