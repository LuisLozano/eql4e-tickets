import { expect, test, type Page } from '@playwright/test';
import { CONTRASENA_TESORERO, LISTADO, TESOREROS, type Perfil } from './datos.ts';

/** Los importes de las filas visibles, en orden: tabla en escritorio, tarjetas en móvil. */
async function importes(page: Page, perfil: Perfil) {
	const filas =
		perfil === 'escritorio'
			? page.getByRole('table').locator('tbody tr')
			: page.getByRole('list', { name: 'Tickets' }).getByRole('listitem');
	const textos = await filas.allTextContents();
	return textos.map((t) => t.match(/\d+,\d{2}/)![0]);
}

test('un tesorero filtra, ordena y pagina el listado global (HU-T01)', async ({ page }, info) => {
	const perfil = info.project.name as Perfil;
	const socio = LISTADO[perfil];

	await page.goto('/entrar');
	await page.getByLabel('Teléfono').fill(TESOREROS[perfil].telefono.slice(3));
	await page.getByLabel('Contraseña').fill(CONTRASENA_TESORERO);
	await page.getByRole('button', { name: 'Entrar' }).click();
	await expect(page).toHaveURL(/\/gestion\/tickets$/);
	await expect(page.getByRole('heading', { name: 'Tickets', exact: true })).toBeVisible();

	// Filtrar por socio: la URL solo lleva lo puesto.
	await page.getByText('Filtros y orden').click();
	await page.getByLabel('Socio').selectOption({ label: socio.nombre });
	await page.getByRole('button', { name: 'Aplicar' }).click();
	await expect(page).toHaveURL(/\/gestion\/tickets\?socio=[0-9a-f-]{36}$/);

	// Orden por defecto: pendiente de autorizar, pendiente de pago, rechazado.
	await expect.poll(() => importes(page, perfil)).toEqual(['10,00', '7,25', '25,50']);
	const totales = page.getByRole('navigation', { name: 'Totales por estado' });
	await expect(totales.getByRole('listitem').last()).toContainText('Total filtrado');
	await expect(totales.getByRole('listitem').last()).toContainText('42,75');
	await expect(totales.getByRole('listitem').last()).toContainText('3 tickets');

	// Un total por estado es un filtro rápido; pulsarlo otra vez lo quita.
	await totales.getByRole('link', { name: /Rechazado/ }).click();
	await expect(page).toHaveURL(/estado=rechazado/);
	await expect.poll(() => importes(page, perfil)).toEqual(['25,50']);
	await expect(page.getByText('Otro: Floristería').locator('visible=true')).toBeVisible();
	await totales.getByRole('link', { name: /Rechazado/ }).click();
	await expect(page).not.toHaveURL(/estado=/);
	await expect.poll(() => importes(page, perfil)).toHaveLength(3);

	// Ordenar por importe: en escritorio, con las cabeceras; en el móvil, con el formulario.
	if (perfil === 'escritorio') {
		const cabecera = page.getByRole('columnheader', { name: 'Importe' });
		await cabecera.getByRole('link').click();
		await expect(cabecera).toHaveAttribute('aria-sort', 'ascending');
		await expect.poll(() => importes(page, perfil)).toEqual(['7,25', '10,00', '25,50']);
		await cabecera.getByRole('link').click();
		await expect(cabecera).toHaveAttribute('aria-sort', 'descending');
	} else {
		await page.getByLabel('Ordenar por').selectOption('importe');
		await page.getByLabel('Sentido').selectOption('desc');
		await page.getByRole('button', { name: 'Aplicar' }).click();
	}
	await expect(page).toHaveURL(/orden=importe&dir=desc/);
	await expect.poll(() => importes(page, perfil)).toEqual(['25,50', '10,00', '7,25']);

	// Un importe mínimo y limpiar.
	await page.getByLabel('Importe mínimo (€)').fill('10');
	await page.getByRole('button', { name: 'Aplicar' }).click();
	await expect(page).toHaveURL(/min=10/);
	await expect.poll(() => importes(page, perfil)).toEqual(['25,50', '10,00']);
	await page.getByRole('link', { name: 'Limpiar filtros' }).click();
	await expect(page).toHaveURL(/\/gestion\/tickets$/);
});
