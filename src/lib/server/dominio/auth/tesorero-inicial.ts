// Tesorero inicial (R-06, decidido 2026-11-05): si no hay ningún tesorero activo, se asegura que
// existe un «Tesorero inicial» con datos ficticios y se genera un código para activarlo.
// Ninguna contraseña está en el repositorio: quien lea el log (con sudo) elige la suya al activar.
import { and, eq } from 'drizzle-orm';
import { usuario } from '#lib/server/infra/db/esquema.ts';
import type { Conexion } from '#lib/server/infra/db/tipos.ts';
import { crearCodigo } from './codigos.ts';

export const TESORERO_INICIAL = {
	nombre: 'Tesorero inicial',
	telefono: '+34600000000',
	email: 'tesorero@ejemplo.invalid'
} as const;

/** Devuelve el código de activación, o nulo si ya hay un tesorero activo. */
export async function asegurarTesoreroInicial(conexion: Conexion, ahora: Date) {
	return conexion.transaction(async (tx) => {
		const [activo] = await tx
			.select({ id: usuario.id })
			.from(usuario)
			.where(and(eq(usuario.esTesorero, true), eq(usuario.estado, 'activo')))
			.limit(1);
		if (activo) return null;

		const [existente] = await tx
			.select({ id: usuario.id })
			.from(usuario)
			.where(eq(usuario.telefono, TESORERO_INICIAL.telefono));
		const usuarioId =
			existente?.id ??
			(
				await tx
					.insert(usuario)
					.values({ ...TESORERO_INICIAL, esSocio: false, esTesorero: true })
					.returning({ id: usuario.id })
			)[0].id;

		const { codigo } = await crearCodigo(
			tx,
			{ usuarioId, tipo: 'activacion', creadoPor: null },
			ahora
		);
		return { codigo, telefono: TESORERO_INICIAL.telefono };
	});
}
