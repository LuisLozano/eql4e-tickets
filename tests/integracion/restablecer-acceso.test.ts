// scripts/restablecer-acceso.js repite la creación de códigos del dominio: aquí se comprueba que la
// app acepta sus enlaces, para que no se desincronicen.
import { eq } from 'drizzle-orm';
import { describe, expect, inject, it } from 'vitest';
import { normalizarTelefono, restablecerAcceso } from '../../scripts/restablecer-acceso.js';
import {
	activarCuenta,
	iniciarSesion,
	restablecerContrasena
} from '../../src/lib/server/dominio/auth/acceso.ts';
import { usuario } from '../../src/lib/server/infra/db/esquema.ts';
import { conexionDePrueba } from './conexion.ts';
import { crearUsuario } from './datos.ts';

const { db } = conexionDePrueba();
const url = inject('databaseUrl');
const URL_PUBLICA = 'https://tickets.example';
const ahora = new Date('2026-11-05T10:00:00Z');
const despues = (ms: number) => new Date(ahora.getTime() + ms);
const HORA = 60 * 60 * 1000;

describe('normalizarTelefono del script', () => {
	it.each([
		['600 123 456', '+34600123456'],
		['0034 600-123-456', '+34600123456'],
		['+34 600 123 456', '+34600123456'],
		['+44 7911 123456', '+447911123456']
	])('%s → %s', (entrada, esperado) => {
		expect(normalizarTelefono(entrada)).toBe(esperado);
	});

	it.each(['12345', 'hola', ''])('rechaza «%s»', (entrada) => {
		expect(normalizarTelefono(entrada)).toBeNull();
	});
});

describe('restablecer el acceso desde el servidor', () => {
	it('a un activo le da un enlace de 1 hora que la app acepta; la contraseña vale hasta usarlo', async () => {
		const u = await crearUsuario(db, { esTesorero: true, contrasena: 'la que se ha olvidado' });
		await db
			.update(usuario)
			.set({ intentosFallidos: 0, bloqueadoHasta: despues(HORA) })
			.where(eq(usuario.id, u.id));

		const r = await restablecerAcceso(url, u.telefono.slice(3), URL_PUBLICA, ahora);
		expect(r).toMatchObject({
			ok: true,
			tipo: 'restablecer',
			persona: { nombre: u.nombre, esSocio: true, esTesorero: true },
			caducaEn: despues(HORA)
		});
		if (!r.ok) return;
		const codigo = /^https:\/\/tickets\.example\/restablecer\/([A-Z2-7-]+)$/.exec(r.enlace)![1];

		const datos = { telefono: u.telefono, codigo, contrasena: 'la nueva y larga' };
		expect(await restablecerContrasena(db, datos, despues(2 * HORA))).toMatchObject({ ok: false });
		expect(await restablecerContrasena(db, datos, despues(HORA / 2))).toMatchObject({
			ok: true,
			esTesorero: true
		});
		// Quita el bloqueo y la contraseña nueva es la que vale.
		expect(
			await iniciarSesion(
				db,
				{ telefono: u.telefono, contrasena: 'la nueva y larga' },
				despues(HORA / 2)
			)
		).toMatchObject({ ok: true });
	});

	it('un enlace nuevo invalida el anterior', async () => {
		const u = await crearUsuario(db);
		const primero = await restablecerAcceso(url, u.telefono, URL_PUBLICA, ahora);
		const segundo = await restablecerAcceso(url, u.telefono, URL_PUBLICA, ahora);
		if (!primero.ok || !segundo.ok) throw new Error('debería haber dado enlace');
		const codigoDe = (enlace: string) => enlace.split('/').pop()!;
		const datos = { telefono: u.telefono, contrasena: 'la nueva y larga' };
		expect(
			await restablecerContrasena(db, { ...datos, codigo: codigoDe(primero.enlace) }, ahora)
		).toMatchObject({ ok: false });
		expect(
			await restablecerContrasena(db, { ...datos, codigo: codigoDe(segundo.enlace) }, ahora)
		).toMatchObject({ ok: true });
	});

	it('a un invitado le da una invitación de 7 días que la app acepta', async () => {
		const u = await crearUsuario(db, { estado: 'invitado' });
		const r = await restablecerAcceso(url, u.telefono, URL_PUBLICA, ahora);
		expect(r).toMatchObject({ ok: true, tipo: 'activacion', caducaEn: despues(7 * 24 * HORA) });
		if (!r.ok) return;
		const enlace = new URL(r.enlace);
		expect(enlace.pathname).toBe('/activar');
		const codigo = enlace.searchParams.get('codigo')!;
		expect(
			await activarCuenta(
				db,
				{ telefono: u.telefono, codigo, contrasena: 'la nueva y larga' },
				ahora
			)
		).toMatchObject({ ok: true });
	});

	it('no hace nada con uno de baja, un teléfono que no existe o uno no válido', async () => {
		const u = await crearUsuario(db, { estado: 'baja' });
		expect(await restablecerAcceso(url, u.telefono, URL_PUBLICA, ahora)).toEqual({
			ok: false,
			motivo: 'baja',
			persona: { nombre: u.nombre, esSocio: true, esTesorero: false }
		});
		expect(await restablecerAcceso(url, '+34699999999', URL_PUBLICA, ahora)).toEqual({
			ok: false,
			motivo: 'no_existe'
		});
		expect(await restablecerAcceso(url, '123', URL_PUBLICA, ahora)).toEqual({
			ok: false,
			motivo: 'telefono'
		});
	});
});
