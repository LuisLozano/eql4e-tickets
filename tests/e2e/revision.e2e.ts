import { expect, test, type Page } from './base.ts';
import { CONTRASENA_TESORERO, REVISION, TESOREROS, type Perfil } from './datos.ts';

async function entrar(page: Page, telefono: string) {
	await page.goto('/entrar');
	await page.getByLabel('Teléfono').fill(telefono.slice(3));
	await page.getByLabel('Contraseña').fill(CONTRASENA_TESORERO);
	await page.getByRole('button', { name: 'Entrar' }).click();
}

/** Desde el listado filtrado por socio, abre el primer ticket (el más antiguo pendiente). */
async function abrirPrimero(page: Page, socio: string) {
	await page.goto('/gestion/tickets');
	await page.getByText('Filtros y orden').click();
	await page.getByLabel('Socio').selectOption({ label: socio });
	await page.getByRole('button', { name: 'Aplicar' }).click();
	await expect(page).toHaveURL(/socio=/);
	await page
		.getByRole('link', { name: /T-\d{6}/ })
		.locator('visible=true')
		.first()
		.click();
	await expect(page).toHaveURL(/\/gestion\/tickets\/\d+$/);
}

test('un tesorero autoriza y rechaza; el socio ve el motivo (HU-T02, T03, T04)', async ({
	page,
	browser
}, info) => {
	const perfil = info.project.name as Perfil;
	const socio = REVISION[perfil];
	await entrar(page, TESOREROS[perfil].telefono);
	await expect(page).toHaveURL(/\/gestion\/tickets$/);

	// Autorizar el primero.
	await abrirPrimero(page, socio.nombre);
	await expect(page.getByText(socio.nombre)).toBeVisible();
	await expect(page.getByText('Pendiente de autorizar').first()).toBeVisible();
	await page.getByRole('button', { name: 'Autorizar' }).click();
	await expect(page.getByText('Ticket autorizado. Queda pendiente de pago.')).toBeVisible();
	await expect(page.getByText('Pendiente de pago').first()).toBeVisible();
	await expect(page.getByRole('button', { name: 'Autorizar' })).toHaveCount(0);
	const historial = page.getByRole('region', { name: 'Historial' });
	await expect(historial).toContainText('Autorizado por ti');

	// Rechazar el siguiente: sin motivo no se puede.
	await abrirPrimero(page, socio.nombre);
	const numero = (await page.getByRole('heading', { level: 1 }).textContent())!;
	await page.getByRole('button', { name: 'Rechazar' }).click();
	await page.getByRole('button', { name: 'Confirmar rechazo' }).click();
	await expect(page.getByText(/Explica el motivo/)).toBeVisible();
	await page.getByLabel('Motivo del rechazo').fill('La foto está borrosa');
	await page.getByRole('button', { name: 'Confirmar rechazo' }).click();
	await expect(page.getByText('Ticket rechazado. El socio verá el motivo.')).toBeVisible();
	await expect(page.getByRole('region', { name: 'Motivo del rechazo' })).toContainText(
		'La foto está borrosa'
	);
	await expect(historial).toContainText('«La foto está borrosa»');

	// R-04: su propio ticket lo ve, pero no puede autorizarlo ni rechazarlo.
	await abrirPrimero(page, TESOREROS[perfil].nombre);
	await expect(
		page.getByText('Es tu ticket: lo tiene que autorizar o rechazar otro tesorero.')
	).toBeVisible();
	await expect(page.getByRole('button', { name: 'Autorizar' })).toHaveCount(0);

	// El socio ve el rechazo con su motivo.
	const contexto = await browser.newContext();
	const delSocio = await contexto.newPage();
	await entrar(delSocio, socio.telefono);
	await delSocio.getByRole('link', { name: new RegExp(numero) }).click();
	await expect(delSocio.getByRole('region', { name: 'Motivo del rechazo' })).toContainText(
		'La foto está borrosa'
	);
	await contexto.close();
});
