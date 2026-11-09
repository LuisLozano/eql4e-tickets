import { expect, test } from '@playwright/test';
import { SOCIOS } from '../e2e/datos.ts';
import { ilustraciones, TAMANO } from './ilustraciones.ts';

// Capturas del móvil a tamaño CSS (412 px de ancho): bastan para la página y pesan poco.
const capturar = (page: import('@playwright/test').Page, nombre: string) =>
	page.screenshot({ path: `static/ayuda/${nombre}.png`, scale: 'css' });

test('capturas', async ({ page }) => {
	const socio = SOCIOS.movil;
	await page.goto('/entrar');
	await capturar(page, 'entrar');

	await page.goto(`/activar?codigo=${socio.codigo}`);
	await page.getByLabel('Teléfono').fill(socio.telefono.slice(3));
	await page.getByLabel('Contraseña nueva').fill('una contraseña de ejemplo');
	await page.getByLabel('Repite la contraseña').fill('una contraseña de ejemplo');
	await capturar(page, 'activar');

	await page.getByRole('button', { name: 'Activar y entrar' }).click();
	await expect(page.getByRole('heading', { name: 'Mis tickets' })).toBeVisible();
	await capturar(page, 'mis-tickets');
});

// Después de las capturas: el fondo de las de Android e iPhone es la de «Mis tickets».
test('ilustraciones', async ({ page }) => {
	await page.setViewportSize(TAMANO);
	const dibujos = ilustraciones({
		misTickets: 'static/ayuda/mis-tickets.png',
		iconoAndroid: 'static/iconos/icono-192.png',
		iconoIphone: 'static/iconos/apple-touch-icon.png'
	});
	for (const [nombre, html] of Object.entries(dibujos)) {
		await page.setContent(html);
		await capturar(page, nombre);
	}
});

// Necesita una compilación posterior a las capturas: las imágenes se sirven desde build/.
test('pdf', async ({ page }) => {
	await page.goto('/ayuda');
	await page.emulateMedia({ media: 'print' });
	await page.pdf({
		path: 'docs/manual/manual-usuario.pdf',
		format: 'A4',
		margin: { top: '15mm', bottom: '15mm', left: '15mm', right: '15mm' },
		displayHeaderFooter: true,
		headerTemplate: '<span></span>',
		footerTemplate:
			'<div style="font-size:8pt;width:100%;text-align:center">Ayuda de EQL4E Tickets · <span class="pageNumber"></span>/<span class="totalPages"></span></div>'
	});
});
