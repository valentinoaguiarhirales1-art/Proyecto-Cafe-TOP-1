# Memoria del Proyecto Final — Café Exquisito

> **Borrador para completar.** Está escrito a partir del código que existe hoy, no de una versión ideal. Sustituye los campos entre corchetes, agrega capturas propias y corrige el texto con tu experiencia antes de exportarlo. La guía pide un PDF de 20 a 40 páginas orientativas, con texto seleccionable. Este archivo Markdown todavía no es ese PDF.

## Portada

- **Proyecto:** Café Exquisito
- **Alumno/a:** [nombre completo]
- **Correo:** [correo]
- **Convocatoria:** [convocatoria]
- **Repositorio:** [URL pública del repositorio]
- **Aplicación:** [URL pública HTTPS]
- **Vídeo:** [enlace público al vídeo]

## Antes de empezar

Confirma que las actividades previas de Prework, Frontend y Backend están aprobadas y que el equipo docente validó la propuesta. Incluye la propuesta original y explica cómo mantuviste el alcance entre cuatro y ocho funciones.

En la copia revisada, esta carpeta todavía no tiene un historial de commits propio. No se debe fabricar uno después del desarrollo. Si la Academia exige ver progreso, organiza el repositorio real y conserva los cambios futuros en commits pequeños y claros.

## 1. Problema y propuesta

Café Exquisito es una aplicación para mostrar la carta de una cafetería y reunir en un mismo sitio los pedidos, las reservas y la gestión de su contenido. La propuesta busca que el cliente pueda consultar la oferta sin depender de una atención presencial y que el equipo pueda actualizar la información desde un panel.

Antes de entregar, explica aquí el problema que observaste, a quién afecta y cómo comprobaste que estas funciones son útiles. Evita presentar como una necesidad real algo que no hayas investigado.

## 2. Aportación

La aplicación reúne la consulta de productos, las promociones, los eventos, las solicitudes de reserva y la gestión de pedidos. El panel evita tener que cambiar el código cada vez que se actualiza contenido que la aplicación permite administrar.

Para respaldar esta parte, agrega un ejemplo antes/después que hayas comprobado y una captura de la acción correspondiente. No atribuyas ahorros de tiempo ni resultados que no hayas medido.

Para la propuesta final, delimita entre cuatro y ocho funciones principales. Una opción para la demo es: consultar la carta, enviar un pedido, solicitar una reserva y administrar contenido. Deja las otras funciones como extras y explica su estado real.

## 3. Tecnologías y versiones

| Uso | Tecnología que aparece en el proyecto |
|---|---|
| Interfaz | React 18 y Vite 6 |
| API existente | Node.js y Express 4 |
| Backend paralelo | Django 5.2 |
| Datos | MongoDB con Mongoose 8; SQLite local o PostgreSQL para Django |
| Sesión | JWT en Express; sesiones de Django independientes |
| Contraseñas | bcrypt en Express; hash de Django y compatibilidad para cuentas migradas |
| Imágenes | Cloudinary, cuando está configurado |
| Recomendaciones | API de Gemini, cuando está configurada |

Las versiones exactas de las dependencias JavaScript quedan en los archivos `package-lock.json`; las de Django están en `django_backend/requirements.txt`. El backend predeterminado sigue siendo Express. Django funciona en paralelo para varias funciones y todavía no se ha verificado como backend principal de una aplicación publicada.

Describe aquí las herramientas que usaste para editar, probar y desplegar, además de por qué elegiste cada tecnología. Incluye la versión de Node.js y de MongoDB usada en tu prueba final.

## 4. Usuarios y permisos

La aplicación contempla visitantes, clientes registrados, personal, gerentes y administradores. Los permisos se deben aplicar en la API, no solo en la interfaz.

Completa esta tabla después de probar cada acción con cuentas separadas:

