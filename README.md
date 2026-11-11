# Amigo Secreto · Lista de Deseos 🎄

Sitio para el amigo secreto de Navidad 2026: cada persona agrega lo que le gustaría recibir, con **foto**, **lugares donde conseguirlo** (con enlace a Google Maps) y **enlaces de compra**.

- **Página:** GitHub Pages (gratis)
- **Datos:** Google Sheets (regalos) + Google Drive (fotos), conectados con Apps Script
- **Intercambio:** miércoles 16 de diciembre de 2026 (cuenta regresiva incluida)

```
amigo-secreto/
├── index.html              ← la página
├── assets/
│   ├── css/styles.css      ← diseño
│   ├── js/config.js        ← ⚙️ URL del backend, nombres y fecha
│   ├── js/api.js           ← conexión con Apps Script
│   ├── js/app.js           ← funcionamiento de la página
│   └── img/favicon.svg
├── apps-script/Code.gs     ← backend (va en Google Apps Script, no en GitHub Pages)
└── .nojekyll
```

---

## Paso 1 · Backend en Google Sheets + Apps Script

1. Cree una **Google Sheet** nueva, por ejemplo con el nombre *Amigo Secreto 2026*.
2. Abra **Extensiones → Apps Script**.
3. Borre lo que haya en `Código.gs` y pegue todo el contenido de `apps-script/Code.gs`.
4. **Cambie la clave** en la línea `CLAVE: 'navidad2026'`. Esa clave la necesita el grupo para agregar o editar regalos.
5. Guarde y, arriba, elija la función **`setup`** → **Ejecutar**. Acepte los permisos (Google le va a advertir que la app no está verificada: *Configuración avanzada → Ir a … (no seguro)*; es su propio script).
   - Esto crea la hoja **Regalos** y la carpeta de Drive **Amigo Secreto 2026 · Fotos**.
6. **Implementar → Nueva implementación** → tipo **Aplicación web**:
   - *Ejecutar como:* **Yo**
   - *Quién tiene acceso:* **Cualquier persona**
7. Copie la **URL de la aplicación web** (termina en `/exec`).

> Si después cambia el código de Apps Script: **Implementar → Administrar implementaciones → ✏️ Editar → Versión: Nueva versión → Implementar.** Así la URL sigue siendo la misma.

## Paso 2 · Conectar la página

Abra `assets/js/config.js` y pegue la URL:

```js
API_URL: "https://script.google.com/macros/s/XXXXXXXX/exec",
```

Mientras `API_URL` esté vacía, el sitio funciona en **modo demostración** (los datos se quedan solo en su navegador). Sirve para verlo antes de configurar todo.

## Paso 3 · Publicar en GitHub Pages

1. En GitHub: **New repository** → nombre `amigo-secreto` → **Public** → *Create repository*.
2. Toque **uploading an existing file** y arrastre **todo el contenido** de esta carpeta (incluida la carpeta `assets` y el archivo `.nojekyll`) → *Commit changes*.
3. Vaya a **Settings → Pages** → *Source:* **Deploy from a branch** → *Branch:* `main` / `(root)` → **Save**.
4. En 1 o 2 minutos el sitio queda en:
   `https://SU-USUARIO.github.io/amigo-secreto/`

## Paso 4 · Compartir

Mande por WhatsApp el enlace del sitio **y la clave del grupo**. Cada persona tiene su propio enlace de lista, por ejemplo:
`https://SU-USUARIO.github.io/amigo-secreto/#lista-dra-dai`
(los botones **WhatsApp** y **Copiar enlace** aparecen dentro de cada lista).

---

## Funciones

- Portada con carrusel de los últimos deseos y cuenta regresiva al intercambio
- "Colecciones": una lista por persona, con indicador de quién ya armó la suya
- Catálogo tipo tienda: búsqueda, orden por precio o nombre, 2/3/4 columnas
- Vista rápida: foto grande, tiendas con mapa y botones de compra
- Agregar, editar y eliminar deseos (protegido con la clave del grupo)
- Fotos optimizadas automáticamente antes de subirlas (también se pueden pegar con Ctrl+V)
- Se actualiza solo cada 30 segundos
- Diseñado primero para celular

## Personalizar

- **Nombres, fecha, título:** `assets/js/config.js`. Si cambia nombres, cámbielos también en `CONFIG.PERSONAS` de `Code.gs` (y vuelva a implementar una nueva versión).
- **Colores y tipografía:** variables al inicio de `assets/css/styles.css`.

## Privacidad

El sitio es público: cualquiera con el enlace puede **ver** las listas, pero solo quien tenga la clave puede **agregar, editar o eliminar**. La clave vive solo en Apps Script, no en el código de GitHub. Las fotos se guardan en su Drive como "cualquier persona con el enlace puede ver" para que se muestren en la página.

## Problemas comunes

| Síntoma | Solución |
|---|---|
| "No se pudo conectar con el tablón" | Revise que la URL termine en `/exec` y que el acceso sea **Cualquier persona**. |
| "La clave del grupo no es correcta" | La clave distingue mayúsculas; revise `CLAVE` en `Code.gs`. |
| Cambié el código y no se nota | Implemente una **nueva versión** (ver Paso 1). En GitHub, espere 1–2 minutos y recargue. |
| Foto de iPhone no sube | Algunas fotos HEIC no se leen en Chrome: tome una captura de pantalla y suba la captura. |
| Las fotos no aparecen | Su cuenta de Google Workspace podría bloquear compartir "con cualquier persona"; use una cuenta Gmail personal. |
