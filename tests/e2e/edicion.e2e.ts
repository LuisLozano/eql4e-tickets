import sharp from 'sharp';
import { expect, test } from './base.ts';
import { CONTRASENA_TESORERO, EDICION, type Perfil } from './datos.ts';

test('el socio edita un ticket pendiente y corrige y reenvía uno rechazado (HU-S04, S06)', async ({
	page
}, info) => {
	const socio = EDICION[info.project.name as Perfil];
	const foto = await sharp({
		create: { width: 800, height: 1000, channels: 3, background: '#ddd' }
	})
		.jpeg()
		.toBuffer();
	const subir = (nombre: string) =>
		page
			.locator('input[type=file]:not([capture])')
			.setInputFiles({ name: nombre, mimeType: 'image/jpeg', buffer: foto });
	const ficheros = page.getByRole('list', { name: 'Ficheros del ticket' }).getByRole('listitem');
	const historial = page.getByRole('region', { name: 'Historial' });

	await page.goto('/entrar');
	await page.getByLabel('Teléfono').fill(socio.telefono.slice(3));
	await page.getByLabel('Contraseña').fill(CONTRASENA_TESORERO);
	await page.getByRole('button', { name: 'Entrar' }).click();
	await expect(page).toHaveURL(/\/tickets$/);

	// Editar el pendiente: otro importe y una foto.
	await page.getByRole('link', { name: /15,00/ }).click();
	await page.getByRole('link', { name: 'Editar' }).click();
	await expect(page.getByRole('heading', { name: /Editar T-\d{6}/ })).toBeVisible();
	await expect(page.getByLabel('Importe (€)')).toHaveValue('15,00');
	await page.getByLabel('Importe (€)').fill('17,50');
	await subir('primera.jpg');
	await expect(ficheros).toHaveCount(1);
	await page.getByRole('button', { name: 'Guardar cambios' }).click();
	await expect(page.getByText('Cambios guardados.')).toBeVisible();
	await expect(historial).toContainText('Editado por ti');
	await expect(historial).toContainText('Importe: 15,00 € → 17,50 €');
	await expect(historial).toContainText('Añadió 1 fichero');

	// Sustituir la foto: la anterior queda enlazada en el historial.
	await page.getByRole('link', { name: 'Editar' }).click();
	await page.getByRole('button', { name: 'Quitar primera.jpg' }).click();
	await expect(page.getByText('Se quitará al guardar.')).toBeVisible();
	await subir('segunda.jpg');
	await page.getByRole('button', { name: 'Guardar cambios' }).click();
	await expect(page.getByText('Cambios guardados.')).toBeVisible();
	await expect(historial.getByRole('link', { name: 'primera.jpg' })).toBeVisible();

	// Sin tocar nada, no se guarda.
	await page.getByRole('link', { name: 'Editar' }).click();
	await page.getByRole('button', { name: 'Guardar cambios' }).click();
	await expect(page.getByText('No has cambiado nada.')).toBeVisible();

	// Corregir el rechazado: ve el motivo, añade la foto buena y lo reenvía.
	await page.goto('/tickets');
	await page.getByRole('link', { name: /9,90/ }).click();
	await page.getByRole('link', { name: 'Corregir y reenviar' }).click();
	await expect(page.getByRole('region', { name: 'Motivo del rechazo' })).toContainText(
		'La foto está borrosa'
	);
	await subir('nitida.jpg');
	await page.getByRole('button', { name: 'Guardar y reenviar' }).click();
	await expect(
		page.getByText('Ticket reenviado. Vuelve a estar pendiente de autorizar.')
	).toBeVisible();
	await expect(page.getByText('Pendiente de autorizar').first()).toBeVisible();
	await expect(historial).toContainText('Corregido y reenviado por ti');
	await expect(page.getByRole('link', { name: 'Editar' })).toBeVisible();
});
