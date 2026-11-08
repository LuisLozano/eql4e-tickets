import { expect, test } from './base.ts';
import { CONTRASENA_TESORERO, PURGA, TESOREROS, type Perfil } from './datos.ts';

test('el tesorero ve el aviso de los pendientes con más de 18 meses y llega a ellos (HU-G05)', async ({
	page
}, info) => {
	const perfil = info.project.name as Perfil;
	await page.goto('/entrar');
	await page.getByLabel('Teléfono').fill(TESOREROS[perfil].telefono.slice(3));
	await page.getByLabel('Contraseña').fill(CONTRASENA_TESORERO);
	await page.getByRole('button', { name: 'Entrar' }).click();
	await expect(page).toHaveURL(/\/gestion\/tickets$/);

	const aviso = page.getByRole('status').filter({ hasText: 'con más de 18 meses' });
	await expect(aviso).toContainText(/Hay \d+ tickets? pendientes? con más de 18 meses/);
	await aviso.getByRole('link', { name: 'Verlos' }).click();
	await expect(page).toHaveURL(
		/\?estado=pendiente_autorizar&estado=pendiente_pago&hasta=\d{4}-\d{2}-\d{2}$/
	);
	await expect(
		page.getByText(PURGA[perfil].nombre, { exact: true }).filter({ visible: true }).first()
	).toBeVisible();
});
