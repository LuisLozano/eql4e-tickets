// Gestión de usuarios por un tesorero (HU-G02, HU-G03): editar datos y roles, dar de baja,
// reactivar y reenviar la invitación. R-03: siempre queda al menos un tesorero activo.
import { and, eq, isNull, ne, or } from 'drizzle-orm';
import { normalizarTelefono } from '#lib/telefono.ts';
import { codigoAcceso, usuario } from '#lib/server/infra/db/esquema.ts';
import type { Conexion } from '#lib/server/infra/db/tipos.ts';
import { crearCodigo } from '../auth/codigos.ts';
import { invalidarSesionesDe } from '../auth/sesiones.ts';
import type { DatosAlta } from './alta.ts';

export type DatosUsuario = DatosAlta;

/**
 * Bloquea a los tesoreros activos y devuelve sus ids. Quien quite el rol o dé de baja a un tesorero
 * espera a que termine el otro, así que dos tesoreros no pueden quitarse el rol a la vez (R-03).
 */
async function tesorerosActivos(tx: Conexion) {
	const filas = await tx
		.select({ id: usuario.id })
		.from(usuario)
		.where(and(eq(usuario.esTesorero, true), eq(usuario.estado, 'activo')))
		.for('update');
	return filas.map((f) => f.id);
}

/** ¿Dejaría sin tesoreros activos quitarle el rol (o la cuenta) a este usuario? */
const esElUltimoTesorero = (activos: string[], id: string) =>
	activos.length === 1 && activos[0] === id;

async function buscar(tx: Conexion, id: string) {
	const [u] = await tx
		.select({
			id: usuario.id,
			nombre: usuario.nombre,
			email: usuario.email,
			estado: usuario.estado,
			passwordHash: usuario.passwordHash
		})
		.from(usuario)
		.where(eq(usuario.id, id))
		.for('update');
	return u ?? null;
}

export type ResultadoEditar =
	| { ok: true }
	| { ok: false; motivo: 'no_encontrado' | 'ultimo_tesorero' }
	| { ok: false; campo: 'telefono'; motivo: 'invalido' | 'duplicado' }
	| { ok: false; campo: 'email'; motivo: 'duplicado' };

export async function editarUsuario(
	conexion: Conexion,
	id: string,
	datos: DatosUsuario
): Promise<ResultadoEditar> {
	const telefono = normalizarTelefono(datos.telefono);
	if (!telefono) return { ok: false, campo: 'telefono', motivo: 'invalido' };
	const email = datos.email.trim().toLowerCase();

	return conexion.transaction(async (tx) => {
		const activos = await tesorerosActivos(tx);
		if (!(await buscar(tx, id))) return { ok: false, motivo: 'no_encontrado' } as const;
		if (!datos.esTesorero && esElUltimoTesorero(activos, id)) {
			return { ok: false, motivo: 'ultimo_tesorero' } as const;
		}

		// La base de datos garantiza la unicidad; esto es para decir cuál de los dos campos choca.
		const repetidos = await tx
			.select({ telefono: usuario.telefono })
			.from(usuario)
			.where(and(ne(usuario.id, id), or(eq(usuario.telefono, telefono), eq(usuario.email, email))));
		if (repetidos.some((r) => r.telefono === telefono)) {
			return { ok: false, campo: 'telefono', motivo: 'duplicado' } as const;
		}
		if (repetidos.length > 0) return { ok: false, campo: 'email', motivo: 'duplicado' } as const;

		await tx
			.update(usuario)
			.set({
				nombre: datos.nombre.trim(),
				telefono,
				email,
				esSocio: datos.esSocio,
				esTesorero: datos.esTesorero
			})
			.where(eq(usuario.id, id));
		return { ok: true } as const;
	});
}

export type ResultadoBaja =
	| { ok: true }
	/** propio: nadie se da de baja a sí mismo; estado: ya estaba de baja. */
	| { ok: false; motivo: 'no_encontrado' | 'propio' | 'estado' | 'ultimo_tesorero' };

/** Baja (R-05): no puede entrar, se cierran sus sesiones y caducan sus códigos. Los tickets quedan. */
export async function darDeBaja(
	conexion: Conexion,
	actorId: string,
	id: string,
	ahora: Date
): Promise<ResultadoBaja> {
	if (actorId === id) return { ok: false, motivo: 'propio' };
	return conexion.transaction(async (tx) => {
		const activos = await tesorerosActivos(tx);
		const u = await buscar(tx, id);
		if (!u) return { ok: false, motivo: 'no_encontrado' } as const;
		if (u.estado === 'baja') return { ok: false, motivo: 'estado' } as const;
		if (esElUltimoTesorero(activos, id)) return { ok: false, motivo: 'ultimo_tesorero' } as const;

		await tx.update(usuario).set({ estado: 'baja' }).where(eq(usuario.id, id));
		await invalidarSesionesDe(tx, id);
		await tx
			.update(codigoAcceso)
			.set({ usadoEn: ahora })
			.where(and(eq(codigoAcceso.usuarioId, id), isNull(codigoAcceso.usadoEn)));
		return { ok: true } as const;
	});
}

export type ResultadoReactivar =
	{ ok: true; estado: 'activo' | 'invitado' } | { ok: false; motivo: 'no_encontrado' | 'estado' };

/** Vuelve a activo si ya tenía contraseña; si nunca la eligió, a invitado (necesitará invitación). */
export async function reactivar(conexion: Conexion, id: string): Promise<ResultadoReactivar> {
	return conexion.transaction(async (tx) => {
		const u = await buscar(tx, id);
		if (!u) return { ok: false, motivo: 'no_encontrado' } as const;
		if (u.estado !== 'baja') return { ok: false, motivo: 'estado' } as const;
		const estado = u.passwordHash ? 'activo' : 'invitado';
		await tx
			.update(usuario)
			.set({ estado, intentosFallidos: 0, bloqueadoHasta: null })
			.where(eq(usuario.id, id));
		return { ok: true, estado } as const;
	});
}

export type ResultadoReenviar =
	| {
			ok: true;
			nombre: string;
			email: string;
			codigo: string;
			caducaEn: Date;
			/** Ya estaba activo: el código le sirve para elegir otra contraseña. */
			restablecer: boolean;
	  }
	| { ok: false; motivo: 'no_encontrado' | 'estado' };

/** Código de activación nuevo, de 7 días; los anteriores dejan de valer (HU-G02). */
export async function reenviarInvitacion(
	conexion: Conexion,
	actorId: string,
	id: string,
	ahora: Date
): Promise<ResultadoReenviar> {
	return conexion.transaction(async (tx) => {
		const u = await buscar(tx, id);
		if (!u) return { ok: false, motivo: 'no_encontrado' } as const;
		if (u.estado === 'baja') return { ok: false, motivo: 'estado' } as const;
		const { codigo, caducaEn } = await crearCodigo(
			tx,
			{ usuarioId: id, tipo: 'activacion', creadoPor: actorId },
			ahora
		);
		return {
			ok: true,
			nombre: u.nombre,
			email: u.email,
			codigo,
			caducaEn,
			restablecer: u.estado === 'activo'
		} as const;
	});
}
