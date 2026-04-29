/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly PUBLIC_API_URL: string;
  readonly PUBLIC_SITE_URL: string;
  readonly PUBLIC_NLG_LOGIN_URL: string;
  readonly BUILD_DATABASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
