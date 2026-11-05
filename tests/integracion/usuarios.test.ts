import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';
import { activarCuenta } from '../../src/lib/server/dominio/auth/acceso.ts';
import { darDeAlta } from '../../src/lib/server/dominio/usuario/alta.ts';
import { listarUsuarios } from '../../src/lib/server/dominio/usuario/listado.ts';
import { codigoAcceso, usuario } from '../../src/lib/server/infra/db/esquema.ts';
import { conexionDePrueba } from './conexion.ts';
import { crearUsuario, telefonoNuevo } from './datos.ts';

const { db } = conexionDePrueba();
const DIA = 24 * 60 * 60 * 1000;
const ahora = new Date('2026-11-05T10:00:00Z');
const despues = (ms: number) => new Date(ahora.getTime() + ms);

/** Datos de alta únicos; el teléfono, en el formato en que lo escribe el tesorero. */
function datosNuevos(cambios: Partial<Parameters<typeof darDeAlta>[1]> = {}) {
	const telefono = telefonoNuevo();
	return {
		nombre: '  Socia Nueva ',
		telefono: `${telefono.slice(3, 6)} ${telefono.slice(6, 9)} ${telefono.slice(9)}`,
		email: `Nueva.${telefono.slice(1)}@Ejemplo.INVALID`,
		esSocio: true,
		esTesorero: false,
		...cambios
	};
}

describe('alta de usuario (HU-G01)', () => {
	it('crea un usuario invitado con los datos normalizados y una invitación de 7 días', async () => {
		const tesorero = await crearUsuario(db, { esTesorero: true });
		const datos = datosNuevos({ esTesorero: true });

		const r = await darDeAlta(db, datos, tesorero.id, ahora);
		if (!r.ok) throw new Error('el alta debía funcionar');
		expect(r.caducaEn).toEqual(despues(7 * DIA));
		expect(r.email).toBe(datos.email.toLowerCase());

		const [u] = await db.select().from(usuario).where(eq(usuario.id, r.usuarioId));
		expect(u).toMatchObject({
			nombre: 'Socia Nueva',
			telefono: `+34${datos.telefono.replaceAll(' ', '')}`,
			email: datos.email.toLowerCase(),
			estado: 'invitado',
			passwordHash: null,
			esSocio: true,
			esTesorero: true
		});

		const [c] = await db.select().from(codigoAcceso).where(eq(codigoAcceso.usuarioId, u.id));
		expect(c).toMatchObject({ tipo: 'activacion', creadoPor: tesorero.id, usadoEn: null });
	});

	it('el código de la invitación activa la cuenta', async () => {
		const tesorero = await crearUsuario(db, { esTesorero: true });
		const datos = datosNuevos();
		const r = await darDeAlta(db, datos, tesorero.id, ahora);
		if (!r.ok) throw new Error('el alta debía funcionar');

		const activada = await activarCuenta(
			db,
			{ telefono: datos.telefono, codigo: r.codigo, contrasena: 'una contraseña larga' },
			despues(DIA)
		);
		expect(activada).toMatchObject({ ok: true, esTesorero: false });
	});

	it('rechaza un teléfono ya registrado, aunque se escriba de otra forma', async () => {
		const tesorero = await crearUsuario(db, { esTesorero: true });
		const existente = await crearUsuario(db);
		const r = await darDeAlta(
			db,
			datosNuevos({ telefono: `0034 ${existente.telefono.slice(3)}` }),
			tesorero.id,
			ahora
		);
		expect(r).toEqual({ ok: false, campo: 'telefono', motivo: 'duplicado' });
	});

	it('rechaza un email ya registrado, sin distinguir mayúsculas', async () => {
		const tesorero = await crearUsuario(db, { esTesorero: true });
		const existente = await crearUsuario(db);
		const r = await darDeAlta(
			db,
			datosNuevos({ email: existente.email.toUpperCase() }),
			tesorero.id,
			ahora
		);
		expect(r).toEqual({ ok: false, campo: 'email', motivo: 'duplicado' });
	});

	it('rechaza un teléfono no válido sin tocar la base de datos', async () => {
		const tesorero = await crearUsuario(db, { esTesorero: true });
		const datos = datosNuevos({ telefono: '123' });
		const r = await darDeAlta(db, datos, tesorero.id, ahora);
		expect(r).toEqual({ ok: false, campo: 'telefono', motivo: 'invalido' });
		const filas = await db
			.select()
			.from(usuario)
			.where(eq(usuario.email, datos.email.toLowerCase()));
		expect(filas).toHaveLength(0);
	});
});

describe('listado de usuarios', () => {
	it('muestra la caducidad solo de las invitaciones vigentes', async () => {
		const tesorero = await crearUsuario(db, { esTesorero: true });
		const vigente = await darDeAlta(db, datosNuevos(), tesorero.id, ahora);
		const caducada = await darDeAlta(db, datosNuevos(), tesorero.id, despues(-8 * DIA));
		if (!vigente.ok || !caducada.ok) throw new Error('las altas debían funcionar');

		const lista = await listarUsuarios(db, ahora);
		const buscar = (id: string) => lista.find((u) => u.id === id);

		expect(buscar(vigente.usuarioId)).toMatchObject({
			estado: 'invitado',
			invitacionCaducaEn: vigente.caducaEn
		});
		expect(buscar(caducada.usuarioId)?.invitacionCaducaEn).toBeNull();
		expect(buscar(tesorero.id)).toMatchObject({ estado: 'activo', invitacionCaducaEn: null });
	});
});
