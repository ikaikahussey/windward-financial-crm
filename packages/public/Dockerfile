# Stage 1 — Astro static build
FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./
COPY packages/api/package.json ./packages/api/
COPY packages/public/package.json ./packages/public/
COPY packages/web/package.json ./packages/web/

RUN npm install --workspaces --include-workspace-root --no-audit --no-fund

COPY packages/api ./packages/api
COPY packages/public ./packages/public

ARG PUBLIC_API_URL=""
ARG PUBLIC_SITE_URL="https://windward.financial"
ARG PUBLIC_NLG_LOGIN_URL="https://www.nationallife.com/login"
ARG BUILD_DATABASE_URL=""
ENV PUBLIC_API_URL=$PUBLIC_API_URL \
    PUBLIC_SITE_URL=$PUBLIC_SITE_URL \
    PUBLIC_NLG_LOGIN_URL=$PUBLIC_NLG_LOGIN_URL \
    BUILD_DATABASE_URL=$BUILD_DATABASE_URL

WORKDIR /app/packages/public
RUN npm run build

# Stage 2 — nginx runtime
FROM nginx:alpine
COPY --from=builder /app/packages/public/dist /usr/share/nginx/html
COPY packages/public/nginx-runtime.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
