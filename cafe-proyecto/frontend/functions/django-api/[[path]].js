function errorResponse(message, status) {
  return new Response(JSON.stringify({ error: message }), {
    status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

export async function forwardDjangoRequest(request, origin, fetchUpstream = fetch) {
  let upstream;
  try {
    upstream = new URL(origin);
  } catch {
    console.error('Falta configurar un origen HTTPS válido para Django.');
    return errorResponse('El servidor de Django no está configurado. Inténtalo más tarde.', 503);
  }
  const incoming = new URL(request.url);
  if (upstream.protocol !== 'https:' || upstream.username || upstream.password
      || upstream.pathname !== '/' || upstream.search || upstream.hash || upstream.origin === incoming.origin) {
    console.error('El origen de Django no es válido para el proxy.');
    return errorResponse('El servidor de Django no está configurado correctamente.', 503);
  }
  if (!incoming.pathname.startsWith('/django-api/')) {
    return errorResponse('Ruta no disponible.', 404);
  }
  const target = new URL(incoming.pathname + incoming.search, upstream.origin);
  const headers = new Headers(request.headers);
  for (const name of [...headers.keys()]) {
    if (name === 'host' || name === 'forwarded' || name.startsWith('x-forwarded-')
        || name === 'x-real-ip' || name.startsWith('cf-')) headers.delete(name);
  }
  const forwarded = new Request(new Request(target, request), { headers, redirect: 'manual' });
  try {
    const response = await fetchUpstream(forwarded);
    const responseHeaders = new Headers(response.headers);
    responseHeaders.set('Cache-Control', 'no-store');
    return new Response(response.body, {
      status: response.status, statusText: response.statusText, headers: responseHeaders,
    });
  } catch (error) {
    console.error('No se pudo contactar con el servidor de Django:', error);
    return errorResponse('No se pudo conectar con Django. Inténtalo de nuevo.', 502);
  }
}

export function onRequest({ request, env }) {
  return forwardDjangoRequest(request, env.DJANGO_ORIGIN);
}
