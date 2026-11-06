import { describe, expect, it } from 'vitest';
import {
	FILTROS_INICIALES,
	centimosATexto,
	consulta,
	estadoCambiado,
	filtrosActivos,
	leerFiltros,
	ordenarPor
} from './listado-tickets';

const leer = (texto: string) => leerFiltros(new URLSearchParams(texto));
const SOCIO = '0b8e2f6a-1c3d-4e5f-8a9b-0c1d2e3f4a5b';

describe('leerFiltros', () => {
	it('sin parámetros: por estado, ascendente, página 1', () => {
		expect(leer('')).toEqual(FILTROS_INICIALES);
	});

	it('lee todos los filtros', () => {
		expect(
			leer(
				`estado=rechazado&estado=pendiente_autorizar&concepto=3&socio=${SOCIO.toUpperCase()}` +
					'&desde=2026-10-01&hasta=2026-11-04&min=20&max=99,5&orden=importe&dir=desc&pagina=3'
			)
		).toEqual({
			// En el orden de los estados, no en el de la URL.
			estados: ['pendiente_autorizar', 'rechazado'],
			concepto: 3,
			socio: SOCIO,
			desde: '2026-10-01',
			hasta: '2026-11-04',
			min: 2000,
			max: 9950,
			orden: 'importe',
			dir: 'desc',
			pagina: 3
		});
	});

	it('sin estado, los pendientes de autorizar; «todos», ninguno filtrado', () => {
		expect(leer('').estados).toEqual(['pendiente_autorizar']);
		expect(leer('estado=todos').estados).toEqual([]);
		// Si además se marca alguno (el formulario sin JavaScript envía los dos), manda el marcado.
		expect(leer('estado=todos&estado=rechazado').estados).toEqual(['rechazado']);
	});

	it('«otro» es el concepto de texto libre', () => {
		expect(leer('concepto=otro').concepto).toBe('otro');
	});

	it('ignora lo que no entiende, sin error', () => {
		expect(
			leer(
				'estado=borrado&concepto=0&socio=12&desde=2026-02-31&hasta=ayer&min=-3&max=abc' +
					'&orden=color&dir=arriba&pagina=0'
			)
		).toEqual(FILTROS_INICIALES);
		expect(leer('concepto=1e3&pagina=2.5')).toEqual(FILTROS_INICIALES);
	});
});

describe('consulta', () => {
	it('vacía con los valores por defecto', () => {
		expect(consulta(FILTROS_INICIALES)).toBe('');
	});

	it('ida y vuelta: lo que escribe se lee igual', () => {
		const texto =
			`?estado=pendiente_autorizar&estado=rechazado&concepto=otro&socio=${SOCIO}` +
			'&desde=2026-10-01&hasta=2026-11-04&min=20&max=99%2C50&orden=socio&dir=asc&pagina=2';
		expect(consulta(leer(texto.slice(1)))).toBe(texto);
	});

	it('el estado por defecto no se escribe; ninguno es «todos»', () => {
		expect(consulta({ ...FILTROS_INICIALES, estados: ['pendiente_autorizar'] })).toBe('');
		expect(consulta({ ...FILTROS_INICIALES, estados: [] })).toBe('?estado=todos');
		expect(consulta(leer('estado=todos'))).toBe('?estado=todos');
	});

	it('el orden por defecto en descendente sí se escribe', () => {
		expect(consulta({ ...FILTROS_INICIALES, dir: 'desc' })).toBe('?orden=estado&dir=desc');
	});
});

describe('centimosATexto', () => {
	it.each([
		[2000, '20'],
		[2050, '20,50'],
		[5, '0,05']
	])('%i → %s', (c, texto) => {
		expect(centimosATexto(c)).toBe(texto);
	});
});

describe('filtrosActivos', () => {
	it('cuenta los rangos una sola vez y no cuenta estado, orden ni página', () => {
		expect(filtrosActivos(FILTROS_INICIALES)).toBe(0);
		expect(filtrosActivos(leer('estado=pagado&desde=2026-01-01&hasta=2026-02-01&max=5'))).toBe(2);
		expect(filtrosActivos(leer(`concepto=2&socio=${SOCIO}&hasta=2026-02-01&min=1`))).toBe(4);
		expect(filtrosActivos(leer('orden=importe&pagina=4'))).toBe(0);
	});
});

describe('estadoCambiado', () => {
	it('solo si no es el de por defecto', () => {
		expect(estadoCambiado(FILTROS_INICIALES)).toBe(false);
		expect(estadoCambiado(leer('estado=todos'))).toBe(true);
		expect(estadoCambiado(leer('estado=pendiente_autorizar&estado=pagado'))).toBe(true);
	});
});

describe('ordenarPor', () => {
	it('la misma columna invierte el sentido; otra empieza ascendente; vuelve a la página 1', () => {
		const pagina3 = { ...FILTROS_INICIALES, pagina: 3 };
		expect(ordenarPor(pagina3, 'estado')).toMatchObject({
			orden: 'estado',
			dir: 'desc',
			pagina: 1
		});
		expect(ordenarPor({ ...pagina3, dir: 'desc' }, 'estado')).toMatchObject({ dir: 'asc' });
		expect(ordenarPor({ ...pagina3, dir: 'desc' }, 'importe')).toMatchObject({
			orden: 'importe',
			dir: 'asc',
			pagina: 1
		});
	});
});
