import { expect, test } from './base.ts';
import { CONTRASENA_TESORERO, MULTIPLE, TESOREROS, type Perfil } from './datos.ts';

test('un tesorero marca varios tickets en el listado y los autoriza de una vez (HU-T03)', async ({
	page
}, info) => {
	const perfil = info.project.name as Perfil;
	await page.goto('/entrar');
	await page.getByLabel('Teléfono').fill(TESOREROS[perfil].telefono.slice(3));
	await page.getByLabel('Contraseña').fill(CONTRASENA_TESORERO);
	await page.getByRole('button', { name: 'Entrar' }).click();
	await expect(page).toHaveURL(/\/gestion\/tickets$/);

	// Su propio ticket pendiente no se puede marcar (R-04).
	const fila = (texto: string) => page.locator('tr, li').filter({ hasText: texto });
	const casilla = (texto: string) => fila(texto).getByRole('checkbox').locator('visible=true');
	await expect(fila('tuyo').first().getByRole('checkbox')).toHaveCount(0);

	// Los del socio de la prueba: tres pendientes.
	await page.getByText('Filtros y orden').click();
	await page.getByLabel('Socio').selectOption({ label: MULTIPLE[perfil].nombre });
	await page.getByRole('button', { name: 'Aplicar' }).click();
	await expect(page).toHaveURL(/socio=[0-9a-f-]{36}$/);

	const autorizar = page.getByRole('button', { name: /^Autorizar/ });
	await expect(autorizar).toBeDisabled();
	await page.getByRole('button', { name: 'Marcar todos' }).click();
	await expect(page.getByText('3 seleccionados')).toBeVisible();
	await page.getByRole('button', { name: 'Desmarcar todos' }).click();
	await expect(page.getByText('0 seleccionados')).toBeVisible();

	await casilla('10,11').check();
	await casilla('20,22').check();
	await expect(page.getByText('2 seleccionados')).toBeVisible();
	await page.getByRole('button', { name: 'Autorizar 2 tickets' }).click();
	await expect(page.getByText('2 tickets autorizados. Quedan pendientes de pago.')).toBeVisible();

	// Queda solo el tercero, todavía sin marcar.
	await expect(fila('10,11')).toHaveCount(0);
	await expect(fila('20,22')).toHaveCount(0);
	await expect(casilla('30,33')).not.toBeChecked();
	await expect(page.getByText('0 seleccionados')).toBeVisible();
});
