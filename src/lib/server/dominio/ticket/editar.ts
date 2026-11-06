// Editar un ticket pendiente (HU-S04) o corregir y reenviar uno rechazado (HU-S06). Como al
// enviarlo: los ficheros nuevos van primero al almacén y, después, una sola transacción comprueba
// la versión (E-04), cambia los datos, sustituye ficheros y deja en el historial qué cambió.
import { and, asc, eq, inArray, isNull, sql } from 'drizzle-orm';
import type { CambiosTicket } from '#lib/estados.ts';
import { MAX_FICHEROS } from '#lib/esquemas/ticket.ts';
import { concepto, historial, ticket, ticketFichero } from '#lib/server/infra/db/esquema.ts';
import type { Conexion } from '#lib/server/infra/db/tipos.ts';
import { guardarFicheros, type Almacen, type DatosTicket, type FicheroNuevo } from './crear.ts';
import { comprobarTransicion, type Actor } from './estados.ts';

export type Edicion = {
	/** La versión que se cargó en el formulario (E-04). */
	version: number;
	datos: DatosTicket;
	/** Ids de los ficheros vigentes que el socio quita. */
	quitar: string[];
	nuevos: FicheroNuevo[];
};

export type ResultadoEdicion =
	| { ok: true; accion: 'editar' | 'reenviar' }
	| {
			ok: false;
			/**
			 * no_encontrado: no existe o no es suyo (R-01); modificado: un tesorero lo ha tocado desde que
			 * se cargó (E-04); estado: ya no se puede editar; concepto: eligió uno desactivado; ficheros:
			 * quedarían menos de 1 o más de MAX_FICHEROS, o quita uno que no es vigente; sin_cambios: al
			 * editar, nada distinto.
			 */
			motivo: 'no_encontrado' | 'modificado' | 'estado' | 'concepto' | 'ficheros' | 'sin_cambios';
	  };

const nombreConcepto = sql<string>`coalesce(${concepto.nombre}, ${ticket.conceptoOtro})`;

export async function editarTicket(
	conexion: Conexion,
	almacen: Almacen,
	actor: Actor,
	numero: number,
	edicion: Edicion,
	ahora: Date
): Promise<ResultadoEdicion> {
	const { rutas, deshacer } = await guardarFicheros(almacen, edicion.nuevos, ahora);
	try {
		const r = await conexion.transaction((tx) => aplicar(tx, actor, numero, edicion, rutas, ahora));
		if (!r.ok) await deshacer();
		return r;
	} catch (e) {
		await deshacer();
		throw e;
	}
}

async function aplicar(
	tx: Conexion,
	actor: Actor,
	numero: number,
	{ version, datos, quitar, nuevos }: Edicion,
	rutas: string[],
	ahora: Date
): Promise<ResultadoEdicion> {
	const [t] = await tx
		.select({
			id: ticket.id,
			socioId: ticket.socioId,
			estado: ticket.estado,
			version: ticket.version,
			importeCentimos: ticket.importeCentimos,
			fechaCompra: ticket.fechaCompra,
			conceptoId: ticket.conceptoId,
			conceptoOtro: ticket.conceptoOtro,
			concepto: nombreConcepto,
			observaciones: ticket.observaciones
		})
		.from(ticket)
		.leftJoin(concepto, eq(concepto.id, ticket.conceptoId))
		.where(eq(ticket.numero, numero))
		.for('update', { of: ticket });
	// Solo el dueño: para cualquier otro, ni existe (R-01).
	if (!t || t.socioId !== actor.id) return { ok: false, motivo: 'no_encontrado' };
	if (t.version !== version) return { ok: false, motivo: 'modificado' };

	// Pendiente: se edita; rechazado: se corrige y vuelve a pendiente de autorizar.
	const accion = t.estado === 'rechazado' ? 'reenviar' : 'editar';
	const comprobacion = comprobarTransicion(accion, actor, t);
	if (!comprobacion.ok) return { ok: false, motivo: 'estado' };

	// Puede quedarse con un concepto desactivado que ya tenía, pero no elegir otro.
	let conceptoNuevo = datos.conceptoOtro ?? '';
	if (datos.conceptoId !== null) {
		const [c] = await tx
			.select({ nombre: concepto.nombre, activo: concepto.activo })
			.from(concepto)
			.where(eq(concepto.id, datos.conceptoId));
		if (!c || (!c.activo && datos.conceptoId !== t.conceptoId)) {
			return { ok: false, motivo: 'concepto' };
		}
		conceptoNuevo = c.nombre;
	}

	const vigentes = await tx
		.select({ id: ticketFichero.id, orden: ticketFichero.orden })
		.from(ticketFichero)
		.where(and(eq(ticketFichero.ticketId, t.id), isNull(ticketFichero.sustituidoEn)))
		.orderBy(asc(ticketFichero.orden));
	const quitados = [...new Set(quitar)];
	const quedan = vigentes.length - quitados.length + nuevos.length;
	if (
		quitados.some((id) => !vigentes.some((v) => v.id === id)) ||
		quedan < 1 ||
		quedan > MAX_FICHEROS
	) {
		return { ok: false, motivo: 'ficheros' };
	}

	const cambios: CambiosTicket = {};
	if (datos.importeCentimos !== t.importeCentimos) {
		cambios.importeCentimos = [t.importeCentimos, datos.importeCentimos];
	}
	if (datos.fechaCompra !== t.fechaCompra) cambios.fechaCompra = [t.fechaCompra, datos.fechaCompra];
	if (datos.conceptoId !== t.conceptoId || datos.conceptoOtro !== t.conceptoOtro) {
		cambios.concepto = [t.concepto, conceptoNuevo];
	}
	if (datos.observaciones !== t.observaciones) {
		cambios.observaciones = [t.observaciones, datos.observaciones];
	}

	let anadidos: string[] = [];
	if (nuevos.length) {
		const siguiente = Math.max(0, ...vigentes.map((v) => v.orden)) + 1;
		anadidos = (
			await tx
				.insert(ticketFichero)
				.values(
					nuevos.map((f, i) => ({
						ticketId: t.id,
						ruta: rutas[i],
						nombreOriginal: f.nombreOriginal,
						tipoMime: f.tipoMime,
						tamanoBytes: f.datos.length,
						orden: siguiente + i,
						creadoEn: ahora
					}))
				)
				.returning({ id: ticketFichero.id })
		).map((f) => f.id);
	}
	if (quitados.length || anadidos.length) cambios.ficheros = [quitados, anadidos];

	const hayCambios = Object.keys(cambios).length > 0;
	// Reenviar sin cambios sí vale: el tesorero pudo equivocarse al rechazar.
	if (accion === 'editar' && !hayCambios) return { ok: false, motivo: 'sin_cambios' };

	if (quitados.length) {
		await tx
			.update(ticketFichero)
			.set({ sustituidoEn: ahora, sustituidoPor: actor.id })
			.where(inArray(ticketFichero.id, quitados));
	}
	await tx
		.update(ticket)
		.set({
			...datos,
			estado: comprobacion.hasta,
			version: sql`${ticket.version} + 1`,
			actualizadoEn: ahora
		})
		.where(eq(ticket.id, t.id));
	await tx.insert(historial).values({
		ticketId: t.id,
		usuarioId: actor.id,
		accion,
		estadoOrigen: t.estado,
		estadoDestino: comprobacion.hasta,
		cambios: hayCambios ? cambios : null,
		creadoEn: ahora
	});
	return { ok: true, accion };
}
