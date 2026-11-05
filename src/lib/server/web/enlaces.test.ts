import { describe, expect, it } from 'vitest';
import { enlaceActivacion } from './enlaces';

describe('enlaceActivacion', () => {
	it('parte de la URL pública, sin importar su ruta', () => {
		expect(enlaceActivacion('https://tickets.example/otra/', 'AAAA-BBBB')).toBe(
			'https://tickets.example/activar?codigo=AAAA-BBBB'
		);
	});
});
