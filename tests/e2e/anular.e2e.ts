import { expect, test } from './base.ts';
import { ANULAR, CONTRASENA_TESORERO, type Perfil } from './datos.ts';

test('el socio anula un ticket pendiente y otro rechazado, tras confirmar (HU-S05)', async ({
	page
}, info) => {
	const socio = ANULAR[info.project.name as Perfil];
	await page.goto('/entrar');
	await page.getByLabel('Teléfono').fill(socio.telefono.slice(3));
	await page.getByLabel('Contraseña').fill(CONTRASENA_TESORERO);
	await page.getByRole('button', { name: 'Entrar' }).click();
	await expect(page).toHaveURL(/\/tickets$/);

	const anular = page.getByRole('button', { name: 'Anular ticket' });
	const pregunta = page.getByRole('heading', { name: /¿Anular el ticket T-\d{6}\?/ });

	for (const importe of ['12,00', '8,40']) {
		await page.goto('/tickets');
		await page.getByRole('link', { name: new RegExp(importe) }).click();
		await expect(page).toHaveURL(/\/tickets\/\d+$/);

		// Cancelar no cambia nada.
		await anular.click();
		await expect(pregunta).toBeFocused();
		await page.getByRole('button', { name: 'Cancelar' }).click();
		await expect(pregunta).toHaveCount(0);

		await anular.click();
		await anular.click();
		await expect(page.getByText('Ticket anulado.')).toBeVisible();
		await expect(page.getByText('Anulado', { exact: true }).first()).toBeVisible();
		await expect(anular).toHaveCount(0);
		await expect(page.getByRole('region', { name: 'Historial' })).toContainText('Anulado por ti');
	}
});
