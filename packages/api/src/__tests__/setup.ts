// Vitest setup. Loads .env so DATABASE_URL is available.
import 'dotenv/config';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL must be set for tests (use the dev database)');
}
