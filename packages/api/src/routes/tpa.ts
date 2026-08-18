import { Router, Request, Response } from 'express';
import { db } from '../db';
import {
  tpaPlans,
  tpaVendors,
  tpaPlanVendors,
  tpaParticipants,
  tpaSras,
  tpaRemittanceBatches,
  tpaContributions,
  tpaTransactions,
  users,
} from '../db/schema';
import { eq, and, desc, asc, sql, getTableColumns, inArray } from 'drizzle-orm';

const router = Router();

const parseId = (raw: string | string[]) => parseInt(raw as string, 10);
const toDate = (v: unknown) => (v ? new Date(v as string) : null);
const toAmount = (v: unknown) => {
  const n = parseFloat(v as string);
  return Number.isNaN(n) ? null : n.toFixed(2);
};

// ─────────────────────────── Plans ───────────────────────────

router.get('/plans', async (_req: Request, res: Response) => {
  try {
    const plans = await db.select().from(tpaPlans).orderBy(asc(tpaPlans.employerName));
    const links = await db
      .select({
        planId: tpaPlanVendors.planId,
        vendorId: tpaPlanVendors.vendorId,
        vendorName: tpaVendors.name,
      })
      .from(tpaPlanVendors)
      .leftJoin(tpaVendors, eq(tpaPlanVendors.vendorId, tpaVendors.id));
    const counts = await db
      .select({ planId: tpaParticipants.planId, count: sql<number>`count(*)::int` })
      .from(tpaParticipants)
      .groupBy(tpaParticipants.planId);

    const countByPlan = new Map(counts.map((c) => [c.planId, c.count]));
    return res.json(
      plans.map((p) => ({
        ...p,
        participantCount: countByPlan.get(p.id) || 0,
        vendors: links.filter((l) => l.planId === p.id).map((l) => ({ id: l.vendorId, name: l.vendorName })),
      })),
    );
  } catch (error) {
    console.error('List TPA plans error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/plans', async (req: Request, res: Response) => {
  try {
    const { employerName, planName, planType, planNumber, effectiveDate, payPeriodsPerYear, planDocumentUrl, notes } = req.body;
    if (!employerName || !planName) {
      return res.status(400).json({ error: 'employerName and planName are required' });
    }
    const [plan] = await db.insert(tpaPlans).values({
      employerName,
      planName,
      planType: planType || '403(b)',
      planNumber: planNumber || null,
      effectiveDate: toDate(effectiveDate),
      payPeriodsPerYear: payPeriodsPerYear ? parseInt(payPeriodsPerYear, 10) : 24,
      planDocumentUrl: planDocumentUrl || null,
      notes: notes || null,
    }).returning();
    return res.status(201).json(plan);
  } catch (error) {
    console.error('Create TPA plan error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/plans/:id', async (req: Request, res: Response) => {
  try {
    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    const b = req.body;
    if (b.employerName !== undefined) updateData.employerName = b.employerName;
    if (b.planName !== undefined) updateData.planName = b.planName;
    if (b.planType !== undefined) updateData.planType = b.planType;
    if (b.planNumber !== undefined) updateData.planNumber = b.planNumber || null;
    if (b.effectiveDate !== undefined) updateData.effectiveDate = toDate(b.effectiveDate);
    if (b.payPeriodsPerYear !== undefined) updateData.payPeriodsPerYear = parseInt(b.payPeriodsPerYear, 10) || 24;
    if (b.planDocumentUrl !== undefined) updateData.planDocumentUrl = b.planDocumentUrl || null;
    if (b.isActive !== undefined) updateData.isActive = !!b.isActive;
    if (b.notes !== undefined) updateData.notes = b.notes || null;

    const [updated] = await db.update(tpaPlans).set(updateData).where(eq(tpaPlans.id, parseId(req.params.id))).returning();
    if (!updated) return res.status(404).json({ error: 'Plan not found' });
    return res.json(updated);
  } catch (error) {
    console.error('Update TPA plan error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Replace the approved-vendor list for a plan.
router.put('/plans/:id/vendors', async (req: Request, res: Response) => {
  try {
    const planId = parseId(req.params.id);
    const vendorIds: number[] = Array.isArray(req.body.vendorIds) ? req.body.vendorIds.map(Number) : [];
    await db.delete(tpaPlanVendors).where(eq(tpaPlanVendors.planId, planId));
    if (vendorIds.length > 0) {
      await db.insert(tpaPlanVendors).values(vendorIds.map((vendorId) => ({ planId, vendorId })));
    }
    return res.json({ planId, vendorIds });
  } catch (error) {
    console.error('Set plan vendors error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─────────────────────────── Vendors ───────────────────────────

router.get('/vendors', async (_req: Request, res: Response) => {
  try {
    const rows = await db.select().from(tpaVendors).orderBy(asc(tpaVendors.name));
    return res.json(rows);
  } catch (error) {
    console.error('List TPA vendors error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/vendors', async (req: Request, res: Response) => {
  try {
    const { name, contactEmail, contactPhone, website, notes } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });
    const [vendor] = await db.insert(tpaVendors).values({
      name,
      contactEmail: contactEmail || null,
      contactPhone: contactPhone || null,
      website: website || null,
      notes: notes || null,
    }).returning();
    return res.status(201).json(vendor);
  } catch (error) {
    console.error('Create TPA vendor error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/vendors/:id', async (req: Request, res: Response) => {
  try {
    const updateData: Record<string, unknown> = {};
    const b = req.body;
    for (const key of ['name', 'contactEmail', 'contactPhone', 'website', 'notes'] as const) {
      if (b[key] !== undefined) updateData[key] = b[key] || null;
    }
    if (!updateData.name && b.name !== undefined) return res.status(400).json({ error: 'name cannot be empty' });
    const [updated] = await db.update(tpaVendors).set(updateData).where(eq(tpaVendors.id, parseId(req.params.id))).returning();
    if (!updated) return res.status(404).json({ error: 'Vendor not found' });
    return res.json(updated);
  } catch (error) {
    console.error('Update TPA vendor error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─────────────────────────── Participants ───────────────────────────

router.get('/participants', async (req: Request, res: Response) => {
  try {
    const { plan_id } = req.query;
    const base = db
      .select({
        ...getTableColumns(tpaParticipants),
        planName: tpaPlans.planName,
        employerName: tpaPlans.employerName,
      })
      .from(tpaParticipants)
      .leftJoin(tpaPlans, eq(tpaParticipants.planId, tpaPlans.id));

    const rows = plan_id
      ? await base.where(eq(tpaParticipants.planId, parseId(plan_id as string))).orderBy(asc(tpaParticipants.lastName))
      : await base.orderBy(asc(tpaParticipants.lastName));

    // Attach SRAs so the UI can show deferral setup without extra round trips.
    const ids = rows.map((r) => r.id);
    const sras = ids.length
      ? await db
          .select({ ...getTableColumns(tpaSras), vendorName: tpaVendors.name })
          .from(tpaSras)
          .leftJoin(tpaVendors, eq(tpaSras.vendorId, tpaVendors.id))
          .where(inArray(tpaSras.participantId, ids))
      : [];

    return res.json(rows.map((r) => ({ ...r, sras: sras.filter((s) => s.participantId === r.id) })));
  } catch (error) {
    console.error('List TPA participants error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/participants', async (req: Request, res: Response) => {
  try {
    const b = req.body;
    if (!b.planId || !b.firstName || !b.lastName) {
      return res.status(400).json({ error: 'planId, firstName, and lastName are required' });
    }
    const [row] = await db.insert(tpaParticipants).values({
      planId: b.planId,
      contactId: b.contactId || null,
      firstName: b.firstName,
      lastName: b.lastName,
      email: b.email || null,
      phone: b.phone || null,
      employeeId: b.employeeId || null,
      birthDate: toDate(b.birthDate),
      hireDate: toDate(b.hireDate),
      status: b.status || 'Active',
      notes: b.notes || null,
    }).returning();
    return res.status(201).json(row);
  } catch (error) {
    console.error('Create TPA participant error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/participants/:id', async (req: Request, res: Response) => {
  try {
    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    const b = req.body;
    if (b.planId !== undefined) updateData.planId = b.planId;
    if (b.contactId !== undefined) updateData.contactId = b.contactId || null;
    if (b.firstName !== undefined) updateData.firstName = b.firstName;
    if (b.lastName !== undefined) updateData.lastName = b.lastName;
    if (b.email !== undefined) updateData.email = b.email || null;
    if (b.phone !== undefined) updateData.phone = b.phone || null;
    if (b.employeeId !== undefined) updateData.employeeId = b.employeeId || null;
    if (b.birthDate !== undefined) updateData.birthDate = toDate(b.birthDate);
    if (b.hireDate !== undefined) updateData.hireDate = toDate(b.hireDate);
    if (b.status !== undefined) updateData.status = b.status;
    if (b.notes !== undefined) updateData.notes = b.notes || null;

    const [updated] = await db.update(tpaParticipants).set(updateData).where(eq(tpaParticipants.id, parseId(req.params.id))).returning();
    if (!updated) return res.status(404).json({ error: 'Participant not found' });
    return res.json(updated);
  } catch (error) {
    console.error('Update TPA participant error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─────────────────────────── SRAs ───────────────────────────

router.post('/sras', async (req: Request, res: Response) => {
  try {
    const b = req.body;
    const amount = toAmount(b.perPayAmount);
    if (!b.participantId || !b.vendorId || amount === null) {
      return res.status(400).json({ error: 'participantId, vendorId, and perPayAmount are required' });
    }
    const [row] = await db.insert(tpaSras).values({
      participantId: b.participantId,
      vendorId: b.vendorId,
      contributionType: b.contributionType || 'Employee Pre-Tax',
      perPayAmount: amount,
      effectiveDate: toDate(b.effectiveDate),
      signedDate: toDate(b.signedDate),
      status: b.status || 'Pending',
      notes: b.notes || null,
    }).returning();
    return res.status(201).json(row);
  } catch (error) {
    console.error('Create TPA SRA error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/sras/:id', async (req: Request, res: Response) => {
  try {
    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    const b = req.body;
    if (b.vendorId !== undefined) updateData.vendorId = b.vendorId;
    if (b.contributionType !== undefined) updateData.contributionType = b.contributionType;
    if (b.perPayAmount !== undefined) {
      const amount = toAmount(b.perPayAmount);
      if (amount === null) return res.status(400).json({ error: 'perPayAmount must be a number' });
      updateData.perPayAmount = amount;
    }
    if (b.effectiveDate !== undefined) updateData.effectiveDate = toDate(b.effectiveDate);
    if (b.signedDate !== undefined) updateData.signedDate = toDate(b.signedDate);
    if (b.status !== undefined) updateData.status = b.status;
    if (b.notes !== undefined) updateData.notes = b.notes || null;

    const [updated] = await db.update(tpaSras).set(updateData).where(eq(tpaSras.id, parseId(req.params.id))).returning();
    if (!updated) return res.status(404).json({ error: 'SRA not found' });
    return res.json(updated);
  } catch (error) {
    console.error('Update TPA SRA error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/sras/:id', async (req: Request, res: Response) => {
  try {
    const [deleted] = await db.delete(tpaSras).where(eq(tpaSras.id, parseId(req.params.id))).returning();
    if (!deleted) return res.status(404).json({ error: 'SRA not found' });
    return res.json({ message: 'SRA deleted' });
  } catch (error) {
    console.error('Delete TPA SRA error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─────────────────────────── Remittance batches ───────────────────────────

router.get('/batches', async (_req: Request, res: Response) => {
  try {
    const rows = await db
      .select({
        ...getTableColumns(tpaRemittanceBatches),
        planName: tpaPlans.planName,
        employerName: tpaPlans.employerName,
        total: sql<string>`coalesce((select sum(amount) from tpa_contributions c where c.batch_id = ${tpaRemittanceBatches.id}), 0)`,
        lineCount: sql<number>`(select count(*)::int from tpa_contributions c where c.batch_id = ${tpaRemittanceBatches.id})`,
      })
      .from(tpaRemittanceBatches)
      .leftJoin(tpaPlans, eq(tpaRemittanceBatches.planId, tpaPlans.id))
      .orderBy(desc(tpaRemittanceBatches.payDate));
    return res.json(rows);
  } catch (error) {
    console.error('List TPA batches error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/batches/:id', async (req: Request, res: Response) => {
  try {
    const id = parseId(req.params.id);
    const [batch] = await db
      .select({
        ...getTableColumns(tpaRemittanceBatches),
        planName: tpaPlans.planName,
        employerName: tpaPlans.employerName,
      })
      .from(tpaRemittanceBatches)
      .leftJoin(tpaPlans, eq(tpaRemittanceBatches.planId, tpaPlans.id))
      .where(eq(tpaRemittanceBatches.id, id))
      .limit(1);
    if (!batch) return res.status(404).json({ error: 'Batch not found' });

    const lines = await db
      .select({
        ...getTableColumns(tpaContributions),
        participantFirstName: tpaParticipants.firstName,
        participantLastName: tpaParticipants.lastName,
        vendorName: tpaVendors.name,
      })
      .from(tpaContributions)
      .leftJoin(tpaParticipants, eq(tpaContributions.participantId, tpaParticipants.id))
      .leftJoin(tpaVendors, eq(tpaContributions.vendorId, tpaVendors.id))
      .where(eq(tpaContributions.batchId, id))
      .orderBy(asc(tpaParticipants.lastName));

    return res.json({ ...batch, lines });
  } catch (error) {
    console.error('Get TPA batch error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/batches', async (req: Request, res: Response) => {
  try {
    const { planId, payDate, notes } = req.body;
    if (!planId || !payDate) return res.status(400).json({ error: 'planId and payDate are required' });
    const [batch] = await db.insert(tpaRemittanceBatches).values({
      planId,
      payDate: new Date(payDate),
      notes: notes || null,
      createdBy: req.session.userId,
    }).returning();
    return res.status(201).json(batch);
  } catch (error) {
    console.error('Create TPA batch error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Prefill a batch from every Active SRA for the plan's participants.
router.post('/batches/:id/prefill', async (req: Request, res: Response) => {
  try {
    const id = parseId(req.params.id);
    const [batch] = await db.select().from(tpaRemittanceBatches).where(eq(tpaRemittanceBatches.id, id)).limit(1);
    if (!batch) return res.status(404).json({ error: 'Batch not found' });
    if (batch.status !== 'Open') return res.status(400).json({ error: 'Batch is not open' });

    const result = await db.execute(sql`
      INSERT INTO tpa_contributions (batch_id, participant_id, vendor_id, contribution_type, amount)
      SELECT ${id}, s.participant_id, s.vendor_id, s.contribution_type, s.per_pay_amount
      FROM tpa_sras s
      JOIN tpa_participants p ON p.id = s.participant_id
      WHERE s.status = 'Active'
        AND p.status = 'Active'
        AND p.plan_id = ${batch.planId}
        AND NOT EXISTS (
          SELECT 1 FROM tpa_contributions c
          WHERE c.batch_id = ${id}
            AND c.participant_id = s.participant_id
            AND c.vendor_id = s.vendor_id
            AND c.contribution_type = s.contribution_type
        )
      RETURNING id
    `);
    return res.json({ added: result.length });
  } catch (error) {
    console.error('Prefill TPA batch error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/batches/:id', async (req: Request, res: Response) => {
  try {
    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    const b = req.body;
    if (b.payDate !== undefined) updateData.payDate = new Date(b.payDate);
    if (b.status !== undefined) updateData.status = b.status;
    if (b.notes !== undefined) updateData.notes = b.notes || null;
    const [updated] = await db.update(tpaRemittanceBatches).set(updateData).where(eq(tpaRemittanceBatches.id, parseId(req.params.id))).returning();
    if (!updated) return res.status(404).json({ error: 'Batch not found' });
    return res.json(updated);
  } catch (error) {
    console.error('Update TPA batch error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/batches/:id', async (req: Request, res: Response) => {
  try {
    const id = parseId(req.params.id);
    const [batch] = await db.select().from(tpaRemittanceBatches).where(eq(tpaRemittanceBatches.id, id)).limit(1);
    if (!batch) return res.status(404).json({ error: 'Batch not found' });
    if (batch.status !== 'Open') return res.status(400).json({ error: 'Only open batches can be deleted' });
    await db.delete(tpaContributions).where(eq(tpaContributions.batchId, id));
    await db.delete(tpaRemittanceBatches).where(eq(tpaRemittanceBatches.id, id));
    return res.json({ message: 'Batch deleted' });
  } catch (error) {
    console.error('Delete TPA batch error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─────────────────────────── Contribution lines ───────────────────────────

router.post('/contributions', async (req: Request, res: Response) => {
  try {
    const b = req.body;
    const amount = toAmount(b.amount);
    if (!b.batchId || !b.participantId || !b.vendorId || amount === null) {
      return res.status(400).json({ error: 'batchId, participantId, vendorId, and amount are required' });
    }
    const [batch] = await db.select().from(tpaRemittanceBatches).where(eq(tpaRemittanceBatches.id, b.batchId)).limit(1);
    if (!batch) return res.status(404).json({ error: 'Batch not found' });
    if (batch.status !== 'Open') return res.status(400).json({ error: 'Batch is not open' });

    const [row] = await db.insert(tpaContributions).values({
      batchId: b.batchId,
      participantId: b.participantId,
      vendorId: b.vendorId,
      contributionType: b.contributionType || 'Employee Pre-Tax',
      amount,
    }).returning();
    return res.status(201).json(row);
  } catch (error) {
    console.error('Create TPA contribution error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/contributions/:id', async (req: Request, res: Response) => {
  try {
    const updateData: Record<string, unknown> = {};
    const b = req.body;
    if (b.amount !== undefined) {
      const amount = toAmount(b.amount);
      if (amount === null) return res.status(400).json({ error: 'amount must be a number' });
      updateData.amount = amount;
    }
    if (b.contributionType !== undefined) updateData.contributionType = b.contributionType;
    if (b.vendorId !== undefined) updateData.vendorId = b.vendorId;
    const [updated] = await db.update(tpaContributions).set(updateData).where(eq(tpaContributions.id, parseId(req.params.id))).returning();
    if (!updated) return res.status(404).json({ error: 'Contribution not found' });
    return res.json(updated);
  } catch (error) {
    console.error('Update TPA contribution error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/contributions/:id', async (req: Request, res: Response) => {
  try {
    const [deleted] = await db.delete(tpaContributions).where(eq(tpaContributions.id, parseId(req.params.id))).returning();
    if (!deleted) return res.status(404).json({ error: 'Contribution not found' });
    return res.json({ message: 'Contribution deleted' });
  } catch (error) {
    console.error('Delete TPA contribution error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─────────────────────────── Transactions ───────────────────────────

router.get('/transactions', async (req: Request, res: Response) => {
  try {
    const { status } = req.query;
    const base = db
      .select({
        ...getTableColumns(tpaTransactions),
        participantFirstName: tpaParticipants.firstName,
        participantLastName: tpaParticipants.lastName,
        planId: tpaParticipants.planId,
        vendorName: tpaVendors.name,
        decidedByName: users.name,
      })
      .from(tpaTransactions)
      .leftJoin(tpaParticipants, eq(tpaTransactions.participantId, tpaParticipants.id))
      .leftJoin(tpaVendors, eq(tpaTransactions.vendorId, tpaVendors.id))
      .leftJoin(users, eq(tpaTransactions.decidedBy, users.id));

    const rows = status
      ? await base.where(eq(tpaTransactions.status, status as (typeof tpaTransactions.status.enumValues)[number])).orderBy(desc(tpaTransactions.requestedAt))
      : await base.orderBy(desc(tpaTransactions.requestedAt));
    return res.json(rows);
  } catch (error) {
    console.error('List TPA transactions error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/transactions', async (req: Request, res: Response) => {
  try {
    const b = req.body;
    if (!b.participantId || !b.txnType) {
      return res.status(400).json({ error: 'participantId and txnType are required' });
    }
    const [row] = await db.insert(tpaTransactions).values({
      participantId: b.participantId,
      vendorId: b.vendorId || null,
      txnType: b.txnType,
      amount: b.amount !== undefined && b.amount !== null && b.amount !== '' ? toAmount(b.amount) : null,
      requestedAt: b.requestedAt ? new Date(b.requestedAt) : new Date(),
      notes: b.notes || null,
    }).returning();
    return res.status(201).json(row);
  } catch (error) {
    console.error('Create TPA transaction error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Decide (approve/deny/complete/cancel) or edit a transaction.
router.patch('/transactions/:id', async (req: Request, res: Response) => {
  try {
    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    const b = req.body;
    if (b.txnType !== undefined) updateData.txnType = b.txnType;
    if (b.vendorId !== undefined) updateData.vendorId = b.vendorId || null;
    if (b.amount !== undefined) updateData.amount = b.amount === null || b.amount === '' ? null : toAmount(b.amount);
    if (b.notes !== undefined) updateData.notes = b.notes || null;
    if (b.decisionNotes !== undefined) updateData.decisionNotes = b.decisionNotes || null;
    if (b.status !== undefined) {
      updateData.status = b.status;
      // Stamp the decision when a reviewer moves it out of the queue.
      if (['Approved', 'Denied', 'Completed', 'Cancelled'].includes(b.status)) {
        updateData.decidedAt = new Date();
        updateData.decidedBy = req.session.userId;
      } else {
        updateData.decidedAt = null;
        updateData.decidedBy = null;
      }
    }
    const [updated] = await db.update(tpaTransactions).set(updateData).where(eq(tpaTransactions.id, parseId(req.params.id))).returning();
    if (!updated) return res.status(404).json({ error: 'Transaction not found' });
    return res.json(updated);
  } catch (error) {
    console.error('Update TPA transaction error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─────────────────────────── Compliance ───────────────────────────

// IRS elective deferral (402(g)) and total contribution (415(c)) limits.
const IRS_LIMITS: Record<number, { deferral: number; catchUp: number; total: number }> = {
  2024: { deferral: 23000, catchUp: 7500, total: 69000 },
  2025: { deferral: 23500, catchUp: 7500, total: 70000 },
  2026: { deferral: 24500, catchUp: 8000, total: 72000 },
};

router.get('/compliance', async (req: Request, res: Response) => {
  try {
    const year = parseInt((req.query.year as string) || `${new Date().getFullYear()}`, 10);
    const limits = IRS_LIMITS[year] || IRS_LIMITS[2026];

    const rows = await db.execute(sql`
      SELECT
        p.id AS participant_id,
        p.first_name,
        p.last_name,
        p.birth_date,
        p.status,
        pl.employer_name,
        pl.plan_name,
        COALESCE(SUM(c.amount) FILTER (WHERE c.contribution_type IN ('Employee Pre-Tax', 'Employee Roth')), 0) AS employee_deferrals,
        COALESCE(SUM(c.amount), 0) AS total_contributions
      FROM tpa_participants p
      JOIN tpa_plans pl ON pl.id = p.plan_id
      LEFT JOIN tpa_contributions c ON c.participant_id = p.id
      LEFT JOIN tpa_remittance_batches b ON b.id = c.batch_id
        AND date_part('year', b.pay_date) = ${year}
      WHERE c.id IS NULL OR b.id IS NOT NULL
      GROUP BY p.id, p.first_name, p.last_name, p.birth_date, p.status, pl.employer_name, pl.plan_name
      ORDER BY p.last_name, p.first_name
    `);

    const cutoff = new Date(`${year}-12-31`);
    const result = rows.map((r: Record<string, unknown>) => {
      const birthDate = r.birth_date ? new Date(r.birth_date as string) : null;
      const age = birthDate ? cutoff.getFullYear() - birthDate.getFullYear() : null;
      const catchUpEligible = age !== null && age >= 50;
      const deferralLimit = limits.deferral + (catchUpEligible ? limits.catchUp : 0);
      const deferrals = parseFloat(r.employee_deferrals as string) || 0;
      return {
        participantId: r.participant_id,
        firstName: r.first_name,
        lastName: r.last_name,
        status: r.status,
        employerName: r.employer_name,
        planName: r.plan_name,
        catchUpEligible,
        employeeDeferrals: deferrals.toFixed(2),
        totalContributions: (parseFloat(r.total_contributions as string) || 0).toFixed(2),
        deferralLimit,
        remaining: (deferralLimit - deferrals).toFixed(2),
        overLimit: deferrals > deferralLimit,
      };
    });

    return res.json({ year, limits, participants: result });
  } catch (error) {
    console.error('TPA compliance error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
