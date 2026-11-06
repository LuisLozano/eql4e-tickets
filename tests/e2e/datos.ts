// Socios de las pruebas e2e: uno por perfil, para que los dos perfiles puedan ir en paralelo.
export const SOCIOS = {
	movil: {
		nombre: 'Socia Móvil',
		telefono: '+34699000001',
		email: 'socia.movil@ejemplo.invalid',
		codigo: 'MOVI-LAAA-AAAA-AAAA-AAAA-AAAA-AAAA'
	},
	escritorio: {
		nombre: 'Socio Escritorio',
		telefono: '+34699000002',
		email: 'socio.escritorio@ejemplo.invalid',
		codigo: 'ESCR-ITOR-IOAA-AAAA-AAAA-AAAA-AAAA'
	}
} as const;

export type Perfil = keyof typeof SOCIOS;

/** Tesoreros activos, con contraseña conocida, para las pruebas de gestión. */
export const TESOREROS = {
	movil: {
		nombre: 'Tesorera Móvil',
		telefono: '+34699000011',
		email: 'tesorera.movil@ejemplo.invalid'
	},
	escritorio: {
		nombre: 'Tesorero Escritorio',
		telefono: '+34699000012',
		email: 'tesorero.escritorio@ejemplo.invalid'
	}
} as const;

export const CONTRASENA_TESORERO = 'contraseña del tesorero e2e';

/** Socios que da de alta cada tesorero en las pruebas (se borran antes de empezar). */
export const ALTAS = {
	movil: { nombre: 'Alta Móvil', telefono: '+34699000021', email: 'alta.movil@ejemplo.invalid' },
	escritorio: {
		nombre: 'Alta Escritorio',
		telefono: '+34699000022',
		email: 'alta.escritorio@ejemplo.invalid'
	}
} as const;

/** Conceptos que crea cada tesorero en las pruebas (se borran antes de empezar). */
export const CONCEPTOS = {
	movil: { nombre: 'Imprenta móvil', renombrado: 'Copistería móvil' },
	escritorio: { nombre: 'Imprenta escritorio', renombrado: 'Copistería escritorio' }
} as const;

/** Socios ya activos que envían tickets (se crean en preparar.ts con CONTRASENA_TESORERO). */
export const REMITENTES = {
	movil: {
		nombre: 'Remitente Móvil',
		telefono: '+34699000031',
		email: 'remitente.movil@ejemplo.invalid'
	},
	escritorio: {
		nombre: 'Remitente Escritorio',
		telefono: '+34699000032',
		email: 'remitente.escritorio@ejemplo.invalid'
	}
} as const;

/** Socios con tickets ya hechos (en preparar.ts) para el listado del tesorero. */
export const LISTADO = {
	movil: {
		nombre: 'Listado Móvil',
		telefono: '+34699000041',
		email: 'listado.movil@ejemplo.invalid'
	},
	escritorio: {
		nombre: 'Listado Escritorio',
		telefono: '+34699000042',
		email: 'listado.escritorio@ejemplo.invalid'
	}
} as const;

/** Socios con dos tickets pendientes (en preparar.ts) que un tesorero autoriza y rechaza. */
export const REVISION = {
	movil: {
		nombre: 'Revisión Móvil',
		telefono: '+34699000051',
		email: 'revision.movil@ejemplo.invalid'
	},
	escritorio: {
		nombre: 'Revisión Escritorio',
		telefono: '+34699000052',
		email: 'revision.escritorio@ejemplo.invalid'
	}
} as const;

/** Socios con un ticket pendiente y otro rechazado (en preparar.ts) que anulan. */
export const ANULAR = {
	movil: {
		nombre: 'Anular Móvil',
		telefono: '+34699000061',
		email: 'anular.movil@ejemplo.invalid'
	},
	escritorio: {
		nombre: 'Anular Escritorio',
		telefono: '+34699000062',
		email: 'anular.escritorio@ejemplo.invalid'
	}
} as const;
