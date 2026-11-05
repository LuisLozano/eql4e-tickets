import { and, eq } from 'drizzle-orm';
import { beforeAll, describe, expect, it } from 'vitest';
import {
	activarCuenta,
	BLOQUEO_MS,
	cambiarContrasena,
	iniciarSesion
} from '../../src/lib/server/dominio/auth/acceso.ts';
import { consumirCodigo, crearCodigo } from '../../src/lib/server/dominio/auth/codigos.ts';
import {
	crearSesion,
	DURACION_SESION_MS,
	invalidarSesion,
	invalidarSesionesDe,
	validarSesion
} from '../../src/lib/server/dominio/auth/sesiones.ts';
import {
	asegurarTesoreroInicial,
	TESORERO_INICIAL
} from '../../src/lib/server/dominio/auth/tesorero-inicial.ts';
import { sha256 } from '../../src/lib/server/dominio/auth/tokens.ts';
import { codigoAcceso, sesion, usuario } from '../../src/lib/server/infra/db/esquema.ts';
import { conexionDePrueba } from './conexion.ts';
import { crearUsuario } from './datos.ts';

const { db } = conexionDePrueba();
const DIA = 24 * 60 * 60 * 1000;
const ahora = new Date('2026-11-05T10:00:00Z');
const despues = (ms: number) => new Date(ahora.getTime() + ms);

describe('sesiones', () => {
	it('valida una sesión recién creada sin renovarla', async () => {
		const u = await crearUsuario(db);
		const { token, caducaEn } = await crearSesion(db, u.id, ahora);
		expect(caducaEn).toEqual(despues(DURACION_SESION_MS));

		const r = await validarSesion(db, token, despues(DIA));
		expect(r?.usuario).toEqual({ id: u.id, nombre: u.nombre, esSocio: true, esTesorero: false });
		expect(r?.renovada).toBe(false);
	});

	it('la renueva hasta 30 días cuando le quedan menos de 15', async () => {
		const u = await crearUsuario(db);
		const { token } = await crearSesion(db, u.id, ahora);
		const r = await validarSesion(db, token, despues(20 * DIA));
		expect(r?.renovada).toBe(true);
		expect(r?.caducaEn).toEqual(despues(20 * DIA + DURACION_SESION_MS));
	});

	it('no acepta un token desconocido', async () => {
		expect(await validarSesion(db, 'no-existe', ahora)).toBeNull();
	});

	it('borra la sesión caducada', async () => {
		const u = await crearUsuario(db);
		const { token } = await crearSesion(db, u.id, ahora);
		expect(await validarSesion(db, token, despues(DURACION_SESION_MS))).toBeNull();
		expect(
			await db
				.select()
				.from(sesion)
				.where(eq(sesion.id, sha256(token)))
		).toHaveLength(0);
	});

	it('no acepta la sesión de un usuario dado de baja (R-05)', async () => {
		const u = await crearUsuario(db);
		const { token } = await crearSesion(db, u.id, ahora);
		await db.update(usuario).set({ estado: 'baja' }).where(eq(usuario.id, u.id));
		expect(await validarSesion(db, token, ahora)).toBeNull();
	});

	it('guarda el SHA-256 del token, nunca el token', async () => {
		const u = await crearUsuario(db);
		const { token } = await crearSesion(db, u.id, ahora);
		const filas = await db.select().from(sesion).where(eq(sesion.usuarioId, u.id));
		expect(filas.map((f) => f.id)).toEqual([sha256(token)]);
	});

	it('cierra una sesión o todas menos la actual', async () => {
		const u = await crearUsuario(db);
		const a = await crearSesion(db, u.id, ahora);
		const b = await crearSesion(db, u.id, ahora);
		const c = await crearSesion(db, u.id, ahora);

		await invalidarSesion(db, a.token);
		expect(await validarSesion(db, a.token, ahora)).toBeNull();

		await invalidarSesionesDe(db, u.id, b.token);
		expect(await validarSesion(db, b.token, ahora)).not.toBeNull();
		expect(await validarSesion(db, c.token, ahora)).toBeNull();

		await invalidarSesionesDe(db, u.id);
		expect(await validarSesion(db, b.token, ahora)).toBeNull();
	});
});

