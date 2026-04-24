FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./
COPY packages/web/package.json packages/web/
COPY packages/api/package.json packages/api/
COPY packages/public/package.json packages/public/

RUN npm install --workspaces --include-workspace-root

COPY packages/web ./packages/web

WORKDIR /app/packages/web

ARG VITE_API_URL
ENV VITE_API_URL=${VITE_API_URL}

RUN npm run build

FROM nginx:alpine AS runtime
COPY packages/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/packages/web/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
