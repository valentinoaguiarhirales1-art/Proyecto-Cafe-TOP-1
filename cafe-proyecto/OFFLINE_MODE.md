# Notas sobre el modo sin conexión

## Alcance actual

La aplicación registra un service worker y mantiene una caché local de productos. Esto permite recuperar algunos recursos visitados cuando la red falla. La caché puede estar incompleta o desactualizada.

No hay una cola durable de pedidos, envío en segundo plano ni sincronización automática de cambios. El carrito vive en el estado de la aplicación y puede perderse al recargar. Las acciones que escriben en la API necesitan conexión.

## Cómo comprobarlo

1. Arranca la API y la interfaz y abre la carta con conexión.
2. Espera a que termine de cargar; recarga una vez para que el navegador registre el service worker.
3. En las herramientas del navegador, activa el modo sin conexión.
4. Vuelve a abrir la página y anota qué recursos y productos guardados se muestran.
5. Prueba una acción que requiera la API y confirma que no se presenta como un pedido enviado.
6. Reactiva la red y comprueba que la aplicación vuelve a cargar datos actuales.

Haz esta prueba en el navegador y dispositivo que vayas a describir en la memoria. El comportamiento de la caché cambia según el navegador y lo que se haya visitado antes.

## Mejoras pendientes

- Guardar el carrito de forma local si se necesita conservarlo al recargar.
- Diseñar una cola de pedidos con identificadores, reintentos y controles contra duplicados.
- Mostrar claramente si los datos vienen de la caché o del servidor.
- Probar conflictos de disponibilidad y errores durante la sincronización antes de ofrecer pedidos offline.
