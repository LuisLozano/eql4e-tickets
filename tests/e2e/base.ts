// Las pruebas e2e importan `test` y `expect` de aquí, no de @playwright/test.
//
// Cada prueba llega desde su propia IP (X-Forwarded-For, como la pone Caddy en producción): así el
// límite de intentos de entrar por IP (RNF-15) no salta por la suma de todas las pruebas.
import { test as base } from '@playwright/test';

let siguiente = 0;

export const test = base.extend({
	extraHTTPHeaders: async ({ extraHTTPHeaders }, use, info) => {
		siguiente++;
		await use({
			...extraHTTPHeaders,
			'x-forwarded-for': `10.${info.workerIndex % 256}.${Math.floor(siguiente / 256) % 256}.${siguiente % 256}`
		});
	}
});

export { expect, type Page } from '@playwright/test';
