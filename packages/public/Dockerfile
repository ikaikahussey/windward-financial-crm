# Multi-stage build: Astro static build -> nginx runtime
FROM node:20-alpine AS builder
WORKDIR /app

# Copy monorepo manifests so npm workspaces can resolve
COPY package.json package-lock.json ./
COPY packages/public/package.json packages/public/
COPY packages/api/package.json packages/api/
COPY packages/web/package.json packages/web/

RUN npm install --workspaces --include-workspace-root

# Copy the API sources (public imports the Drizzle schema at build time
# for build-time event queries) and the public package sources.
COPY packages/api ./packages/api
COPY packages/public ./packages/public

WORKDIR /app/packages/public

ARG PUBLIC_API_URL
ARG PUBLIC_SITE_URL
ARG PUBLIC_NLG_LOGIN_URL
ARG BUILD_DATABASE_URL
ENV PUBLIC_API_URL=${PUBLIC_API_URL}
ENV PUBLIC_SITE_URL=${PUBLIC_SITE_URL}
ENV PUBLIC_NLG_LOGIN_URL=${PUBLIC_NLG_LOGIN_URL}
ENV BUILD_DATABASE_URL=${BUILD_DATABASE_URL}

RUN npm run build

# ── Runtime ──
FROM nginx:alpine AS runtime

COPY packages/public/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/packages/public/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
