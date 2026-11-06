import { and, eq, isNull } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';
import { activarCuenta, iniciarSesion } from '../../src/lib/server/dominio/auth/acceso.ts';
import { crearSesion, validarSesion } from '../../src/lib/server/dominio/auth/sesiones.ts';
import { darDeAlta } from '../../src/lib/server/dominio/usuario/alta.ts';
import {
	darDeBaja,
	editarUsuario,
	reactivar,
	reenviarInvitacion
} from '../../src/lib/server/dominio/usuario/gestion.ts';
import { fichaUsuario, listarUsuarios } from '../../src/lib/server/dominio/usuario/listado.ts';
import { codigoAcceso, usuario } from '../../src/lib/server/infra/db/esquema.ts';
import type { Conexion } from '../../src/lib/server/infra/db/tipos.ts';
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

/** Los datos actuales de un usuario, como los mandaría el formulario de la ficha. */
const datosDe = (u: Awaited<ReturnType<typeof crearUsuario>>) => ({
	nombre: u.nombre,
	telefono: u.telefono,
	email: u.email,
	esSocio: u.esSocio,
	esTesorero: u.esTesorero
});

/**
 * Deja un único tesorero activo y prueba con él, en una transacción que se deshace: los demás
 * tesoreros de la base son de otras pruebas.
 */
async function conUnSoloTesorero(
	prueba: (tx: Conexion, tesorero: { id: string }) => Promise<void>
) {
	class Deshacer extends Error {}
	await expect(
		db.transaction(
			async (tx) => {
				await tx
					.update(usuario)
					.set({ esTesorero: false, esSocio: true })
					.where(and(eq(usuario.esTesorero, true), eq(usuario.estado, 'activo')));
				const tesorero = await crearUsuario(tx, { esTesorero: true });
				await prueba(tx, tesorero);
				throw new Deshacer();
				// Con una foto fija: así no ve a los tesoreros que crean a la vez otros ficheros de pruebas.
			},
			{ isolationLevel: 'repeatable read' }
		)
	).rejects.toBeInstanceOf(Deshacer);
}

describe('editar usuario (HU-G03)', () => {
	it('cambia nombre, teléfono, email y roles, normalizados', async () => {
		const u = await crearUsuario(db);
		const telefono = telefonoNuevo();
		const r = await editarUsuario(db, u.id, {
			nombre: ' Nombre Nuevo ',
			telefono: `${telefono.slice(3, 6)} ${telefono.slice(6)}`,
			email: `Nuevo.${telefono.slice(1)}@Ejemplo.INVALID`,
			esSocio: false,
			esTesorero: true
		});
		expect(r).toEqual({ ok: true });
		const [cambiado] = await db.select().from(usuario).where(eq(usuario.id, u.id));
		expect(cambiado).toMatchObject({
			nombre: 'Nombre Nuevo',
			telefono,
			email: `nuevo.${telefono.slice(1)}@ejemplo.invalid`,
			esSocio: false,
			esTesorero: true
		});
	});

	it('guardar sin cambios funciona: su teléfono y su email no chocan consigo mismos', async () => {
		const u = await crearUsuario(db);
		expect(await editarUsuario(db, u.id, datosDe(u))).toEqual({ ok: true });
	});

	it('rechaza el teléfono o el email de otro usuario, y un teléfono no válido', async () => {
		const u = await crearUsuario(db);
		const otro = await crearUsuario(db);
		expect(
			await editarUsuario(db, u.id, { ...datosDe(u), telefono: `0034${otro.telefono.slice(3)}` })
		).toEqual({ ok: false, campo: 'telefono', motivo: 'duplicado' });
		expect(
			await editarUsuario(db, u.id, { ...datosDe(u), email: otro.email.toUpperCase() })
		).toEqual({ ok: false, campo: 'email', motivo: 'duplicado' });
		expect(await editarUsuario(db, u.id, { ...datosDe(u), telefono: '123' })).toEqual({
			ok: false,
			campo: 'telefono',
			motivo: 'invalido'
		});
	});

	it('no quita el rol al último tesorero activo, pero sí si queda otro (R-03)', async () => {
		await conUnSoloTesorero(async (tx, tesorero) => {
			const [t] = await tx.select().from(usuario).where(eq(usuario.id, tesorero.id));
			const sinRol = { ...datosDe(t), esTesorero: false, esSocio: true };
			expect(await editarUsuario(tx, t.id, sinRol)).toEqual({
				ok: false,
				motivo: 'ultimo_tesorero'
			});

			// Un tesorero invitado no cuenta: todavía no puede entrar.
			await crearUsuario(tx, { esTesorero: true, estado: 'invitado' });
			expect(await editarUsuario(tx, t.id, sinRol)).toMatchObject({ ok: false });

			await crearUsuario(tx, { esTesorero: true });
			expect(await editarUsuario(tx, t.id, sinRol)).toEqual({ ok: true });
		});
	});

	it('no encuentra un usuario que no existe', async () => {
		const u = await crearUsuario(db);
		expect(
			await editarUsuario(db, '00000000-0000-4000-8000-000000000000', {
				...datosDe(u),
				telefono: telefonoNuevo(),
				email: 'nadie@ejemplo.invalid'
			})
		).toEqual({ ok: false, motivo: 'no_encontrado' });
	});
});

