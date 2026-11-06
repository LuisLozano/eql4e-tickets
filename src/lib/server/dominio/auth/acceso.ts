// Casos de uso de acceso: iniciar sesión (HU-A02), activar la cuenta (HU-A01)
// y cambiar la contraseña (HU-A03).
import { eq, sql } from 'drizzle-orm';
import { normalizarTelefono } from '#lib/telefono.ts';
import { usuario } from '#lib/server/infra/db/esquema.ts';
import type { Conexion } from '#lib/server/infra/db/tipos.ts';
import { consumirCodigo } from './codigos.ts';
import {
	hashContrasena,
	problemaContrasena,
	verificarContrasena,
	verificarFicticio
} from './contrasenas.ts';
import { crearSesion, invalidarSesionesDe } from './sesiones.ts';

export const MAX_INTENTOS = 5;
export const BLOQUEO_MS = 15 * 60 * 1000;

export type ResultadoEntrar =
	| { ok: true; token: string; caducaEn: Date; esTesorero: boolean }
	| { ok: false; motivo: 'credenciales' }
	| { ok: false; motivo: 'bloqueado'; hasta: Date };

export async function iniciarSesion(
	conexion: Conexion,
	datos: { telefono: string; contrasena: string },
	ahora: Date
): Promise<ResultadoEntrar> {
	const telefono = normalizarTelefono(datos.telefono);
	const [u] = telefono
		? await conexion.select().from(usuario).where(eq(usuario.telefono, telefono))
		: [];

	// Usuario inexistente, sin activar o de baja (R-05): el mismo error y el mismo tiempo de respuesta.
	if (!u || u.estado !== 'activo') {
		await verificarFicticio(datos.contrasena);
		return { ok: false, motivo: 'credenciales' };
	}

	if (u.bloqueadoHasta && u.bloqueadoHasta > ahora) {
		return { ok: false, motivo: 'bloqueado', hasta: u.bloqueadoHasta };
	}

	// Un usuario activo siempre tiene contraseña (CHECK usuario_activo_con_password).
	if (!(await verificarContrasena(u.passwordHash!, datos.contrasena))) {
		const [{ intentos }] = await conexion
			.update(usuario)
			.set({ intentosFallidos: sql`${usuario.intentosFallidos} + 1` })
			.where(eq(usuario.id, u.id))
			.returning({ intentos: usuario.intentosFallidos });

		if (intentos >= MAX_INTENTOS) {
			const hasta = new Date(ahora.getTime() + BLOQUEO_MS);
			await conexion
				.update(usuario)
				.set({ intentosFallidos: 0, bloqueadoHasta: hasta })
				.where(eq(usuario.id, u.id));
			return { ok: false, motivo: 'bloqueado', hasta };
		}
		return { ok: false, motivo: 'credenciales' };
	}

	await conexion
		.update(usuario)
		.set({ intentosFallidos: 0, bloqueadoHasta: null })
		.where(eq(usuario.id, u.id));
	const nueva = await crearSesion(conexion, u.id, ahora);
	return { ok: true, ...nueva, esTesorero: u.esTesorero };
}

export type ResultadoActivar =
	| { ok: true; token: string; caducaEn: Date; esTesorero: boolean }
	| { ok: false; motivo: 'contrasena'; mensaje: string }
	| { ok: false; motivo: 'codigo' };

export async function activarCuenta(
	conexion: Conexion,
	datos: { telefono: string; codigo: string; contrasena: string },
	ahora: Date
): Promise<ResultadoActivar> {
	const problema = problemaContrasena(datos.contrasena);
	if (problema) return { ok: false, motivo: 'contrasena', mensaje: problema };

	const telefono = normalizarTelefono(datos.telefono);
	if (!telefono) return { ok: false, motivo: 'codigo' };

	const passwordHash = await hashContrasena(datos.contrasena);

	return conexion.transaction(async (tx) => {
		// Vale para un invitado y, si un tesorero le reenvió la invitación, para un activo: elige otra
		// contraseña y la anterior deja de valer (HU-G02). Nunca para uno de baja (R-05).
		const usuarioId = await consumirCodigo(
			tx,
			{
				codigo: datos.codigo,
				telefono,
				tipo: 'activacion',
				estadoUsuario: ['invitado', 'activo']
			},
			ahora
		);
		if (!usuarioId) return { ok: false, motivo: 'codigo' } as const;

		const [activado] = await tx
			.update(usuario)
			.set({ passwordHash, estado: 'activo', intentosFallidos: 0, bloqueadoHasta: null })
			.where(eq(usuario.id, usuarioId))
			.returning({ esTesorero: usuario.esTesorero });

		// Con la contraseña nueva se cierran las sesiones abiertas con la anterior.
		await invalidarSesionesDe(tx, usuarioId);
		const nueva = await crearSesion(tx, usuarioId, ahora);
		return { ok: true, ...nueva, esTesorero: activado.esTesorero } as const;
	});
}

export type ResultadoCambiar =
	| { ok: true }
	| { ok: false; motivo: 'actual' }
	| { ok: false; motivo: 'contrasena'; mensaje: string };

/** Cambia la contraseña y cierra las demás sesiones del usuario (HU-A03). */
export async function cambiarContrasena(
	conexion: Conexion,
	datos: { usuarioId: string; actual: string; nueva: string; tokenActual: string }
): Promise<ResultadoCambiar> {
	const [u] = await conexion
		.select({ passwordHash: usuario.passwordHash })
		.from(usuario)
		.where(eq(usuario.id, datos.usuarioId));
	if (!u?.passwordHash || !(await verificarContrasena(u.passwordHash, datos.actual))) {
		return { ok: false, motivo: 'actual' };
	}

	const problema = problemaContrasena(datos.nueva);
	if (problema) return { ok: false, motivo: 'contrasena', mensaje: problema };

	const passwordHash = await hashContrasena(datos.nueva);
	await conexion.transaction(async (tx) => {
		await tx.update(usuario).set({ passwordHash }).where(eq(usuario.id, datos.usuarioId));
		await invalidarSesionesDe(tx, datos.usuarioId, datos.tokenActual);
	});
	return { ok: true };
}
