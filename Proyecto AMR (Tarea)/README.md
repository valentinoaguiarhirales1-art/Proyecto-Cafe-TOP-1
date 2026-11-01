# *🥘 Sazón Compartida*

### *Una mesa, muchas historias y recetas para compartir.* 🌎

**Sazón Compartida** es un recetario colaborativo bilingüe desarrollado con Django. Descubre platillos, comparte los tuyos, añade todos los ingredientes que necesites y ayuda a que cada receta cruce fronteras.

> *🍋 *Proyecto 9: Aplicación Multilingüe de Recetas**
> **Django · Español e inglés · Lista para configurar y desplegar**

---

## *✨ Un recetario hecho entre todos*

En **Sazón Compartida**, cada receta cuenta una historia. Publica tus platillos, comparte instrucciones claras y descubre nuevas ideas de la comunidad.

### *🍽️ ¿Qué puedes hacer?*

- **Crear, editar y eliminar recetas** desde tu cuenta.
- **Agregar tantos ingredientes como necesites**, con cantidad y unidad, gracias al formulario dinámico.
- **Traducir el contenido** de la receta y los nombres de sus ingredientes entre español e inglés.
- **Buscar recetas** por nombre, descripción o ingrediente.
- **Explorar y filtrar** por categoría, dificultad y tiempo total.
- **Valorar recetas** de una a cinco estrellas y compartir comentarios.
- **Subir fotografías** JPG, PNG o WebP de hasta 5 MB.
- **Cambiar el idioma de la interfaz** entre español e inglés.
- **Administrar el recetario** desde el panel de Django.

### *🌐 Un detalle importante sobre las traducciones*

***Las traducciones las escriben las personas que crean y mantienen las recetas; la aplicación **no realiza traducciones automáticas**. Si un idioma todavía no está disponible, se muestra el contenido en el idioma original. Así las cantidades, los ingredientes y las instrucciones siguen siendo fieles a quien comparte la receta. 💚***

---

## *🧰 Tecnologías*

| Tecnología | Para qué se utiliza |
|---|---|
| **Python 3.12+ y Django 5.2** | Aplicación web, autenticación, modelos y administración |
| **SQLite** | Base de datos local para comenzar fácilmente |
| **PostgreSQL** | Base de datos recomendada para producción |
| **HTML, CSS y JavaScript** | Interfaz adaptable y gestión dinámica de ingredientes |
| **WhiteNoise** | Archivos estáticos en el despliegue |
| **Docker y Docker Compose** | Entorno reproducible con PostgreSQL |
| **Almacenamiento S3 compatible (opcional)** | Fotografías persistentes con AWS S3 o DigitalOcean Spaces |

### *🧑‍🍳 Modelos del recetario*

`Recipe` · `RecipeTranslation` · `Ingredient` · `IngredientTranslation` · `RecipeIngredient` · `Category` · `Rating` · `User`

***La receta, los ingredientes y sus traducciones tienen datos propios. Así, cada persona puede valorar una receta una sola vez y actualizar su valoración sin duplicarla.***

---

## *🚀 Pon la cocina en marcha*

### *Requisitos*

- **Python 3.12 o posterior**
- **pip**
- Opcional: **Docker Desktop** para ejecutar la aplicación con PostgreSQL

### *⚡ Inicio rápido en Windows*

Dentro de `aplicacion-system-recets`, haz doble clic en **`00_INICIAR.bat`** (el primer archivo de la carpeta, junto a `manage.py`): prepara todo, levanta el servidor y abre ***Chrome*** en `http://127.0.0.1:8000/`.

### *🪟 Windows · PowerShell*

***Desde la carpeta del proyecto:***

```powershell
cd aplicacion-system-recets
py -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
Copy-Item .env.example .env
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

***Visita **<http://127.0.0.1:8000/>** y empieza a explorar. El comando `createsuperuser` crea la cuenta para entrar a **<http://127.0.0.1:8000/admin/>**.***

> 💡 PowerShell puede bloquear la activación del entorno virtual por la política de ejecución de scripts. En ese caso, ejecuta `.\.venv\Scripts\python.exe -m pip install -r requirements.txt` y luego `.\.venv\Scripts\python.exe manage.py runserver`; no hace falta cambiar la política de seguridad de Windows.

### *🍎 macOS y 🐧 Linux*

```bash
cd aplicacion-system-recets
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
cp .env.example .env
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

### *🐳 ¿Prefieres Docker?*

***Primero copia `.env.example` a `.env` desde la carpeta de la aplicación. Después:***

```bash
docker compose up --build
```

***También puedes usar PowerShell:***

```powershell
Copy-Item .env.example .env
docker compose up --build
```

