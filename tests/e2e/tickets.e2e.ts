import { expect, test } from '@playwright/test';
import sharp from 'sharp';
import { CONTRASENA_TESORERO, REMITENTES, TESOREROS, type Perfil } from './datos.ts';

test('un socio envía un ticket con foto y PDF, lo ve en su lista y en el detalle (HU-S01, S02, S03)', async ({
	page,
	browser
}, info) => {
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

	// Se quita el fichero malo; foto y PDF, con «Otro…» y su texto libre.
	await page.getByRole('button', { name: 'Quitar ticket.jpg' }).click();
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
	const numero = (await page.getByText(/^Ticket T-\d{6} enviado\./).textContent())!.match(
		/T-\d{6}/
	)![0];

	// Mis tickets (HU-S02): aparece arriba, con su estado, y los filtros funcionan.
	const enLista = page
		.getByRole('list', { name: 'Tickets' })
		.getByRole('link')
		.filter({ hasText: numero });
	await expect(enLista).toContainText('Floristería');
	await expect(enLista).toContainText('Pendiente de autorizar');
	await page.getByRole('link', { name: 'Rechazados' }).click();
	await expect(page.getByText('No hay tickets con este estado.')).toBeVisible();
	await page.getByRole('link', { name: 'Pendientes' }).click();
	await expect(page.getByRole('link', { name: 'Pendientes' })).toHaveAttribute(
		'aria-current',
		'page'
	);

	// Detalle (HU-S03): datos, historial, la foto se amplía y el PDF se abre aparte.
	await enLista.click();
	await expect(page.getByRole('heading', { name: numero })).toBeVisible();
	await expect(page.getByText('Flores para la gala')).toBeVisible();
	await expect(page.getByText(/^Enviado por ti$/)).toBeVisible();
	await expect(page.getByRole('link', { name: /Ver PDF/ })).toBeVisible();
	await page.getByRole('button', { name: 'Ampliar ticket.jpg' }).click();
	const ampliada = page.getByRole('dialog').getByRole('img', { name: 'ticket.jpg' });
	await expect(ampliada).toBeVisible();
	await expect
		.poll(() => ampliada.evaluate((img: HTMLImageElement) => img.naturalWidth))
		.toBe(1200);
	await page.keyboard.press('Escape');
	await expect(page.getByRole('dialog')).toBeHidden();

	// Otro socio no ve ni el ticket ni sus ficheros: 404, como si no existieran (R-01).
	const urlDetalle = page.url();
	const urlFichero = await page.getByRole('link', { name: /Ver PDF/ }).getAttribute('href');
	const otro = REMITENTES[info.project.name === 'movil' ? 'escritorio' : 'movil'];
	const ajena = await (await browser.newContext()).newPage();
	await ajena.goto('/entrar');
	await ajena.getByLabel('Teléfono').fill(otro.telefono.slice(3));
	await ajena.getByLabel('Contraseña').fill(CONTRASENA_TESORERO);
	await ajena.getByRole('button', { name: 'Entrar' }).click();
	await expect(ajena.getByRole('heading', { name: 'Mis tickets' })).toBeVisible();
	expect((await ajena.goto(urlDetalle))?.status()).toBe(404);
	expect((await ajena.request.get(urlFichero!)).status()).toBe(404);

	// El dueño sí lo descarga, con las cabeceras de un fichero privado.
	const r = await page.request.get(urlFichero!);
	expect(r.status()).toBe(200);
	expect(r.headers()).toMatchObject({
		'content-type': 'application/pdf',
		'x-content-type-options': 'nosniff',
		'cache-control': 'private, no-store'
	});
});

test('quien solo es tesorero no puede enviar tickets (R-01: 404)', async ({ page }, info) => {
	await page.goto('/entrar');
	await page.getByLabel('Teléfono').fill(TESOREROS[info.project.name as Perfil].telefono.slice(3));
	await page.getByLabel('Contraseña').fill(CONTRASENA_TESORERO);
	await page.getByRole('button', { name: 'Entrar' }).click();
	await expect(page.getByRole('heading', { name: 'Tickets', exact: true })).toBeVisible();
	expect((await page.goto('/tickets/nuevo'))?.status()).toBe(404);
});