describe('baja y reactivación (HU-G03, R-05)', () => {
	it('la baja cierra sus sesiones, invalida sus códigos y le impide entrar', async () => {
		const tesorero = await crearUsuario(db, { esTesorero: true });
		const u = await crearUsuario(db, { contrasena: 'contraseña del socio' });
		const { token } = await crearSesion(db, u.id, ahora);
		await reenviarInvitacion(db, tesorero.id, u.id, ahora);

		expect(await darDeBaja(db, tesorero.id, u.id, ahora)).toEqual({ ok: true });
		expect(await validarSesion(db, token, ahora)).toBeNull();
		const pendientes = await db
			.select()
			.from(codigoAcceso)
			.where(and(eq(codigoAcceso.usuarioId, u.id), isNull(codigoAcceso.usadoEn)));
		expect(pendientes).toHaveLength(0);
		expect(
			await iniciarSesion(db, { telefono: u.telefono, contrasena: 'contraseña del socio' }, ahora)
		).toMatchObject({ ok: false });
		expect(await darDeBaja(db, tesorero.id, u.id, ahora)).toEqual({ ok: false, motivo: 'estado' });
	});

	it('nadie se da de baja a sí mismo', async () => {
		const tesorero = await crearUsuario(db, { esTesorero: true });
		expect(await darDeBaja(db, tesorero.id, tesorero.id, ahora)).toEqual({
			ok: false,
			motivo: 'propio'
		});
	});

	it('no da de baja al último tesorero activo (R-03)', async () => {
		await conUnSoloTesorero(async (tx, tesorero) => {
			const otro = await crearUsuario(tx);
			expect(await darDeBaja(tx, otro.id, tesorero.id, ahora)).toEqual({
				ok: false,
				motivo: 'ultimo_tesorero'
			});
		});
	});

	it('reactivar: vuelve a activo con su contraseña, o a invitado si nunca la eligió', async () => {
		const tesorero = await crearUsuario(db, { esTesorero: true });
		const conContrasena = await crearUsuario(db, { contrasena: 'contraseña del socio' });
		const invitado = await crearUsuario(db, { estado: 'invitado' });
		await darDeBaja(db, tesorero.id, conContrasena.id, ahora);
		await darDeBaja(db, tesorero.id, invitado.id, ahora);

		expect(await reactivar(db, conContrasena.id)).toEqual({ ok: true, estado: 'activo' });
		expect(
			await iniciarSesion(
				db,
				{ telefono: conContrasena.telefono, contrasena: 'contraseña del socio' },
				ahora
			)
		).toMatchObject({ ok: true });
		expect(await reactivar(db, invitado.id)).toEqual({ ok: true, estado: 'invitado' });
		expect(await reactivar(db, invitado.id)).toEqual({ ok: false, motivo: 'estado' });
	});
});

describe('reenviar invitación (HU-G02)', () => {
	it('genera un código de 7 días e invalida el anterior', async () => {
		const tesorero = await crearUsuario(db, { esTesorero: true });
		const alta = await darDeAlta(db, datosNuevos(), tesorero.id, ahora);
		if (!alta.ok) throw new Error('el alta debía funcionar');
		const [u] = await db.select().from(usuario).where(eq(usuario.id, alta.usuarioId));

		const r = await reenviarInvitacion(db, tesorero.id, u.id, despues(DIA));
		if (!r.ok) throw new Error('el reenvío debía funcionar');
		expect(r).toMatchObject({ email: u.email, restablecer: false, caducaEn: despues(8 * DIA) });

		const contrasena = 'una contraseña larga';
		expect(
			await activarCuenta(
				db,
				{ telefono: u.telefono, codigo: alta.codigo, contrasena },
				despues(DIA)
			)
		).toEqual({ ok: false, motivo: 'codigo' });
		expect(
			await activarCuenta(db, { telefono: u.telefono, codigo: r.codigo, contrasena }, despues(DIA))
		).toMatchObject({ ok: true });
		expect((await fichaUsuario(db, u.id, despues(DIA)))?.estado).toBe('activo');
	});

	it('a un usuario activo le sirve para elegir otra contraseña y cierra sus sesiones', async () => {
		const tesorero = await crearUsuario(db, { esTesorero: true });
		const u = await crearUsuario(db, { contrasena: 'contraseña olvidada' });
		const { token } = await crearSesion(db, u.id, ahora);

		const r = await reenviarInvitacion(db, tesorero.id, u.id, ahora);
		if (!r.ok) throw new Error('el reenvío debía funcionar');
		expect(r.restablecer).toBe(true);
		// Hasta que use el código, la contraseña de siempre sigue valiendo.
		expect(await validarSesion(db, token, ahora)).not.toBeNull();

		const nueva = await activarCuenta(
			db,
			{ telefono: u.telefono, codigo: r.codigo, contrasena: 'contraseña recuperada' },
			ahora
		);
		expect(nueva).toMatchObject({ ok: true });
		expect(await validarSesion(db, token, ahora)).toBeNull();
		expect(
			await iniciarSesion(db, { telefono: u.telefono, contrasena: 'contraseña olvidada' }, ahora)
		).toMatchObject({ ok: false });
		expect(
			await iniciarSesion(db, { telefono: u.telefono, contrasena: 'contraseña recuperada' }, ahora)
		).toMatchObject({ ok: true });
	});

	it('no reenvía a un usuario de baja', async () => {
		const tesorero = await crearUsuario(db, { esTesorero: true });
		const u = await crearUsuario(db, { estado: 'baja' });
		expect(await reenviarInvitacion(db, tesorero.id, u.id, ahora)).toEqual({
			ok: false,
			motivo: 'estado'
		});
	});
});

describe('ficha de usuario', () => {
	it('marca los datos ficticios del tesorero inicial (R-06)', async () => {
		const u = await crearUsuario(db);
		expect(await fichaUsuario(db, u.id, ahora)).toMatchObject({ id: u.id, ficticio: false });
		expect(await fichaUsuario(db, '00000000-0000-4000-8000-000000000000', ahora)).toBeNull();
	});
});
