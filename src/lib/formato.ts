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

const fechaHora = new Intl.DateTimeFormat('es-ES', {
	day: '2-digit',
	month: '2-digit',
	year: 'numeric',
	hour: '2-digit',
	minute: '2-digit',
	timeZone: 'Europe/Madrid'
});

/** → "06/11/2026 07:15" (hora de Madrid) */
export function formatoFechaHora(valor: Date): string {
	return fechaHora.format(valor).replace(',', '');
}

/** "2026-11-02" (columna `date`) → "02/11/2026", sin pasar por zonas horarias. */
export function formatoDia(dia: string): string {
	const [anio, mes, d] = dia.split('-');
	return `${d}/${mes}/${anio}`;
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

const tamano = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 1 });

/** 4404019 → "4,2 MB"; 389120 → "380 KB" */
export function formatoTamano(bytes: number): string {
	if (bytes >= 1024 * 1024) return `${tamano.format(bytes / 1024 / 1024)} MB`;
	return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}
