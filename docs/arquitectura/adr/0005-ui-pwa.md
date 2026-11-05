# ADR-0005 · Interfaz, formularios y PWA

- **Estado**: Aceptada
- **Fecha**: 2026-11-04

## Decisión

- **Estilos**: Tailwind CSS.
- **Componentes**: **Bits UI** (componentes accesibles sin estilos: diálogos, menús, *selects*, hojas inferiores) con componentes propios en `src/lib/componentes` que aplican el tema de los bocetos.
  - *Cambio 2026-11-05*: la idea inicial era **shadcn-svelte**, que se construye sobre Bits UI. Su `init` (v1.8) obliga a elegir de forma interactiva un *preset* de diseño con sus propios colores, que choca con el tema monocromo y los colores de estado de los bocetos. Se usa directamente su base, Bits UI, y se escriben los componentes a mano con nuestros colores. Iconos: `@lucide/svelte`.
- **Tabla del tesorero**: TanStack Table (con su adaptador para Svelte), con la ordenación y los filtros reflejados en la **URL** (`?estado=…&orden=…`). Así el filtrado y la paginación se hacen en el **servidor** (`load`) y cada vista se puede enlazar o recargar.
- **Formularios y validación**:
  - **Zod**: esquemas compartidos entre cliente y servidor, en `src/lib/esquemas`.
  - **Superforms**: integración con las *form actions*, errores por campo y mejora progresiva.
  - La validación del servidor es la que manda.
- **Captura y compresión de imágenes**:
  - Captura con `<input type="file" accept="image/*,application/pdf" capture="environment" multiple>`. No hace falta `getUserMedia` y es más robusto en iOS y Android.
  - Compresión en el cliente en un *web worker* propio (`src/lib/cliente/compresor.worker.ts`), con `createImageBitmap` y `OffscreenCanvas`: lado mayor de 2000 px, en JPEG (calidad 0,82), respetando la orientación EXIF. Si no gana tamaño, se sube la original.
    - *Cambio 2026-11-05*: la idea inicial era `browser-image-compression`. Su *worker* carga por defecto su propio código desde jsDelivr, lo que añade un tercero y choca con la CSP prevista. Lo que hace falta cabe en unas 40 líneas sin dependencias.
    - JPEG y no WebP: Safari no genera WebP desde `OffscreenCanvas`. Da igual, porque el servidor recodifica a WebP.
  - Si un formato no se puede decodificar (algunos HEIC), se sube sin comprimir dentro del límite.
  - El servidor recodifica igualmente (ADR-0002).
- **Conservar el formulario si falla la red**: el borrador (campos + ficheros comprimidos) se guarda en **IndexedDB** antes de enviar y se borra al confirmarse. Si el envío falla, el formulario se restaura al volver (con la opción «Descartar»). Hay un borrador por usuario, porque el móvil puede ser compartido. Sin IndexedDB (navegación privada) el formulario funciona igual, sin borrador.
- **PWA** con `@vite-pwa/sveltekit`:
  - *Manifest*, iconos y modo *standalone*.
  - El *service worker* solo cachea los **recursos estáticos** (la estructura de la app). **No** cachea datos ni ficheros de tickets, por privacidad y para no mostrar estados desactualizados.
  - No hay modo sin conexión completo: sin red, la app muestra un aviso y conserva el borrador.
- **Responsive**: diseño *mobile-first*. En el tesorero, a partir de `lg` (1024 px) la lista pasa a tabla.
- **Idioma**: textos en español directamente en los componentes (sin i18n). Formatos con `Intl.NumberFormat('es-ES', {style:'currency', currency:'EUR'})` y `Intl.DateTimeFormat('es-ES')`.

## Consecuencias

- El diseño visual detallado (bocetos) se hace en la Tarea 3 sobre estos componentes.
