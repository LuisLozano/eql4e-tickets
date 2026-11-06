import { describe, expect, it } from 'vitest';
import { ESTADOS_TICKET, type EstadoTicket } from '#lib/estados.ts';
import {
	TRANSICIONES,
	accionesPosibles,
	comprobarTransicion,
	type AccionTicket
} from './estados.ts';

const SOCIO = { id: 'socio', esTesorero: false };
const TESORERO = { id: 'tesorero', esTesorero: true };
const deSocio = (estado: EstadoTicket) => ({ socioId: SOCIO.id, estado });

// La tabla de docs/requisitos/03-estados.md, escrita a mano: desde → acción → hasta.
const PERMITIDAS: [EstadoTicket, AccionTicket, EstadoTicket][] = [
	['pendiente_autorizar', 'editar', 'pendiente_autorizar'], // T2
	['pendiente_autorizar', 'anular', 'anulado'], // T3
	['pendiente_autorizar', 'autorizar', 'pendiente_pago'], // T4
	['pendiente_autorizar', 'rechazar', 'rechazado'], // T5
	['rechazado', 'reenviar', 'pendiente_autorizar'], // T6
	['rechazado', 'anular', 'anulado'], // T7
	['pendiente_pago', 'pagar', 'pagado'], // T8
	['pendiente_pago', 'deshacer_autorizacion', 'pendiente_autorizar'], // D1
	['rechazado', 'deshacer_rechazo', 'pendiente_autorizar'], // D2
	['pagado', 'deshacer_pago', 'pendiente_pago'] // D3
];

const actorDe = (a: AccionTicket) => (TRANSICIONES[a].quien === 'socio' ? SOCIO : TESORERO);

describe('comprobarTransicion', () => {
	it.each(PERMITIDAS)('%s —%s→ %s', (desde, accion, hasta) => {
		expect(comprobarTransicion(accion, actorDe(accion), deSocio(desde))).toEqual({
			ok: true,
			hasta
		});
	});

	it('cualquier otra combinación de estado y acción se rechaza', () => {
		for (const estado of ESTADOS_TICKET) {
			for (const accion of Object.keys(TRANSICIONES) as AccionTicket[]) {
				if (PERMITIDAS.some(([d, a]) => d === estado && a === accion)) continue;
				expect(comprobarTransicion(accion, actorDe(accion), deSocio(estado))).toEqual({
					ok: false,
					motivo: 'estado'
				});
			}
		}
	});

	it('Anulado es final: no sale de ahí', () => {
		expect(accionesPosibles(SOCIO, deSocio('anulado'))).toEqual([]);
		expect(accionesPosibles(TESORERO, deSocio('anulado'))).toEqual([]);
	});

	it('las acciones del socio, solo sobre sus tickets', () => {
		const otro = { id: 'otro', esTesorero: false };
		expect(comprobarTransicion('anular', otro, deSocio('pendiente_autorizar'))).toEqual({
			ok: false,
			motivo: 'permiso'
		});
		// Tampoco un tesorero sobre el ticket de otro.
		expect(comprobarTransicion('editar', TESORERO, deSocio('pendiente_autorizar'))).toEqual({
			ok: false,
			motivo: 'permiso'
		});
	});

	it('las del tesorero, solo un tesorero', () => {
		expect(comprobarTransicion('autorizar', SOCIO, deSocio('pendiente_autorizar'))).toEqual({
			ok: false,
			motivo: 'permiso'
		});
	});

	it('R-04: un tesorero no actúa sobre sus propios tickets, ni para deshacer', () => {
		const propio = (estado: EstadoTicket) => ({ socioId: TESORERO.id, estado });
		for (const [desde, accion] of PERMITIDAS.filter(
			([, a]) => TRANSICIONES[a].quien === 'tesorero'
		)) {
			expect(comprobarTransicion(accion, TESORERO, propio(desde))).toEqual({
				ok: false,
				motivo: 'propio'
			});
		}
		// Como socio de su ticket, sí puede anularlo.
		expect(comprobarTransicion('anular', TESORERO, propio('pendiente_autorizar')).ok).toBe(true);
	});

	it('el motivo se exige al rechazar y al deshacer', () => {
		const conMotivo = (Object.keys(TRANSICIONES) as AccionTicket[]).filter(
			(a) => TRANSICIONES[a].motivo
		);
		expect(conMotivo.sort()).toEqual(
			['deshacer_autorizacion', 'deshacer_pago', 'deshacer_rechazo', 'rechazar'].sort()
		);
	});
});

describe('accionesPosibles', () => {
	it('lo que ve cada uno sobre un ticket pendiente de autorizar', () => {
		expect(accionesPosibles(SOCIO, deSocio('pendiente_autorizar'))).toEqual(['editar', 'anular']);
		expect(accionesPosibles(TESORERO, deSocio('pendiente_autorizar'))).toEqual([
			'autorizar',
			'rechazar'
		]);
	});
});
