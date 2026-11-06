import { expect, test, type Page } from './base.ts';
import { CONTRASENA_TESORERO, PAGO, TESOREROS, type Perfil } from './datos.ts';

async function entrar(page: Page, telefono: string) {
	await page.goto('/entrar');
	await page.getByLabel('Teléfono').fill(telefono.slice(3));
	await page.getByLabel('Contraseña').fill(CONTRASENA_TESORERO);
	await page.getByRole('button', { name: 'Entrar' }).click();
}

test('un tesorero registra un pago agrupado y otro desde el ticket; el socio lo ve (HU-T05)', async ({
	page,
	browser
}, info) => {
	const perfil = info.project.name as Perfil;
	const socio = PAGO[perfil];
	await entrar(page, TESOREROS[perfil].telefono);
	await expect(page).toHaveURL(/\/gestion\/tickets$/);

	// Desde «Pagos»: el socio sale con lo que se le debe.
	await page
		.getByRole('navigation', { name: 'Principal' })
		.getByRole('link', { name: 'Pagos' })
		.click();
	const porPagar = page.getByRole('link', { name: new RegExp(socio.nombre) });
	await expect(porPagar).toContainText('2 tickets pendientes de pago');
	await expect(porPagar).toContainText('25,00');
	const socioId = new URL((await porPagar.getAttribute('href'))!, page.url()).searchParams.get(
		'socio'
	);
	await porPagar.click();

	// Todos marcados; el total sigue a lo marcado. Bizum, de entrada.
	await expect(page.getByRole('heading', { name: 'Registrar pago' })).toBeVisible();
	const registrar = page.getByRole('button', { name: /Registrar pago de/ });
	await expect(registrar).toHaveText(/25,00/);
	await page.getByRole('checkbox', { name: /5,00/ }).uncheck();
	await expect(registrar).toHaveText(/20,00/);
	await expect(page.getByRole('radio', { name: 'Bizum' })).toBeChecked();
	await page.locator('input[name=justificante]').setInputFiles({
		name: 'bizum.pdf',
		mimeType: 'application/pdf',
		buffer: Buffer.from('%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n')
	});
	await registrar.click();
	await expect(page.getByText('Pago registrado.')).toBeVisible();
	await expect(page.getByRole('heading', { name: '1 ticket' })).toBeVisible();
	const justificante = page.getByRole('link', { name: 'Ver justificante' });
	const respuesta = await page.request.get(
		new URL((await justificante.getAttribute('href'))!, page.url()).href
	);
	expect(respuesta.headers()['content-type']).toBe('application/pdf');

	// Desde el detalle del otro ticket: solo va marcado ese.
	await page.goto(`/gestion/tickets?estado=pendiente_pago&socio=${socioId}`);
	await page
		.getByRole('link', { name: /T-\d{6}/ })
		.locator('visible=true')
		.first()
		.click();
	await page.getByRole('link', { name: 'Registrar pago' }).click();
	await expect(registrar).toHaveText(/5,00/);
	await page.locator('label', { hasText: 'Transferencia' }).click();
	await registrar.click();
	await expect(page.getByText('Pago registrado.')).toBeVisible();

	// Ya no se le debe nada.
	await page.goto('/gestion/pagos');
	await expect(
		page
			.getByRole('list', { name: 'Socios con tickets pendientes de pago' })
			.getByText(socio.nombre)
	).toHaveCount(0);

	// El socio ve cuándo y cómo se le pagó, con el justificante.
	const contexto = await browser.newContext();
	const delSocio = await contexto.newPage();
	await entrar(delSocio, socio.telefono);
	await delSocio.getByRole('link', { name: /20,00/ }).click();
	await expect(delSocio.getByRole('region', { name: /Pagado el .* por Bizum/ })).toBeVisible();
	await expect(delSocio.getByRole('link', { name: 'Ver justificante' })).toBeVisible();
	await expect(delSocio.getByRole('region', { name: 'Historial' })).toContainText('· Bizum');
	await contexto.close();
});
