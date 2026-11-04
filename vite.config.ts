import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vitest/config';
import adapter from '@sveltejs/adapter-node';
import { sveltekit } from '@sveltejs/kit/vite';

export default defineConfig({
	plugins: [
		tailwindcss(),
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},
			adapter: adapter()
		})
	],
	test: {
		expect: { requireAssertions: true },
		coverage: {
			provider: 'v8',
			include: ['src/lib/**/*.ts'],
			exclude: ['src/**/*.test.ts'],
			// ADR-0007: 100 % de ramas en la máquina de estados, los permisos y la autenticación.
			// Los ficheros llegan en el Sprint 1; los umbrales se aplican en cuanto existan.
			thresholds: {
				'src/lib/server/dominio/ticket/estados.ts': { branches: 100 },
				'src/lib/server/dominio/ticket/permisos.ts': { branches: 100 },
				'src/lib/server/dominio/auth/**': { branches: 100 }
			}
		},
		projects: [
			{
				extends: './vite.config.ts',
				test: {
					name: 'unitarias',
					environment: 'node',
					include: ['src/**/*.test.ts']
				}
			},
			{
				extends: './vite.config.ts',
				test: {
					name: 'integracion',
					environment: 'node',
					include: ['tests/integracion/**/*.test.ts'],
					globalSetup: ['tests/integracion/preparar.ts'],
					testTimeout: 30_000,
					hookTimeout: 120_000
				}
			}
		]
	}
});
