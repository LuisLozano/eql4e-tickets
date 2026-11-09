# Manuales (D-01)

## Manual de usuario

Es la página **Ayuda** de la propia app (`/ayuda`, sin iniciar sesión), en `src/routes/ayuda/+page.svelte`. El PDF se genera desde esa página: mismo contenido.

Las capturas (`static/ayuda/*.png`) y el PDF (`docs/manual/manual-usuario.pdf`, no se guarda en git) se generan con Playwright, contra la app compilada y una base de datos de prueba, como las pruebas e2e:

```bash
export DATABASE_URL=postgres://…/eql4e_e2e   # una base de datos de prueba (la vacía)
pnpm build && pnpm manual:capturas           # 1. capturas en static/ayuda/
pnpm build && pnpm manual:pdf                # 2. PDF, con las capturas nuevas ya compiladas
```

Los pasos de instalar la app en Android e iPhone van sin capturas: esos menús los dibuja el propio móvil, no la app. Si se añaden capturas hechas en un móvil, van en `static/ayuda/` y se enlazan en la página.
