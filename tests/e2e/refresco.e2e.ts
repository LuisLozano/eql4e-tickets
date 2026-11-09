import { expect, test, type Page } from './base.ts';
import { CONTRASENA_TESORERO, REFRESCO, TESOREROS, type Perfil } from './datos.ts';

async function entrar(page: Page, telefono: string) {
	await page.goto('/entrar');
	await page.getByLabel('Teléfono').fill(telefono.slice(3));
	await page.getByLabel('Contraseña').fill(CONTRASENA_TESORERO);
	await page.getByRole('button', { name: 'Entrar' }).click();
}

test('el socio ve cómo le autorizan sus tickets sin recargar la página', async ({
	page,
	browser
}, info) => {
	const perfil = info.project.name as Perfil;
	const socio = REFRESCO[perfil];
	// Reloj falso: los dos minutos del refresco pasan al instante.
	await page.clock.install();
	await entrar(page, socio.telefono);
	await expect(page).toHaveURL(/\/tickets$/);
	const ticket = (importe: string) => page.getByRole('link').filter({ hasText: importe });
	await expect(ticket('14,14')).toContainText('Pendiente de autorizar');
	await expect(ticket('28,28')).toContainText('Pendiente de autorizar');

	// Otro tesorero los autoriza, uno a uno, desde su listado.
	const tesorero = await (await browser.newContext()).newPage();
	await entrar(tesorero, TESOREROS[perfil].telefono);
	await expect(tesorero).toHaveURL(/\/gestion\/tickets$/);
	await tesorero.getByText('Filtros y orden').click();
	await tesorero.getByLabel('Socio').selectOption({ label: socio.nombre });
	await tesorero.getByRole('button', { name: 'Aplicar' }).click();
	await expect(tesorero).toHaveURL(/socio=/);
	const autorizar = async (importe: string) => {
		await tesorero
			.locator('tr, li')
			.filter({ hasText: importe })
			.getByRole('checkbox')
			.locator('visible=true')
			.check();
		await tesorero.getByRole('button', { name: 'Autorizar 1 ticket' }).click();
		await expect(tesorero.getByText('1 ticket autorizado.')).toBeVisible();
	};

	// A los dos minutos, con la página a la vista, se actualiza sola.
	await autorizar('14,14');
	await expect(ticket('14,14')).toContainText('Pendiente de autorizar');
	await page.clock.runFor(2 * 60_000);
	await expect(ticket('14,14')).toContainText('Pendiente de pago');

	// Al volver a la página (el móvil cambia de tarea), en el momento.
	await autorizar('28,28');
	await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
	await expect(ticket('28,28')).toContainText('Pendiente de pago');
});
