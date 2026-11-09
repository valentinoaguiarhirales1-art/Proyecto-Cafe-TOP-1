# Publicar Café Exquisito con servicios gratuitos

> **Ruta acordada para este despliegue:** React en Cloudflare Pages, Express en Render y MongoDB Atlas. Django queda fuera de esta publicación. Es una excepción/adaptación para simplificar el despliegue; **no cumple por sí sola el requisito de Django como backend principal**. No digas en la defensa que lo cumple. Si el instructor exige Django, esa versión tendría que desplegarse y probarse por separado; el fallo local de WSL/Docker no impide usar un host remoto para Django.

## Resumen

Sí, puedes separar las partes:

```text
Navegador
   ├── Interfaz React: Cloudflare Pages
   └── API Express: Render
           └── Datos: MongoDB Atlas
```

Cloudflare Pages publica los archivos estáticos que genera Vite; no ejecuta este servidor Express como un proceso Node permanente. La API puede quedarse en un servicio Node aparte. Para el código actual, esta es la ruta más sencilla sin reescribir el backend.

Los planes gratis sirven para una demo o un proyecto personal, pero no garantizan que la aplicación esté siempre lista. Render duerme los servicios gratuitos inactivos y pierde los archivos guardados en el disco local cuando el servicio se detiene, se reinicia o se vuelve a publicar. Revisa los límites vigentes antes de depender de ellos para la defensa.

## 0. Repositorio listo

El repositorio de Café Exquisito ya está preparado. Su raíz contiene `README.md`, `LICENSE` y `cafe-proyecto/`; conecta el repositorio `Proyecto-Cafe-TOP-1` en los servicios de despliegue, no el repositorio general `Proyectos`. Este despliegue no usa `django_backend/`. No subas archivos `.env`, bases de datos, exportaciones, `node_modules/` ni archivos de otros proyectos.

## 1. Crea una base de datos

1. Crea una cuenta y un clúster gratuito de MongoDB Atlas en una región disponible.
2. Crea un usuario de base de datos solo para esta aplicación y guarda su contraseña fuera del repositorio.
3. Configura la lista de acceso de red de Atlas. En una plataforma sin IP saliente fija puede ser necesario permitir más direcciones; no abras el acceso sin entender el riesgo. Usa una contraseña larga y exclusiva para la base de datos.
4. Copia el URI de conexión a las variables privadas del servicio backend como `MONGO_URI`. Conserva la contraseña en el gestor de variables del hosting, no en esta guía.
5. Si Atlas pide el nombre de la base, usa `cafe_exquisito` o el nombre que hayas elegido.

Las cuotas y condiciones del clúster gratuito pueden cambiar. Atlas gratuito no debe tratarse como copia de seguridad; conserva una exportación de los datos de demo si los necesitas.

Render también debe poder conectarse a Atlas. En la lista de acceso de red de Atlas autoriza las direcciones de salida publicadas para la región de tu servicio de Render y confirma las limitaciones vigentes del plan. Si para una demo gratuita no puedes restringir por IP y decides usar `0.0.0.0/0`, esa regla permite intentos de conexión desde cualquier IP: úsala solo con una base de demostración, un usuario MongoDB de privilegios mínimos y una contraseña exclusiva. No la presentes como una configuración adecuada para datos reales.

## 2. Publica el backend en Render

La carpeta `cafe-proyecto/` incluye `render.yaml` para preparar el Web Service. Si Render permite indicar la ruta del archivo Blueprint, selecciona `cafe-proyecto/render.yaml`; proporciona el `MONGO_URI` de Atlas cuando Render lo solicite. El Blueprint genera `JWT_SECRET` y `EMPLOYER_ACCESS_KEY`. También puedes crear el servicio manualmente:

- **Root Directory:** `cafe-proyecto/backend`.
- **Build Command:** `npm ci`
- **Start Command:** `npm start`
- **Instance Type:** Free, si aparece disponible en tu cuenta.

Configura las variables en el panel de Render:

| Variable | Valor |
|---|---|
| `NODE_ENV` | `production` |
| `MONGO_URI` | URI privado de MongoDB Atlas |
| `JWT_SECRET` | Cadena aleatoria larga y privada |
| `EMPLOYER_ACCESS_KEY` | Otra cadena aleatoria y privada |
| `CORS_ORIGINS` | Dirección exacta de Cloudflare Pages, por ejemplo `https://tu-sitio.pages.dev` |
| `CLOUDINARY_CLOUD_NAME` | Opcional; necesario para que las imágenes subidas no dependan del disco temporal |
| `CLOUDINARY_API_KEY` | Opcional |
| `CLOUDINARY_API_SECRET` | Opcional y privado |
| `GEMINI_API_KEY` | Opcional; déjalo sin configurar si no usarás el asistente de IA |
| `STRIPE_SECRET_KEY` | Opcional; no lo configures si no vas a probar pagos |
| `N8N_WEBHOOK_URL` | Opcional |

Render asigna `PORT`; el servidor ya lee esa variable. No es necesario fijar un puerto público. Cuando termine el despliegue, abre la URL asignada al backend: la ruta raíz (`/`) debe devolver JSON con el estado del servicio.

