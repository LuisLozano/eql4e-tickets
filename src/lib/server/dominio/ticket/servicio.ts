// Casos de uso que cambian el estado de un ticket (docs/requisitos/03-estados.md). Cada cambio va en
// una transacción: comprueba permisos y versión, cambia el estado y deja su entrada en el historial.
import { eq, sql } from 'drizzle-orm';
import type { EstadoTicket } from '#lib/estados.ts';
import { MOTIVO_MAXIMO, MOTIVO_MINIMO } from '#lib/esquemas/revision.ts';
import { historial, ticket } from '#lib/server/infra/db/esquema.ts';
import type { Conexion } from '#lib/server/infra/db/tipos.ts';
import { TRANSICIONES, comprobarTransicion, type AccionTicket, type Actor } from './estados.ts';
import { puedeVerTicket } from './permisos.ts';

/**
 * Las que no cambian los datos del ticket, solo su estado. Editar y reenviar van aparte, y pagar y
 * deshacer el pago también: actúan sobre el Pago completo (E-02, E-03).
 */
export type AccionDeEstado = Exclude<
	AccionTicket,
	'editar' | 'reenviar' | 'pagar' | 'deshacer_pago'
>;

export type ResultadoCambio =
	| { ok: true; estado: EstadoTicket; version: number }
	| {
			ok: false;
			/**
			 * no_encontrado: no existe o no lo puede ver (R-01); modificado: alguien lo cambió desde que se
			 * cargó (E-04); el resto, los de comprobarTransicion y un motivo que falta o sobra de largo.
			 */
			motivo: 'no_encontrado' | 'modificado' | 'permiso' | 'propio' | 'estado' | 'motivo';
	  };

export async function cambiarEstado(
	conexion: Conexion,
	actor: Actor,
	numero: number,
	accion: AccionDeEstado,
	datos: { version: number; motivo?: string },
	ahora: Date
): Promise<ResultadoCambio> {
	const motivo = datos.motivo?.trim() || null;
	if (TRANSICIONES[accion].motivo) {
		if (!motivo || motivo.length < MOTIVO_MINIMO || motivo.length > MOTIVO_MAXIMO) {
			return { ok: false, motivo: 'motivo' };
		}
	}

	return conexion.transaction(async (tx) => {
		const [t] = await tx
			.select({
				id: ticket.id,
				socioId: ticket.socioId,
				estado: ticket.estado,
				version: ticket.version
			})
			.from(ticket)
			.where(eq(ticket.numero, numero))
			.for('update');
		if (!t || !puedeVerTicket(actor, t)) return { ok: false, motivo: 'no_encontrado' };

		const comprobacion = comprobarTransicion(accion, actor, t);
		if (!comprobacion.ok && comprobacion.motivo !== 'estado') return comprobacion;
		// Si otro lo ha tocado, eso es lo que hay que contar, aunque además ya no se pueda desde aquí.
		if (t.version !== datos.version) return { ok: false, motivo: 'modificado' };
		if (!comprobacion.ok) return comprobacion;

		const hasta = comprobacion.hasta;
		const [nuevo] = await tx
			.update(ticket)
			.set({
				estado: hasta,
				version: sql`${ticket.version} + 1`,
				actualizadoEn: ahora,
				...(accion === 'rechazar' ? { motivoRechazo: motivo } : {})
			})
			.where(eq(ticket.id, t.id))
			.returning({ version: ticket.version });
		await tx.insert(historial).values({
			ticketId: t.id,
			usuarioId: actor.id,
			accion,
			estadoOrigen: t.estado,
			estadoDestino: hasta,
			motivo: TRANSICIONES[accion].motivo ? motivo : null,
			creadoEn: ahora
		});
		return { ok: true, estado: hasta, version: nuevo.version };
	});
}
