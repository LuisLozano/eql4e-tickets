// Casos de uso de acceso: iniciar sesión (HU-A02), activar la cuenta (HU-A01), cambiar la
// contraseña (HU-A03) y restablecerla si se ha olvidado (HU-A04).
import { eq, sql } from 'drizzle-orm';
import { normalizarIban } from '#lib/iban.ts';
import { normalizarTelefono } from '#lib/telefono.ts';
import { usuario } from '#lib/server/infra/db/esquema.ts';
import type { Conexion } from '#lib/server/infra/db/tipos.ts';
import { consumirCodigo, crearCodigo, type TipoCodigo } from './codigos.ts';
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
	| { ok: false; motivo: 'codigo' | 'iban' };

type DatosCodigo = { telefono: string; codigo: string; contrasena: string };

/**
 * El IBAN es opcional (HU-S07): si viene vacío se conserva el que hubiera, para que reenviar la
 * invitación a un activo no se lo borre.
 */
export async function activarCuenta(
	conexion: Conexion,
	datos: DatosCodigo & { iban?: string },
	ahora: Date
): Promise<ResultadoActivar> {
	const iban = datos.iban?.trim() ? normalizarIban(datos.iban) : undefined;
	if (iban === null) return { ok: false, motivo: 'iban' };
	// Vale para un invitado y, si un tesorero le reenvió la invitación, para un activo: elige otra
	// contraseña y la anterior deja de valer (HU-G02). Nunca para uno de baja (R-05).
	return contrasenaConCodigo(conexion, datos, 'activacion', ['invitado', 'activo'], ahora, {
		iban
	});
}

/** Elige una contraseña nueva con el código del correo de restablecimiento (HU-A04). */
export function restablecerContrasena(conexion: Conexion, datos: DatosCodigo, ahora: Date) {
	return contrasenaConCodigo(conexion, datos, 'restablecer', ['activo'], ahora);
}

/**
 * Consume el código, guarda la contraseña nueva, quita el bloqueo por intentos fallidos, cierra las
 * sesiones abiertas con la anterior y abre una nueva.
 */
async function contrasenaConCodigo(
	conexion: Conexion,
	datos: DatosCodigo,
	tipo: TipoCodigo,
	estadoUsuario: readonly ('invitado' | 'activo')[],
	ahora: Date,
	extra: { iban?: string } = {}
): Promise<ResultadoActivar> {
	const problema = problemaContrasena(datos.contrasena);
	if (problema) return { ok: false, motivo: 'contrasena', mensaje: problema };

	const telefono = normalizarTelefono(datos.telefono);
	if (!telefono) return { ok: false, motivo: 'codigo' };

	const passwordHash = await hashContrasena(datos.contrasena);

	return conexion.transaction(async (tx) => {
		const usuarioId = await consumirCodigo(
			tx,
			{ codigo: datos.codigo, telefono, tipo, estadoUsuario },
			ahora
		);
		if (!usuarioId) return { ok: false, motivo: 'codigo' } as const;

		const [activado] = await tx
			.update(usuario)
			.set({ passwordHash, estado: 'activo', intentosFallidos: 0, bloqueadoHasta: null, ...extra })
			.where(eq(usuario.id, usuarioId))
			.returning({ esTesorero: usuario.esTesorero });

		await invalidarSesionesDe(tx, usuarioId);
		const nueva = await crearSesion(tx, usuarioId, ahora);
		return { ok: true, ...nueva, esTesorero: activado.esTesorero } as const;
	});
}

export type Restablecimiento = { nombre: string; email: string; codigo: string; caducaEn: Date };

/**
 * Crea un código de restablecimiento para el usuario activo con ese teléfono (HU-A04). Nulo si no
 * existe, no es válido o no está activo; quien lo pide no debe notar la diferencia. Invalida los
 * códigos de restablecimiento anteriores.
 */
export async function solicitarRestablecimiento(
	conexion: Conexion,
	datos: { telefono: string },
	ahora: Date
): Promise<Restablecimiento | null> {
	const telefono = normalizarTelefono(datos.telefono);
	if (!telefono) return null;
	const [u] = await conexion.select().from(usuario).where(eq(usuario.telefono, telefono));
	if (!u || u.estado !== 'activo') return null;

	const { codigo, caducaEn } = await crearCodigo(
		conexion,
		{ usuarioId: u.id, tipo: 'restablecer', creadoPor: u.id },
		ahora
	);
	return { nombre: u.nombre, email: u.email, codigo, caducaEn };
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
