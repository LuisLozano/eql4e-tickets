// Ayudas para crear datos en las pruebas de integración.
import { hashContrasena } from '../../src/lib/server/dominio/auth/contrasenas.ts';
import { usuario } from '../../src/lib/server/infra/db/esquema.ts';
import type { Conexion } from '../../src/lib/server/infra/db/tipos.ts';

let siguiente = 0;

/** Un teléfono español válido y distinto en cada llamada (y en cada fichero de pruebas). */
export function telefonoNuevo(): string {
	siguiente++;
	const base = 610_000_000 + ((process.pid % 1000) * 10_000 + siguiente);
	return `+34${base}`;
}

export async function crearUsuario(
	conexion: Conexion,
	datos: {
		estado?: 'invitado' | 'activo' | 'baja';
		contrasena?: string;
		esTesorero?: boolean;
		esSocio?: boolean;
	} = {}
) {
	const telefono = telefonoNuevo();
	const estado = datos.estado ?? 'activo';
	const passwordHash =
		estado === 'invitado' ? null : await hashContrasena(datos.contrasena ?? 'una contraseña larga');
	const [fila] = await conexion
		.insert(usuario)
		.values({
			nombre: `Usuario ${telefono}`,
			telefono,
			email: `u${telefono.slice(1)}@ejemplo.invalid`,
			passwordHash,
			estado,
			esSocio: datos.esSocio ?? true,
			esTesorero: datos.esTesorero ?? false
		})
		.returning();
	return fila;
}
