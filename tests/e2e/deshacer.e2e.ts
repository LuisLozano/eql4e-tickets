import { expect, test, type Page } from './base.ts';
import { CONTRASENA_TESORERO, DESHACER, TESOREROS, type Perfil } from './datos.ts';

/** Abre el ticket del socio con ese importe desde el listado del tesorero. */
async function abrir(page: Page, socioId: string, importe: string) {
	await page.goto(`/gestion/tickets?estado=todos&socio=${socioId}`);
	// El enlace de cada fila (tabla o tarjeta) lleva el número; la fila, el importe.
	await page
		.locator('tr, li')
		.filter({ hasText: importe })
		.getByRole('link', { name: /T-\d{6}/ })
		.locator('visible=true')
		.first()
		.click();
	await expect(page).toHaveURL(/\/gestion\/tickets\/\d+$/);
}

test('un tesorero deshace una autorización, un rechazo y un pago, con motivo (HU-T06)', async ({
	page
}, info) => {
	const perfil = info.project.name as Perfil;
	const socio = DESHACER[perfil];
	await page.goto('/entrar');
	await page.getByLabel('Teléfono').fill(TESOREROS[perfil].telefono.slice(3));
	await page.getByLabel('Contraseña').fill(CONTRASENA_TESORERO);
	await page.getByRole('button', { name: 'Entrar' }).click();
	await expect(page).toHaveURL(/\/gestion\/tickets$/);

	await page.goto('/gestion/pagos');
	const porPagar = page.getByRole('link', { name: new RegExp(socio.nombre) });
	const socioId = new URL((await porPagar.getAttribute('href'))!, page.url()).searchParams.get(
		'socio'
	)!;
	const historial = page.getByRole('region', { name: 'Historial' });

	// D1: deshacer la autorización. Sin motivo, no.
	await abrir(page, socioId, '12,00');
	await page.getByRole('button', { name: 'Deshacer autorización…' }).click();
	await page.getByRole('button', { name: 'Deshacer autorización', exact: true }).click();
	await expect(page.getByText(/Explica el motivo/)).toBeVisible();
	await page.getByLabel('¿Por qué lo deshaces?').fill('Lo autoricé por error');
	await page.getByRole('button', { name: 'Deshacer autorización', exact: true }).click();
	await expect(
		page.getByText('Autorización deshecha. Vuelve a estar pendiente de autorizar.')
	).toBeVisible();
	await expect(historial).toContainText('Autorización deshecha por ti');
	await expect(historial).toContainText('«Lo autoricé por error»');
	await expect(page.getByRole('button', { name: 'Autorizar' })).toBeVisible();

	// D2: deshacer el rechazo.
	await abrir(page, socioId, '6,00');
	await page.getByRole('button', { name: 'Deshacer rechazo…' }).click();
	await page.getByLabel('¿Por qué lo deshaces?').fill('Sí se lee bien');
	await page.getByRole('button', { name: 'Deshacer rechazo', exact: true }).click();
	await expect(
		page.getByText('Rechazo deshecho. Vuelve a estar pendiente de autorizar.')
	).toBeVisible();

	// D3: pagar y deshacer el pago completo.
	await page.goto(`/gestion/pagos/nuevo?socio=${socioId}`);
	await page.getByRole('button', { name: /Registrar pago de 4,00/ }).click();
	await expect(page.getByText('Pago registrado.')).toBeVisible();
	await page.getByRole('button', { name: 'Deshacer pago…' }).click();
	await expect(page.getByRole('heading', { name: '¿Deshacer el pago completo?' })).toBeVisible();
	await page.getByLabel('¿Por qué lo deshaces?').fill('El Bizum fue a otro número');
	await page.getByRole('button', { name: 'Deshacer pago', exact: true }).click();
	await expect(
		page.getByText('Pago deshecho. El ticket vuelve a Pendiente de pago.')
	).toBeVisible();
	await expect(page.getByRole('region', { name: 'Pago deshecho' })).toContainText(
		'El Bizum fue a otro número'
	);
	await expect(page.getByRole('button', { name: 'Deshacer pago…' })).toHaveCount(0);

	// El ticket vuelve a estar pendiente de pago, con el paso en su historial.
	await abrir(page, socioId, '4,00');
	await expect(page.getByText('Pendiente de pago').first()).toBeVisible();
	await expect(historial).toContainText('Pago deshecho por ti');
	await expect(historial).toContainText('«El Bizum fue a otro número»');
});
