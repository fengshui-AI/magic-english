FROM node:22-alpine

WORKDIR /app

RUN apk add --no-cache python3 make g++

COPY package.json package-lock.json ./
RUN npm install --omit=dev
RUN npm install tsx

COPY src ./src
COPY drizzle ./drizzle

EXPOSE 3000
ENV NODE_ENV=production

CMD ["npx", "tsx", "src/main.ts"]
