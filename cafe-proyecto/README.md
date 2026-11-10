# Café Exquisito

Aplicación web para consultar una carta de cafetería, preparar pedidos y gestionar reservas y contenido desde un panel.

## Antes de entregar

Para desplegar esta versión se eligió **React en Cloudflare Pages + API Express en Render + MongoDB Atlas**. Es una excepción acordada para priorizar una publicación sencilla y estable mientras este entorno presenta errores con WSL/Docker. Django sigue en el proyecto como integración de prueba y no es el backend de esta publicación. Por eso, esta entrega **no demuestra el requisito de Django como backend principal**; hay que presentarla ante Conquer Blocks como una adaptación/excepción, no afirmar que Django cumple ese requisito. Si el instructor lo exige sin excepción, habría que volver a desplegar la API Django en un host con PostgreSQL y verificarla allí, lo cual no depende de Docker local.

La interfaz publicada está en [Cloudflare Pages](https://proyecto-cafe-top-1.pages.dev/) y la API en [Render](https://proyecto-cafe-top-1.onrender.com/). La guía [DESPLIEGUE_GRATIS.md](./DESPLIEGUE_GRATIS.md) explica la configuración; revisa las variables privadas y vuelve a probar los flujos después de cada publicación. El vídeo de defensa se agrega a la entrega cuando esté grabado.

## Qué incluye

- Carta de productos, promociones y eventos.
- Registro e inicio de sesión.
- Carrito y creación de pedidos.
- Solicitudes de reserva y consulta del estado.
- Panel de administración para gestionar contenido y pedidos.
- Asistente de menú conectado a un proveedor de IA si se configura su clave.
- Música ambiental original, con reproducción voluntaria y control de volumen.
- Interfaz React con un modo PWA y caché local de productos.

El modo sin conexión permite abrir recursos que ya se hayan cargado y, en el modo Express, consultar productos cacheados. El catálogo Django no se guarda para uso sin conexión. **No se debe contar con que cree pedidos offline ni que los sincronice después**; esa sincronización no está implementada de forma completa.

La app instalada necesita abrirse primero con conexión y terminar de guardar sus archivos. El botón «Comprobar conexión» intenta contactar con la API sin cerrar la página: no puede encender un servidor ni reparar la conexión por sí solo. Si la copia guardada no está completa, vuelve a abrir la app con conexión.

En el chat del asistente, Enter envía el mensaje y Shift+Enter agrega un salto de línea. Las respuestas necesitan que la API esté disponible; si estás leyendo mensajes anteriores, puedes usar la flecha para volver al final.

Como prueba opcional, `VITE_DJANGO_CHAT=true` busca palabras en el catálogo disponible de Django sin usar Express ni un proveedor de IA. Es una búsqueda sencilla, no un chat de inteligencia artificial: muestra coincidencias o pide otra búsqueda y no verifica ingredientes ni restricciones. Para alergias u otras necesidades alimentarias consulta al personal. Con la opción desactivada se conserva el asistente de Express. Esta búsqueda tampoco reemplaza la configuración de producción del backend Django.

Algunos productos y promociones muestran «Fotografía pendiente» porque la foto anterior no correspondía a lo anunciado. Las fotografías ilustrativas pueden diferir de la presentación real y sus créditos están al pie de la página. Se pueden subir fotos reales desde el panel de administración. Para no alterar fotos personalizadas, las sustituciones de imágenes antiguas solo se aplican cuando coinciden tanto el nombre o título como la ruta anterior; no se cambian los registros de la base de datos.

## Memoria del proyecto

- [Memoria de Café Exquisito en PDF](./MEMORIA_CAFE_EXQUISITO.pdf)
- [Versión editable en Word](./MEMORIA_CAFE_EXQUISITO_EDITABLE.docx)
- [Fuente editable en Markdown](./MEMORIA_CAFE_EXQUISITO_EDITABLE.md)

## Sobre instalarla como app

La instalación PWA agrega un icono y abre la interfaz en una ventana propia, pero no instala en el dispositivo la API de Node.js ni la base de datos. Para iniciar sesión, crear pedidos y usar las funciones del servidor, la página publicada y la API deben estar disponibles y el dispositivo necesita conexión. Sin internet, solo podrían abrirse algunos archivos y datos guardados previamente en la caché; el carrito y los cambios no se sincronizan automáticamente.

## Tecnologías actuales

| Parte | Tecnología |
|---|---|
| Interfaz | React 18, Vite 6 |
| API existente | Node.js, Express 4 |
| Base de datos | MongoDB con Mongoose 8 |
| Inicio de sesión | JWT y contraseñas con bcrypt |
| Archivos | Cloudinary, si se configura |
| Pruebas automáticas | API Express con `node:test`; Django con `manage.py test` |

Las versiones instaladas quedan registradas en `backend/package-lock.json` y `frontend/package-lock.json`.

## Primera etapa de Django

`django_backend` contiene un catálogo independiente con categorías y productos relacionados, migraciones, una API de solo lectura y un formulario de edición para personal con sesión Django. Tiene también registro de clientes, pedidos sencillos de un producto y reservas mediante plantillas Django. El servidor calcula el precio de los pedidos; cada cliente solo ve sus propios pedidos y reservas. Para editar productos se requiere ser personal y disponer del permiso Django `catalog.change_product`; el superusuario puede conceder los permisos correspondientes a cada miembro desde `/admin/`. Los usuarios autorizados pueden gestionar pedidos y reservas en ese panel.

El panel sencillo de Django está en `http://127.0.0.1:8000/personal/`: muestra productos, pedidos y reservas de invitados y clientes según los permisos de cada miembro y permite cambiar estados a quienes tengan permiso de modificación. Este panel no es el panel React original y no muestra datos de MongoDB.

Para probarlo en local, con Python compatible con Django 5.2, abre una terminal en la carpeta del proyecto:

```powershell
cd django_backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
$env:DJANGO_DEBUG = "true"
python manage.py migrate
python manage.py import_menu
python manage.py createsuperuser
python manage.py runserver 127.0.0.1:8000
```

En otra terminal, inicia React siguiendo las instrucciones de abajo y abre `http://localhost:3000/catalogo-django`. Esta vista consulta `/django-api/products` mediante el proxy de Vite hacia Django. También puedes visitar `http://127.0.0.1:8000/catalogo/` y `http://127.0.0.1:8000/admin/`. El importador añade los productos de ejemplo que faltan y no sobrescribe productos ya guardados.

Esta primera etapa usa SQLite en `django_backend/db.sqlite3`, una base **separada** de MongoDB. No copia los usuarios, productos personalizados, pedidos ni reservas existentes; los cambios en un backend no aparecen en el otro. Por defecto la página principal sigue conectada a Express. Los usuarios, sesiones y roles de Django también son independientes.

La vista React de prueba `/catalogo-django` permite registrarse o iniciar sesión en Django, añadir productos con sus opciones, enviar pedidos y solicitar reservas. El servidor calcula los precios, requiere una sesión Django y valida el token CSRF. Los historiales solo muestran los pedidos y reservas del usuario autenticado. Por defecto el carrito, las reservas y las cuentas de la página principal utilizan Express; existen opciones de prueba separadas para Django. El formulario web de Django sigue permitiendo pedir un producto a la vez. Aún no están implementados en Django el pago con tarjeta, los puntos ni las notificaciones; las reservas son solicitudes sin comprobación automática de disponibilidad.

Si la cuenta Django cambia en otra pestaña mientras usas `/catalogo-django`, recarga la vista antes de consultar historiales, crear pedidos o reservas, o cerrar sesión.

### Prueba opcional de reservas de la página principal

La página principal puede enviar nuevas solicitudes de reserva a Django en lugar de Express. Esta opción está **desactivada por defecto** para no cambiar dónde se guardan los datos. Solo para probarla en local:

1. Inicia Django siguiendo los pasos anteriores; asegúrate de ejecutar `python manage.py migrate` para aplicar también la migración de solicitudes de reserva.
2. En otra terminal, desde `frontend`, ejecuta:

   ```powershell
   $env:VITE_DJANGO_RESERVATIONS = "true"
   npm run dev
   ```

3. Abre la página principal en la dirección que indique Vite y envía el formulario de reservas. Un superusuario de Django puede gestionar las nuevas solicitudes en `http://127.0.0.1:8000/admin/`, en «Solicitudes de reserva». La sesión y los permisos de Django son independientes de los de Express.

En este modo, el panel React avisa de que las reservas nuevas están en Django. Las anteriores continúan en MongoDB y no aparecen en el panel Django hasta que se trasladen de forma expresa; para volver a verlas en el panel React, reinicia Vite sin la opción (`$env:VITE_DJANGO_RESERVATIONS = "false"`). Más abajo se explica la herramienta de exportación e importación; no se ha hecho el traslado definitivo. La solicitud no queda confirmada automáticamente y no se envían notificaciones. Esta integración es experimental y no está preparada para producción: aún hay que configurar protección contra abuso y verificar el despliegue. Los demás apartados de la página principal siguen usando Express.

También se puede probar el catálogo de Django en el diseño de la página principal con `$env:VITE_DJANGO_CATALOG = "true"` antes de iniciar Vite. Por defecto es **solo de consulta**. Si Django no responde, se muestra un aviso y no se sustituye su catálogo por productos de ejemplo. Si además se establece `$env:VITE_DJANGO_CHECKOUT = "true"`, el carrito principal puede enviar pedidos de prueba a Django. Sin la opción de cuentas descrita abajo, hay que crear una cuenta e iniciar sesión en `/catalogo-django` y consultar los pedidos en esa vista. No hay pago en línea ni puntos; el servidor calcula el total definitivo y el pedido queda pendiente de pago en mostrador. No mezcles este modo con operaciones reales.

El botón «Comprobar conexión» consulta el servidor del catálogo seleccionado: Django si está activada esa opción y Express en caso contrario. Que responda el catálogo no garantiza que respondan los demás servicios, que todavía pueden estar en otro servidor.

Al enviar un pedido Django, el navegador consulta la sesión y envía la identidad esperada junto con el pedido. Si otra pestaña cambia la cuenta antes de que Django lo reciba, el servidor rechaza la operación; recarga la página y comprueba la cuenta antes de volver a intentarlo.

### Prueba opcional de cuenta Django en la página principal

Con Django y Express iniciados por separado, inicia Vite desde `frontend` con estas opciones:

```powershell
$env:VITE_DJANGO_AUTH = "true"
$env:VITE_DJANGO_CATALOG = "true"
$env:VITE_DJANGO_CHECKOUT = "true"
$env:VITE_DJANGO_RESERVATIONS = "true"
npm run dev
```

El botón de acceso usa el **correo de la cuenta Django** y su contraseña; el registro pide también un nombre de usuario. La sesión se recupera al recargar y se cierra en Django. El perfil permite guardar nombre y teléfono y «Mis pedidos» muestra los pedidos Django con sus opciones. Instala las dependencias actualizadas y ejecuta `python manage.py migrate` antes de probar el perfil actualizado. Las cuentas antiguas de Express no se trasladan automáticamente ni se borran. Si cambias de cuenta Django en otra pestaña, recarga antes de consultar el perfil, pedidos, pedir o cerrar sesión.

Este modo sigue siendo experimental: el avatar, los puntos y el pago online no están disponibles con la cuenta Django. Personal, chat y otras funciones aún dependen de Express; eventos y promociones también usan Express salvo que se activen las opciones Django descritas a continuación. Los permisos del panel React de Express no se transfieren a Django. El panel del personal Django se abre aparte en `http://127.0.0.1:8000/personal/` con una cuenta Django autorizada. Las solicitudes del formulario público se guardan como reservas de invitados, no como reservas vinculadas a la cuenta. Para volver al modo anterior, reinicia Vite con las cuatro variables en `false`; la cuenta Express guardada localmente se conserva.

El carrito rechaza mezclas de productos de Django y Express y los productos de respaldo sin conexión. Las imágenes de productos Django no se editan desde React; el panel de administración React sigue mostrando productos y pedidos de Express, mientras que los pedidos Django se administran desde su propio panel. Si Django no responde, se muestra el aviso de recuperación y se usan productos de respaldo que no permiten confirmar pedidos. Esta opción no traslada los productos personalizados desde MongoDB. Para volver al comportamiento habitual, reinicia Vite con ambas variables en `false`.

### Prueba opcional de promociones Django

Ejecuta `python manage.py migrate` en `django_backend` e inicia Django. Crea o edita promociones en `/admin/`, con una cuenta Django autorizada. Después inicia el frontend con `$env:VITE_DJANGO_PROMOTIONS = "true"`; la página principal y la sección de promociones leerán las promociones activas de Django. Una lista vacía se muestra vacía, sin inventar ofertas. El panel React y su editor siguen gestionando promociones de Express y muestran un aviso de esa separación.

Para probar el traslado desde MongoDB, usa primero una copia de seguridad y una base Django de prueba independiente:

```powershell
# En backend; la ruta debe ser un archivo nuevo
node scripts\exportPromotionsForDjango.js "$env:TEMP\cafe-promociones-export.json"

# En django_backend, con la base de prueba elegida
python manage.py migrate
python manage.py import_mongo_promotions "$env:TEMP\cafe-promociones-export.json" --dry-run
python manage.py import_mongo_promotions "$env:TEMP\cafe-promociones-export.json"
```

La importación conserva fecha, imágenes, precios, productos incluidos y estado activo; cancela todo el lote ante identificadores duplicados o datos incompatibles. No actualiza ni borra registros existentes. No se ha realizado el traslado definitivo ni se han verificado las imágenes externas. Las promociones son informativas y no se cobran como combos desde el carrito Django.

### Prueba opcional de ajustes visuales Django

Ejecuta `python manage.py migrate` en `django_backend` e inicia Django. Una cuenta autorizada puede editar «Ajustes visuales» en `/admin/`. Inicia Vite desde `frontend` con `$env:VITE_DJANGO_SETTINGS = "true"` para que la página principal lea esos ajustes; con `false` sigue usando Express. El editor React continúa guardando en Express y no modifica los valores de Django. Las imágenes se indican mediante una ruta o URL: el panel Django no las sube ni copia. Los textos vacíos pueden mostrar los valores de respaldo de la página.

Para ensayar el traslado, primero respalda los datos y utiliza una base Django de prueba independiente:

```powershell
# En backend; el archivo de destino no debe existir
node scripts\exportSiteSettingsForDjango.js "$env:TEMP\cafe-ajustes-export.json"
# En django_backend
python manage.py import_mongo_settings "$env:TEMP\cafe-ajustes-export.json" --dry-run
python manage.py import_mongo_settings "$env:TEMP\cafe-ajustes-export.json"
```

La importación solo acepta las claves disponibles en Django y valores de texto de hasta 5000 caracteres. Una clave desconocida, un valor de otro tipo o un duplicado cancela el lote completo, sin sobrescribir ajustes existentes. Por ejemplo, `logo_url` puede existir en Express pero no está admitida: la página principal no la utiliza. Revisa y prepara una copia del archivo antes de importar; no elimines ni modifiques los datos originales. No se ha realizado el traslado real ni se han comprobado las imágenes de origen.

### Prueba opcional de perfiles públicos del equipo

Ejecuta `python manage.py migrate`, inicia Django y crea «Perfiles públicos del equipo» en `/admin/` con una cuenta autorizada. Cada perfil requiere una cuenta Django, un nombre público y un puesto. Antes de activar la publicación, confirma la autorización de la persona: solo aparecen perfiles marcados para publicar **y** con autorización confirmada; si se retira cualquiera de las marcas o se desactiva la cuenta, dejan de aparecer. No se publica el correo de la cuenta.

Inicia el frontend con `$env:VITE_DJANGO_TEAM = "true"` para mostrar esos perfiles; con `false` se sigue usando Express. No se trasladan perfiles automáticamente. Por defecto las solicitudes de empleo siguen en Express, salvo que se active la opción siguiente. El panel patronal de React continúa en Express: editar allí un perfil no cambia el listado público de Django. Esta opción es experimental y no constituye una migración completa del personal.

Para ensayar el traslado de perfiles del equipo, respalda primero los datos y utiliza una base Django de prueba independiente. Importa primero las cuentas con `import_mongo_users` y `--staff-as-customers`, como se explica más abajo; las cuentas importadas no reciben permisos de personal. Después:

```powershell
# En backend; el archivo de destino no debe existir
node scripts\exportTeamProfilesForDjango.js "$env:TEMP\cafe-equipo-export.json"
# En django_backend
python manage.py import_mongo_team_profiles "$env:TEMP\cafe-equipo-export.json" --dry-run
python manage.py import_mongo_team_profiles "$env:TEMP\cafe-equipo-export.json"
```

El archivo contiene nombres y datos de perfil, por lo que debe mantenerse privado. No incluye contraseñas, sueldos, CURP ni correos. La importación requiere la cuenta vinculada, rechaza errores y duplicados sin sobrescribir datos y cancela el lote completo si algo falla. Por precaución, todos los perfiles importados quedan privados y sin autorización confirmada en Django, aunque estuvieran públicos en Express; una persona autorizada debe volver a confirmar la autorización antes de publicarlos. No se conceden permisos ni se han trasladado datos reales.

Las solicitudes también pueden probarse con `$env:VITE_DJANGO_STAFF_APPLICATIONS = "true"` y `$env:VITE_DJANGO_AUTH = "true"`. Tras ejecutar las migraciones, las solicitudes nuevas se guardan en Django. Un miembro de personal con permiso `catalog.change_staffapplication` puede emitir o renovar una invitación en `/personal/`, o rechazar la solicitud; renovar o rechazar invalida el código anterior. El código se muestra una sola vez, vence a los siete días y debe entregarse en privado. La persona debe tener una cuenta Django con el correo aprobado, iniciar sesión y aceptar el código en la sección de equipo. La aceptación crea un perfil privado sin conceder permisos ni publicar datos: un administrador debe confirmar cualquier autorización y conceder permisos por separado.

El panel patronal React sigue conectado a Express y no recibe solicitudes Django; las invitaciones Django no funcionan en Express ni viceversa. Si las solicitudes y el acceso de cuentas están configurados para servidores distintos, la aceptación se desactiva hasta que ambos usen el mismo servidor. El registro no verifica que la persona controle el correo: hacer coincidir la dirección no demuestra su propiedad. No se evitan automáticamente solicitudes duplicadas ni se envían notificaciones. Esta función es experimental: antes de publicarla se necesita limitar el abuso, definir la protección y retención de datos personales y probar la concurrencia con PostgreSQL.

Para ensayar el traslado de solicitudes desde MongoDB, haz primero una copia de seguridad y usa una base Django de prueba independiente:

```powershell
# En backend; el archivo de destino no debe existir
node scripts\exportStaffApplicationsForDjango.js "$env:TEMP\cafe-solicitudes-export.json"
# En django_backend
python manage.py import_mongo_staff_applications "$env:TEMP\cafe-solicitudes-export.json" --dry-run
python manage.py import_mongo_staff_applications "$env:TEMP\cafe-solicitudes-export.json"
```

El archivo contiene datos personales y debe mantenerse privado y eliminarse de forma segura cuando ya no se necesite. El exportador no copia códigos de invitación, hashes ni cuentas vinculadas. El importador admite solo solicitudes pendientes o rechazadas; las aprobadas y aceptadas requieren conciliación manual y cancelan el lote, porque Django no reproduce aún su invitación ni activación. Datos incompatibles o identificadores duplicados también cancelan toda la operación. No se actualizan registros existentes ni se detectan automáticamente duplicados creados por separado. No se ha realizado el traslado real.

### Prueba opcional de eventos Django

Ejecuta `python manage.py migrate`, inicia Django y crea un evento futuro desde `/admin/`, incluyendo fecha y hora real y el horario mostrado. En `frontend`, inicia Vite con `$env:VITE_DJANGO_EVENTS = "true"` y `$env:VITE_DJANGO_AUTH = "true"`. Los eventos se muestran en la página principal y en su sección; las cuentas Django pueden reservar de uno a cuatro lugares por solicitud. El servidor comprueba el aforo y guarda la reserva junto con la cuenta. En `/admin/`, el personal autorizado puede consultar reservas; no puede borrarlas ni cambiar el cupo por debajo de lo reservado.

Al activar eventos o promociones Django, se oculta en la portada la tarjeta fija de temporada correspondiente, para no anunciar como disponible un evento o una oferta que no exista en Django. La otra tarjeta fija se conserva si su sección todavía usa Express.

Esta función está en prueba: no hace cobros, no envía notificaciones ni permite cancelaciones. Las reservas Django se pueden consultar en «Mis reservas de eventos» en esa misma sección. Si se interrumpe la conexión al reservar, comprueba ahí si se registró antes de intentarlo de nuevo; si no puedes consultarlo, pregunta al personal para evitar duplicados. Las reservas existentes de Express se siguen administrando por separado. El control de aforo utiliza una actualización condicional transaccional; las pruebas se han ejecutado en SQLite, no con concurrencia real en PostgreSQL.

Para preparar el traslado de eventos y asistentes, haz primero una copia de seguridad, detén los cambios y prueba en una base Django aislada. Las cuentas de los asistentes deben haberse importado antes. El archivo incluye identificadores personales de asistentes: protégelo y no lo subas a Git.

```powershell
# En backend; la ruta debe ser un archivo nuevo
node scripts\exportEventsForDjango.js "$env:TEMP\cafe-eventos-export.json"

# En django_backend, con las cuentas ya importadas en la base de prueba
python manage.py migrate
python manage.py import_mongo_events "$env:TEMP\cafe-eventos-export.json" --dry-run
python manage.py import_mongo_events "$env:TEMP\cafe-eventos-export.json"
```

La importación conserva eventos, asistentes, fechas y lugares reservados. Rechaza el lote completo si falta una cuenta, hay duplicados, el aforo no alcanza o algún dato es incompatible. El traslado definitivo aún no se ha realizado ni probado con los datos reales; revisa cualquier conflicto sin modificar ni borrar el origen.

### Preparación del traslado de cuentas

Existe un exportador de solo lectura y un importador transaccional para probar el traslado de cuentas. Copian correo, nombre, teléfono, identificador y hash bcrypt; **no** copian puntos, fotos, sesiones, pedidos ni datos de personal. No se asignan permisos administrativos automáticamente. Una contraseña bcrypt compatible se comprueba al iniciar sesión y Django la actualiza a su algoritmo habitual; las sesiones JWT anteriores no se convierten.

**No se ha hecho el traslado definitivo.** Antes de importar, prepara una copia de seguridad, detén los registros y cambios de cuentas en ambos sistemas durante el corte y prueba primero en una base Django aislada. El archivo contiene datos personales y hashes de contraseñas: guárdalo fuera del repositorio en una ubicación privada, restringe el acceso con permisos del sistema (en Windows revisa los permisos de la carpeta) y elimínalo de forma segura cuando ya no se necesite. No lo compartas ni lo subas a Git.

```powershell
# En backend, con MONGO_URI configurada; no sobrescribe un archivo existente
node scripts\exportUsersForDjango.js "$env:TEMP\cafe-cuentas-export.json"

# En django_backend, con las dependencias instaladas y la base de prueba elegida
python manage.py migrate
python manage.py import_mongo_users "$env:TEMP\cafe-cuentas-export.json" --dry-run
python manage.py import_mongo_users "$env:TEMP\cafe-cuentas-export.json"
```

La importación se cancela completa si hay conflictos de correo, identificador, nombre de usuario o datos inválidos. Si el archivo incluye personal, también se cancela a menos que se agregue `--staff-as-customers` a **ambos comandos**; en ese caso se crean como clientes sin privilegios y un administrador debe revisar y conceder manualmente los permisos Django que correspondan. Resuelve conflictos sin borrar ni sobrescribir datos. Prueba acceso con una cuenta autorizada antes de planear el corte; no se ha verificado con las cuentas reales.

### Preparación del traslado de pedidos

Hay un exportador de solo lectura y un importador transaccional para pedidos históricos. Primero deben estar importadas las cuentas y los productos correspondientes con sus identificadores MongoDB. No se asigna un pedido si falta su cliente o alguno de sus productos. El historial conserva importe, opciones, fecha y estado, así como datos históricos de sucursal y pago; no vuelve a cobrar ni acredita puntos. El indicador de pago refleja únicamente lo registrado en Express, no una consulta actual a Stripe.

Con los pedidos congelados durante el corte, una copia de seguridad disponible y una base Django de prueba independiente:

```powershell
# En backend; el archivo nuevo contiene información privada de pedidos y pagos
node scripts\exportOrdersForDjango.js "$env:TEMP\cafe-pedidos-export.json"

# En django_backend, después de importar cuentas y productos a la base de prueba
python manage.py migrate
python manage.py import_mongo_orders "$env:TEMP\cafe-pedidos-export.json" --dry-run
python manage.py import_mongo_orders "$env:TEMP\cafe-pedidos-export.json"
```

Protege y elimina el archivo temporal como el de cuentas. La validación rechaza todo el lote ante duplicados, referencias ausentes o datos no compatibles; no reemplaza ni borra pedidos. Las pruebas usan datos ficticios: **no se ha hecho la migración definitiva ni una conciliación real de pagos, puntos o pedidos**. Si un registro antiguo no pasa la validación, revísalo antes de cualquier traslado; no modifiques el origen para forzar la importación.

### Preparación del traslado de productos

Existe un exportador de solo lectura y un importador para **productos**, con una validación previa. No copian usuarios, contraseñas, pedidos ni reservas y no sustituyen una copia de seguridad de MongoDB. Se probó la exportación de los 76 productos existentes y su importación en una base temporal separada: coincidieron identificadores, nombre, categoría, descripción, precio, disponibilidad, imagen y opciones. La base temporal se eliminó después; **no se ha hecho el traslado definitivo ni se han comprobado las imágenes alojadas externamente**.

1. Haz una copia de seguridad y usa primero una base Django de prueba separada. No borres la base actual ni sobrescribas datos para resolver conflictos.
2. Desde `backend`, con `MONGO_URI` configurada localmente, exporta a un archivo nuevo fuera del repositorio:

   ```powershell
   node scripts\exportProductsForDjango.js "$env:TEMP\cafe-productos-export.json"
   ```

   Si el archivo ya existe, el comando se detiene sin sobrescribirlo. El archivo puede contener información comercial y debe guardarse de forma privada; no lo subas a Git.
3. En `django_backend`, usando la base de prueba elegida, aplica `python manage.py migrate` y valida:

   ```powershell
   python manage.py import_mongo_products "$env:TEMP\cafe-productos-export.json" --dry-run
   ```

   La validación no guarda nada. Si hay nombres o identificadores duplicados o datos incompatibles, el comando detiene toda la operación. La base local inicial ya contiene productos de ejemplo, por lo que puede haber conflictos de nombres: usa una base de prueba vacía y revisa cómo conciliarlos antes de un traslado real.
4. Solo después de comprobar el resultado, ejecuta el mismo comando sin `--dry-run` en la base de prueba. Se conservan nombre, categoría, descripción, precio, disponibilidad, imagen, opciones y la referencia al identificador MongoDB; **no se migran las imágenes alojadas externamente ni se comprueba su disponibilidad**. El importador no sobrescribe productos y revierte toda la importación si aparece un error. No sincroniza cambios posteriores entre las bases.

### Preparación del traslado de reservas

Las reservas de Express pueden exportarse e importarse como solicitudes de Django; **todavía no se ha realizado el traslado real**. La exportación contiene nombres, correos y teléfonos: usa una carpeta privada, limita el acceso al archivo, no lo subas al repositorio y elimínalo de forma segura cuando ya no lo necesites. Haz antes una copia de seguridad y trabaja primero con una base Django de prueba independiente.

Desde `backend`, con MongoDB configurado localmente, exporta a un archivo nuevo:

```powershell
node scripts\exportReservationsForDjango.js "$env:TEMP\cafe-reservas-export.json"
```

El comando solo lee MongoDB y no sobrescribe un archivo existente. Después, desde `django_backend`, con `DJANGO_DEBUG=true` y la base de prueba seleccionada, aplica `python manage.py migrate` y valida:

```powershell
python manage.py import_mongo_reservations "$env:TEMP\cafe-reservas-export.json" --dry-run
```

Si la validación es correcta, el mismo comando sin `--dry-run` importa las solicitudes, su estado, fecha, hora y fecha original de creación. La operación es transaccional: un registro inválido o un identificador Mongo ya importado cancela toda la importación. Por seguridad, se rechazan fechas que no coincidan con el formato de mediodía UTC que genera el backend actual; los registros históricos diferentes deben revisarse antes de proceder. No se detectan automáticamente posibles duplicados creados manualmente en Django y no existe sincronización entre bases. Las reservas importadas no se asocian a cuentas Django y se gestionan como solicitudes de invitados.

Para producción no basta con copiar estas instrucciones: configura `DJANGO_SECRET_KEY` de forma privada, `DJANGO_DEBUG=false`, `DJANGO_ALLOWED_HOSTS` y PostgreSQL persistente mediante `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_HOST` y opcionalmente `POSTGRES_PORT` y `POSTGRES_SSLMODE` (por defecto `require`). Instala las dependencias de `django_backend/requirements.txt`, ejecuta `python manage.py collectstatic --noinput` durante la preparación y usa Gunicorn en Linux (por ejemplo, `gunicorn cafe.wsgi:application --bind 0.0.0.0:$PORT` desde `django_backend`). WhiteNoise sirve los archivos estáticos recopilados; no sirve imágenes subidas por usuarios. También hay que configurar HTTPS y enrutar `/django-api/` al servidor Django desde el mismo origen de React. Si el proxy HTTPS es de confianza, elimina cualquier cabecera `X-Forwarded-Proto` recibida del cliente y configura `DJANGO_TRUST_PROXY_HTTPS=true` solo cuando el proxy la establezca correctamente. Si los formularios se envían desde otro origen autorizado, configura `DJANGO_CSRF_TRUSTED_ORIGINS` con sus URL HTTPS separadas por comas. Estos pasos de producción y el despliegue no están verificados.

Si el panel Django se publica detrás del mismo proxy que React, las rutas de administración y `/static/` también deben llegar a Django, sin interceptar los archivos estáticos del frontend. La preparación de estáticos se probó localmente con `DEBUG` desactivado; Gunicorn, el proxy y PostgreSQL todavía no se han probado juntos en un alojamiento.

El proyecto incluye una función experimental de Cloudflare Pages para reenviar `/django-api/*` a Django. Para usarla, el directorio raíz de Pages debe ser `frontend`, la variable de entorno de ejecución `DJANGO_ORIGIN` debe contener solo el origen HTTPS del backend (por ejemplo, `https://django.example.com`, sin ruta ni credenciales), y Django debe tener configurado el host de su servicio y `DJANGO_CSRF_TRUSTED_ORIGINS` con el origen HTTPS exacto de Pages. La función conserva cookies y CSRF y no almacena respuestas en caché; el servidor y su proxy deben establecer por sí mismos la información HTTPS confiable. La función no enruta `/admin/`, `/personal/` ni `/static/`: esos paneles requieren acceso HTTPS separado al backend y su propia configuración de seguridad. Las opciones `VITE_DJANGO_*` se fijan al compilar React, mientras que `DJANGO_ORIGIN` configura la función de Pages. No incluyas secretos en variables `VITE_`.

Cloudflare indica que Pages Functions se despliegan mediante integración Git o Wrangler, no mediante la carga directa desde el panel. Esta función está probada de forma local con peticiones simuladas, **no** en Cloudflare ni con un backend público; antes de utilizarla hay que probar inicio y cierre de sesión, CSRF, cookies, errores y permisos en el dominio definitivo. No uses datos reales hasta terminar esas comprobaciones y la protección contra abuso.

Según la [documentación de Render Free](https://render.com/docs/free), su PostgreSQL gratuito caduca a los 30 días y no incluye copias de seguridad; no debe tratarse como almacenamiento permanente. Comprueba los planes vigentes y elige una base adecuada antes de migrar datos reales.

Las pruebas de esta etapa se ejecutan desde `django_backend` con `python manage.py test catalog`, usando `DJANGO_DEBUG=true` en local. No prueban las funciones que siguen en Express.

Para comprobar la concurrencia con una base PostgreSQL de prueba independiente, configura las variables `POSTGRES_*` para un usuario que pueda crear y borrar la base temporal de pruebas y ejecuta `python manage.py test catalog.test_postgres_concurrency`. El ejecutor de Django crea y elimina esa base de pruebas; nunca apuntes estos ensayos a datos que no puedas perder. Comprueba que las dos pruebas se ejecuten, no que se omitan. Con SQLite se omiten expresamente y no demuestran la concurrencia de PostgreSQL.

## Ejecutar en local

Se necesita Node.js instalado y una instancia de MongoDB accesible.

1. Copia `backend/.env.example` a `backend/.env` y completa los valores en tu equipo. No subas ese archivo ni compartas sus claves.
2. Instala y arranca la API:

   ```powershell
   cd backend
   npm install
   npm run dev
   ```

3. En otra terminal, instala y arranca la interfaz:

   ```powershell
   cd frontend
   npm install
   npm run dev
   ```

4. Abre la dirección local que muestra Vite. En desarrollo, Vite reenvía `/api` y `/uploads` al backend del puerto `5000`.

El modo de desarrollo no conserva la app para usarla sin conexión. Una dirección de vista previa como `127.0.0.1:4173` solo funciona mientras su servidor de vista previa esté encendido; para trabajar en local usa la dirección que aparece al ejecutar `npm run dev`, normalmente `http://localhost:3000`.

Para crear un administrador local de prueba, completa `ADMIN_NAME`, `ADMIN_EMAIL` y `ADMIN_PASSWORD` en el archivo local `backend/.env`. La contraseña debe tener al menos 12 caracteres. Desde `backend`, ejecuta `npm run admin:create`. No uses esos datos como credenciales públicas ni los incluyas en Git.

También están los lanzadores `iniciar.bat` y `iniciar.ps1`. Para producción, configura `VITE_API_URL` con la dirección de la API terminada en `/api` y `CORS_ORIGINS` con el origen exacto del frontend. La ruta `/uploads` también necesita servirse desde la API o pasar por un proxy del alojamiento.

Para una posible publicación de la versión Express consulta [DESPLIEGUE_GRATIS.md](./DESPLIEGUE_GRATIS.md). Esa guía no despliega Django y por sí sola no cubre el requisito académico. Los planes gratuitos y el despliegue conjunto aún deben verificarse.

## Datos y permisos

La API actual guarda usuarios, productos, pedidos, promociones, eventos, reservas, solicitudes de personal y ajustes del sitio en MongoDB. Los pedidos pertenecen a un usuario y guardan sus productos y cantidades. Las rutas restringidas comprueban la sesión y el rol en el backend; ocultar un botón en React no reemplaza esa comprobación.

Roles contemplados: visitante, cliente, personal, gerente y administrador. Para la memoria final, comprueba los permisos ruta por ruta y añade capturas de las acciones que sí estén disponibles.

## Comprobaciones disponibles

Desde la carpeta del proyecto se puede generar la versión de producción de la interfaz:

```powershell
npm --prefix frontend run build
```

Ejecuta `npm --prefix backend test` para probar la lista de orígenes CORS y las sustituciones de imágenes. La compilación de React también se ejecutó durante esta revisión y terminó correctamente; se comprobó la sintaxis de los archivos JavaScript del backend. Aún faltan pruebas de pedidos, permisos, base de datos y pagos.

## Pendientes para la entrega final

- Migrar el backend a Django y verificar sus modelos, migraciones, validaciones y roles.
- Conectar la vista React a la API Django, tanto en local como en producción.
- Añadir tests de los flujos principales y de los permisos.
- Configurar `CORS_ORIGINS` con el dominio real y completar las medidas de seguridad.
- Revisar la duración de las sesiones, los datos de entrada y las reglas de reservas y pagos.
- Desplegar por HTTPS con `DEBUG` desactivado, datos de prueba y una cuenta funcional por rol.
- Crear un historial de commits real y progresivo; no inventar commits anteriores.
- Completar la memoria editable de `MEMORIA_PFM.md`, añadir capturas propias y exportarla a PDF con texto seleccionable.
- Grabar y publicar el vídeo de menos de cinco minutos siguiendo `GUION_VIDEO_PFM.md`.

## Asistencia con IA

En esta revisión se usó GitHub Copilot en VS Code para analizar el proyecto y preparar documentación y cambios. La memoria debe describir con honestidad las herramientas que se usaron, qué aportaron y qué se comprobó. Antes de entregar, revisa cada cambio y asegúrate de poder explicarlo y modificarlo.
