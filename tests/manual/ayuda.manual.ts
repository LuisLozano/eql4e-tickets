import { expect, test, type Page } from '@playwright/test';
import { entrar, enviarTicket } from './acciones.ts';
import { ALTA, SOCIA, TESORERA } from './demo.ts';
import { ilustraciones, TAMANO } from './ilustraciones.ts';

// Capturas del móvil a tamaño CSS (412 px de ancho): bastan para la página y pesan poco.
const capturar = (page: Page, nombre: string) =>
	page.screenshot({ path: `static/ayuda/${nombre}.png`, scale: 'css' });

test('capturas', async ({ page, browser }) => {
	await page.goto('/entrar');
	await capturar(page, 'entrar');

	// Empezar: activar la cuenta con la invitación.
	await page.goto(`/activar?codigo=${SOCIA.codigo}`);
	await page.getByLabel('Teléfono').fill(SOCIA.telefono.slice(3));
	await page.getByLabel('Contraseña nueva').fill(SOCIA.contrasena);
	await page.getByLabel('Repite la contraseña').fill(SOCIA.contrasena);
	await page.getByLabel('IBAN para recibir los pagos (opcional)').fill(SOCIA.iban);
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

	// Mi cuenta: el IBAN y la contraseña.
	await page.goto('/cuenta');
	await capturar(page, 'cuenta');

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

	// Ayuda del tesorero. Dos tickets más, para autorizar varios a la vez.
	const cena = await enviarTicket(page, {
		comercio: 'RESTAURANTE EL PATIO',
		lineas: [
			['Menú del día (x3)', '36,00'],
			['Cafés (x3)', '6,00']
		],
		total: '42,00',
		concepto: 'Representación'
	});
	const pintura = await enviarTicket(page, {
		comercio: 'FERRETERÍA EL CLAVO',
		lineas: [
			['Pintura blanca 750 ml', '7,40'],
			['Rodillo', '2,50']
		],
		total: '9,90',
		concepto: 'Ferretería'
	});
	const t = await (await browser.newContext()).newPage();
	await entrar(t, TESORERA.telefono, TESORERA.contrasena);
	await expect(t.getByRole('heading', { name: 'Tickets', exact: true })).toBeVisible();
	await capturar(t, 't-tickets');

	// Revisar uno: autorizar o rechazar, con el motivo.
	await t.goto(`/gestion/tickets/${tornillos}`);
	await t.getByRole('region', { name: 'Acciones' }).scrollIntoViewIfNeeded();
	await capturar(t, 't-revisar');
	await t.getByRole('button', { name: 'Rechazar' }).click();
	await t.getByLabel('Motivo del rechazo').fill('Falta la foto del ticket de los tacos.');
	await t.getByLabel('Motivo del rechazo').scrollIntoViewIfNeeded();
	await capturar(t, 't-rechazar');
	await t.getByRole('button', { name: 'Cancelar' }).click();

	// Autorizar varios desde la lista.
	await t.goto('/gestion/tickets');
	for (const numero of [cena, pintura]) {
		await t
			.locator('tr, li')
			.filter({ hasText: `T-${String(numero).padStart(6, '0')}` })
			.getByRole('checkbox')
			.locator('visible=true')
			.check();
	}
	await expect(t.getByText('2 seleccionados')).toBeVisible();
	await capturar(t, 't-varios');
	await t.getByRole('button', { name: 'Autorizar 2 tickets' }).click();
	await expect(t.getByText('2 tickets autorizados. Quedan pendientes de pago.')).toBeVisible();

	// Pagar: la lista de lo que se debe y el formulario.
	await t
		.getByRole('navigation', { name: 'Principal' })
		.getByRole('link', { name: 'Pagos' })
		.click();
	await expect(t.getByRole('heading', { name: 'Pagos', level: 1 })).toBeVisible();
	await capturar(t, 't-pagos');
	await t
		.getByRole('list', { name: 'Socios con tickets pendientes de pago' })
		.getByRole('link', { name: new RegExp(SOCIA.nombre) })
		.click();
	await expect(t.getByRole('heading', { name: 'Registrar pago' })).toBeVisible();
	await capturar(t, 't-registrar-pago');
	await t.getByRole('button', { name: /Registrar pago de/ }).click();
	await expect(t.getByText('Pago registrado.')).toBeVisible();
	await capturar(t, 't-pago');

	// Filtros y exportar a CSV.
	await t.goto('/gestion/tickets');
	await t.getByText('Filtros y orden').click();
	await t.getByLabel('Socio').selectOption({ label: SOCIA.nombre });
	await capturar(t, 't-filtros');

	// Usuarios: el alta y la ficha.
	await t.goto('/gestion/usuarios');
	const alta = t.getByRole('region', { name: 'Nuevo usuario' });
	await alta.getByLabel('Nombre').fill(ALTA.nombre);
	await alta.getByLabel('Teléfono').fill(ALTA.telefono.slice(3));
	await alta.getByLabel('Email').fill(ALTA.email);
	await alta.scrollIntoViewIfNeeded();
	await capturar(t, 't-alta');
	await t.goto('/gestion/usuarios');
	await t
		.getByRole('main')
		.getByRole('link', { name: SOCIA.nombre })
		.locator('visible=true')
		.click();
	await expect(t.getByRole('heading', { name: SOCIA.nombre, level: 1 })).toBeVisible();
	await t.getByRole('region', { name: 'Acceso' }).scrollIntoViewIfNeeded();
	await capturar(t, 't-ficha');

	// Conceptos.
	await t.goto('/gestion/conceptos');
	await capturar(t, 't-conceptos');
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
for (const [ruta, fichero, titulo] of [
	['/ayuda', 'manual-usuario', 'Ayuda de EQL4E Tickets'],
	['/ayuda/tesoreros', 'manual-tesorero', 'Ayuda del tesorero de EQL4E Tickets']
]) {
	test(`pdf ${fichero}`, async ({ page }) => {
		await page.goto(ruta);
		await page.emulateMedia({ media: 'print' });
		await page.pdf({
			path: `docs/manual/${fichero}.pdf`,
			format: 'A4',
			margin: { top: '15mm', bottom: '15mm', left: '15mm', right: '15mm' },
			displayHeaderFooter: true,
			headerTemplate: '<span></span>',
			footerTemplate: `<div style="font-size:8pt;width:100%;text-align:center">${titulo} · <span class="pageNumber"></span>/<span class="totalPages"></span></div>`
		});
	});
}
