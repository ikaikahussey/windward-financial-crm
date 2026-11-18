/**
 * Normalize a free-form US phone number to E.164 (+1XXXXXXXXXX), which the
 * Quo API requires. Returns null when the input is not a valid 10-digit
 * North American number.
 */
export function toE164(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let digits = raw.replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('1')) digits = digits.slice(1);
  if (digits.length !== 10) return null;
  // Area code and exchange cannot start with 0 or 1.
  if (!/^[2-9]\d{2}[2-9]\d{6}$/.test(digits)) return null;
  return `+1${digits}`;
}

/** Format a phone number for display: (808) 555-1234. Falls back to the input. */
export function formatPhone(raw: string | null | undefined): string {
  const e164 = toE164(raw);
  if (!e164) return raw ?? '';
  const d = e164.slice(2);
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
}
