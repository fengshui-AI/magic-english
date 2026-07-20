# Magic English — CloudRun Dockerfile (root-level, delegates to server/)
# CloudBase CloudRun 在项目根目录执行 docker build
# server/ 下也有一份同样的 Dockerfile

FROM node:22-alpine

WORKDIR /app

RUN apk add --no-cache python3 make g++

COPY server/package.json server/package-lock.json ./
RUN npm install --omit=dev && npm install tsx

COPY server/src ./src
COPY server/drizzle ./drizzle

EXPOSE 3000
ENV NODE_ENV=production

CMD ["npx", "tsx", "src/main.ts"]