***La aplicación queda en **<http://localhost:8000/>**. Docker Compose inicia PostgreSQL, espera a que esté disponible y aplica las migraciones antes de iniciar el servidor web. Las recetas de la base de datos se conservan en el volumen de Docker.***

---

## *⚙️ Configuración*

La carpeta `aplicacion-system-recets` contiene [`.env.example`](./aplicacion-system-recets/.env.example), una plantilla con las variables de configuración. **Cópiala a `.env` para comenzar y no subas `.env` ni secretos reales al repositorio.**

| Variable | Descripción |
|---|---|
| `DJANGO_SECRET_KEY` | Clave secreta de Django. Imprescindible en producción: genera una propia y mantenla privada. |
| `DJANGO_DEBUG` | Depuración local; debe estar en `False` al publicar. |
| `DJANGO_ALLOWED_HOSTS` | Nombres de host autorizados, separados por comas. |
| `DJANGO_CSRF_TRUSTED_ORIGINS` | Dominios de confianza **con** esquema, por ejemplo `https://recetas.example.com`. |
| `DATABASE_URL` | Conexión a PostgreSQL. Si se deja vacía, el desarrollo usa SQLite. |
| `AWS_STORAGE_BUCKET_NAME` | Nombre del bucket S3 compatible para conservar las fotografías. |
| `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` | Credenciales privadas del almacenamiento de imágenes. |
| `AWS_S3_REGION_NAME` / `AWS_S3_ENDPOINT_URL` | Región y endpoint del servicio S3 o Spaces. |
| `AWS_S3_CUSTOM_DOMAIN` | Dominio CDN opcional para las fotografías. |
| `DJANGO_HSTS_SECONDS` | Duración de la política HSTS en producción. |
| `DJANGO_HSTS_INCLUDE_SUBDOMAINS` / `DJANGO_HSTS_PRELOAD` | Ajustes HSTS opcionales; actívalos solo cuando el dominio y sus subdominios estén preparados para HTTPS. |

Las fotos se guardan localmente en desarrollo. En producción, un almacenamiento S3/Spaces mantiene las imágenes aunque el proveedor recicle el contenedor. Configura el acceso del bucket y sus secretos directamente en el panel del proveedor. 🔐

---

## *☁️ Lista para configurar el despliegue*

***El proyecto incluye un **Dockerfile de producción**, Gunicorn, WhiteNoise y PostgreSQL. Se puede desplegar en **DigitalOcean App Platform** u otro proveedor compatible con contenedores.***

1. **Crea una base de datos PostgreSQL** y ten a mano su URL de conexión.
2. **Publica la carpeta `aplicacion-system-recets`** como aplicación Docker.
3. Configura los secretos y variables de producción: `DJANGO_SECRET_KEY`, `DJANGO_DEBUG=False`, `DJANGO_ALLOWED_HOSTS`, `DJANGO_CSRF_TRUSTED_ORIGINS` y `DATABASE_URL`.
4. Si necesitas conservar fotos, configura también un bucket S3/Spaces y sus credenciales en el panel privado del proveedor.
5. **Activa HTTPS** y usa el dominio público asignado. Configura los hosts sin `https://` en `DJANGO_ALLOWED_HOSTS` y los orígenes completos en `DJANGO_CSRF_TRUSTED_ORIGINS`.
6. Crea tu usuario administrador desde la consola del proveedor:

   ```bash
   python manage.py createsuperuser
   ```

***Las migraciones se ejecutan al iniciar el contenedor. **El repositorio contiene el código y la configuración, no la base de datos, el dominio ni las credenciales del servicio de publicación**: esos recursos se crean y configuran en la cuenta del proveedor.***

---

## *✅ Comprobaciones*

***Ejecuta estos comandos desde `aplicacion-system-recets`:***

```bash
python manage.py test
python manage.py check
python manage.py check --deploy
```

`check --deploy` comprueba los ajustes de producción y necesita las variables de entorno reales de tu despliegue. Los avisos que dependan del dominio, HTTPS o la clave se resuelven al configurar el proveedor.

---

## *🗂️ ¿Qué contiene el repositorio?*

***La raíz del proyecto se mantiene sencilla y ordenada:***

```text
Proyecto AMR (Tarea)/
├── aplicacion-system-recets/  # Aplicación Django completa y configuración
├── README.md                  # Esta guía
└── LICENSE                    # Licencia MIT
```

***Dentro de la carpeta de la aplicación encontrarás `recetas/`, `recetario/`, `templates/`, `static/`, las pruebas, las migraciones y los archivos para ejecutar y desplegar el proyecto.***

---

## *📄 Licencia*

***Este proyecto se distribuye bajo la **licencia MIT**. Consulta [`LICENSE`](./LICENSE) para leer sus términos.***

---

### *💚 *Gracias por compartir tu receta.**

**Una buena comida reúne a todos. ¡Buen provecho!** 🍽️🌿
