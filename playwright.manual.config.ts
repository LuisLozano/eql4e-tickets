import { defineConfig, devices } from '@playwright/test';
import base from './playwright.config.ts';

// Manual de usuario (D-01): las capturas de /ayuda y su PDF. No son pruebas: se lanzan a mano
// (docs/manual/README.md), con la misma app que las e2e y una base de datos propia (preparar.ts).
export default defineConfig({
	...base,
	globalSetup: './tests/manual/preparar.ts',
	testDir: 'tests/manual',
	testMatch: '**/*.manual.ts',
	retries: 0,
	reporter: 'list',
	projects: [{ name: 'movil', use: { ...devices['Pixel 7'], colorScheme: 'light' } }]
});
