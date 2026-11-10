# Manuales (D-01)

## Manual de usuario

Son dos páginas de la propia app, que se leen sin iniciar sesión:

- **Ayuda** (`/ayuda`, `src/routes/ayuda/+page.svelte`): todo el uso del socio. PDF: `docs/manual/manual-usuario.pdf`.
- **Ayuda del tesorero** (`/ayuda/tesoreros`, `src/routes/ayuda/tesoreros/+page.svelte`): revisar, autorizar, pagar, deshacer, exportar, usuarios y conceptos. Se enlaza desde la del socio. PDF: `docs/manual/manual-tesorero.pdf`.

Cada PDF se genera desde su página: mismo contenido.

Las capturas (`static/ayuda/*.png`) y los PDF (no se guardan en git) se generan con Playwright, contra la app compilada y una base de datos **propia**, acabada en `_manual`: se vacía entera cada vez ([tests/manual/preparar.ts](../../tests/manual/preparar.ts)), y el guion se niega a usar otra.

```bash
export DATABASE_URL=postgres://…/eql4e_manual   # creada con createdb; se vacía entera
pnpm build && pnpm manual:capturas           # 1. capturas en static/ayuda/
pnpm build && pnpm manual:pdf                # 2. los dos PDF, con las capturas nuevas ya compiladas
```

Las capturas usan **datos de demostración** ([tests/manual/demo.ts](../../tests/manual/demo.ts)): la socia Lucía Martín y la tesorera Marta Gil, con fotos de tickets dibujadas. El guion activa la cuenta y envía seis tickets; como tesorera, paga, autoriza (uno a uno y varios a la vez) y rechaza, para que salgan todos los estados y las pantallas de gestión.

Los pasos de instalar la app en Android e iPhone llevan **ilustraciones esquemáticas** (`static/ayuda/android-*.png` e `iphone-*.png`), no capturas: esos menús los dibuja el propio móvil, no la app. Se generan con el mismo `pnpm manual:capturas` desde `tests/manual/ilustraciones.ts`. Si se consiguen capturas reales hechas en un móvil, pueden sustituirlas con el mismo nombre de fichero.

## Vídeos de demostración

Dos vídeos cortos, sin sonido y con rótulos, para enseñar la app a quien todavía no la conoce: lo que hace un **socio** (`video-socio.mp4`, más o menos 1:15) y lo que hace un **tesorero** (`video-tesorero.mp4`, más o menos 1:45). Los dos están grabados en el móvil, con los mismos datos de demostración que las capturas y dos socios más (Javier Ruiz y Carmen López), para que el tesorero tenga tickets de varias personas.

```bash
export DATABASE_URL=postgres://…/eql4e_manual   # la misma base que las capturas; se vacía entera
pnpm build && pnpm manual:videos             # docs/manual/video-*.mp4 (no se guardan en git)
```

El guion está en [tests/manual/videos.manual.ts](../../tests/manual/videos.manual.ts). Playwright graba en WebM al tamaño del móvil, y **ffmpeg** (`sudo apt install ffmpeg`) lo pasa a MP4 a doble tamaño, que se ve en cualquier móvil y se puede mandar por WhatsApp. Lo que la tesorera hace mientras el socio «espera unos días» se hace fuera de cámara y se corta del vídeo. La foto del ticket aparece elegida de la galería, porque la cámara no se puede grabar.

## Manual de administrador

Solo en PDF. Su contenido es el de [deploy/README.md](../../deploy/README.md), el procedimiento de instalación, despliegue, copias y restauración, para que no haya dos documentos que mantener. Lleva el inventario de scripts y unidades con su ruta, las tareas programadas, qué buscar en el log y la configuración del `.env`, correo incluido.

```bash
pnpm manual:admin   # docs/manual/manual-administrador.pdf (no se guarda en git)
```

No necesita la app ni la base de datos: convierte el Markdown con `marked` y lo imprime con el Chromium de Playwright. Los enlaces relativos apuntan a GitHub.
