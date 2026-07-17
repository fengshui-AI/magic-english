# Magic English — 部署指南

## 架构概览

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   前端 (Vue)  │────▶│  API (Hono)  │────▶│  PostgreSQL   │
│  静态资源     │     │  :3000       │     │              │
│  COS + CDN   │     │  CloudRun    │     │  CloudBase   │
└──────────────┘     └──────────────┘     └──────────────┘
```

## 一、数据库初始化

```bash
cd server

# 1. 确保 PostgreSQL 可用
# 2. 创建数据库
createdb magic_english

# 3. 推送表结构
npm run db:push

# 4. 填充种子数据（60个单词 + demo用户）
npm run db:seed
```

## 二、后端部署

### 方式 A：CloudBase CloudRun（推荐）

```bash
# 1. 安装 CloudBase CLI
npm i -g @cloudbase/cli

# 2. 登录
tcb login

# 3. 构建
cd server
npm run build

# 4. 部署到 CloudRun
tcb run deploy --name magic-english-api --path dist/
```

### 方式 B：Docker

```bash
cd server

# 构建镜像
docker build -t magic-english-api .

# 运行
docker run -d \
  -p 3000:3000 \
  -e DATABASE_URL=postgres://... \
  -e JWT_SECRET=your-secret \
  -e NODE_ENV=production \
  magic-english-api
```

### 方式 C：传统服务器

```bash
cd server
npm run build
NODE_ENV=production npm start
# 建议使用 pm2 守护
# pm2 start dist/index.js --name magic-english
```

## 三、前端部署

### 方式 A：腾讯云 COS + CDN（推荐）

```bash
# 1. 构建前端
npm run build

# 2. 上传到 COS
cos-cli upload dist/ cos://magic-english-bucket/ --recursive

# 3. 配置 CDN 加速 + HTTPS
# 在 COS 控制台开启 CDN，配置域名 + SSL 证书
```

### 方式 B：CloudBase 静态托管

```bash
# 1. 构建
npm run build

# 2. 部署
tcb hosting deploy dist/ -e your-env-id
```

## 四、环境变量

### 后端必需

| 变量 | 说明 | 示例 |
|------|------|------|
| `DATABASE_URL` | PostgreSQL 连接串 | `postgres://...` |
| `JWT_SECRET` | JWT 签名密钥 | `openssl rand -hex 64` |
| `PORT` | 服务端口 | `3000` |
| `NODE_ENV` | 环境 | `production` |

### 后端可选

| 变量 | 说明 | 示例 |
|------|------|------|
| `CORS_ORIGINS` | CORS 白名单 | `https://example.com` |

## 五、SSL 证书

- COS + CDN：在腾讯云 SSL 控制台申请免费证书，绑定到 CDN 域名
- CloudRun：自动 HTTPS，无需额外配置
- 自建服务器：使用 certbot + nginx 反向代理

## 六、监控告警

```bash
# 健康检查端点
curl https://api.magic-english.com/health
# 预期返回: {"status":"ok","timestamp":"..."}
```

建议接入：
- **腾讯云监控**：CloudRun 自带 CPU/内存/QPS 监控
- **日志收集**：CloudBase 日志服务 或 ELK
- **错误追踪**：接入 Sentry（推荐）或腾讯云 RUM

## 七、回滚方案

1. **前端**：COS 支持版本回滚，控制台一键恢复历史版本
2. **后端 CloudRun**：保留最近 3 个版本，控制台一键回滚
3. **数据库**：使用 CloudBase 自动备份 + 手动备份

```bash
# 数据库手动备份
pg_dump magic_english > backup_$(date +%Y%m%d).sql

# 恢复
psql magic_english < backup_20260715.sql
```