test('las fotos se reducen en el móvil y, si falla la red, el ticket no se pierde (HU-S01)', async ({
	page,
	context
}, info) => {
	const socio = REMITENTES[info.project.name as Perfil];
	// Ruido para que el JPEG pese de verdad (unos MB), como una foto de móvil.
	const [ancho, alto] = [2400, 3200];
	const ruido = Buffer.alloc(ancho * alto * 3);
	for (let i = 0; i < ruido.length; i++) ruido[i] = (i * 2654435761) >>> 24;
	const grande = await sharp(ruido, { raw: { width: ancho, height: alto, channels: 3 } })
		.jpeg({ quality: 95 })
		.toBuffer();

	await page.goto('/entrar');
	await page.getByLabel('Teléfono').fill(socio.telefono.slice(3));
	await page.getByLabel('Contraseña').fill(CONTRASENA_TESORERO);
	await page.getByRole('button', { name: 'Entrar' }).click();
	await page.getByRole('link', { name: 'Nuevo ticket' }).click();

	await page.locator('input[type=file][capture]').setInputFiles({
		name: 'IMG_0001.jpg',
		mimeType: 'image/jpeg',
		buffer: grande
	});
	// Elegido justo después: tiene que quedar detrás de la foto aunque se prepare antes.
	await page.locator('input[type=file]:not([capture])').setInputFiles({
		name: 'factura.pdf',
		mimeType: 'application/pdf',
		buffer: Buffer.from('%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n')
	});
	const lista = page.getByRole('list', { name: 'Ficheros elegidos' });
	await expect(lista.getByRole('listitem')).toHaveCount(2);
	await expect(lista.getByRole('listitem').first()).toContainText('IMG_0001.jpg');
	await expect(lista.getByText(/^Reducida de [\d,]+ MB a [\d,]+ (KB|MB)$/)).toBeVisible();
	await expect(lista.getByText('IMG_0001.jpg')).toBeVisible();
	await expect(page.getByRole('group', { name: 'Fotos del ticket · 2 de 5' })).toBeVisible();

	await page.getByLabel('Importe (€)').fill('12,30');
	await page.locator('label', { hasText: 'Transporte' }).click();

	// Sin conexión: avisa y el formulario sigue igual.
	await context.setOffline(true);
	await page.getByRole('button', { name: 'Enviar ticket' }).click();
	// El aviso sale junto al botón, dentro de la pantalla: en el móvil no hay que subir a buscarlo.
	const avisoRed = page.getByText(/^No se ha podido enviar\./);
	await expect(avisoRed).toBeInViewport();
	await expect(lista.getByRole('listitem')).toHaveCount(2);

	// Aunque se recargue la página, el borrador vuelve.
	await context.setOffline(false);
	await page.reload();
	await expect(
		page.getByText('Hemos recuperado el ticket que no llegaste a enviar.')
	).toBeVisible();
	await expect(page.getByLabel('Importe (€)')).toHaveValue('12,30');
	await expect(page.getByLabel('Transporte')).toBeChecked();
	await expect(lista.getByRole('listitem')).toHaveCount(2);
	await expect(lista.getByRole('listitem').first()).toContainText('IMG_0001.jpg');

	await page.getByRole('button', { name: 'Enviar ticket' }).click();
	await expect(page.getByText(/^Ticket T-\d{6} enviado\./)).toBeVisible();

	// Enviado, el borrador desaparece.
	await page.getByRole('link', { name: 'Nuevo ticket' }).click();
	await expect(page.getByLabel('Importe (€)')).toHaveValue('');
	await expect(page.getByText('Hemos recuperado')).toHaveCount(0);
});
