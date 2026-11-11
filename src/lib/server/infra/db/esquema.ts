// Esquema de la base de datos (docs/arquitectura/02-modelo-datos.md).
// Los nombres van en camelCase en TypeScript y en snake_case en PostgreSQL (opción `casing` de Drizzle).
import { relations, sql, type SQLWrapper } from 'drizzle-orm';
import {
	bigint,
	boolean,
	check,
	date,
	index,
	integer,
	jsonb,
	pgEnum,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
	uuid,
	type AnyPgColumn
} from 'drizzle-orm/pg-core';
import type { AccionHistorial, CambiosTicket, EstadoTicket } from '../../../estados.ts';
import type { MetodoPago } from '../../../pagos.ts';

const instante = () => timestamp({ withTimezone: true });
const creadoEn = () => instante().notNull().defaultNow();

// --- Enumerados ---

export const estadoUsuario = pgEnum('estado_usuario', ['invitado', 'activo', 'baja']);
export const tipoCodigo = pgEnum('tipo_codigo', ['activacion', 'restablecer']);
export const estadoTicket = pgEnum('estado_ticket', [
	'pendiente_autorizar',
	'rechazado',
	'pendiente_pago',
	'pagado',
	'anulado'
]);
// Los estados de la base de datos y los de la interfaz (src/lib/estados.ts) deben coincidir:
// si uno cambia sin el otro, falla la comprobación de tipos.
type Iguales<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
export const estadosCoinciden: Iguales<(typeof estadoTicket.enumValues)[number], EstadoTicket> =
	true;

export const metodoPago = pgEnum('metodo_pago', ['bizum', 'transferencia', 'efectivo', 'otro']);
export const metodosCoinciden: Iguales<(typeof metodoPago.enumValues)[number], MetodoPago> = true;
export const accionHistorial = pgEnum('accion_historial', [
	'crear',
	'editar',
	'anular',
	'reenviar',
	'autorizar',
	'rechazar',
	'pagar',
	'deshacer_autorizacion',
	'deshacer_rechazo',
	'deshacer_pago'
]);
export const accionesCoinciden: Iguales<
	(typeof accionHistorial.enumValues)[number],
	AccionHistorial
> = true;

// --- Usuarios y acceso ---

export const usuario = pgTable(
	'usuario',
	{
		id: uuid().primaryKey().defaultRandom(),
		nombre: text().notNull(),
		/** E.164: +34612345678 */
		telefono: text().notNull().unique(),
		email: text().notNull().unique(),
		/** Cuenta donde recibe los pagos (HU-S07), sin espacios: ES9121000418450200051332. */
		iban: text(),
		/** Argon2id. Nulo hasta que el usuario activa su cuenta. */
		passwordHash: text(),
		esSocio: boolean().notNull().default(true),
		esTesorero: boolean().notNull().default(false),
		estado: estadoUsuario().notNull().default('invitado'),
		intentosFallidos: integer().notNull().default(0),
		bloqueadoHasta: instante(),
		creadoEn: creadoEn()
	},
	(t) => [
		check('usuario_algun_rol', sql`${t.esSocio} or ${t.esTesorero}`),
		check('usuario_email_minusculas', sql`${t.email} = lower(${t.email})`),
		check(
			'usuario_activo_con_password',
			sql`${t.estado} <> 'activo' or ${t.passwordHash} is not null`
		),
		// El dígito de control lo comprueba la app (lib/iban.ts); aquí, que se guarde normalizado.
		check('usuario_iban_normalizado', sql`${t.iban} ~ '^[A-Z]{2}[0-9]{2}[A-Z0-9]{11,30}$'`)
	]
);

export const sesion = pgTable(
	'sesion',
	{
		/** SHA-256 del token de la cookie: el token en sí nunca se guarda. */
		id: text().primaryKey(),
		usuarioId: uuid()
			.notNull()
			.references(() => usuario.id, { onDelete: 'cascade' }),
		caducaEn: instante().notNull(),
		creadoEn: creadoEn()
	},
	(t) => [index().on(t.usuarioId)]
);

