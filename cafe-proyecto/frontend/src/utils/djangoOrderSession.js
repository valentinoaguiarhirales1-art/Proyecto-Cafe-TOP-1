export function djangoOrderSessionHeaders(session, expectedUserId) {
  if (!session.user) throw new Error('Inicia sesión en la página de prueba de Django y vuelve a tu carrito.');
  if (expectedUserId != null && session.user.id !== expectedUserId) {
    throw new Error('La sesión de Django cambió en otra pestaña. Recarga la página antes de hacer el pedido.');
  }
  return {
    'X-CSRFToken': session.csrfToken,
    'X-Expected-Django-User': String(session.user.id),
  };
}
