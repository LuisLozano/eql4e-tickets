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