export const codigoAcceso = pgTable(
	'codigo_acceso',
	{
		id: uuid().primaryKey().defaultRandom(),
		usuarioId: uuid()
			.notNull()
			.references(() => usuario.id, { onDelete: 'cascade' }),
		/** SHA-256 del código enviado. */
		codigoHash: text().notNull().unique(),
		tipo: tipoCodigo().notNull(),
		caducaEn: instante().notNull(),
		usadoEn: instante(),
		/** Nulo cuando lo genera el sistema (tesorero inicial, R-06, o scripts/restablecer-acceso.js); el propio usuario si pide restablecer (HU-A04). */
		creadoPor: uuid().references(() => usuario.id),
		creadoEn: creadoEn()
	},
	(t) => [index().on(t.usuarioId)]
);

// --- Conceptos ---

/**
 * Clave para comparar nombres de concepto: sin mayúsculas ni tildes («Ferretería» = «ferreteria»).
 * La ñ se mantiene: es otra letra. `translate` y `lower` son inmutables, así que valen para un índice.
 */
export const claveNombre = (columna: SQLWrapper) =>
	sql`translate(lower(${columna}), 'áàâäéèêëíìîïóòôöúùûü', 'aaaaeeeeiiiioooouuuu')`;

export const concepto = pgTable(
	'concepto',
	{
		id: integer().primaryKey().generatedAlwaysAsIdentity(),
		nombre: text().notNull(),
		orden: integer().notNull().default(0),
		activo: boolean().notNull().default(true)
	},
	(t) => [
		// Único sin distinguir mayúsculas ni tildes: «ferreteria» choca con «Ferretería».
		uniqueIndex('concepto_nombre_unico').on(claveNombre(t.nombre)),
		check('concepto_nombre_largo', sql`char_length(${t.nombre}) between 1 and 50`),
		// «Otro» es la opción fija del formulario del ticket, no un concepto.
		check('concepto_nombre_no_otro', sql`${claveNombre(t.nombre)} <> 'otro'`)
	]
);

// --- Tickets ---

export const ticket = pgTable(
	'ticket',
	{
		id: uuid().primaryKey().defaultRandom(),
		/** Número visible (T-000123). Puede tener huecos si una transacción se deshace. */
		numero: integer().notNull().unique().generatedAlwaysAsIdentity(),
		socioId: uuid()
			.notNull()
			.references(() => usuario.id),
		importeCentimos: integer().notNull(),
		fechaCompra: date({ mode: 'string' }).notNull(),
		/** Nulo si el concepto es «Otro». */
		conceptoId: integer().references(() => concepto.id),
		/** Texto libre de «Otro»; nulo si el concepto es predefinido. */
		conceptoOtro: text(),
		observaciones: text(),
		estado: estadoTicket().notNull().default('pendiente_autorizar'),
		/** Último motivo de rechazo (todos están en el historial). */
		motivoRechazo: text(),
		pagoId: uuid().references((): AnyPgColumn => pago.id),
		/** Concurrencia optimista (E-04). */
		version: integer().notNull().default(1),
		creadoEn: creadoEn(),
		actualizadoEn: instante().notNull().defaultNow()
	},
	(t) => [
		check('ticket_importe_positivo', sql`${t.importeCentimos} > 0`),
		check('ticket_un_concepto', sql`(${t.conceptoId} is null) <> (${t.conceptoOtro} is null)`),
		check('ticket_concepto_otro_largo', sql`char_length(${t.conceptoOtro}) between 1 and 100`),
		check('ticket_observaciones_largo', sql`char_length(${t.observaciones}) <= 500`),
		check('ticket_pagado_con_pago', sql`(${t.estado} = 'pagado') = (${t.pagoId} is not null)`),
		check(
			'ticket_rechazado_con_motivo',
			sql`${t.estado} <> 'rechazado' or ${t.motivoRechazo} is not null`
		),
		index().on(t.estado, t.creadoEn),
		index().on(t.socioId),
		index().on(t.fechaCompra)
	]
);

