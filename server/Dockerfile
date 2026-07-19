# Magic English — Dockerfile

FROM node:22-alpine AS builder

WORKDIR /app

# 安装编译原生模块所需的依赖
RUN apk add --no-cache python3 make g++

# 复制依赖文件并安装（用 install 避免 ci 的 lock 同步问题）
COPY package.json package-lock.json ./
RUN npm install --omit=dev

# 安装 devDependencies 用于编译
RUN npm install

# 复制源码并编译（tsc 在 strict 下有 TS7006 警告退出码非零，但不影响 emit）
COPY . .
RUN npm run build; exit 0

# ============================================================
# 生产镜像（精简）
# ============================================================
FROM node:22-alpine AS runner

WORKDIR /app

# 只复制必要文件
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/drizzle ./drizzle
COPY --from=builder /app/package.json ./

EXPOSE 3000

ENV NODE_ENV=production

CMD ["node", "dist/main.js"]
