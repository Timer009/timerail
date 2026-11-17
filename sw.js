/* 微记 · Service Worker（P3.30）
 * 策略：
 *   - 安装时预缓存应用外壳（HTML / CSS / JS / manifest / 图标），改版本号即换新缓存
 *   - 页面导航：网络优先，断网时回落到缓存的 index.html
 *   - 其它同源静态资源：缓存优先 + 后台顺手更新
 * 说明：Service Worker 只在 https 或 localhost 下生效；用局域网 IP 访问时自动跳过，应用照常可用。
 */
var CACHE = 'timerail-p3.30';
var ASSETS = [
  './',
  './index.html',
  './styles.css?v=p3.30',
  './app.js?v=p3.30',
  './manifest.webmanifest?v=p3.30',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png',
  './apple-touch-icon.png'
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE)
      .then(function (c) { return c.addAll(ASSETS); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        return k === CACHE ? null : caches.delete(k);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url;
  try { url = new URL(req.url); } catch (err) { return; }
  if (url.origin !== self.location.origin) return;

  /* 页面导航：网络优先，断网回落到外壳 */
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).then(function (res) {
        if (res && res.ok) {
          var copy = res.clone();
          caches.open(CACHE).then(function (c) { c.put('./index.html', copy); });
        }
        return res;
      }).catch(function () {
        return caches.match('./index.html').then(function (hit) {
          return hit || caches.match('./');
        });
      })
    );
    return;
  }

  /* 静态资源：缓存优先，后台更新 */
  e.respondWith(
    caches.match(req).then(function (hit) {
      if (hit) {
        fetch(req).then(function (res) {
          if (res && res.ok) {
            caches.open(CACHE).then(function (c) { c.put(req, res.clone()); });
          }
        }).catch(function () {});
        return hit;
      }
      return fetch(req).then(function (res) {
        if (res && res.ok) {
          var copy = res.clone();
          caches.open(CACHE).then(function (c) { c.put(req, copy); });
        }
        return res;
      });
    })
  );
});
