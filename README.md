# ☕ Café Exquisito

### Una experiencia digital para disfrutar cada momento

Aplicación web para una cafetería: explora el menú, consulta promociones, haz pedidos y reservas, y administra el contenido desde un solo lugar.

> **Un proyecto pensado para que pedir tu café favorito sea fácil, agradable y rápido.**

---

## ✨ ¿Qué puedes encontrar?

- 🥐 **Catálogo** de productos y promociones.
- 🛍️ **Pedidos** y seguimiento de la experiencia de compra.
- 📅 **Reservas** y funciones para eventos.
- 🧑‍🍳 **Administración** del contenido del café.
- 📱 **Interfaz adaptable** y funciones de consulta sin conexión.

## 🧰 Tecnologías

| Parte | Tecnología |
|---|---|
| Interfaz | React + Vite |
| API de esta publicación | Node.js + Express |
| Base de datos | MongoDB Atlas |
| Despliegue planeado | Cloudflare Pages + Render |

### 🗺️ Así se conectan las piezas

```text
Tu navegador
    ├── La página: Cloudflare Pages
    └── La API:    Render
                      └── Los datos: MongoDB Atlas
```

## 🚀 Para empezar

El proyecto está dentro de [`cafe-proyecto/`](./cafe-proyecto/). Ahí encontrarás el frontend, la API, documentación y los archivos necesarios para trabajar en la aplicación.

1. 📖 Lee [`cafe-proyecto/README.md`](./cafe-proyecto/README.md) para conocer el proyecto y cómo ejecutarlo.
2. 🌐 Sigue [`cafe-proyecto/DESPLIEGUE_GRATIS.md`](./cafe-proyecto/DESPLIEGUE_GRATIS.md) para preparar el despliegue.
3. 🔐 Usa los archivos `.env.example` como guía y configura tus claves de forma privada.

## 📌 Estado del despliegue

El repositorio está organizado para desplegar **React en Cloudflare Pages**, **Express en Render** y usar **MongoDB Atlas**. **El sitio todavía no está publicado en esos servicios.**

El backend Django se conserva como una integración experimental y no forma parte de este despliegue básico. Por eso, esta publicación **no acredita por sí sola** el requisito de Django como backend principal.

## 🔒 Privacidad y archivos sensibles

No subas contraseñas, archivos `.env`, bases de datos locales ni exportaciones. Mantén las claves privadas en tu equipo o en los paneles de configuración de cada servicio.

## 📜 Derechos de uso

Este proyecto **no se distribuye bajo una licencia de código abierto**. Consulta [`LICENSE`](./LICENSE): el uso, la copia, la modificación o la redistribución requieren autorización previa y por escrito del titular de los derechos.

Las fotografías, ilustraciones, marcas, tipografías y otros materiales de terceros pueden tener condiciones propias y no quedan incluidos en esta licencia.

---

<p align="center"><strong>Hecho con cariño y mucho café ☕</strong></p>
