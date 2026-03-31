FROM node:20-alpine

WORKDIR /app

COPY packages/api/package.json packages/api/package-lock.json* ./
RUN npm install

COPY packages/api/ .

RUN npm run build

EXPOSE 3001

CMD ["npm", "run", "start"]
