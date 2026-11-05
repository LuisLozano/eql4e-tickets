import { describe, expect, it } from 'vitest';
import { esquemaAlta } from './usuario';

const valido = { nombre: 'Ana', telefono: '612 345 678', email: 'ana@ejemplo.com' };

describe('esquemaAlta', () => {
	it('por defecto da el rol de socio', () => {
		expect(esquemaAlta.parse(valido)).toMatchObject({ esSocio: true, esTesorero: false });
	});

	it('exige al menos un rol', () => {
		const r = esquemaAlta.safeParse({ ...valido, esSocio: false, esTesorero: false });
		expect(r.error?.issues[0]).toMatchObject({
			path: ['esSocio'],
			message: 'Marca al menos un rol.'
		});
	});

	it.each([
		['telefono', '123', 'El teléfono no es válido.'],
		['email', 'no-es-email', 'El email no es válido.'],
		['nombre', '   ', 'Escribe el nombre.']
	])('rechaza %s = «%s»', (campo, valor, mensaje) => {
		const r = esquemaAlta.safeParse({ ...valido, [campo]: valor });
		expect(r.error?.issues.map((i) => i.message)).toContain(mensaje);
	});
});
