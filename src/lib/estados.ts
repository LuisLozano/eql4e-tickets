// Presentación de los estados del ticket (guía visual, docs/diseno/README.md):
// color + icono + texto, siempre los tres (RNF-42).

export const ESTADOS_TICKET = [
	'pendiente_autorizar',
	'pendiente_pago',
	'pagado',
	'rechazado',
	'anulado'
] as const;

export type EstadoTicket = (typeof ESTADOS_TICKET)[number];

export const TEXTO_ESTADO: Record<EstadoTicket, string> = {
	pendiente_autorizar: 'Pendiente de autorizar',
	pendiente_pago: 'Pendiente de pago',
	pagado: 'Pagado',
	rechazado: 'Rechazado',
	anulado: 'Anulado'
};
