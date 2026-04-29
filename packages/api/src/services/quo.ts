import { db } from '../db';
import {
  quoPhoneNumbers,
  callLogs,
  smsMessages,
  contacts,
} from '../db/schema';
import { eq } from 'drizzle-orm';

interface QuoListOptions {
  maxResults?: number;
  pageToken?: string;
  createdAfter?: string;
  createdBefore?: string;
}

interface QuoPhoneNumber {
  id: string;
  phoneNumber: string;
  name?: string;
}

interface QuoCall {
  id: string;
  phoneNumberId: string;
  direction: 'inbound' | 'outbound';
  status: 'completed' | 'missed' | 'voicemail' | 'cancelled';
  duration: number;
  from: string;
  to: string;
  createdAt: string;
  completedAt?: string;
  participants: string[];
}

interface QuoMessage {
  id: string;
  phoneNumberId: string;
  direction: 'inbound' | 'outbound';
  body: string;
  from: string;
  to: string;
  status: string;
  createdAt: string;
}

class QuoService {
  private apiKey: string;
  private baseUrl = 'https://api.openphone.com/v1';

  constructor() {
    this.apiKey = process.env.QUO_API_KEY || '';
  }

  /**
   * Make an authenticated request to the OpenPhone API.
   * Handles 429 rate limits with exponential backoff (up to 3 retries).
   */
  private async request<T = any>(
    method: string,
    path: string,
    body?: any
  ): Promise<T> {
    const maxRetries = 3;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const url = `${this.baseUrl}${path}`;
      const options: RequestInit = {
        method,
        headers: {
          Authorization: this.apiKey,
          'Content-Type': 'application/json',
        },
      };

      if (body && method !== 'GET') {
        options.body = JSON.stringify(body);
      }

      const response = await fetch(url, options);

      if (response.status === 429) {
        // Rate limited — exponential backoff
        const retryAfter = response.headers.get('retry-after');
        const waitMs = retryAfter
          ? parseInt(retryAfter, 10) * 1000
          : Math.pow(2, attempt) * 1000;

        console.warn(
          `Quo API rate limited on ${method} ${path}. Retrying in ${waitMs}ms (attempt ${attempt + 1}/${maxRetries})`
        );
        await new Promise((resolve) => setTimeout(resolve, waitMs));
        continue;
      }

      if (!response.ok) {
        const errorBody = await response.text();
        lastError = new Error(
          `Quo API error ${response.status} on ${method} ${path}: ${errorBody}`
        );

        if (response.status >= 500 && attempt < maxRetries) {
          // Retry server errors
          await new Promise((resolve) =>
            setTimeout(resolve, Math.pow(2, attempt) * 1000)
          );
          continue;
        }

        throw lastError;
      }

      // 204 No Content
      if (response.status === 204) {
        return undefined as T;
      }

      return (await response.json()) as T;
    }

