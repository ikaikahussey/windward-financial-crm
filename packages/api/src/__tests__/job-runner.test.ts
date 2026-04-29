import { describe, it, expect } from 'vitest';
import { db } from '../db';
import { jobRuns } from '../db/schema';
import { eq } from 'drizzle-orm';
import { runJob } from '../services/job-runner';

describe('runJob', () => {
  it('writes a running row, then success on resolve', async () => {
    let observedStatusDuringRun: string | null = null;
    let observedRunId: number | null = null;
    await runJob('test-success', 'manual', null, async (ctx) => {
      observedRunId = ctx.runId;
      const [row] = await db
        .select({ status: jobRuns.status })
        .from(jobRuns)
        .where(eq(jobRuns.id, ctx.runId));
      observedStatusDuringRun = row?.status ?? null;
      ctx.incrementProcessed();
    });
    expect(observedStatusDuringRun).toBe('running');
    expect(observedRunId).not.toBeNull();
    const [row] = await db
      .select()
      .from(jobRuns)
      .where(eq(jobRuns.id, observedRunId!));
    expect(row.status).toBe('success');
    expect(row.itemsProcessed).toBe(1);
    expect(row.finishedAt).not.toBeNull();
  });

  it('marks failed when the function throws', async () => {
    let runId = -1;
    await expect(
      runJob('test-throw', 'manual', null, async (ctx) => {
        runId = ctx.runId;
        throw new Error('boom');
      }),
    ).rejects.toThrow('boom');
    const [row] = await db.select().from(jobRuns).where(eq(jobRuns.id, runId));
    expect(row.status).toBe('failed');
    expect(row.error).toContain('boom');
  });

  it('marks partial when items_failed > 0 and items_processed > 0', async () => {
    let runId = -1;
    await runJob('test-partial', 'manual', null, async (ctx) => {
      runId = ctx.runId;
      ctx.incrementProcessed(3);
      ctx.incrementFailed(1);
    });
    const [row] = await db.select().from(jobRuns).where(eq(jobRuns.id, runId));
    expect(row.status).toBe('partial');
    expect(row.itemsProcessed).toBe(3);
    expect(row.itemsFailed).toBe(1);
  });
});
