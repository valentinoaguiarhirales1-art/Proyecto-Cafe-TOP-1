# Uso sin conexión

La aplicación tiene algunas funciones que pueden seguir disponibles después de haber abierto el sitio con internet. El alcance es limitado: **no es posible completar y sincronizar pedidos offline**.

## Antes de desconectarte

1. Abre Café Exquisito con internet y espera a que cargue la carta.
2. Si el navegador ofrece instalar la aplicación, puedes instalarla desde esa opción. Esto crea un icono y abre la página en una ventana propia; no instala ni reemplaza el servidor de la API o la base de datos. Para una instalación publicada se necesita HTTPS; `localhost` también se considera un origen seguro para pruebas locales.
3. Prueba el modo sin conexión antes de depender de él.

## Qué puede quedar disponible

- Archivos de la interfaz que el navegador haya guardado en caché.
- Productos que se hayan consultado y guardado en el almacenamiento local del navegador.

El contenido puede estar desactualizado. La página publicada y la API deben seguir disponibles, y hace falta conexión para iniciar sesión, crear pedidos, enviar reservas y usar otras funciones que guardan datos.

## Qué no debes dar por hecho

- El carrito no se conserva al recargar la página.
- Un pedido creado sin conexión no queda en una cola para enviarse después.
- El historial del servidor y los cambios de administración requieren conexión.
- Borrar los datos del navegador elimina también la información local cacheada.

## Probarlo y volver a conectarse

Usa las herramientas de desarrollador del navegador para activar el modo sin conexión. Comprueba qué contenido ya visitado sigue abriendo y qué acciones muestran un error de conexión. Vuelve a activar la red antes de iniciar sesión o enviar información.

La caché local se administra desde los ajustes de almacenamiento del navegador. La ubicación exacta depende de Chrome, Edge, Firefox o Safari. No borres los datos del sitio si necesitas conservar la caché que acabas de probar.

## Nota para la demo

Describe únicamente lo que hayas comprobado en el navegador y en el dispositivo que vas a mostrar. El modo PWA ayuda a conservar algunos recursos; no reemplaza un servidor disponible ni un sistema de sincronización de pedidos.
