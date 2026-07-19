// ============================================================
// Magic English Service Worker
// 提供离线缓存和 PWA 安装支持
// ============================================================

// 更新此版本号可强制所有客户端刷新 SW 缓存
const CACHE_VERSION = 'v3';
const CACHE_NAME = `magic-english-${CACHE_VERSION}`;
const RUNTIME_CACHE = `magic-english-runtime-${CACHE_VERSION}`;

// 仅预缓存不常变的资源，index.html 不缓存（避免 SW 返回旧版本）
const PRECACHE_URLS = [
  '/manifest.json',
  '/favicon.svg',
  '/icons.svg',
];

// ============================================================
// Install — 预缓存关键资源
// ============================================================
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

// ============================================================
// Activate — 清理旧缓存
// ============================================================
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME && key !== RUNTIME_CACHE)
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// ============================================================
// Fetch — 网络优先策略（适合频繁更新的 SPA）
// ============================================================
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // 跳过非 GET 请求和 chrome-extension 请求
  if (request.method !== 'GET') return;
  if (request.url.startsWith('chrome-extension://')) return;

  // API 请求：仅走网络，不做缓存
  if (request.url.includes('/api/')) {
    return;
  }

  // 静态资源：网络优先，网络失败时回退缓存
  // 但 index.html（'/'）永远走网络，不缓存
  event.respondWith(
    fetch(request)
      .then((response) => {
        // 只缓存成功的非 HTML 响应（JS/CSS/图片等带 hash 的不会变）
        if (response.status === 200 && request.destination !== 'document') {
          const cloned = response.clone();
          caches.open(RUNTIME_CACHE).then((cache) => {
            cache.put(request, cloned);
          });
        }
        return response;
      })
      .catch(() => {
        // 网络不可用时，尝试从缓存返回
        return caches.match(request).then((cached) => {
          if (cached) return cached;
          // 无法提供缓存
          return new Response(
            JSON.stringify({ error: 'OFFLINE', message: '当前处于离线状态' }),
            { status: 503, headers: { 'Content-Type': 'application/json' } }
          );
        });
      })
  );
});

// ============================================================
// Message — 接收来自前端的缓存控制指令
// ============================================================
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data === 'CLEAR_CACHE') {
    caches.keys().then((keys) =>
      Promise.all(keys.map((key) => caches.delete(key)))
    );
  }
});
