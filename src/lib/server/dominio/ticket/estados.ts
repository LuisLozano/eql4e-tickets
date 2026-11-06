// Ciclo de vida del ticket (docs/requisitos/03-estados.md). Puro: sin base de datos.
// Cualquier transición que no esté en la tabla se rechaza.
import type { EstadoTicket } from '#lib/estados.ts';

type Transicion = {
	desde: readonly EstadoTicket[];
	hasta: EstadoTicket;
	/** «socio»: solo el dueño del ticket. «tesorero»: un tesorero que no sea el dueño (R-04). */
	quien: 'socio' | 'tesorero';
	/** Exige motivo (T5, D1–D3). */
	motivo: boolean;
};

export const TRANSICIONES = {
	editar: {
		desde: ['pendiente_autorizar'],
		hasta: 'pendiente_autorizar',
		quien: 'socio',
		motivo: false
	},
	anular: {
		desde: ['pendiente_autorizar', 'rechazado'],
		hasta: 'anulado',
		quien: 'socio',
		motivo: false
	},
	reenviar: { desde: ['rechazado'], hasta: 'pendiente_autorizar', quien: 'socio', motivo: false },
	autorizar: {
		desde: ['pendiente_autorizar'],
		hasta: 'pendiente_pago',
		quien: 'tesorero',
		motivo: false
	},
	rechazar: { desde: ['pendiente_autorizar'], hasta: 'rechazado', quien: 'tesorero', motivo: true },
	pagar: { desde: ['pendiente_pago'], hasta: 'pagado', quien: 'tesorero', motivo: false },
	deshacer_autorizacion: {
		desde: ['pendiente_pago'],
		hasta: 'pendiente_autorizar',
		quien: 'tesorero',
		motivo: true
	},
	deshacer_rechazo: {
		desde: ['rechazado'],
		hasta: 'pendiente_autorizar',
		quien: 'tesorero',
		motivo: true
	},
	deshacer_pago: { desde: ['pagado'], hasta: 'pendiente_pago', quien: 'tesorero', motivo: true }
} as const satisfies Record<string, Transicion>;

export type AccionTicket = keyof typeof TRANSICIONES;

export type Actor = { id: string; esTesorero: boolean };

export type Comprobacion =
	| { ok: true; hasta: EstadoTicket }
	/** permiso: no le toca; propio: tesorero sobre su propio ticket (R-04); estado: no desde aquí. */
	| { ok: false; motivo: 'permiso' | 'propio' | 'estado' };

export function comprobarTransicion(
	accion: AccionTicket,
	actor: Actor,
	ticket: { socioId: string; estado: EstadoTicket }
): Comprobacion {
	const t: Transicion = TRANSICIONES[accion];
	const esDueno = actor.id === ticket.socioId;
	if (t.quien === 'socio' && !esDueno) return { ok: false, motivo: 'permiso' };
	if (t.quien === 'tesorero') {
		if (!actor.esTesorero) return { ok: false, motivo: 'permiso' };
		if (esDueno) return { ok: false, motivo: 'propio' };
	}
	if (!t.desde.includes(ticket.estado)) return { ok: false, motivo: 'estado' };
	return { ok: true, hasta: t.hasta };
}

/** Las acciones que el actor puede hacer ahora sobre el ticket, para pintar los botones. */
export function accionesPosibles(
	actor: Actor,
	ticket: { socioId: string; estado: EstadoTicket }
): AccionTicket[] {
	return (Object.keys(TRANSICIONES) as AccionTicket[]).filter(
		(a) => comprobarTransicion(a, actor, ticket).ok
	);
}
