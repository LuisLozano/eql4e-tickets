// Pagos (HU-T05): métodos y cómo se muestran.

export const METODOS_PAGO = ['bizum', 'transferencia', 'efectivo', 'otro'] as const;

export type MetodoPago = (typeof METODOS_PAGO)[number];

export const TEXTO_METODO: Record<MetodoPago, string> = {
	bizum: 'Bizum',
	transferencia: 'Transferencia',
	efectivo: 'Efectivo',
	otro: 'Otro'
};
