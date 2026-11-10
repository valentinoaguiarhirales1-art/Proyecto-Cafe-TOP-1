# Guion para el vídeo de defensa

La guía de entrega pide un vídeo narrado por el estudiante, de **cinco minutos como máximo**. Este guion dura aproximadamente **4 minutos y 50 segundos** para dejar un pequeño margen. Adáptalo a tu voz y muestra solo lo que hayas comprobado en el sitio publicado.

## Antes de grabar

- Abre el sitio público por HTTPS y espera a que cargue el menú.
- Prueba el flujo que vas a enseñar: producto, personalización y carrito.
- Ten preparada una cuenta de prueba solo si mostrarás una función privada.
- Comprueba que los datos del menú vienen de la API, no de una maqueta local.
- Cierra pestañas con contraseñas, tokens, correos o información privada.
- Comprueba que el vídeo se abra desde el enlace sin pedir permiso.

## Secuencia

**0:00–0:30 — Presentación y problema.** Preséntate y explica que Café Exquisito busca reunir la carta, la personalización y la revisión del pedido en un sitio, en vez de dispersar esa información.

**0:30–1:00 — Aportación.** Cuenta que la persona puede consultar categorías, elegir opciones adecuadas al producto y conservarlas en el carrito. No afirmes mejoras de ventas o tiempos que no se hayan medido.

**1:00–1:30 — Tecnologías y datos.** Menciona React y Vite para la interfaz, Node.js y Express para la API, y MongoDB con Mongoose para los datos. Explica brevemente: React solicita los productos a la API, Express procesa la solicitud y consulta MongoDB, y la API devuelve la respuesta que se muestra en la página.

**1:30–3:05 — Demostración.** Abre la aplicación publicada. Muestra que carga el menú, elige una categoría y abre un producto. Selecciona una opción que corresponda a ese producto, agrégalo al carrito y enseña cómo aparecen las opciones y el total.

**3:05–3:45 — Otro caso de uso.** Enseña una reserva, promoción o evento que esté activo y probado. Si tienes una cuenta autorizada, puedes mostrar una acción de gestión; si no, explica brevemente cómo se representan los datos sin revelar información privada.

**3:45–4:20 — Seguridad y pruebas.** Explica que las contraseñas se guardan con hash y que el servidor controla las rutas protegidas. Menciona las pruebas locales que ejecutaste y aclara que no demuestran por sí solas todos los flujos de producción. Señala una limitación real, como no haber probado pagos reales.

**4:20–4:50 — Cierre.** Resume el resultado, comenta una mejora futura y agradece. Finaliza antes de los cinco minutos.

## Preguntas para ensayar

- ¿Cómo llega un producto desde MongoDB hasta la pantalla?
- ¿Qué valida el servidor al recibir un pedido?
- ¿Qué opciones se guardan con un producto personalizado?
- ¿Qué parte probaste en local y cuál comprobaste en el sitio publicado?
- ¿Qué herramientas de IA utilizaste y cómo revisaste sus sugerencias?

Si un flujo falla durante el ensayo, corrígelo o elige otro que sí funcione. No presentes una grabación editada como si una operación hubiese terminado correctamente cuando no fue así.
