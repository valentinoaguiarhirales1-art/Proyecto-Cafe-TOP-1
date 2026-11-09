# Guion para la demostración

Duración sugerida: **4 minutos y 30 segundos como máximo**. Es una guía para ensayar; graba con tu voz y muestra solo funciones que hayas probado.

## Antes de grabar

- Abre el sitio publicado y confirma que carga por HTTPS.
- Ten lista una cuenta de prueba que no use datos personales.
- Comprueba que React muestra datos que vienen de la API publicada.
- Cierra pestañas con secretos, consola con tokens o información privada.
- Asegúrate de que el enlace del vídeo se pueda abrir sin solicitar permiso.

Si todavía no hay URL pública, base de datos o cuenta de prueba, no presentes una demo local como si fuera el despliegue final.

## Secuencia sugerida

**0:00–0:35 — Problema**

> “Este proyecto se llama Café Exquisito. La idea es reunir la carta, los pedidos y las reservas en una misma aplicación. Está pensado para clientes y para las personas que administran el contenido.”

Adapta la explicación a la necesidad que realmente investigaste.

**0:35–1:20 — Tecnologías**

Muestra el proyecto y cuenta, con tus palabras, qué hace React y cómo recibe información de la API. Describe el stack real: Express y MongoDB siguen activos por defecto y Django funciona en paralelo para varias funciones. No afirmes que el requisito de Django está cubierto hasta completar la migración y comprobar la aplicación publicada.

**1:20–3:25 — Demostración**

1. Abre la carta y muestra un producto y su precio.
2. Añade un producto al carrito y explica qué pasa al confirmar un pedido.
3. Muestra el formulario de reserva.
4. Entra al panel con una cuenta autorizada y enseña una acción que hayas probado.

No muestres una pantalla ni un flujo que falle o que solo exista como diseño.

**3:25–4:05 — Datos y permisos**

Explica dónde se guardan los datos y da un ejemplo de una acción que solo debe poder hacer un rol autorizado. Si la publicación no está lista, dilo claramente y no sustituyas la URL pública por `localhost`.

**4:05–4:30 — Cierre**

Menciona una limitación real, el siguiente paso y una cosa que aprendiste. Deja visible la aplicación final unos segundos.

## Preguntas para ensayar

- ¿Cómo llega un producto desde la base de datos hasta la pantalla?
- ¿Dónde comprueba el servidor el rol de una cuenta?
- ¿Qué validaste antes de guardar un pedido o una reserva?
- ¿Qué parte del proyecto cambiarías y por qué?
- ¿Qué herramienta de IA usaste y cómo revisaste sus cambios?
