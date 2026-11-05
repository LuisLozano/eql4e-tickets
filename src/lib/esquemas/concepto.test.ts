import { describe, expect, it } from 'vitest';
import { esquemaCrear, esquemaRenombrar } from './concepto.ts';

describe('esquemaCrear', () => {
	it('quita los espacios sobrantes', () => {
		expect(esquemaCrear.parse({ nombre: '  Imprenta ' })).toEqual({ nombre: 'Imprenta' });
	});

	it.each([
		['', 'Escribe el nombre.'],
		['   ', 'Escribe el nombre.'],
		['x'.repeat(51), 'Máximo 50 caracteres.'],
		[' OTRO ', '«Otro» ya existe: es la opción para lo que no encaja en ningún concepto.']
	])('rechaza «%s»', (entrada, mensaje) => {
		const r = esquemaCrear.safeParse({ nombre: entrada });
		expect(r.error?.issues[0].message).toBe(mensaje);
	});

	it('admite 50 caracteres y nombres que contienen «otro»', () => {
		expect(esquemaCrear.safeParse({ nombre: 'x'.repeat(50) }).success).toBe(true);
		expect(esquemaCrear.safeParse({ nombre: 'Otros gastos' }).success).toBe(true);
	});
});

describe('esquemaRenombrar', () => {
	it('convierte el id del formulario en número', () => {
		expect(esquemaRenombrar.parse({ id: '3', nombre: 'Imprenta' })).toEqual({
			id: 3,
			nombre: 'Imprenta'
		});
	});

	it.each(['0', 'abc', '1.5'])('rechaza el id «%s»', (id) => {
		expect(esquemaRenombrar.safeParse({ id, nombre: 'Imprenta' }).success).toBe(false);
	});
});
