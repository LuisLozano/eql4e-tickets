import { defineEnvVars } from '@sveltejs/kit/env';
import { z } from 'zod';

/**
 * Configuración validada al arrancar (04-estructura). Si falta una variable
 * obligatoria o no es válida, la app no arranca y dice cuál es.
 */
export const variables = defineEnvVars({
	DATABASE_URL: {
		description: 'Conexión a PostgreSQL: postgres://usuario:clave@host:5432/base',
		schema: z.url({ protocol: /^postgres(ql)?$/ })
	},
	URL_PUBLICA: {
		description: 'Dirección pública de la app, para los enlaces de los correos y del log',
		schema: z.url().default('http://localhost:5173')
	},
	RUTA_FICHEROS: {
		description: 'Carpeta del volumen donde se guardan fotos y justificantes',
		schema: z.string().min(1).default('/data/ficheros')
	},
	CORREO_MODO: {
		description: 'smtp envía de verdad; consola solo escribe el correo en el log',
		schema: z.enum(['smtp', 'consola']).default('consola')
	},
	SMTP_HOST: { description: 'Servidor SMTP (ADR-0004)', schema: z.string().optional() },
	SMTP_PORT: {
		description: 'Puerto SMTP',
		schema: z.coerce.number<string | undefined>().int().positive().default(587)
	},
	SMTP_USER: { description: 'Usuario SMTP', schema: z.string().optional() },
	SMTP_PASS: { description: 'Contraseña de aplicación SMTP', schema: z.string().optional() },
	SMTP_FROM: { description: 'Remitente de los correos', schema: z.string().optional() }
});
