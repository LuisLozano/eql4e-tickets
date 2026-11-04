# ADR-0005 · Interfaz, formularios y PWA

- **Estado**: Aceptada
- **Fecha**: 2026-11-04

## Decisión

- **Estilos**: Tailwind CSS.
- **Componentes**: **shadcn-svelte**, que está construido sobre Bits UI: componentes accesibles (diálogos, menús, tablas, *selects*) que se **copian al proyecto** en lugar de ser una dependencia cerrada, así que se pueden adaptar.
- **Tabla del tesorero**: TanStack Table (con su adaptador para Svelte), con la ordenación y los filtros reflejados en la **URL** (`?estado=…&orden=…`). Así el filtrado y la paginación se hacen en el **servidor** (`load`) y cada vista se puede enlazar o recargar.
- **Formularios y validación**:
  - **Zod**: esquemas compartidos entre cliente y servidor, en `src/lib/esquemas`.
  - **Superforms**: integración con las *form actions*, errores por campo y mejora progresiva.
  - La validación del servidor es la que manda.
- **Captura y compresión de imágenes**:
  - Captura con `<input type="file" accept="image/*,application/pdf" capture="environment" multiple>`. No hace falta `getUserMedia` y es más robusto en iOS y Android.
  - Compresión en el cliente con la librería `browser-image-compression` (en un *web worker*): lado mayor de 2000 px, en JPEG o WebP.
  - Si un formato no se puede decodificar (algunos HEIC), se sube sin comprimir dentro del límite.
  - El servidor recodifica igualmente (ADR-0002).
- **Conservar el formulario si falla la red**: el borrador (campos + ficheros comprimidos) se guarda en **IndexedDB** antes de enviar y se borra al confirmarse. Si el envío falla, el formulario se restaura al volver.
- **PWA** con `@vite-pwa/sveltekit`:
  - *Manifest*, iconos y modo *standalone*.
  - El *service worker* solo cachea los **recursos estáticos** (la estructura de la app). **No** cachea datos ni ficheros de tickets, por privacidad y para no mostrar estados desactualizados.
  - No hay modo sin conexión completo: sin red, la app muestra un aviso y conserva el borrador.
- **Responsive**: diseño *mobile-first*. En el tesorero, a partir de `lg` (1024 px) la lista pasa a tabla.
- **Idioma**: textos en español directamente en los componentes (sin i18n). Formatos con `Intl.NumberFormat('es-ES', {style:'currency', currency:'EUR'})` y `Intl.DateTimeFormat('es-ES')`.

## Consecuencias

- El diseño visual detallado (bocetos) se hace en la Tarea 3 sobre estos componentes.