    throw lastError || new Error('Max retries exceeded');
  }

  // ── Phone Numbers ──

  async listPhoneNumbers(): Promise<QuoPhoneNumber[]> {
    const res = await this.request<{ data: QuoPhoneNumber[] }>(
      'GET',
      '/phone-numbers'
    );
    return res.data;
  }

  /**
   * Sync phone numbers from OpenPhone into the local database.
   */
  async syncPhoneNumbers(): Promise<void> {
    const phoneNumbers = await this.listPhoneNumbers();

    for (const pn of phoneNumbers) {
      const existing = await db
        .select()
        .from(quoPhoneNumbers)
        .where(eq(quoPhoneNumbers.quoPhoneNumberId, pn.id))
        .limit(1);

      if (existing.length > 0) {
        await db
          .update(quoPhoneNumbers)
          .set({
            phoneNumber: pn.phoneNumber,
            label: pn.name || null,
            syncedAt: new Date(),
          })
          .where(eq(quoPhoneNumbers.quoPhoneNumberId, pn.id));
      } else {
        await db.insert(quoPhoneNumbers).values({
          quoPhoneNumberId: pn.id,
          phoneNumber: pn.phoneNumber,
          label: pn.name || null,
          syncedAt: new Date(),
        });
      }
    }

    console.log(`Synced ${phoneNumbers.length} phone numbers from Quo`);
  }

  // ── Calls ──

  async listCalls(
    phoneNumberId: string,
    participant: string,
    opts?: QuoListOptions
  ): Promise<QuoCall[]> {
    const params = new URLSearchParams({
      phoneNumberId,
      participants: participant,
    });
    if (opts?.maxResults) params.set('maxResults', String(opts.maxResults));
    if (opts?.pageToken) params.set('pageToken', opts.pageToken);
    if (opts?.createdAfter) params.set('createdAfter', opts.createdAfter);
    if (opts?.createdBefore) params.set('createdBefore', opts.createdBefore);

    const res = await this.request<{ data: QuoCall[] }>(
      'GET',
      `/calls?${params.toString()}`
    );
    return res.data;
  }

  async getCall(callId: string): Promise<QuoCall> {
    const res = await this.request<{ data: QuoCall }>('GET', `/calls/${callId}`);
    return res.data;
  }

  async getRecordings(
    callId: string
  ): Promise<{ url: string; duration: number }[]> {
    const res = await this.request<{
      data: { url: string; duration: number }[];
    }>('GET', `/calls/${callId}/recordings`);
    return res.data;
  }

  async getTranscription(callId: string): Promise<string> {
    const res = await this.request<{ data: { transcript: string } }>(
      'GET',
      `/calls/${callId}/transcription`
    );
    return res.data.transcript;
  }

  async getSummary(callId: string): Promise<string> {
    const res = await this.request<{ data: { summary: string } }>(
      'GET',
      `/calls/${callId}/summary`
    );
    return res.data.summary;
  }

  // ── SMS ──

  async sendSMS(
    fromPhoneNumberId: string,
    to: string,
    content: string
  ): Promise<QuoMessage> {
    const res = await this.request<{ data: QuoMessage }>('POST', '/messages', {
      phoneNumberId: fromPhoneNumberId,
      to: [to],
      content,
    });
    return res.data;
  }

  async listMessages(
    phoneNumberId: string,
    participant: string,
    opts?: QuoListOptions
  ): Promise<QuoMessage[]> {
    const params = new URLSearchParams({
      phoneNumberId,
      participants: participant,
    });
    if (opts?.maxResults) params.set('maxResults', String(opts.maxResults));
    if (opts?.pageToken) params.set('pageToken', opts.pageToken);
    if (opts?.createdAfter) params.set('createdAfter', opts.createdAfter);
    if (opts?.createdBefore) params.set('createdBefore', opts.createdBefore);

    const res = await this.request<{ data: QuoMessage[] }>(
      'GET',
      `/messages?${params.toString()}`
    );
    return res.data;
  }

  // ── Webhooks ──

  /**
   * List all registered webhooks at OpenPhone. Returns an empty array if
   * the API key is not configured (so callers can degrade gracefully).
   */
  async listWebhooks(): Promise<Array<{ id: string; events: string[]; url: string }>> {
    if (!this.apiKey) return [];
    const res = await this.request<{ data: Array<{ id: string; events: string[]; url: string }> }>(
      'GET',
      '/webhooks',
    );
    return res.data ?? [];
  }

  isConfigured(): boolean {
    return Boolean(this.apiKey);
  }

  async registerWebhooks(baseUrl: string): Promise<void> {
    const webhookEvents = [
      'call.completed',
      'call.ringing',
      'message.received',
      'message.delivered',
    ];

    for (const event of webhookEvents) {
      try {
        await this.request('POST', '/webhooks', {
          url: `${baseUrl}/api/webhooks/quo`,
          events: [event],
        });
        console.log(`Registered webhook for ${event}`);
      } catch (err) {
        console.error(`Failed to register webhook for ${event}:`, err);
      }
    }
  }

  // ── Contact Matching ──

  /**
   * Find a contact by phone number. Strips formatting to match.
   */
  private async findContactByPhone(
    phone: string
  ): Promise<{ id: number } | null> {
    // Normalize to digits only for matching
    const digits = phone.replace(/\D/g, '');
    const allContacts = await db
      .select({ id: contacts.id, phone: contacts.phone })
      .from(contacts);

    for (const c of allContacts) {
      if (c.phone && c.phone.replace(/\D/g, '') === digits) {
        return { id: c.id };
      }
    }
    return null;
  }

  // ── Sync ──

  async syncCallsForContact(contactId: number): Promise<void> {
    const [contact] = await db
      .select({ phone: contacts.phone })
      .from(contacts)
      .where(eq(contacts.id, contactId))
      .limit(1);

    if (!contact?.phone) return;

    const phoneNumbers = await db.select().from(quoPhoneNumbers);

    for (const pn of phoneNumbers) {
      const calls = await this.listCalls(pn.quoPhoneNumberId, contact.phone);

      for (const call of calls) {
        // Check if already synced
        const existing = await db
          .select({ id: callLogs.id })
          .from(callLogs)
          .where(eq(callLogs.quoCallId, call.id))
          .limit(1);

        if (existing.length > 0) continue;

        // Fetch extras where available
        let transcription: string | null = null;
        let aiSummary: string | null = null;
        let recordingUrl: string | null = null;

        if (call.status === 'completed' && call.duration > 0) {
          try {
            const recordings = await this.getRecordings(call.id);
            if (recordings.length > 0) {
              recordingUrl = recordings[0].url;
            }
          } catch {
            /* recording may not exist */
          }

          try {
            transcription = await this.getTranscription(call.id);
          } catch {
            /* transcription may not exist */
          }

          try {
            aiSummary = await this.getSummary(call.id);
          } catch {
            /* summary may not exist */
          }
        }

        // Determine agent from phone number assignment
        const matchingPn = await db
          .select({ assignedUserId: quoPhoneNumbers.assignedUserId })
          .from(quoPhoneNumbers)
          .where(eq(quoPhoneNumbers.quoPhoneNumberId, call.phoneNumberId))
          .limit(1);

        await db.insert(callLogs).values({
          quoCallId: call.id,
          contactId,
          agentId: matchingPn[0]?.assignedUserId ?? null,
          direction: call.direction,
          status: call.status,
          durationSeconds: call.duration,
          startedAt: new Date(call.createdAt),
          completedAt: call.completedAt ? new Date(call.completedAt) : null,
          recordingUrl,
          transcription,
          aiSummary,
          quoPhoneNumberId: call.phoneNumberId,
          participantNumber: contact.phone,
        });
      }
    }

    console.log(`Synced calls for contact ${contactId}`);
  }

  async syncMessagesForContact(contactId: number): Promise<void> {
    const [contact] = await db
      .select({ phone: contacts.phone })
      .from(contacts)
      .where(eq(contacts.id, contactId))
      .limit(1);

    if (!contact?.phone) return;

    const phoneNumbers = await db.select().from(quoPhoneNumbers);

    for (const pn of phoneNumbers) {
      const messages = await this.listMessages(
        pn.quoPhoneNumberId,
        contact.phone
      );

      for (const msg of messages) {
        const existing = await db
          .select({ id: smsMessages.id })
          .from(smsMessages)
          .where(eq(smsMessages.quoMessageId, msg.id))
          .limit(1);

        if (existing.length > 0) continue;

        const matchingPn = await db
          .select({ assignedUserId: quoPhoneNumbers.assignedUserId })
          .from(quoPhoneNumbers)
          .where(eq(quoPhoneNumbers.quoPhoneNumberId, msg.phoneNumberId))
          .limit(1);

        const smsDirection =
          msg.direction === 'inbound' ? 'inbound' : 'outbound';
        const smsStatus =
          msg.direction === 'inbound'
            ? 'received'
            : msg.status === 'delivered'
              ? 'delivered'
              : 'sent';

        await db.insert(smsMessages).values({
          quoMessageId: msg.id,
          contactId,
          agentId: matchingPn[0]?.assignedUserId ?? null,
          direction: smsDirection as 'inbound' | 'outbound',
          body: msg.body,
          status: smsStatus as 'queued' | 'sent' | 'delivered' | 'failed' | 'received',
          quoPhoneNumberId: msg.phoneNumberId,
          participantNumber: contact.phone,
          sentAt: new Date(msg.createdAt),
        });
      }
    }

    console.log(`Synced messages for contact ${contactId}`);
  }

  /**
   * Full sync: sync phone numbers, then sync calls and messages for all contacts
   * that have a phone number on file.
   */
  async fullSync(): Promise<void> {
    console.log('Starting Quo full sync...');

    // Sync phone numbers first
    await this.syncPhoneNumbers();

    // Get all contacts with phone numbers
    const allContacts = await db
      .select({ id: contacts.id, phone: contacts.phone })
      .from(contacts);

    const contactsWithPhone = allContacts.filter((c) => c.phone);

    for (const contact of contactsWithPhone) {
      try {
        await this.syncCallsForContact(contact.id);
        await this.syncMessagesForContact(contact.id);
      } catch (err) {
        console.error(`Failed to sync contact ${contact.id}:`, err);
      }
    }

    console.log(
      `Quo full sync complete. Processed ${contactsWithPhone.length} contacts.`
    );
  }
}

export const quoService = new QuoService();
