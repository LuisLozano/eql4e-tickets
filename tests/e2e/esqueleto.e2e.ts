import { expect, test } from '@playwright/test';

test('la portada provisional se muestra', async ({ page }) => {
	await page.goto('/');
	await expect(page.getByRole('heading', { level: 1 })).toHaveText('Tickets de la asociación');
	await expect(
		page.getByRole('list', { name: 'Estados de un ticket' }).getByRole('listitem')
	).toHaveCount(5);
});

test('/salud responde ok con la base de datos', async ({ request }) => {
	const respuesta = await request.get('/salud');
	expect(respuesta.status()).toBe(200);
	expect(await respuesta.json()).toEqual({ estado: 'ok' });
});
