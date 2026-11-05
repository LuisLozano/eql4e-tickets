import { expect, test } from '@playwright/test';
import sharp from 'sharp';
import { CONTRASENA_TESORERO, REMITENTES, TESOREROS, type Perfil } from './datos.ts';

test('un socio envía un ticket con foto y PDF (HU-S01)', async ({ page }, info) => {
	const socio = REMITENTES[info.project.name as Perfil];
	const foto = await sharp({
		create: { width: 1200, height: 1600, channels: 3, background: '#eee' }
	})
		.jpeg()
		.toBuffer();
	const pdf = Buffer.from('%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n');

	await page.goto('/entrar');
	await page.getByLabel('Teléfono').fill(socio.telefono.slice(3));
	await page.getByLabel('Contraseña').fill(CONTRASENA_TESORERO);
	await page.getByRole('button', { name: 'Entrar' }).click();
	await expect(page.getByRole('heading', { name: 'Mis tickets' })).toBeVisible();

	await page.getByRole('link', { name: 'Nuevo ticket' }).click();
	await expect(page.getByRole('heading', { name: 'Nuevo ticket' })).toBeVisible();
	const enviar = page.getByRole('button', { name: 'Enviar ticket' });
	const archivo = page.locator('input[type=file]:not([capture])');

	// Vacío: dice qué falta. La fecha ya viene con hoy.
	await expect(page.getByLabel('Fecha de compra')).not.toHaveValue('');
	await enviar.click();
	await expect(page.getByText('Añade al menos una foto o un PDF del ticket.')).toBeVisible();
	await expect(page.getByText('Escribe el importe.')).toBeVisible();
	await expect(page.getByText('Elige un concepto.')).toBeVisible();

	// Un fichero que no es lo que dice ser se rechaza por su contenido.
	await archivo.setInputFiles({
		name: 'ticket.jpg',
		mimeType: 'image/jpeg',
		buffer: Buffer.from('no soy una foto')
	});
	await page.getByLabel('Importe (€)').fill('23,45');
	await page.locator('label', { hasText: 'Ferretería' }).click();
	await enviar.click();
	await expect(
		page.getByText('«ticket.jpg»: solo se admiten fotos (JPEG, PNG o WebP) y PDF.')
	).toBeVisible();

	// Foto y PDF, con «Otro…» y su texto libre.
	await archivo.setInputFiles([
		{ name: 'ticket.jpg', mimeType: 'image/jpeg', buffer: foto },
		{ name: 'factura.pdf', mimeType: 'application/pdf', buffer: pdf }
	]);
	await expect(
		page.getByRole('list', { name: 'Ficheros elegidos' }).getByRole('listitem')
	).toHaveCount(2);
	await page.locator('label', { hasText: 'Otro…' }).click();
	await page.getByLabel('¿Qué concepto?').fill('Floristería');
	await page.getByLabel('Observaciones (opcional)').fill('Flores para la gala');
	await enviar.click();

	await expect(page).toHaveURL(/\/tickets\?enviado=\d+$/);
	await expect(page.getByText(/^Ticket T-\d{6} enviado\./)).toBeVisible();
});

test('quien solo es tesorero no puede enviar tickets (R-01: 404)', async ({ page }, info) => {
	await page.goto('/entrar');
	await page.getByLabel('Teléfono').fill(TESOREROS[info.project.name as Perfil].telefono.slice(3));
	await page.getByLabel('Contraseña').fill(CONTRASENA_TESORERO);
	await page.getByRole('button', { name: 'Entrar' }).click();
	await expect(page.getByRole('heading', { name: 'Todos los tickets' })).toBeVisible();
	expect((await page.goto('/tickets/nuevo'))?.status()).toBe(404);
});
