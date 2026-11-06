// Antes de las pruebas e2e: migraciones y, por perfil (móvil y escritorio), un socio invitado con
// un código de activación conocido y un tesorero activo con contraseña conocida. Escribe en la
// base directamente, sin pasar por la app.
import { createHash } from 'node:crypto';
import { hash } from '@node-rs/argon2';
import postgres from 'postgres';
import { migrar } from '../../scripts/migrar.js';
import {
	ALTAS,
	ANULAR,
	EDICION,
	CONCEPTOS,
	CONTRASENA_TESORERO,
	LISTADO,
	PAGO,
	REMITENTES,
	REVISION,
	SOCIOS,
	TESOREROS
} from './datos.ts';

const sha256 = (texto: string) => createHash('sha256').update(texto).digest('hex');

export default async function preparar() {
	const url = process.env.DATABASE_URL;
	if (!url) throw new Error('Las pruebas e2e necesitan DATABASE_URL');
	await migrar(url);

	const sql = postgres(url, { max: 1, onnotice: () => {} });
	try {
		const usuarios = [
			// Primero los dados de alta: sus códigos apuntan al tesorero que los creó.
			...Object.values(ALTAS),
			...Object.values(SOCIOS),
			...Object.values(TESOREROS),
			...Object.values(REMITENTES),
			...Object.values(LISTADO),
			...Object.values(REVISION),
			...Object.values(ANULAR),
			...Object.values(EDICION),
			...Object.values(PAGO)
		];
		const telefonos = usuarios.map((u) => u.telefono);
		const emails = usuarios.map((u) => u.email);
		const suyos = sql`select id from usuario where telefono in ${sql(telefonos)} or email in ${sql(emails)}`;
		// Sus tickets (con su historial y ficheros, en cascada) y lo que hicieron en tickets de otros.
		await sql`delete from ticket where socio_id in (${suyos})`;
		await sql`delete from historial where usuario_id in (${suyos})`;
		await sql`delete from pago where socio_id in (${suyos}) or registrado_por in (${suyos})`;
		for (const u of usuarios) {
			await sql`delete from usuario where telefono = ${u.telefono} or email = ${u.email}`;
		}

		for (const socio of Object.values(SOCIOS)) {
			const [{ id }] = await sql`
				insert into usuario (nombre, telefono, email)
				values (${socio.nombre}, ${socio.telefono}, ${socio.email})
				returning id`;
			await sql`
				insert into codigo_acceso (usuario_id, codigo_hash, tipo, caduca_en)
				values (${id}, ${sha256(socio.codigo.replaceAll('-', ''))}, 'activacion', now() + interval '1 day')`;
		}

		for (const c of Object.values(CONCEPTOS)) {
			await sql`delete from concepto where nombre in (${c.nombre}, ${c.renombrado})`;
		}

		const passwordHash = await hash(CONTRASENA_TESORERO);
		for (const t of Object.values(TESOREROS)) {
			await sql`
				insert into usuario (nombre, telefono, email, password_hash, estado, es_socio, es_tesorero)
				values (${t.nombre}, ${t.telefono}, ${t.email}, ${passwordHash}, 'activo', false, true)`;
		}
		for (const r of Object.values(REMITENTES)) {
			await sql`
				insert into usuario (nombre, telefono, email, password_hash, estado, es_socio, es_tesorero)
				values (${r.nombre}, ${r.telefono}, ${r.email}, ${passwordHash}, 'activo', true, false)`;
		}
		// Tres tickets por socio del listado, uno por estado y con importes distintos para ordenar.
		for (const l of Object.values(LISTADO)) {
			const [{ id }] = await sql`
				insert into usuario (nombre, telefono, email, password_hash, estado)
				values (${l.nombre}, ${l.telefono}, ${l.email}, ${passwordHash}, 'activo')
				returning id`;
			const [{ concepto }] = await sql`select id as concepto from concepto order by orden limit 1`;
			await sql`
				insert into ticket (socio_id, importe_centimos, fecha_compra, concepto_id, concepto_otro, estado, motivo_rechazo, creado_en)
				values
					(${id}, 1000, '2026-10-01', ${concepto}, null, 'pendiente_autorizar', null, '2026-10-01T10:00:00Z'),
					(${id}, 725, '2026-10-02', ${concepto}, null, 'pendiente_pago', null, '2026-10-02T10:00:00Z'),
					(${id}, 2550, '2026-10-03', null, 'Floristería', 'rechazado', 'No se lee', '2026-10-03T10:00:00Z')`;
		}
		// Dos pendientes por socio de revisión y uno de cada tesorero (que él no puede revisar, R-04).
		const [{ concepto }] = await sql`select id as concepto from concepto order by orden limit 1`;
		for (const r of Object.values(REVISION)) {
			const [{ id }] = await sql`
				insert into usuario (nombre, telefono, email, password_hash, estado)
				values (${r.nombre}, ${r.telefono}, ${r.email}, ${passwordHash}, 'activo')
				returning id`;
			await sql`
				insert into ticket (socio_id, importe_centimos, fecha_compra, concepto_id, creado_en)
				values
					(${id}, 1500, '2026-10-01', ${concepto}, '2026-10-01T10:00:00Z'),
					(${id}, 3000, '2026-10-02', ${concepto}, '2026-10-02T10:00:00Z')`;
		}
		for (const t of Object.values(TESOREROS)) {
			await sql`
				insert into ticket (socio_id, importe_centimos, fecha_compra, concepto_id)
				select id, 900, '2026-10-05', ${concepto} from usuario where telefono = ${t.telefono}`;
		}
		// Un pendiente y un rechazado por socio que anula (HU-S05).
		for (const a of Object.values(ANULAR)) {
			const [{ id }] = await sql`
				insert into usuario (nombre, telefono, email, password_hash, estado)
				values (${a.nombre}, ${a.telefono}, ${a.email}, ${passwordHash}, 'activo')
				returning id`;
			await sql`
				insert into ticket (socio_id, importe_centimos, fecha_compra, concepto_id, estado, motivo_rechazo)
				values
					(${id}, 1200, '2026-10-01', ${concepto}, 'pendiente_autorizar', null),
					(${id}, 840, '2026-10-02', ${concepto}, 'rechazado', 'No se lee')`;
		}
		// Un pendiente y un rechazado, sin ficheros, por socio que edita (HU-S04, S06).
		for (const e of Object.values(EDICION)) {
			const [{ id }] = await sql`
				insert into usuario (nombre, telefono, email, password_hash, estado)
				values (${e.nombre}, ${e.telefono}, ${e.email}, ${passwordHash}, 'activo')
				returning id`;
			await sql`
				insert into ticket (socio_id, importe_centimos, fecha_compra, concepto_id, estado, motivo_rechazo)
				values
					(${id}, 1500, '2026-10-01', ${concepto}, 'pendiente_autorizar', null),
					(${id}, 990, '2026-10-02', ${concepto}, 'rechazado', 'La foto está borrosa')`;
		}
		// Dos pendientes de pago por socio al que se paga (HU-T05).
		for (const p of Object.values(PAGO)) {
			const [{ id }] = await sql`
				insert into usuario (nombre, telefono, email, password_hash, estado)
				values (${p.nombre}, ${p.telefono}, ${p.email}, ${passwordHash}, 'activo')
				returning id`;
			await sql`
				insert into ticket (socio_id, importe_centimos, fecha_compra, concepto_id, estado)
				values
					(${id}, 2000, '2026-10-01', ${concepto}, 'pendiente_pago'),
					(${id}, 500, '2026-10-02', ${concepto}, 'pendiente_pago')`;
		}
	} finally {
		await sql.end();
	}
}
