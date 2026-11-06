// Listado de usuarios y ficha de uno para la gestión (HU-G03).
import { and, asc, eq, gt, isNull, max } from 'drizzle-orm';
import { codigoAcceso, usuario } from '#lib/server/infra/db/esquema.ts';
import type { Conexion } from '#lib/server/infra/db/tipos.ts';
import { TESORERO_INICIAL } from '../auth/tesorero-inicial.ts';

/** Los usuarios por nombre (o solo uno). `invitacionCaducaEn`: la invitación vigente, si la hay. */
function consulta(conexion: Conexion, ahora: Date, id?: string) {
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
		.where(id ? eq(usuario.id, id) : undefined)
		.orderBy(asc(usuario.nombre));
}

export const listarUsuarios = (conexion: Conexion, ahora: Date) => consulta(conexion, ahora);

export type UsuarioListado = Awaited<ReturnType<typeof listarUsuarios>>[number];

/** Un usuario, con su invitación vigente y si tiene los datos ficticios del tesorero inicial. */
export async function fichaUsuario(conexion: Conexion, id: string, ahora: Date) {
	const [u] = await consulta(conexion, ahora, id);
	if (!u) return null;
	return {
		...u,
		ficticio: u.telefono === TESORERO_INICIAL.telefono || u.email === TESORERO_INICIAL.email
	};
}
