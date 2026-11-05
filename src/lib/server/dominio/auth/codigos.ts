// Códigos de invitación y de restablecimiento (ADR-0003, RNF-14): aleatorios, de un solo uso,
// con caducidad y guardados como SHA-256. Generar uno nuevo invalida los anteriores.
import { and, eq, gt, isNull } from 'drizzle-orm';
import { codigoAcceso, usuario } from '#lib/server/infra/db/esquema.ts';
import type { Conexion } from '#lib/server/infra/db/tipos.ts';
import { generarCodigo, normalizarCodigo, sha256 } from './tokens.ts';

export type TipoCodigo = 'activacion' | 'restablecer';
type EstadoUsuario = 'invitado' | 'activo';

const VALIDEZ_MS: Record<TipoCodigo, number> = {
	activacion: 7 * 24 * 60 * 60 * 1000,
	restablecer: 60 * 60 * 1000
};

export async function crearCodigo(
	conexion: Conexion,
	datos: { usuarioId: string; tipo: TipoCodigo; creadoPor: string | null },
	ahora: Date
) {
	await conexion
		.update(codigoAcceso)
		.set({ usadoEn: ahora })
		.where(
			and(
				eq(codigoAcceso.usuarioId, datos.usuarioId),
				eq(codigoAcceso.tipo, datos.tipo),
				isNull(codigoAcceso.usadoEn)
			)
		);

	const codigo = generarCodigo();
	const caducaEn = new Date(ahora.getTime() + VALIDEZ_MS[datos.tipo]);
	await conexion.insert(codigoAcceso).values({
		usuarioId: datos.usuarioId,
		codigoHash: sha256(normalizarCodigo(codigo)),
		tipo: datos.tipo,
		caducaEn,
		creadoPor: datos.creadoPor
	});
	return { codigo, caducaEn };
}

/**
 * Marca el código como usado y devuelve el id de su usuario. Nulo si no existe, es de otro tipo,
 * ya se usó, ha caducado, no corresponde a ese teléfono o el usuario no está en el estado esperado;
 * el motivo no se distingue (HU-A01). Es una sola sentencia, así que dos peticiones simultáneas no
 * pueden usar el mismo código.
 */
export async function consumirCodigo(
	conexion: Conexion,
	datos: { codigo: string; telefono: string; tipo: TipoCodigo; estadoUsuario: EstadoUsuario },
	ahora: Date
): Promise<string | null> {
	const [fila] = await conexion
		.update(codigoAcceso)
		.set({ usadoEn: ahora })
		.from(usuario)
		.where(
			and(
				eq(codigoAcceso.usuarioId, usuario.id),
				eq(codigoAcceso.codigoHash, sha256(normalizarCodigo(datos.codigo))),
				eq(codigoAcceso.tipo, datos.tipo),
				isNull(codigoAcceso.usadoEn),
				gt(codigoAcceso.caducaEn, ahora),
				eq(usuario.telefono, datos.telefono),
				eq(usuario.estado, datos.estadoUsuario)
			)
		)
		.returning({ usuarioId: codigoAcceso.usuarioId });
	return fila?.usuarioId ?? null;
}
