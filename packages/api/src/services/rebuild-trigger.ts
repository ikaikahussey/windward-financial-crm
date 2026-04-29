export async function triggerRebuild(reason: string): Promise<void> {
  const url = process.env.REBUILD_WEBHOOK_URL;
  if (!url) return;
  try {
    await fetch(url, { method: 'POST' });
    console.log(`[rebuild] triggered (${reason})`);
  } catch (err) {
    console.error('[rebuild] failed:', err);
  }
}
