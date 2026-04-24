FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./
COPY packages/api/package.json packages/api/
COPY packages/web/package.json packages/web/
COPY packages/public/package.json packages/public/

RUN npm install --workspaces --include-workspace-root

COPY packages/api ./packages/api

WORKDIR /app/packages/api

EXPOSE 3001
CMD ["npm", "start"]
