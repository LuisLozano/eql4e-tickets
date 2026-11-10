import { defineConfig, devices, type PlaywrightTestConfig } from '@playwright/test';
import base from './playwright.config.ts';

// Manual de usuario (D-01): las capturas de /ayuda, su PDF y los vídeos de demostración. No son
// pruebas: se lanzan a mano (docs/manual/README.md), con la misma app que las e2e y una base de
// datos propia (preparar.ts).
const servidor = base.webServer as Extract<PlaywrightTestConfig['webServer'], { command: string }>;

export default defineConfig({
	...base,
	globalSetup: './tests/manual/preparar.ts',
	testDir: 'tests/manual',
	testMatch: '**/*.manual.ts',
	retries: 0,
	reporter: 'list',
	// Los enlaces de activación que se ven en pantalla, con la dirección real.
	webServer: {
		...servidor,
		env: { ...servidor.env, URL_PUBLICA: 'https://tickets-eql4e.ddns.net' }
	},
	projects: [{ name: 'movil', use: { ...devices['Pixel 7'], colorScheme: 'light' } }]
});
