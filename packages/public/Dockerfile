FROM node:20-alpine AS build

WORKDIR /app

COPY packages/public/package.json packages/public/package-lock.json* ./
RUN npm install

COPY packages/public/ .

RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY packages/public/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
