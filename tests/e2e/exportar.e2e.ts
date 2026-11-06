import { readFile } from 'node:fs/promises';
import { expect, test } from './base.ts';
import { CONTRASENA_TESORERO, LISTADO, TESOREROS, type Perfil } from './datos.ts';

test('un tesorero exporta a CSV lo listado con sus filtros (HU-T07)', async ({ page }, info) => {
	const perfil = info.project.name as Perfil;
	const socio = LISTADO[perfil];

	await page.goto('/entrar');
	await page.getByLabel('Teléfono').fill(TESOREROS[perfil].telefono.slice(3));
	await page.getByLabel('Contraseña').fill(CONTRASENA_TESORERO);
	await page.getByRole('button', { name: 'Entrar' }).click();
	await expect(page).toHaveURL(/\/gestion\/tickets$/);

	// Todos los estados de un socio: sus tres tickets.
	await page
		.getByRole('navigation', { name: 'Filtrar por estado' })
		.getByRole('link', { name: /Todos/ })
		.click();
	// Antes de abrir el panel: al terminar de navegar, se vuelve a pintar cerrado.
	await expect(page).toHaveURL(/\?estado=todos$/);
	await page.getByText('Filtros y orden').click();
	await page.getByLabel('Socio').selectOption({ label: socio.nombre });
	await page.getByRole('button', { name: 'Aplicar' }).click();
	await expect(page).toHaveURL(/socio=[0-9a-f-]{36}$/);

	const descarga = page.waitForEvent('download');
	await page.getByRole('link', { name: 'Exportar CSV' }).click();
	const fichero = await descarga;
	expect(fichero.suggestedFilename()).toMatch(/^tickets-\d{4}-\d{2}-\d{2}\.csv$/);

	const csv = await readFile(await fichero.path(), 'utf8');
	const [cabecera, ...filas] = csv.split('\r\n').filter(Boolean);
	expect(cabecera).toBe(
		'﻿Ticket;Fecha de compra;Enviado;Socio;Teléfono;Concepto;Importe (€);Estado;Fecha de pago;Método de pago'
	);
	const telefono = socio.telefono.slice(3).replace(/(\d{3})(\d{3})(\d{3})/, '$1 $2 $3');
	expect(filas.map((f) => f.split(';').slice(3, 8))).toEqual([
		[socio.nombre, telefono, expect.any(String), '10,00', 'Pendiente de autorizar'],
		[socio.nombre, telefono, expect.any(String), '7,25', 'Pendiente de pago'],
		[socio.nombre, telefono, 'Otro: Floristería', '25,50', 'Rechazado']
	]);
});
