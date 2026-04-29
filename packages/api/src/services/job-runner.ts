import { db } from '../db';
import { jobRuns } from '../db/schema';
import { eq } from 'drizzle-orm';

export type TriggeredBy = 'cron' | 'manual';
export type JobStatus = 'running' | 'success' | 'partial' | 'failed';

export interface JobContext {
  runId: number;
  incrementProcessed(n?: number): void;
  incrementFailed(n?: number): void;
  appendLog(line: string): void;
}

interface RunState {
  processed: number;
  failed: number;
  log: string[];
}

function statusFor(state: RunState, threw: boolean): Exclude<JobStatus, 'running'> {
  if (threw) return 'failed';
  if (state.failed > 0 && state.processed > 0) return 'partial';
  if (state.failed > 0) return 'failed';
  return 'success';
}

export async function runJob<T>(
  jobName: string,
  triggeredBy: TriggeredBy,
  userId: number | null,
  fn: (ctx: JobContext) => Promise<T>,
): Promise<T> {
  const [run] = await db
    .insert(jobRuns)
    .values({
      jobName,
      status: 'running',
      triggeredBy,
      triggeredByUserId: userId,
    })
    .returning({ id: jobRuns.id });

  const state: RunState = { processed: 0, failed: 0, log: [] };
  const ctx: JobContext = {
    runId: run.id,
    incrementProcessed(n = 1) {
      state.processed += n;
    },
    incrementFailed(n = 1) {
      state.failed += n;
    },
    appendLog(line: string) {
      state.log.push(line);
    },
  };

  try {
    const result = await fn(ctx);
    await db
      .update(jobRuns)
      .set({
        status: statusFor(state, false),
        finishedAt: new Date(),
        itemsProcessed: state.processed,
        itemsFailed: state.failed,
        log: state.log.length ? state.log.join('\n') : null,
      })
      .where(eq(jobRuns.id, run.id));
    return result;
  } catch (err) {
    const errMsg = err instanceof Error ? err.stack ?? err.message : String(err);
    await db
      .update(jobRuns)
      .set({
        status: 'failed',
        finishedAt: new Date(),
        itemsProcessed: state.processed,
        itemsFailed: state.failed,
        error: errMsg,
        log: state.log.length ? state.log.join('\n') : null,
      })
      .where(eq(jobRuns.id, run.id));
    throw err;
  }
}
