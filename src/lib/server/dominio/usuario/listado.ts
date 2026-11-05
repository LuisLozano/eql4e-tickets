// Listado de usuarios para la gestión (HU-G03, mínimo en el Sprint 1).
import { and, asc, eq, gt, isNull, max } from 'drizzle-orm';
import { codigoAcceso, usuario } from '#lib/server/infra/db/esquema.ts';
import type { Conexion } from '#lib/server/infra/db/tipos.ts';

/** Todos los usuarios por nombre. `invitacionCaducaEn`: la invitación vigente, si la hay. */
export async function listarUsuarios(conexion: Conexion, ahora: Date) {
	const vigentes = conexion
		.select({
			usuarioId: codigoAcceso.usuarioId,
			caducaEn: max(codigoAcceso.caducaEn).as('caduca_en')
		})
		.from(codigoAcceso)
		.where(
			and(
				eq(codigoAcceso.tipo, 'activacion'),
				isNull(codigoAcceso.usadoEn),
				gt(codigoAcceso.caducaEn, ahora)
			)
		)
		.groupBy(codigoAcceso.usuarioId)
		.as('vigentes');

	return conexion
		.select({
			id: usuario.id,
			nombre: usuario.nombre,
			telefono: usuario.telefono,
			email: usuario.email,
			esSocio: usuario.esSocio,
			esTesorero: usuario.esTesorero,
			estado: usuario.estado,
			invitacionCaducaEn: vigentes.caducaEn
		})
		.from(usuario)
		.leftJoin(vigentes, eq(vigentes.usuarioId, usuario.id))
		.orderBy(asc(usuario.nombre));
}

export type UsuarioListado = Awaited<ReturnType<typeof listarUsuarios>>[number];