describe('códigos de acceso', () => {
	it('se usan una sola vez', async () => {
		const u = await crearUsuario(db, { estado: 'invitado' });
		const { codigo } = await crearCodigo(
			db,
			{ usuarioId: u.id, tipo: 'activacion', creadoPor: null },
			ahora
		);
		const datos = {
			codigo,
			telefono: u.telefono,
			tipo: 'activacion',
			estadoUsuario: 'invitado'
		} as const;
		expect(await consumirCodigo(db, datos, ahora)).toBe(u.id);
		expect(await consumirCodigo(db, datos, ahora)).toBeNull();
	});

	it('caducan a los 7 días', async () => {
		const u = await crearUsuario(db, { estado: 'invitado' });
		const { codigo, caducaEn } = await crearCodigo(
			db,
			{ usuarioId: u.id, tipo: 'activacion', creadoPor: null },
			ahora
		);
		expect(caducaEn).toEqual(despues(7 * DIA));
		const datos = {
			codigo,
			telefono: u.telefono,
			tipo: 'activacion',
			estadoUsuario: 'invitado'
		} as const;
		expect(await consumirCodigo(db, datos, despues(7 * DIA))).toBeNull();
	});

	it('el de restablecer caduca en una hora', async () => {
		const u = await crearUsuario(db);
		const { caducaEn } = await crearCodigo(
			db,
			{ usuarioId: u.id, tipo: 'restablecer', creadoPor: null },
			ahora
		);
		expect(caducaEn).toEqual(despues(60 * 60 * 1000));
	});

	it('no valen con otro teléfono ni para otro tipo', async () => {
		const u = await crearUsuario(db, { estado: 'invitado' });
		const otro = await crearUsuario(db, { estado: 'invitado' });
		const { codigo } = await crearCodigo(
			db,
			{ usuarioId: u.id, tipo: 'activacion', creadoPor: null },
			ahora
		);
		expect(
			await consumirCodigo(
				db,
				{ codigo, telefono: otro.telefono, tipo: 'activacion', estadoUsuario: 'invitado' },
				ahora
			)
		).toBeNull();
		expect(
			await consumirCodigo(
				db,
				{ codigo, telefono: u.telefono, tipo: 'restablecer', estadoUsuario: 'invitado' },
				ahora
			)
		).toBeNull();
	});

	it('generar uno nuevo invalida el anterior', async () => {
		const u = await crearUsuario(db, { estado: 'invitado' });
		const viejo = await crearCodigo(
			db,
			{ usuarioId: u.id, tipo: 'activacion', creadoPor: null },
			ahora
		);
		const nuevo = await crearCodigo(
			db,
			{ usuarioId: u.id, tipo: 'activacion', creadoPor: null },
			ahora
		);
		const datos = { telefono: u.telefono, tipo: 'activacion', estadoUsuario: 'invitado' } as const;
		expect(await consumirCodigo(db, { ...datos, codigo: viejo.codigo }, ahora)).toBeNull();
		expect(await consumirCodigo(db, { ...datos, codigo: nuevo.codigo }, ahora)).toBe(u.id);
	});

	it('acepta el código escrito en minúsculas y sin guiones', async () => {
		const u = await crearUsuario(db, { estado: 'invitado' });
		const { codigo } = await crearCodigo(
			db,
			{ usuarioId: u.id, tipo: 'activacion', creadoPor: null },
			ahora
		);
		const escrito = codigo.replaceAll('-', ' ').toLowerCase();
		expect(
			await consumirCodigo(
				db,
				{ codigo: escrito, telefono: u.telefono, tipo: 'activacion', estadoUsuario: 'invitado' },
				ahora
			)
		).toBe(u.id);
	});
});

