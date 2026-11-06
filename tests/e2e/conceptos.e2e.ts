import { expect, test } from './base.ts';
import { CONCEPTOS, CONTRASENA_TESORERO, TESOREROS, type Perfil } from './datos.ts';

test('un tesorero gestiona los conceptos (HU-G04)', async ({ page }, info) => {
	const perfil = info.project.name as Perfil;
	const concepto = CONCEPTOS[perfil];

	await page.goto('/entrar');
	await page.getByLabel('Teléfono').fill(TESOREROS[perfil].telefono.slice(3));
	await page.getByLabel('Contraseña').fill(CONTRASENA_TESORERO);
	await page.getByRole('button', { name: 'Entrar' }).click();
	await expect(page.getByRole('heading', { name: 'Tickets', exact: true })).toBeVisible();

	await page.getByRole('link', { name: 'Conceptos' }).click();
	await expect(page.getByRole('heading', { name: 'Conceptos', level: 1 })).toBeVisible();
	const filas = page.getByRole('main').getByRole('listitem');

	// Crear: un nombre repetido (sin distinguir mayúsculas) no vale.
	const nuevo = page.getByLabel('Nombre del nuevo concepto');
	await nuevo.fill('ferretería');
	await page.getByRole('button', { name: 'Añadir' }).click();
	await expect(page.getByText('Ya hay un concepto con ese nombre.')).toBeVisible();
	await nuevo.fill(concepto.nombre);
	await page.getByRole('button', { name: 'Añadir' }).click();
	await expect(filas.filter({ hasText: concepto.nombre })).toBeVisible();
	await expect(nuevo).toHaveValue('');

	// Renombrar, en su propia fila.
	await page.getByRole('link', { name: `Renombrar ${concepto.nombre}` }).click();
	await expect(page.getByLabel('Nuevo nombre')).toHaveValue(concepto.nombre);
	await page.getByLabel('Nuevo nombre').fill(concepto.renombrado);
	await page.getByRole('button', { name: 'Guardar' }).click();
	await expect(page).toHaveURL(/\/gestion\/conceptos$/);
	const fila = filas.filter({ hasText: concepto.renombrado });
	await expect(fila).toBeVisible();

	// Desactivar: sigue en la lista, marcado.
	const interruptor = page.getByRole('switch', { name: `Activo: ${concepto.renombrado}` });
	await interruptor.click();
	await expect(interruptor).toHaveAttribute('aria-checked', 'false');
	await expect(fila.getByText('Desactivado')).toBeVisible();

	// Reordenar solo en un perfil: los dos comparten la lista y se ejecutan a la vez.
	if (perfil === 'escritorio') {
		const posicion = async () =>
			(await filas.allTextContents()).findIndex((t) => t.includes(concepto.renombrado));
		const antes = await posicion();
		await page.getByRole('button', { name: `Subir ${concepto.renombrado}` }).click();
		await expect.poll(posicion).toBe(antes - 1);
	}
});
