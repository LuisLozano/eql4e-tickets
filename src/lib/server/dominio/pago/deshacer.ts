// Deshacer un pago (HU-T06, D3): actúa sobre el Pago completo (E-03). Todos sus tickets vuelven a
// Pendiente de pago y el Pago queda marcado como anulado, sin borrarse. Con motivo obligatorio.
import { eq, sql } from 'drizzle-orm';
import { MOTIVO_MAXIMO, MOTIVO_MINIMO } from '#lib/esquemas/revision.ts';
import { historial, pago, ticket } from '#lib/server/infra/db/esquema.ts';
import type { Conexion } from '#lib/server/infra/db/tipos.ts';
import { comprobarTransicion, type Actor } from '../ticket/estados.ts';

export type ResultadoDeshacerPago =
	| { ok: true; tickets: number }
	| {
			ok: false;
			/**
			 * no_encontrado: no existe o no es tesorero; modificado: ya estaba deshecho (E-04); propio:
			 * el pago es al propio tesorero (R-04); motivo: falta o sobra de largo.
			 */
			motivo: 'no_encontrado' | 'modificado' | 'propio' | 'motivo';
	  };

export async function deshacerPago(
	conexion: Conexion,
	actor: Actor,
	pagoId: string,
	motivoEscrito: string,
	ahora: Date
): Promise<ResultadoDeshacerPago> {
	if (!actor.esTesorero) return { ok: false, motivo: 'no_encontrado' };
	const motivo = motivoEscrito.trim();
	if (motivo.length < MOTIVO_MINIMO || motivo.length > MOTIVO_MAXIMO) {
		return { ok: false, motivo: 'motivo' };
	}

	return conexion.transaction(async (tx) => {
		const [p] = await tx
			.select({ id: pago.id, socioId: pago.socioId, anuladoEn: pago.anuladoEn })
			.from(pago)
			.where(eq(pago.id, pagoId))
			.for('update');
		if (!p) return { ok: false, motivo: 'no_encontrado' };
		if (p.socioId === actor.id) return { ok: false, motivo: 'propio' };
		if (p.anuladoEn) return { ok: false, motivo: 'modificado' };

		const tickets = await tx
			.select({ id: ticket.id, socioId: ticket.socioId, estado: ticket.estado })
			.from(ticket)
			.where(eq(ticket.pagoId, p.id))
			.for('update');
		// Mientras el pago esté vigente, sus tickets están en Pagado (ticket_pagado_con_pago).
		for (const t of tickets) {
			if (!comprobarTransicion('deshacer_pago', actor, t).ok) {
				return { ok: false, motivo: 'modificado' };
			}
		}

		await tx
			.update(pago)
			.set({ anuladoEn: ahora, anuladoPor: actor.id, motivoAnulacion: motivo })
			.where(eq(pago.id, p.id));
		await tx
			.update(ticket)
			.set({
				estado: 'pendiente_pago',
				pagoId: null,
				version: sql`${ticket.version} + 1`,
				actualizadoEn: ahora
			})
			.where(eq(ticket.pagoId, p.id));
		if (tickets.length) {
			await tx.insert(historial).values(
				tickets.map((t) => ({
					ticketId: t.id,
					usuarioId: actor.id,
					accion: 'deshacer_pago' as const,
					estadoOrigen: t.estado,
					estadoDestino: 'pendiente_pago' as const,
					motivo,
					pagoId: p.id,
					creadoEn: ahora
				}))
			);
		}
		return { ok: true, tickets: tickets.length };
	});
}
