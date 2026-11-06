// Filtros, orden y página del listado global del tesorero (HU-T01). Viven en la URL para que cada
// vista se pueda guardar como marcador (docs/arquitectura/03-rutas.md). Un parámetro que no se
// entiende se ignora: un marcador antiguo nunca debe dar error.
import { ESTADOS_TICKET, type EstadoTicket } from './estados.ts';
import { importeACentimos } from './importe.ts';

export const ORDENES = ['estado', 'compra', 'socio', 'concepto', 'importe', 'enviado'] as const;
export type Orden = (typeof ORDENES)[number];
export type Direccion = 'asc' | 'desc';

export const TAMANO_PAGINA = 50;

export type FiltrosListado = {
	estados: EstadoTicket[];
	/** Id de concepto, u «otro» para los de texto libre. */
	concepto: number | 'otro' | null;
	socio: string | null;
	/** Fecha de compra, AAAA-MM-DD, ambos incluidos. */
	desde: string | null;
	hasta: string | null;
	/** Céntimos, ambos incluidos. */
	min: number | null;
	max: number | null;
	orden: Orden;
	dir: Direccion;
	pagina: number;
};

export const FILTROS_INICIALES: FiltrosListado = {
	estados: [],
	concepto: null,
	socio: null,
	desde: null,
	hasta: null,
	min: null,
	max: null,
	orden: 'estado',
	dir: 'asc',
	pagina: 1
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const esOrden = (v: string | null): v is Orden =>
	v !== null && (ORDENES as readonly string[]).includes(v);

function fecha(valor: string | null): string | null {
	if (!valor || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) return null;
	// Descarta el 31 de febrero y similares: Date lo pasaría al mes siguiente.
	const d = new Date(`${valor}T00:00:00Z`);
	return d.toISOString().slice(0, 10) === valor ? valor : null;
}

function concepto(valor: string | null): FiltrosListado['concepto'] {
	if (valor === 'otro') return 'otro';
	return valor && /^[1-9]\d{0,8}$/.test(valor) ? Number(valor) : null;
}

export function leerFiltros(params: URLSearchParams): FiltrosListado {
	const orden = params.get('orden');
	const pagina = Number(params.get('pagina'));
	return {
		estados: ESTADOS_TICKET.filter((e) => params.getAll('estado').includes(e)),
		concepto: concepto(params.get('concepto')),
		socio: UUID.test(params.get('socio') ?? '') ? params.get('socio')!.toLowerCase() : null,
		desde: fecha(params.get('desde')),
		hasta: fecha(params.get('hasta')),
		min: importeACentimos(params.get('min') ?? ''),
		max: importeACentimos(params.get('max') ?? ''),
		orden: esOrden(orden) ? orden : 'estado',
		dir: params.get('dir') === 'desc' ? 'desc' : 'asc',
		pagina: Number.isSafeInteger(pagina) && pagina > 1 ? pagina : 1
	};
}

/** 2000 → «20»; 2050 → «20,50». Lo que se vuelve a poner en el campo del filtro. */
export const centimosATexto = (c: number) =>
	c % 100 === 0 ? String(c / 100) : (c / 100).toFixed(2).replace('.', ',');

/** La parte «?…» de la URL, sin los valores por defecto. Vacía si todo está por defecto. */
export function consulta(filtros: FiltrosListado): string {
	const p = new URLSearchParams();
	for (const e of filtros.estados) p.append('estado', e);
	if (filtros.concepto !== null) p.set('concepto', String(filtros.concepto));
	if (filtros.socio) p.set('socio', filtros.socio);
	if (filtros.desde) p.set('desde', filtros.desde);
	if (filtros.hasta) p.set('hasta', filtros.hasta);
	if (filtros.min !== null) p.set('min', centimosATexto(filtros.min));
	if (filtros.max !== null) p.set('max', centimosATexto(filtros.max));
	if (filtros.orden !== 'estado' || filtros.dir !== 'asc') {
		p.set('orden', filtros.orden);
		p.set('dir', filtros.dir);
	}
	if (filtros.pagina > 1) p.set('pagina', String(filtros.pagina));
	const texto = p.toString();
	return texto ? `?${texto}` : '';
}

/** Cuántos filtros (no orden ni página) hay puestos: rango de fechas e importes cuentan uno cada uno. */
export function filtrosActivos(f: FiltrosListado): number {
	return [
		f.estados.length > 0,
		f.concepto !== null,
		f.socio !== null,
		f.desde !== null || f.hasta !== null,
		f.min !== null || f.max !== null
	].filter(Boolean).length;
}

/** Pulsar una cabecera: la misma columna invierte el sentido; otra empieza ascendente. Vuelve a la página 1. */
export function ordenarPor(f: FiltrosListado, orden: Orden): FiltrosListado {
	const dir: Direccion = f.orden === orden && f.dir === 'asc' ? 'desc' : 'asc';
	return { ...f, orden, dir, pagina: 1 };
}
