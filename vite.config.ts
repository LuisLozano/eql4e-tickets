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
			adapter: adapter(),
			// Content-Security-Policy (ADR-0003): todo sale de la propia app, sin terceros. SvelteKit añade
			// un nonce por respuesta a sus <script> y <style> en línea; cualquier otro script se bloquea.
			csp: {
				mode: 'nonce',
				directives: {
					'default-src': ['self'],
					'script-src': ['self'],
					'style-src': ['self'],
					// Atributos style="…": el contenedor de app.html y el giro y el zoom del visor de fotos. Un
					// atributo de estilo no ejecuta código.
					'style-src-attr': ['unsafe-inline'],
					// blob: para las miniaturas antes de enviar; data: por si Vite incrusta una imagen pequeña.
					'img-src': ['self', 'blob:', 'data:'],
					'font-src': ['self', 'data:'],
					// El worker que comprime las fotos en el móvil es un fichero de la app.
					'worker-src': ['self'],
					// blob: porque Chrome, al no poder decodificar una foto en el worker, la vuelve a leer por su URL
					// blob:. Esas URL solo las crea la propia app: no sirven para sacar datos fuera.
					'connect-src': ['self', 'blob:'],
					'object-src': ['none'],
					'base-uri': ['self'],
					'form-action': ['self'],
					'frame-ancestors': ['none']
				}
			}
		})
	],
	test: {
		expect: { requireAssertions: true },
		coverage: {
			provider: 'v8',
			include: ['src/lib/**/*.ts'],
			exclude: ['src/**/*.test.ts'],
			// ADR-0007: 100 % de ramas en la máquina de estados, los permisos, la autenticación, el alta y
			// los conceptos.
			// Los ficheros llegan en el Sprint 1; los umbrales se aplican en cuanto existan.
			thresholds: {
				'src/lib/server/dominio/ticket/estados.ts': { branches: 100 },
				'src/lib/server/dominio/ticket/permisos.ts': { branches: 100 },
				'src/lib/server/dominio/auth/**': { branches: 100 },
				'src/lib/server/dominio/usuario/**': { branches: 100 },
				'src/lib/server/dominio/concepto/**': { branches: 100 }
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
