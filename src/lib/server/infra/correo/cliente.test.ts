import { describe, expect, it } from 'vitest';
import { correoConsola, crearCorreo } from './cliente';

const mensaje = {
	para: 'ana@ejemplo.invalid',
	asunto: 'Hola',
	texto: 'Enlace: X',
	html: '<p>X</p>'
};

describe('correo', () => {
	it('en modo consola escribe el correo y no lo envía', async () => {
		const lineas: string[] = [];
		const correo = correoConsola((t) => lineas.push(t));
		await correo.enviar(mensaje);
		expect(correo.envia).toBe(false);
		expect(lineas.join('\n')).toContain('Para: ana@ejemplo.invalid');
		expect(lineas.join('\n')).toContain('Enlace: X');
	});

	it('el modo por defecto de crearCorreo es la consola', () => {
		expect(crearCorreo({ modo: 'consola', puerto: 587 }).envia).toBe(false);
	});

	it('en modo smtp sin configuración, cada envío falla diciendo qué falta', async () => {
		const correo = crearCorreo({ modo: 'smtp', puerto: 587, host: 'smtp.ejemplo.invalid' });
		expect(correo.envia).toBe(true);
		await expect(correo.enviar(mensaje)).rejects.toThrow(
			'CORREO_MODO=smtp necesita SMTP_USER, SMTP_PASS, SMTP_FROM'
		);
	});

	it('en modo smtp con configuración crea el transporte sin conectar', () => {
		const correo = crearCorreo({
			modo: 'smtp',
			host: 'smtp.ejemplo.invalid',
			puerto: 465,
			usuario: 'u',
			contrasena: 'p',
			remitente: 'Tickets <t@ejemplo.invalid>'
		});
		expect(correo.envia).toBe(true);
	});
});