export const ticketFichero = pgTable(
	'ticket_fichero',
	{
		id: uuid().primaryKey().defaultRandom(),
		ticketId: uuid()
			.notNull()
			.references(() => ticket.id, { onDelete: 'cascade' }),
		/** Relativa al volumen de ficheros: {año}/{mes}/{uuid}.{ext} */
		ruta: text().notNull(),
		nombreOriginal: text().notNull(),
		tipoMime: text().notNull(),
		tamanoBytes: integer().notNull(),
		orden: integer().notNull(),
		creadoEn: creadoEn(),
		/** Nulo = vigente. Los sustituidos se conservan hasta la purga. */
		sustituidoEn: instante(),
		sustituidoPor: uuid().references(() => usuario.id)
	},
	(t) => [
		check(
			'ticket_fichero_sustitucion_completa',
			sql`(${t.sustituidoEn} is null) = (${t.sustituidoPor} is null)`
		),
		index().on(t.ticketId)
	]
);

// --- Pagos ---

export const pago = pgTable(
	'pago',
	{
		id: uuid().primaryKey().defaultRandom(),
		socioId: uuid()
			.notNull()
			.references(() => usuario.id),
		fechaPago: date({ mode: 'string' }).notNull(),
		metodo: metodoPago().notNull(),
		/** Suma de los tickets, calculada al registrar el pago. */
		importeTotalCentimos: integer().notNull(),
		justificanteRuta: text(),
		justificanteMime: text(),
		registradoPor: uuid()
			.notNull()
			.references(() => usuario.id),
		creadoEn: creadoEn(),
		/** Deshacer el pago (E-03) lo marca como anulado, sin borrarlo. */
		anuladoEn: instante(),
		anuladoPor: uuid().references(() => usuario.id),
		motivoAnulacion: text()
	},
	(t) => [
		check('pago_importe_positivo', sql`${t.importeTotalCentimos} > 0`),
		check(
			'pago_anulacion_completa',
			sql`(${t.anuladoEn} is null) = (${t.anuladoPor} is null) and (${t.anuladoEn} is null) = (${t.motivoAnulacion} is null)`
		),
		check(
			'pago_justificante_completo',
			sql`(${t.justificanteRuta} is null) = (${t.justificanteMime} is null)`
		),
		index().on(t.socioId)
	]
);

// --- Historial (E-01): solo se inserta, nunca se modifica ---

export const historial = pgTable(
	'historial',
	{
		id: bigint({ mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
		ticketId: uuid()
			.notNull()
			.references(() => ticket.id, { onDelete: 'cascade' }),
		usuarioId: uuid()
			.notNull()
			.references(() => usuario.id),
		accion: accionHistorial().notNull(),
		/** Nulo en la creación. */
		estadoOrigen: estadoTicket(),
		estadoDestino: estadoTicket().notNull(),
		motivo: text(),
		/** Campos editados: { campo: [antes, después] } */
		cambios: jsonb().$type<CambiosTicket>(),
		pagoId: uuid().references(() => pago.id),
		creadoEn: creadoEn()
	},
	(t) => [index().on(t.ticketId)]
);

// --- Relaciones (para db.query con `with`) ---

export const usuarioRelaciones = relations(usuario, ({ many }) => ({
	tickets: many(ticket),
	sesiones: many(sesion)
}));

export const ticketRelaciones = relations(ticket, ({ one, many }) => ({
	socio: one(usuario, { fields: [ticket.socioId], references: [usuario.id] }),
	concepto: one(concepto, { fields: [ticket.conceptoId], references: [concepto.id] }),
	pago: one(pago, { fields: [ticket.pagoId], references: [pago.id] }),
	ficheros: many(ticketFichero),
	historial: many(historial)
}));

export const ticketFicheroRelaciones = relations(ticketFichero, ({ one }) => ({
	ticket: one(ticket, { fields: [ticketFichero.ticketId], references: [ticket.id] })
}));

export const pagoRelaciones = relations(pago, ({ one, many }) => ({
	socio: one(usuario, { fields: [pago.socioId], references: [usuario.id] }),
	tickets: many(ticket)
}));

export const historialRelaciones = relations(historial, ({ one }) => ({
	ticket: one(ticket, { fields: [historial.ticketId], references: [ticket.id] }),
	usuario: one(usuario, { fields: [historial.usuarioId], references: [usuario.id] }),
	pago: one(pago, { fields: [historial.pagoId], references: [pago.id] })
}));

export const sesionRelaciones = relations(sesion, ({ one }) => ({
	usuario: one(usuario, { fields: [sesion.usuarioId], references: [usuario.id] })
}));
