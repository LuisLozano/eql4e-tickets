# Manuales (D-01)

## Manual de usuario

Es la página **Ayuda** de la propia app (`/ayuda`, sin iniciar sesión), en `src/routes/ayuda/+page.svelte`. El PDF se genera desde esa página: mismo contenido.

Las capturas (`static/ayuda/*.png`) y el PDF (`docs/manual/manual-usuario.pdf`, no se guarda en git) se generan con Playwright, contra la app compilada y una base de datos de prueba, como las pruebas e2e:

```bash
export DATABASE_URL=postgres://…/eql4e_e2e   # una base de datos de prueba (la vacía)
pnpm build && pnpm manual:capturas           # 1. capturas en static/ayuda/
pnpm build && pnpm manual:pdf                # 2. PDF, con las capturas nuevas ya compiladas
```

Los pasos de instalar la app en Android e iPhone llevan **ilustraciones esquemáticas** (`static/ayuda/android-*.png` e `iphone-*.png`), no capturas: esos menús los dibuja el propio móvil, no la app. Se generan con el mismo `pnpm manual:capturas` desde `tests/manual/ilustraciones.ts`. Si se consiguen capturas reales hechas en un móvil, pueden sustituirlas con el mismo nombre de fichero.

## Manual de administrador

Solo en PDF. Su contenido es el de [deploy/README.md](../../deploy/README.md), el procedimiento de instalación, despliegue, copias y restauración, para que no haya dos documentos que mantener. Lleva el inventario de scripts y unidades con su ruta, las tareas programadas, qué buscar en el log y la configuración del `.env`, correo incluido.

```bash
pnpm manual:admin   # docs/manual/manual-administrador.pdf (no se guarda en git)
```

No necesita la app ni la base de datos: convierte el Markdown con `marked` y lo imprime con el Chromium de Playwright. Los enlaces relativos apuntan a GitHub.
