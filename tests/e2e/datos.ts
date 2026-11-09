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

/** Socios con un ticket pendiente y otro rechazado (en preparar.ts) que editan y corrigen. */
export const EDICION = {
	movil: {
		nombre: 'Edición Móvil',
		telefono: '+34699000071',
		email: 'edicion.movil@ejemplo.invalid'
	},
	escritorio: {
		nombre: 'Edición Escritorio',
		telefono: '+34699000072',
		email: 'edicion.escritorio@ejemplo.invalid'
	}
} as const;

/** Socios con dos tickets pendientes de pago (en preparar.ts) que un tesorero paga. */
export const PAGO = {
	movil: {
		nombre: 'Pago Móvil',
		telefono: '+34699000081',
		email: 'pago.movil@ejemplo.invalid'
	},
	escritorio: {
		nombre: 'Pago Escritorio',
		telefono: '+34699000082',
		email: 'pago.escritorio@ejemplo.invalid'
	}
} as const;

/** Socios (en preparar.ts) con dos pendientes de pago y uno rechazado, para deshacer pasos. */
export const DESHACER = {
	movil: {
		nombre: 'Deshacer Móvil',
		telefono: '+34699000091',
		email: 'deshacer.movil@ejemplo.invalid'
	},
	escritorio: {
		nombre: 'Deshacer Escritorio',
		telefono: '+34699000092',
		email: 'deshacer.escritorio@ejemplo.invalid'
	}
} as const;

/** Socios activos (en preparar.ts) cuya ficha edita un tesorero: datos, baja y otra contraseña. */
export const GESTION = {
	movil: {
		nombre: 'Gestión Móvil',
		telefono: '+34699000101',
		email: 'gestion.movil@ejemplo.invalid',
		nuevoTelefono: '+34699000111'
	},
	escritorio: {
		nombre: 'Gestión Escritorio',
		telefono: '+34699000102',
		email: 'gestion.escritorio@ejemplo.invalid',
		nuevoTelefono: '+34699000112'
	}
} as const;

/** Socios (en preparar.ts) con un ticket pendiente de 2019: la purga no lo borra y sale el aviso. */
export const PURGA = {
	movil: { nombre: 'Purga Móvil', telefono: '+34699000121', email: 'purga.movil@ejemplo.invalid' },
	escritorio: {
		nombre: 'Purga Escritorio',
		telefono: '+34699000122',
		email: 'purga.escritorio@ejemplo.invalid'
	}
} as const;

/** Socios (en preparar.ts) con tres tickets pendientes de autorizar: autorización múltiple. */
export const MULTIPLE = {
	movil: {
		nombre: 'Múltiple Móvil',
		telefono: '+34699000131',
		email: 'multiple.movil@ejemplo.invalid'
	},
	escritorio: {
		nombre: 'Múltiple Escritorio',
		telefono: '+34699000132',
		email: 'multiple.escritorio@ejemplo.invalid'
	}
} as const;

/** Socios (en preparar.ts) con dos tickets pendientes: ven cómo los autorizan sin recargar. */
export const REFRESCO = {
	movil: {
		nombre: 'Refresco Móvil',
		telefono: '+34699000141',
		email: 'refresco.movil@ejemplo.invalid'
	},
	escritorio: {
		nombre: 'Refresco Escritorio',
		telefono: '+34699000142',
		email: 'refresco.escritorio@ejemplo.invalid'
	}
} as const;

/** Socios activos (en preparar.ts) con un código de restablecimiento conocido (HU-A04). */
export const RESTABLECER = {
	movil: {
		nombre: 'Olvido Móvil',
		telefono: '+34699000151',
		email: 'olvido.movil@ejemplo.invalid',
		codigo: 'OLVI-DOMO-VILA-AAAA-AAAA-AAAA-AAAA'
	},
	escritorio: {
		nombre: 'Olvido Escritorio',
		telefono: '+34699000152',
		email: 'olvido.escritorio@ejemplo.invalid',
		codigo: 'OLVI-DOES-CRIT-ORIO-AAAA-AAAA-AAAA'
	}
} as const;