Si creaste el servicio manualmente, añade `MONGO_URI` antes del primer despliegue. Después de crear Pages, configura `CORS_ORIGINS` con el origen exacto de Pages (solo esquema y host, sin `/` ni ruta) y vuelve a desplegar la API. Comprueba `/health`: devuelve HTTP 200 solo cuando Express está conectado a MongoDB, o HTTP 503 si la base no está lista. No compartas ni guardes secretos en Git.

### Cuidado con las imágenes

El backend guarda archivos en `backend/uploads/` cuando Cloudinary no está configurado. En el plan gratuito de Render ese disco es temporal: las fotos subidas así pueden desaparecer al dormir el servicio, reiniciarlo o volver a desplegar. Para una demo estable, configura Cloudinary en el backend antes de subir imágenes. Las imágenes que ya estén guardadas como rutas `/uploads/...` deben migrarse o volverse a cargar.

### Carga los datos de prueba

Atlas comienza vacío. Según la [documentación oficial de Render](https://render.com/docs/free), los servicios gratuitos no ofrecen acceso a la consola del panel ni trabajos puntuales. Los comandos siguientes deben ejecutarse desde un entorno seguro que tenga las dependencias y acceso autorizado a la base de prueba; no supongas que podrás usar la consola de Render Free. Antes de ejecutarlos, verifica la base seleccionada y conserva un respaldo:

```powershell
npm run data:menu:import
npm run data:promotions:import
npm run admin:create
```

Antes del último comando, configura temporalmente `ADMIN_NAME`, `ADMIN_EMAIL` y `ADMIN_PASSWORD` en el entorno seguro donde lo vayas a ejecutar; las variables de Render no se copian automáticamente a tu equipo. También necesitas allí la conexión autorizada a la base de prueba. Usa una contraseña exclusiva de al menos 12 caracteres y elimina esas variables de ese entorno cuando termines. El usuario y contraseña de prueba se comparten por el canal privado de la entrega, nunca en el repositorio ni en esta guía.

El primer comando agrega/actualiza productos; el segundo agrega/actualiza promociones. Si se ejecutan otra vez, vuelven a sincronizar esos datos. No ejecutes `data:destroy` en la base de datos que quieras conservar.

## 3. Publica React en Cloudflare Pages

En Cloudflare Pages crea un proyecto conectado a `Proyecto-Cafe-TOP-1`:

- **Root directory:** `cafe-proyecto/frontend`
- **Build command:** `npm run build`
- **Build output directory:** `dist`
- **Variable de build `VITE_API_URL`:** URL pública del backend terminada en `/api`, sin barra final. Ejemplo: `https://tu-api.onrender.com/api`

`VITE_API_URL` se incorpora en el JavaScript de la web durante la compilación, así que **no pongas secretos ahí**. Después de cambiar esta variable, vuelve a desplegar el frontend.

Después del primer despliegue, copia la dirección `*.pages.dev` que asignó Cloudflare y configura dos valores:

1. En Cloudflare Pages, define `VITE_API_URL` como la URL Render terminada en `/api` (por ejemplo, `https://tu-api.onrender.com/api`) y vuelve a desplegar Pages.
2. En Render, define `CORS_ORIGINS` como el origen exacto de Pages (por ejemplo, `https://tu-sitio.pages.dev`, sin `/api` ni otra ruta) y vuelve a desplegar la API.

Si cambias de dominio, actualiza `CORS_ORIGINS` en Render. No pongas secretos en variables `VITE_`.

El sitio usa Vite y un service worker (`/sw.js`). La carpeta `frontend/dist` ya incluye el manifiesto, los iconos y el service worker al ejecutar `npm run build`.

## 4. Comprueba el despliegue

1. Abre `/health` en la URL de Render; debe responder HTTP 200 con `{"status":"ok"}`.
2. Abre la URL de Pages en una ventana privada y revisa que cargue el menú sin errores CORS.
3. Prueba crear una cuenta de demostración e iniciar sesión; no publiques sus credenciales.
4. Prueba una reserva y, si vas a demostrar pedidos, crea un pedido de prueba y confirma que aparece en el historial.
5. Si Render se durmió, espera que despierte y vuelve a cargar; la demora inicial es una limitación del plan gratuito.
6. Comprueba que las imágenes abran tras reiniciar. Usa Cloudinary antes de subir imágenes que quieras conservar: el disco local gratuito de Render es temporal.
7. Prueba el service worker. No prometas pedidos offline ni sincronización, porque no está implementada.

## Límites del plan gratuito

- **Cloudflare Pages:** encaja con este frontend porque el resultado de Vite son archivos estáticos. Los límites de compilaciones, archivos y tamaño por archivo dependen del plan.
- **Render Free:** puede dormir tras 15 minutos sin tráfico; al volver, el primer acceso tarda alrededor de un minuto. El sistema de archivos es efímero y las horas gratuitas son compartidas por el espacio de trabajo.
- **MongoDB Atlas Free:** tiene límites de almacenamiento, conexiones y funciones respecto de un clúster pagado. No lo uses como respaldo único de datos importantes.

## Referencias oficiales

- [Cloudflare Pages: límites del plan](https://developers.cloudflare.com/pages/platform/limits/)
- [Cloudflare Workers: compatibilidad con Node.js](https://developers.cloudflare.com/workers/runtime-apis/nodejs/)
- [Render: despliegue gratuito y sus límites](https://render.com/docs/free)
- [MongoDB Atlas: límites de clústeres gratuitos](https://www.mongodb.com/docs/atlas/reference/free-shared-limitations/)
