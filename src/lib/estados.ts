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

/** Lo que se ve en el historial de un ticket por cada acción. */
export const TEXTO_ACCION = {
	crear: 'Enviado',
	editar: 'Editado',
	anular: 'Anulado',
	reenviar: 'Corregido y reenviado',
	autorizar: 'Autorizado',
	rechazar: 'Rechazado',
	pagar: 'Pagado',
	deshacer_autorizacion: 'Autorización deshecha',
	deshacer_rechazo: 'Rechazo deshecho',
	deshacer_pago: 'Pago deshecho'
} as const;

export type AccionHistorial = keyof typeof TEXTO_ACCION;