| Usuario | Qué puede hacer | Qué comprobé |
|---|---|---|
| Visitante | Consultar las secciones públicas disponibles | [resultado y captura] |
| Cliente (`client`) | Iniciar sesión y usar las funciones de su cuenta | [resultado y captura] |
| Personal (`barista`, `atencion`) | [acciones verificadas] | [resultado y captura] |
| Encargado/a (`encargado`, `subgerente`, `gerente`, `supervisor`) | [acciones verificadas] | [resultado y captura] |
| Administrador (`admin`) | Gestionar las secciones habilitadas | [resultado y captura] |

El modelo también define el rol `codueno`. Describe sus permisos por separado si aparece en las rutas que vayas a demostrar. Los nombres entre paréntesis son los valores guardados por el backend.

No escribas contraseñas reales en esta memoria ni en el repositorio. Comparte las credenciales de prueba por el canal privado que indique la Academia.

## 5. Casos de uso

Agrega una captura y anota el resultado real de cada flujo. Indica también qué ocurre si la información falta, la cuenta no tiene permiso o el servidor no está disponible.

1. **Consultar la carta:** abrir la página, elegir un producto y comprobar su precio y disponibilidad.
2. **Hacer un pedido:** iniciar sesión, añadir productos, enviar el pedido y revisar el resultado en el historial.
3. **Solicitar una reserva:** completar el formulario y comprobar el estado de la solicitud.
4. **Administrar contenido:** iniciar sesión con un rol autorizado y actualizar un dato de prueba.

## 6. Arquitectura y datos

La versión actual tiene una interfaz React, una API Express con MongoDB y un backend Django independiente. Por defecto React utiliza Express; ciertas funciones pueden configurarse para consultar Django. Los datos y las sesiones de ambos sistemas no se sincronizan automáticamente.

```text
Navegador
   │
   ▼
Interfaz React (Vite)
   ├── /api ─────────► Express ─────► MongoDB
   │                     ├── Imágenes (opcional)
   │                     └── IA (opcional)
   └── /django-api ──► Django ──────► SQLite local o PostgreSQL
```

El proxy local de Vite dirige las rutas a cada servidor durante el desarrollo; no funciona automáticamente en producción. La integración con Django es opcional y aún debe completarse y comprobarse públicamente.

Entidades principales que aparecen en el código:

- **Usuario:** cuenta, contraseña protegida y rol.
- **Producto:** carta, precio y disponibilidad.
- **Pedido:** usuario, productos, cantidades y estado.
- **Reserva:** datos de la solicitud y su estado.
- **Promoción y evento:** contenido que se muestra en el sitio.
- **Solicitud de personal y ajustes del sitio:** información para el panel.

Incluye un diagrama entidad-relación generado a partir de los modelos reales. Revisa las referencias y cardinalidades directamente en el código antes de dibujarlo; este resumen no reemplaza ese chequeo.

## 7. Seguridad y cuidado de los datos

Express usa JWT para reconocer sesiones y bcrypt para proteger contraseñas. Django utiliza su sistema de sesiones, contraseñas y permisos; las operaciones de sus formularios requieren CSRF. Estas medidas no bastan por sí solas para afirmar que la aplicación está lista para producción.

La lista de orígenes permitidos de CORS se configura con `CORS_ORIGINS`; el valor local sirve para desarrollar, no para publicar. La interfaz guarda el token JWT en el navegador. No se encontró una protección CSRF dedicada, y almacenar el token en el navegador hace importante revisar la protección frente a XSS y el tratamiento del contenido de usuarios.

En el código actual, los tokens duran hasta 365 días y no se encontró rotación o revocación de sesión. También faltan pruebas de conflictos entre reservas y de pagos. Antes de usar datos reales, revisa esas reglas y los campos que acepta cada ruta; la validación no es igual en toda la API.

Antes de publicar, comprueba y documenta:

- Que no haya claves, contraseñas ni datos privados en el repositorio o su historial.
- Que cada ruta privada rechace a usuarios sin sesión o con un rol incorrecto.
- Que se validen y limiten los datos recibidos, y se protejan las salidas que puedan mostrarse como texto.
- Que CORS solo permita los dominios de la aplicación.
- Qué protección se usa contra CSRF según el tipo de autenticación.
- Que la duración de la sesión sea adecuada y exista un modo claro de cerrar o invalidar una cuenta de prueba.
- Que la aplicación pública use HTTPS y que el modo de depuración esté desactivado.
- Cómo se hacen y se restauran copias de seguridad de la base de datos.

