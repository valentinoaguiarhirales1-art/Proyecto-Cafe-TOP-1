// Service Worker para Café Exquisito - Funcionalidad Offline
const CACHE_NAME = 'cafe-exquisito-v3-official-logo';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/apple-touch-icon.png',
  '/images/cafe-moments-trio.jpg',
  '/images/cafe-exquisito-logo.jpg',
  '/assets/',
  '/images/'
];

// Instalación del Service Worker
self.addEventListener('install', event => {
  console.log('[Service Worker] Instalando...');
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[Service Worker] Cacheando assets');
      return cache.addAll(ASSETS_TO_CACHE);
    }).catch(err => {
      console.log('[Service Worker] Error al cachear:', err);
    })
  );
  self.skipWaiting();
});

// Activación del Service Worker
self.addEventListener('activate', event => {
  console.log('[Service Worker] Activando...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Eliminando cache viejo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Estrategia: Network First, Fall back to Cache
self.addEventListener('fetch', event => {
  // Solo cachear GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  const { request } = event;
  const url = new URL(request.url);

  // No cachear API calls (se manejan diferente)
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirstStrategy(request));
    return;
  }

  // Para assets estáticos: Cache First
  if (url.pathname.match(/\.(js|css|png|jpg|jpeg|gif|svg|woff|woff2|ttf|eot)$/)) {
    event.respondWith(cacheFirstStrategy(request));
    return;
  }

  // Para HTML: Network First
  event.respondWith(networkFirstStrategy(request));
});

// Cache First Strategy: busca en cache primero, luego en red
async function cacheFirstStrategy(request) {
  try {
    const cached = await caches.match(request);
    if (cached) {
      return cached;
    }

    const response = await fetch(request);
    if (response.status === 200) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    console.log('[Service Worker] Fetch error:', error);
    
    // Retornar página offline si está cacheada
    const cached = await caches.match(request);
    if (cached) {
      return cached;
    }

    return new Response('Sin conexión y recurso no disponible', {
      status: 503,
      statusText: 'Service Unavailable'
    });
  }
}

// Network First Strategy: intenta red primero, luego cache
async function networkFirstStrategy(request) {
  try {
    const response = await fetch(request);
    if (response.status === 200) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    console.log('[Service Worker] Fetch error, usando cache:', error);
    const cached = await caches.match(request);
    if (cached) {
      return cached;
    }

    if (request.destination === 'document') {
      return caches.match('/index.html');
    }

    return new Response('Sin conexión', {
      status: 503,
      statusText: 'Service Unavailable'
    });
  }
}

// Manejo de mensajes desde la app
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    caches.delete(CACHE_NAME);
  }
});
