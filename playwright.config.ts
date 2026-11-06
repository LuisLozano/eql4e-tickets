import { defineConfig, devices } from '@playwright/test';

const puerto = 4173;

// ADR-0007: perfiles móvil y escritorio. Necesita DATABASE_URL apuntando a un PostgreSQL.
export default defineConfig({
	testDir: 'tests/e2e',
	testMatch: '**/*.e2e.ts',
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 1 : 0,
	reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
	globalSetup: './tests/e2e/preparar.ts',
	// localhost (y no 127.0.0.1): SvelteKit solo omite «Secure» en la cookie para http://localhost.
	// Las cabeceras imitan a Caddy: el protocolo, para que el origen calculado sea http y pase la
	// comprobación CSRF; la IP, que tests/e2e/base.ts cambia en cada prueba.
	use: {
		baseURL: `http://localhost:${puerto}`,
		extraHTTPHeaders: { 'x-forwarded-proto': 'http', 'x-forwarded-for': '10.255.255.1' },
		trace: 'retain-on-failure'
	},
	projects: [
		{ name: 'movil', use: { ...devices['Pixel 7'] } },
		{ name: 'escritorio', use: { ...devices['Desktop Chrome'] } }
	],
	webServer: {
		command: 'node build',
		url: `http://localhost:${puerto}/salud`,
		reuseExistingServer: !process.env.CI,
		env: {
			PORT: String(puerto),
			PROTOCOL_HEADER: 'x-forwarded-proto',
			ADDRESS_HEADER: 'x-forwarded-for',
			XFF_DEPTH: '1',
			URL_PUBLICA: `http://localhost:${puerto}`,
			BODY_SIZE_LIMIT: '60M',
			RUTA_FICHEROS: 'test-results/ficheros'
		}
	}
});