Anota cada prueba con su fecha, el resultado y cualquier ajuste realizado.

## 8. Evaluación y defensa

La guía reparte la nota así: backend Django, 30 %; integración de React, 15 %; arquitectura y buenas prácticas, 15 %; seguridad e integridad, 15 %; memoria y presentación, 15 %; reflexión y valor aportado, 10 %. La nota mínima indicada es 7,0 sobre 10 y el backend debe cumplir el requisito de Django para que el proyecto pueda calificarse.

La defensa dura hasta 30 minutos. Prepara una explicación y demo de unos 10 minutos y reserva el resto para preguntas técnicas y un cambio pequeño en vivo. Practica explicar cómo llega un producto a React, cómo se autorizan las rutas y cómo validaste un pedido. No memorices una respuesta que no puedas comprobar en el código.

Ensaya un cambio sencillo que puedas explicar —por ejemplo, reordenar un listado o cambiar un texto— y verifica el resultado en el navegador local.

## 9. Despliegue y pruebas

**Estado actual:** no se verificó un despliegue público HTTPS. Completa este apartado solo después de abrir la aplicación y la API desde una red externa, probar la cuenta de cada rol y confirmar que React recibe datos del backend publicado.

| Prueba | Resultado | Evidencia |
|---|---|---|
| Compilación de React (`npm --prefix frontend run build`) | Correcta en la revisión actual | [fecha / captura] |
| Registro e inicio de sesión | [pendiente de comprobar] | [captura] |
| Consulta de productos desde la API | [pendiente de comprobar] | [captura] |
| Pedido y permisos | [pendiente de comprobar] | [captura] |
| Reserva y validación | [pendiente de comprobar] | [captura] |
| Acceso a la URL pública con HTTPS | [pendiente de desplegar] | [URL / captura] |

Hay pruebas automáticas para funciones de Django, incluidas cuentas, pedidos, reservas, permisos y herramientas de importación, además de pruebas concretas de Express y React. No sustituyen la comprobación integral con los servicios publicados, PostgreSQL, MongoDB y cuentas de cada rol.

## 10. Uso de herramientas de IA

En esta revisión se usó GitHub Copilot en VS Code para ayudar a leer la estructura, comparar el proyecto con la guía y preparar cambios de código y documentación. Se ejecutaron pruebas automatizadas y compilaciones locales; registra los resultados y fechas de la comprobación final antes de entregar.

Describe con tus palabras qué partes aceptaste, cuáles cambiaste o rechazaste y qué probaste tú. Añade cualquier otra herramienta de IA que hayas usado, aunque haya sido solo para una parte del trabajo. No ocultes su uso ni presentes como propias decisiones que no puedas explicar.

## 11. Límites y siguientes pasos

- Django funciona en paralelo, pero falta completar la migración y verificarlo como backend principal publicado.
- No se ha comprobado una publicación pública ni se han configurado credenciales de prueba para producción.
- Faltan pruebas integrales en producción y verificación real de todos los flujos y permisos.
- El modo PWA conserva algunos recursos y productos vistos; no se ha verificado la creación y sincronización offline de pedidos.
- [Añade aquí otros límites observados en tus pruebas.]

## 12. Cierre personal

Completa esta parte con lo que aprendiste, una decisión que cambiarías y el siguiente paso que darías. Usa un ejemplo concreto de tu experiencia y evita frases generales que no puedas sostener en la defensa.

## Anexos para completar

- Capturas propias de cada flujo.
- Diagrama final de arquitectura y diagrama entidad-relación.
- Enlaces comprobados al repositorio, la aplicación y el vídeo.
- Resultados de pruebas y lista de comprobación de seguridad.
- Credenciales de prueba compartidas por el canal indicado por la Academia, no incluidas en este archivo.
