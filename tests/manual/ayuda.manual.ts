import { expect, test, type Page } from '@playwright/test';
import { fotoTicket, prepararDemo, SOCIA, TESORERA } from './demo.ts';
import { ilustraciones, TAMANO } from './ilustraciones.ts';

// Capturas del móvil a tamaño CSS (412 px de ancho): bastan para la página y pesan poco.
const capturar = (page: Page, nombre: string) =>
	page.screenshot({ path: `static/ayuda/${nombre}.png`, scale: 'css' });

async function entrar(page: Page, telefono: string, contrasena: string) {
	await page.goto('/entrar');
	await page.getByLabel('Teléfono').fill(telefono.slice(3));
	await page.getByLabel('Contraseña').fill(contrasena);
	await page.getByRole('button', { name: 'Entrar' }).click();
}

/** Envía un ticket desde «Nuevo ticket» y devuelve su número. Antes de enviar, `antes`. */
async function enviarTicket(
	page: Page,
	datos: {
		comercio: string;
		lineas: [string, string][];
		total: string;
		concepto: string;
		otro?: string;
	},
	antes?: () => Promise<unknown>
) {
	await page.goto('/tickets/nuevo');
	await page.locator('input[type=file]:not([capture])').setInputFiles({
		name: 'ticket.jpg',
		mimeType: 'image/jpeg',
		buffer: await fotoTicket(datos)
	});
	await expect(page.getByRole('list', { name: 'Ficheros del ticket' })).toBeVisible();
	await page.getByLabel('Importe (€)').fill(datos.total);
	await page.locator('label', { hasText: datos.concepto }).click();
	if (datos.otro) await page.getByLabel('¿Qué concepto?').fill(datos.otro);
	await antes?.();
	await page.getByRole('button', { name: 'Enviar ticket' }).click();
	await expect(page).toHaveURL(/enviado=\d+/);
	return Number(new URL(page.url()).searchParams.get('enviado'));
}

test('capturas', async ({ page, browser }) => {
	await prepararDemo(process.env.DATABASE_URL!);

	await page.goto('/entrar');
	await capturar(page, 'entrar');

	// Empezar: activar la cuenta con la invitación.
	await page.goto(`/activar?codigo=${SOCIA.codigo}`);
	await page.getByLabel('Teléfono').fill(SOCIA.telefono.slice(3));
	await page.getByLabel('Contraseña nueva').fill(SOCIA.contrasena);
	await page.getByLabel('Repite la contraseña').fill(SOCIA.contrasena);
	await capturar(page, 'activar');
	await page.getByRole('button', { name: 'Activar y entrar' }).click();
	await expect(page.getByRole('heading', { name: 'Mis tickets' })).toBeVisible();
	await capturar(page, 'mis-tickets');

	// Enviar un ticket: el formulario relleno y el aviso al volver a la lista.
	const tornillos = await enviarTicket(
		page,
		{
			comercio: 'FERRETERÍA EL CLAVO',
			lineas: [
				['Tornillos 4x40 (100)', '6,95'],
				['Tacos nylon (50)', '4,50'],
				['Brocas de pared', '12,00']
			],
			total: '23,45',
			concepto: 'Ferretería'
		},
		() => capturar(page, 'nuevo-ticket')
	);
	await expect(page.getByText(/Ticket T-\d+ enviado/)).toBeVisible();
	await capturar(page, 'ticket-enviado');

	const agua = await enviarTicket(page, {
		comercio: 'SUPERMERCADO LA PLAZA',
		lineas: [
			['Agua 1,5 l (x12)', '7,20'],
			['Galletas surtidas', '5,60']
		],
		total: '12,80',
		concepto: 'Alimentación'
	});
	const taxi = await enviarTicket(page, {
		comercio: 'RADIO TAXI MADRID',
		lineas: [['Trayecto al almacén', '18,40']],
		total: '18,40',
		concepto: 'Transporte'
	});
	const cartulinas = await enviarTicket(page, {
		comercio: 'PAPELERÍA EL LÁPIZ',
		lineas: [
			['Cartulinas A3 (x20)', '9,00'],
			['Rotuladores', '6,50']
		],
		total: '15,50',
		concepto: 'Otro',
		otro: 'Material para el taller'
	});

	// La tesorera autoriza y paga uno, autoriza otro y rechaza un tercero.
	const contexto = await browser.newContext();
	const tesorera = await contexto.newPage();
	await entrar(tesorera, TESORERA.telefono, TESORERA.contrasena);
	await expect(tesorera).toHaveURL(/\/gestion\/tickets$/);
	for (const numero of [agua, taxi]) {
		await tesorera.goto(`/gestion/tickets/${numero}`);
		await tesorera.getByRole('button', { name: 'Autorizar' }).click();
		await expect(tesorera.getByText('Ticket autorizado. Queda pendiente de pago.')).toBeVisible();
	}
	await tesorera.goto(`/gestion/tickets/${agua}`);
	await tesorera.getByRole('link', { name: 'Registrar pago' }).click();
	await tesorera.getByRole('button', { name: /Registrar pago de/ }).click();
	await expect(tesorera.getByText('Pago registrado.')).toBeVisible();
	await tesorera.goto(`/gestion/tickets/${cartulinas}`);
	await tesorera.getByRole('button', { name: 'Rechazar' }).click();
	await tesorera
		.getByLabel('Motivo del rechazo')
		.fill('En la foto no se lee el total. Haz otra con más luz.');
	await tesorera.getByRole('button', { name: 'Confirmar rechazo' }).click();
	await expect(tesorera.getByText('Ticket rechazado. El socio verá el motivo.')).toBeVisible();
	await contexto.close();

	// Seguir los tickets: la lista con cada estado.
	await page.goto('/tickets');
	await expect(page.getByRole('link').filter({ hasText: '12,80' })).toContainText('Pagado');
	await capturar(page, 'mis-tickets-estados');

	// Editar o anular uno pendiente: los botones, al final del detalle.
	await page.goto(`/tickets/${tornillos}`);
	await page.getByRole('region', { name: 'Acciones' }).scrollIntoViewIfNeeded();
	await capturar(page, 'ticket-pendiente');

	// Corregir uno rechazado: el motivo y el formulario.
	await page.goto(`/tickets/${cartulinas}`);
	await expect(page.getByRole('region', { name: 'Motivo del rechazo' })).toBeVisible();
	await capturar(page, 'ticket-rechazado');
	await page.getByRole('link', { name: 'Corregir y reenviar' }).click();
	await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
	await capturar(page, 'corregir');
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
