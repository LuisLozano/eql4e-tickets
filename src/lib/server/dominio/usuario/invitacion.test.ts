import { describe, expect, it } from 'vitest';
import { mensajeInvitacion, mensajeRestablecimiento } from './invitacion';

describe('mensajeInvitacion', () => {
	const m = mensajeInvitacion({
		nombre: 'Ana <b>& "Co"',
		enlace: 'https://t.example/activar?codigo=AAAA-BBBB&x=1',
		caducaEn: new Date('2026-11-12T10:00:00Z')
	});

	it('lleva el enlace y la caducidad en el texto', () => {
		expect(m.texto).toContain('https://t.example/activar?codigo=AAAA-BBBB&x=1');
		expect(m.texto).toContain('caduca el 12/11/2026');
	});

	it('escapa el HTML del nombre y del enlace', () => {
		expect(m.html).toContain('Hola, Ana &lt;b&gt;&amp; &quot;Co&quot;:');
		expect(m.html).toContain('href="https://t.example/activar?codigo=AAAA-BBBB&amp;x=1"');
		expect(m.html).not.toContain('<b>&');
	});

	it('a un usuario ya activo le explica que es para elegir otra contraseña (HU-G02)', () => {
		const r = mensajeInvitacion({
			nombre: 'Ana',
			enlace: 'https://t.example/activar?codigo=CCCC-DDDD',
			caducaEn: new Date('2026-11-12T10:00:00Z'),
			restablecer: true
		});
		expect(r.asunto).toBe('Elige una contraseña nueva en EQL4E Tickets');
		expect(r.texto).toContain('la anterior dejará de valer');
		expect(r.texto).not.toContain('Te han dado de alta');
		expect(r.html).toContain('>Elegir contraseña</a>');
	});
});

describe('mensajeRestablecimiento (HU-A04)', () => {
	const m = mensajeRestablecimiento({
		nombre: 'Ana <b>',
		enlace: 'https://t.example/restablecer/AAAA-BBBB',
		caducaEn: new Date('2026-11-05T11:00:00Z')
	});

	it('lleva el enlace, la caducidad en hora de Madrid y qué hacer si no lo pidió', () => {
		expect(m.asunto).toBe('Elige una contraseña nueva en EQL4E Tickets');
		expect(m.texto).toContain('https://t.example/restablecer/AAAA-BBBB');
		expect(m.texto).toContain('caduca el 05/11/2026 12:00');
		expect(m.texto).toContain('Si no lo has pedido tú');
	});

	it('escapa el nombre en el HTML', () => {
		expect(m.html).toContain('Hola, Ana &lt;b&gt;:');
		expect(m.html).toContain('href="https://t.example/restablecer/AAAA-BBBB"');
	});
});