describe('activar la cuenta (HU-A01)', () => {
	async function invitado() {
		const u = await crearUsuario(db, { estado: 'invitado', esTesorero: true });
		const { codigo } = await crearCodigo(
			db,
			{ usuarioId: u.id, tipo: 'activacion', creadoPor: null },
			ahora
		);
		return { u, codigo };
	}

	it('activa la cuenta, invalida el código y abre sesión', async () => {
		const { u, codigo } = await invitado();
		const r = await activarCuenta(
			db,
			{ telefono: u.telefono.slice(3), codigo, contrasena: 'mi nueva contraseña' },
			ahora
		);
		expect(r).toMatchObject({ ok: true, esTesorero: true });
		if (!r.ok) return;
		expect((await validarSesion(db, r.token, ahora))?.usuario.id).toBe(u.id);
		const [activo] = await db.select().from(usuario).where(eq(usuario.id, u.id));
		expect(activo.estado).toBe('activo');

		const otraVez = await activarCuenta(
			db,
			{ telefono: u.telefono, codigo, contrasena: 'mi nueva contraseña' },
			ahora
		);
		expect(otraVez).toEqual({ ok: false, motivo: 'codigo' });
	});

	it('rechaza una contraseña común antes de tocar el código', async () => {
		const { u, codigo } = await invitado();
		const r = await activarCuenta(
			db,
			{ telefono: u.telefono, codigo, contrasena: '12345678' },
			ahora
		);
		expect(r).toMatchObject({ ok: false, motivo: 'contrasena' });
		const pendientes = await db
			.select()
			.from(codigoAcceso)
			.where(and(eq(codigoAcceso.usuarioId, u.id)));
		expect(pendientes[0].usadoEn).toBeNull();
	});

	it('da el error genérico con un teléfono no válido o un código incorrecto', async () => {
		const { u } = await invitado();
		expect(
			await activarCuenta(
				db,
				{ telefono: '123', codigo: 'x', contrasena: 'mi nueva contraseña' },
				ahora
			)
		).toEqual({ ok: false, motivo: 'codigo' });
		expect(
			await activarCuenta(
				db,
				{ telefono: u.telefono, codigo: 'AAAA-BBBB', contrasena: 'mi nueva contraseña' },
				ahora
			)
		).toEqual({ ok: false, motivo: 'codigo' });
	});

	it('no activa a un usuario dado de baja', async () => {
		const { u, codigo } = await invitado();
		await db.update(usuario).set({ estado: 'baja' }).where(eq(usuario.id, u.id));
		expect(
			await activarCuenta(
				db,
				{ telefono: u.telefono, codigo, contrasena: 'mi nueva contraseña' },
				ahora
			)
		).toEqual({ ok: false, motivo: 'codigo' });
	});
});

describe('iniciar sesión (HU-A02)', () => {
	const contrasena = 'contraseña del socio';

	it('entra con el teléfono escrito de cualquier forma', async () => {
		const u = await crearUsuario(db, { contrasena });
		const r = await iniciarSesion(
			db,
			{ telefono: `0034 ${u.telefono.slice(3)}`, contrasena },
			ahora
		);
		expect(r).toMatchObject({ ok: true, esTesorero: false });
	});

	it('el mismo error si el teléfono no existe, no es válido, no está activo o la contraseña falla', async () => {
		const activo = await crearUsuario(db, { contrasena });
		const invitado = await crearUsuario(db, { estado: 'invitado' });
		const baja = await crearUsuario(db, { estado: 'baja', contrasena });
		const error = { ok: false, motivo: 'credenciales' };
		expect(await iniciarSesion(db, { telefono: '+34699999999', contrasena }, ahora)).toEqual(error);
		expect(await iniciarSesion(db, { telefono: 'abc', contrasena }, ahora)).toEqual(error);
		expect(await iniciarSesion(db, { telefono: invitado.telefono, contrasena }, ahora)).toEqual(
			error
		);
		expect(await iniciarSesion(db, { telefono: baja.telefono, contrasena }, ahora)).toEqual(error);
		expect(
			await iniciarSesion(db, { telefono: activo.telefono, contrasena: 'otra' }, ahora)
		).toEqual(error);
	});

	it('bloquea 15 minutos al quinto fallo, incluso con la contraseña correcta', async () => {
		const u = await crearUsuario(db, { contrasena });
		for (let i = 1; i <= 4; i++) {
			expect(
				await iniciarSesion(db, { telefono: u.telefono, contrasena: 'mal' }, ahora)
			).toMatchObject({ motivo: 'credenciales' });
		}
		const quinto = await iniciarSesion(db, { telefono: u.telefono, contrasena: 'mal' }, ahora);
		expect(quinto).toEqual({ ok: false, motivo: 'bloqueado', hasta: despues(BLOQUEO_MS) });

		const durante = await iniciarSesion(
			db,
			{ telefono: u.telefono, contrasena },
			despues(BLOQUEO_MS - 1000)
		);
		expect(durante).toMatchObject({ ok: false, motivo: 'bloqueado' });

		const pasado = await iniciarSesion(
			db,
			{ telefono: u.telefono, contrasena },
			despues(BLOQUEO_MS)
		);
		expect(pasado).toMatchObject({ ok: true });
	});

	it('un acierto pone a cero el contador de fallos', async () => {
		const u = await crearUsuario(db, { contrasena });
		for (let i = 0; i < 4; i++)
			await iniciarSesion(db, { telefono: u.telefono, contrasena: 'mal' }, ahora);
		await iniciarSesion(db, { telefono: u.telefono, contrasena }, ahora);
		const [fila] = await db.select().from(usuario).where(eq(usuario.id, u.id));
		expect(fila.intentosFallidos).toBe(0);
	});
});

