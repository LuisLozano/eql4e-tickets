import { defineConfig, devices } from '@playwright/test';

const puerto = 4173;

// ADR-0007: perfiles móvil y escritorio. Necesita DATABASE_URL apuntando a un PostgreSQL.
export default defineConfig({
	testDir: 'tests/e2e',
	testMatch: '**/*.e2e.ts',
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 1 : 0,
	reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
	use: { baseURL: `http://127.0.0.1:${puerto}`, trace: 'retain-on-failure' },
	projects: [
		{ name: 'movil', use: { ...devices['Pixel 7'] } },
		{ name: 'escritorio', use: { ...devices['Desktop Chrome'] } }
	],
	webServer: {
		command: 'node build',
		url: `http://127.0.0.1:${puerto}/salud`,
		reuseExistingServer: !process.env.CI,
		env: { PORT: String(puerto), HOST: '127.0.0.1', PROTOCOL_HEADER: 'x-forwarded-proto' }
	}
});
