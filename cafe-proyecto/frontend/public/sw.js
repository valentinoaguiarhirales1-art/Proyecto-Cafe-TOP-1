// Service Worker — Café Exquisito PWA
// Versión de caché: incrementar al actualizar assets
const CACHE_NAME = 'cafe-exquisito-v43-musica-ambiente';
const PUBLIC_API_PATHS = new Set([
  '/api/products',
  '/api/events',
  '/api/promotions',
  '/api/site-settings',
]);

const cacheResponse = async (request, response) => {
  try {
    const cache = await caches.open(CACHE_NAME);
    await cache.put(request, response.clone());
  } catch (error) {
    console.warn('[PWA] No se pudo guardar un recurso para uso offline:', error);
  }
};

// Assets que se cachean en la instalación
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/offline.html',
  '/manifest.json',
  '/apple-touch-icon.png',
  '/icon-192.png',
  '/icon-512.png',
  '/images/hero-cafe.jpg',
  '/images/producto-sin-foto.svg',
  '/images/menu/verificada-cheesecake.jpg',
  '/images/menu/verificada-chilaquiles-rojos.jpg',
  '/images/menu/verificada-pay-manzana.jpg',
  '/images/menu/soda-italiana.jpg',
  '/images/menu/muffin.jpg',
  '/images/menu/desayuno-americano.jpg',
  '/images/menu/sndwich-maanero.jpg',
  '/images/menu/chicken-chipotle.jpg',
  '/images/menu/sopa-de-lentejas.jpg',
  '/images/menu/sopa-de-brcoli.jpg',
  '/images/menu/foto-verificada-0.jpg',
  '/images/menu/foto-verificada-2.jpg',
  '/images/menu/foto-verificada-3.jpg',
  '/images/menu/foto-verificada-5.jpg',
  '/images/menu/foto-verificada-7.jpg',
  '/images/menu/foto-verificada-8.jpg',
  '/images/menu/foto-verificada-9.jpg',
  '/images/menu/foto-verificada-10.jpg',
  '/images/menu/foto-verificada-12.jpg',
  '/images/menu/foto-verificada-15.jpg',
  '/images/menu/foto-verificada-16.jpg',
  '/images/menu/foto-verificada-tisana.jpg',
  '/images/menu/foto-verificada-espresso.jpg',
  '/images/menu/frappe-taro.jpg',
  '/images/menu/foto-revisada-2.jpg',
  '/images/menu/foto-revisada-3.jpg',
  '/images/menu/foto-revisada-7.jpg',
  '/images/menu/foto-revisada-8.jpg',
  '/images/menu/foto-revisada-9.jpg',
  '/images/menu/foto-revisada-10.jpg',
  '/images/menu/foto-revisada-11.jpg',
  '/images/menu/foto-ensalada-pollo.jpg',
  '/images/menu/foto-papas-fritas.jpg',
  '/images/cafe-moments-trio.jpg',
  '/images/cafe-exquisito-logo.jpg',
  '/images/gallery/sonic-shadow.webp',
  '/images/gallery/tails-knuckles.webp',
  '/images/gallery/halloween-friends.webp',
  '/images/gallery/shadow-rouge-halloween.webp',
  '/images/gallery/sonic-friends-stickers.webp',
];

// Instalación: pre-cachear assets estáticos
self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const response = await fetch('/offline-assets.json', { cache: 'no-store' });
    if (!response.ok) throw new Error('No se pudo obtener la lista de archivos offline.');
    const assets = await response.json();
    if (!Array.isArray(assets) || !assets.some((asset) => asset.endsWith('.js')) || !assets.some((asset) => asset.endsWith('.css'))) {
      throw new Error('La lista de archivos offline está incompleta.');
    }
    try {
      const cache = await caches.open(CACHE_NAME);
      await cache.addAll([...STATIC_ASSETS, ...assets]);
    } catch (error) {
      await caches.delete(CACHE_NAME);
      throw error;
    }
    await self.skipWaiting();
  })());
});

// Activación: limpiar cachés viejos
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key.startsWith('cafe-exquisito-') && key !== CACHE_NAME)
          .sort((a, b) => {
            const versionA = Number(a.match(/-v(\d+)/)?.[1] || 0);
            const versionB = Number(b.match(/-v(\d+)/)?.[1] || 0);
            return versionA - versionB;
          })
          .slice(0, -1)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Fetch: Network First para /api, Cache First para assets estáticos
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method === 'GET' && PUBLIC_API_PATHS.has(url.pathname)) {
    event.respondWith((async () => {
      try {
        const response = await fetch(request);
        if (response.ok) {
          await cacheResponse(request, response);
        }
        return response;
      } catch {
        const cache = await caches.open(CACHE_NAME);
        const cached = await cache.match(request);
        return cached || new Response('{"error":"Sin conexión"}', {
          status: 503,
          statusText: 'Service Unavailable',
          headers: { 'Content-Type': 'application/json' }
        });
      }
    })());
    return;
  }

  // Las demás rutas de la API contienen pedidos o datos privados y no se guardan.
  if (url.pathname.startsWith('/api') || url.pathname.startsWith('/django-api')) {
    event.respondWith(fetch(request).catch(() => new Response('{"error":"Sin conexión"}', {
      status: 503,
      statusText: 'Service Unavailable',
      headers: { 'Content-Type': 'application/json' }
    })));
    return;
  }

  // Páginas HTML: red primero para recibir los cambios nuevos; sin conexión usa la copia guardada
  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const response = await fetch(request);
        if (response.status === 200) {
          await cacheResponse('/index.html', response);
        }
        return response;
      } catch {
        return (await caches.match('/index.html')) || (await caches.match('/offline.html'))
          || new Response('No se pudo abrir Café Exquisito. Revisa tu conexión y vuelve a intentarlo.', {
            status: 503,
            headers: { 'Content-Type': 'text/plain; charset=utf-8' },
          });
      }
    })());
    return;
  }

  // Para todo lo demás: Cache First, fallback a red
  event.respondWith((async () => {
    const cached = await caches.match(request);
    if (cached) return cached;
    try {
      const response = await fetch(request);
      if (request.method === 'GET' && response.status === 200) {
        await cacheResponse(request, response);
      }
      return response;
    } catch {
      return request.mode === 'navigate'
        ? caches.match('/index.html')
        : new Response('', { status: 503, statusText: 'Service Unavailable' });
    }
  })());
});

// Notificaciones push (base para futuras integraciones con WhatsApp/FCM)
self.addEventListener('push', (event) => {
  const data = event.data?.json() || {};
  event.waitUntil(
    self.registration.showNotification(data.title || '☕ Café Exquisito', {
      body: data.body || 'Tienes una nueva notificación',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      data: { url: data.url || '/' },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow(event.notification.data?.url || '/'));
});