describe('cambiar la contraseña (HU-A03)', () => {
	const contrasena = 'contraseña de siempre';

	it('la cambia y cierra las demás sesiones, no la actual', async () => {
		const u = await crearUsuario(db, { contrasena });
		const actual = await crearSesion(db, u.id, ahora);
		const otra = await crearSesion(db, u.id, ahora);
		const r = await cambiarContrasena(db, {
			usuarioId: u.id,
			actual: contrasena,
			nueva: 'contraseña renovada',
			tokenActual: actual.token
		});
		expect(r).toEqual({ ok: true });
		expect(await validarSesion(db, actual.token, ahora)).not.toBeNull();
		expect(await validarSesion(db, otra.token, ahora)).toBeNull();
		expect(
			await iniciarSesion(db, { telefono: u.telefono, contrasena: 'contraseña renovada' }, ahora)
		).toMatchObject({ ok: true });
	});

	it('exige la contraseña actual', async () => {
		const u = await crearUsuario(db, { contrasena });
		const r = await cambiarContrasena(db, {
			usuarioId: u.id,
			actual: 'no es',
			nueva: 'contraseña renovada',
			tokenActual: 'x'
		});
		expect(r).toEqual({ ok: false, motivo: 'actual' });
	});

	it('falla igual con un usuario inexistente o sin contraseña', async () => {
		const invitado = await crearUsuario(db, { estado: 'invitado' });
		const datos = { actual: contrasena, nueva: 'contraseña renovada', tokenActual: 'x' };
		expect(await cambiarContrasena(db, { ...datos, usuarioId: crypto.randomUUID() })).toEqual({
			ok: false,
			motivo: 'actual'
		});
		expect(await cambiarContrasena(db, { ...datos, usuarioId: invitado.id })).toEqual({
			ok: false,
			motivo: 'actual'
		});
	});

	it('rechaza una contraseña nueva común', async () => {
		const u = await crearUsuario(db, { contrasena });
		const r = await cambiarContrasena(db, {
			usuarioId: u.id,
			actual: contrasena,
			nueva: 'password',
			tokenActual: 'x'
		});
		expect(r).toMatchObject({ ok: false, motivo: 'contrasena' });
	});
});

describe('tesorero inicial (R-06)', () => {
	// Este bloque necesita una base sin tesoreros activos: los de otras pruebas se pasan a socios.
	beforeAll(async () => {
		await db
			.update(usuario)
			.set({ esTesorero: false, esSocio: true })
			.where(eq(usuario.esTesorero, true));
	});

	it('lo crea sin contraseña, lo reutiliza y deja de hacerlo al activarse', async () => {
		const primero = await asegurarTesoreroInicial(db, ahora);
		expect(primero?.telefono).toBe(TESORERO_INICIAL.telefono);
		const [creado] = await db
			.select()
			.from(usuario)
			.where(eq(usuario.telefono, TESORERO_INICIAL.telefono));
		expect(creado).toMatchObject({
			esTesorero: true,
			esSocio: false,
			estado: 'invitado',
			passwordHash: null
		});

		// En otro arranque sin activar: el mismo usuario, código nuevo y el anterior invalidado.
		const segundo = await asegurarTesoreroInicial(db, ahora);
		expect(segundo?.codigo).not.toBe(primero?.codigo);
		const tesoreros = await db
			.select()
			.from(usuario)
			.where(eq(usuario.telefono, TESORERO_INICIAL.telefono));
		expect(tesoreros).toHaveLength(1);

		const datos = { telefono: TESORERO_INICIAL.telefono, contrasena: 'la del tesorero inicial' };
		expect(await activarCuenta(db, { ...datos, codigo: primero!.codigo }, ahora)).toMatchObject({
			ok: false
		});
		expect(await activarCuenta(db, { ...datos, codigo: segundo!.codigo }, ahora)).toMatchObject({
			ok: true,
			esTesorero: true
		});

		expect(await asegurarTesoreroInicial(db, ahora)).toBeNull();
	});
});
