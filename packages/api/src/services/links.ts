/** Public links texted to clients. All are served by this API. */

export const apiBaseUrl = () =>
  (process.env.API_PUBLIC_URL || process.env.QUO_WEBHOOK_BASE_URL || '').replace(/\/+$/, '');

const link = (prefix: string, key: string | null | undefined) => {
  const base = apiBaseUrl();
  return base && key ? `${base}/${prefix}/${key}` : '';
};

/** Rep photo card. */
export const repCardLink = (slug: string | null | undefined) => link('r', slug);
/** The contact's own booking page. */
export const bookingLink = (token: string | null | undefined) => link('b', token);
/** The contact's own intake form. */
export const intakeLink = (token: string | null | undefined) => link('i', token);
