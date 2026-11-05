// Formatos de la guía visual (docs/diseno): importes, fechas y números de ticket.

const euros = new Intl.NumberFormat('es-ES', {
	style: 'currency',
	currency: 'EUR',
	useGrouping: 'always'
});
const fecha = new Intl.DateTimeFormat('es-ES', {
	day: '2-digit',
	month: '2-digit',
	year: 'numeric',
	timeZone: 'Europe/Madrid'
});

/** 123456 → "1.234,56 €" */
export function formatoImporte(centimos: number): string {
	return euros.format(centimos / 100);
}

/** → "04/11/2026" */
export function formatoFecha(valor: Date): string {
	return fecha.format(valor);
}

/** 150 → "T-000150" */
export function formatoNumeroTicket(numero: number): string {
	return `T-${String(numero).padStart(6, '0')}`;
}

const dia = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid' });

/** La fecha de hoy en Madrid, como la usa un `<input type="date">`: "2026-11-05". */
export function hoyEnMadrid(ahora = new Date()): string {
	return dia.format(ahora);
}
