// Sesiones en base de datos (ADR-0003): la cookie lleva el token y la tabla, su SHA-256.
import { and, eq, ne } from 'drizzle-orm';
import { sesion, usuario } from '#lib/server/infra/db/esquema.ts';
import type { Conexion } from '#lib/server/infra/db/tipos.ts';
import { generarTokenSesion, sha256 } from './tokens.ts';

const DIA = 24 * 60 * 60 * 1000;
export const DURACION_SESION_MS = 30 * DIA;
/** Si a la sesión le quedan menos de 15 días, se renueva hasta 30 (caducidad deslizante). */
const RENOVAR_SI_QUEDAN_MS = 15 * DIA;

export type UsuarioSesion = {
	id: string;
	nombre: string;
	esSocio: boolean;
	esTesorero: boolean;
};

export async function crearSesion(conexion: Conexion, usuarioId: string, ahora: Date) {
	const token = generarTokenSesion();
	const caducaEn = new Date(ahora.getTime() + DURACION_SESION_MS);
	await conexion.insert(sesion).values({ id: sha256(token), usuarioId, caducaEn });
	return { token, caducaEn };
}

/**
 * Devuelve el usuario de la sesión, o nulo si el token no existe, ha caducado o el usuario ya no
 * está activo (R-05). `renovada` indica que hay que volver a enviar la cookie con la nueva caducidad.
 */
export async function validarSesion(conexion: Conexion, token: string, ahora: Date) {
	const id = sha256(token);
	const [fila] = await conexion
		.select({
			caducaEn: sesion.caducaEn,
			usuario: {
				id: usuario.id,
				nombre: usuario.nombre,
				esSocio: usuario.esSocio,
				esTesorero: usuario.esTesorero,
				estado: usuario.estado
			}
		})
		.from(sesion)
		.innerJoin(usuario, eq(sesion.usuarioId, usuario.id))
		.where(eq(sesion.id, id));

	if (!fila) return null;

	if (fila.caducaEn.getTime() <= ahora.getTime() || fila.usuario.estado !== 'activo') {
		await conexion.delete(sesion).where(eq(sesion.id, id));
		return null;
	}

	let caducaEn = fila.caducaEn;
	const renovada = caducaEn.getTime() - ahora.getTime() < RENOVAR_SI_QUEDAN_MS;
	if (renovada) {
		caducaEn = new Date(ahora.getTime() + DURACION_SESION_MS);
		await conexion.update(sesion).set({ caducaEn }).where(eq(sesion.id, id));
	}

	const { id: usuarioId, nombre, esSocio, esTesorero } = fila.usuario;
	const usuarioSesion: UsuarioSesion = { id: usuarioId, nombre, esSocio, esTesorero };
	return { usuario: usuarioSesion, caducaEn, renovada };
}

export async function invalidarSesion(conexion: Conexion, token: string) {
	await conexion.delete(sesion).where(eq(sesion.id, sha256(token)));
}

/** Cierra todas las sesiones del usuario, salvo la indicada (cambio de contraseña, baja). */
export async function invalidarSesionesDe(
	conexion: Conexion,
	usuarioId: string,
	exceptoToken?: string
) {
	const condicion = exceptoToken
		? and(eq(sesion.usuarioId, usuarioId), ne(sesion.id, sha256(exceptoToken)))
		: eq(sesion.usuarioId, usuarioId);
	await conexion.delete(sesion).where(condicion);
}
