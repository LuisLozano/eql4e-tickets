// Acciones de la app que repiten las capturas de la Ayuda y los vídeos de demostración.
import { expect, type Page } from '@playwright/test';
import { fotoTicket } from './demo.ts';

export async function entrar(page: Page, telefono: string, contrasena: string) {
	await page.goto('/entrar');
	await page.getByLabel('Teléfono').fill(telefono.slice(3));
	await page.getByLabel('Contraseña').fill(contrasena);
	await page.getByRole('button', { name: 'Entrar' }).click();
}

export type DatosTicket = {
	comercio: string;
	lineas: [string, string][];
	total: string;
	concepto: string;
	otro?: string;
};

/** Envía un ticket desde «Nuevo ticket» y devuelve su número. Antes de enviar, `antes`. */
export async function enviarTicket(page: Page, datos: DatosTicket, antes?: () => Promise<unknown>) {
	await page.goto('/tickets/nuevo');
	await page.locator('input[type=file]:not([capture])').setInputFiles({
		name: 'ticket.jpg',
		mimeType: 'image/jpeg',
		buffer: await fotoTicket(datos)
	});
	await expect(page.getByRole('list', { name: 'Ficheros del ticket' })).toBeVisible();
	await page.getByLabel('Importe (€)').fill(datos.total);
	await page.locator('label', { hasText: datos.concepto }).click();
	if (datos.otro) await page.getByLabel('¿Qué concepto?').fill(datos.otro);
	await antes?.();
	await page.getByRole('button', { name: 'Enviar ticket' }).click();
	await expect(page).toHaveURL(/enviado=\d+/);
	return Number(new URL(page.url()).searchParams.get('enviado'));
}
