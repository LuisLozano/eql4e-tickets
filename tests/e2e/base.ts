// Las pruebas e2e importan `test` y `expect` de aquí, no de @playwright/test.
//
// Cada prueba llega desde su propia IP (X-Forwarded-For, como la pone Caddy en producción): así el
// límite de intentos de entrar por IP (RNF-15) no salta por la suma de todas las pruebas.
//
// Y cada prueba falla si el navegador bloquea algo por la Content-Security-Policy: así cualquier
// pantalla que necesite un script, estilo o imagen no permitidos se detecta aquí y no en producción.
import { expect, test as base } from '@playwright/test';

let siguiente = 0;

export const test = base.extend({
	extraHTTPHeaders: async ({ extraHTTPHeaders }, use, info) => {
		siguiente++;
		await use({
			...extraHTTPHeaders,
			'x-forwarded-for': `10.${info.workerIndex % 256}.${Math.floor(siguiente / 256) % 256}.${siguiente % 256}`
		});
	},
	page: async ({ page }, use) => {
		const bloqueos: string[] = [];
		page.on('console', (m) => {
			if (m.type() === 'error' && m.text().includes('Content Security Policy')) {
				bloqueos.push(m.text());
			}
		});
		await use(page);
		expect(bloqueos, 'bloqueos de la Content-Security-Policy').toEqual([]);
	}
});

export { expect, type Page } from '@playwright/test';
