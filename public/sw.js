// ============================================================
// Magic English Service Worker
// 提供离线缓存和 PWA 安装支持
// ============================================================

const CACHE_NAME = 'magic-english-v1';
const RUNTIME_CACHE = 'magic-english-runtime';

// 需要预缓存的静态资源（构建后自动生成 hash 文件名，此处只缓存入口）
const PRECACHE_URLS = [
  '/',
  '/manifest.json',
  '/favicon.svg',
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
  event.respondWith(
    fetch(request)
      .then((response) => {
        // 只缓存成功的响应
        if (response.status === 200) {
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
          // 对于 SPA 导航请求，返回 index.html
          if (request.destination === 'document') {
            return caches.match('/');
          }
          // 无法提供缓存，返回离线提示
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
