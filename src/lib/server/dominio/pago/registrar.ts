// Registrar un pago (HU-T05): uno o varios tickets del mismo socio, pendientes de pago, con un solo
// Bizum o transferencia (E-02). El justificante va primero al almacén y, después, una sola
// transacción crea el Pago, pasa los tickets a Pagado y deja su entrada en el historial.
import { inArray, sql } from 'drizzle-orm';
import type { MetodoPago } from '#lib/pagos.ts';
import { historial, pago, ticket } from '#lib/server/infra/db/esquema.ts';
import type { Conexion } from '#lib/server/infra/db/tipos.ts';
import { guardarFicheros, type Almacen, type FicheroNuevo } from '../ticket/crear.ts';
import { comprobarTransicion, type Actor } from '../ticket/estados.ts';

export type DatosPago = {
	socioId: string;
	/** Los tickets marcados, con la versión que se cargó (E-04). */
	tickets: { numero: number; version: number }[];
	fechaPago: string;
	metodo: MetodoPago;
	justificante: FicheroNuevo | null;
};

export type ResultadoPago =
	| { ok: true; id: string; importeTotalCentimos: number }
	| {
			ok: false;
			/**
			 * modificado: alguno ya no existe, es de otro socio o ha cambiado desde que se cargó (E-02,
			 * E-04); propio: alguno es del tesorero (R-04); permiso: no es tesorero.
			 */
			motivo: 'modificado' | 'propio' | 'permiso';
	  };

export async function registrarPago(
	conexion: Conexion,
	almacen: Almacen,
	actor: Actor,
	datos: DatosPago,
	ahora: Date
): Promise<ResultadoPago> {
	if (!actor.esTesorero) return { ok: false, motivo: 'permiso' };
	const justificantes = datos.justificante ? [datos.justificante] : [];
	const { rutas, deshacer } = await guardarFicheros(almacen, justificantes, ahora);
	try {
		const r = await conexion.transaction((tx) => aplicar(tx, actor, datos, rutas[0], ahora));
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
	datos: DatosPago,
	ruta: string | undefined,
	ahora: Date
): Promise<ResultadoPago> {
	const numeros = [...new Set(datos.tickets.map((t) => t.numero))];
	if (numeros.length === 0 || numeros.length !== datos.tickets.length) {
		return { ok: false, motivo: 'modificado' };
	}
	const filas = await tx
		.select({
			id: ticket.id,
			numero: ticket.numero,
			socioId: ticket.socioId,
			estado: ticket.estado,
			version: ticket.version,
			importeCentimos: ticket.importeCentimos
		})
		.from(ticket)
		.where(inArray(ticket.numero, numeros))
		.for('update');

	if (filas.length !== numeros.length) return { ok: false, motivo: 'modificado' };
	for (const t of filas) {
		// Todos del socio elegido (E-02): si no, la pantalla no era la que se cargó.
		if (t.socioId !== datos.socioId) return { ok: false, motivo: 'modificado' };
		const comprobacion = comprobarTransicion('pagar', actor, t);
		if (!comprobacion.ok && comprobacion.motivo === 'propio') {
			return { ok: false, motivo: 'propio' };
		}
		const cargada = datos.tickets.find((d) => d.numero === t.numero)!.version;
		if (!comprobacion.ok || t.version !== cargada) return { ok: false, motivo: 'modificado' };
	}

	// El total se calcula; nunca se escribe a mano.
	const importeTotalCentimos = filas.reduce((suma, t) => suma + t.importeCentimos, 0);
	const [nuevo] = await tx
		.insert(pago)
		.values({
			socioId: datos.socioId,
			fechaPago: datos.fechaPago,
			metodo: datos.metodo,
			importeTotalCentimos,
			justificanteRuta: ruta ?? null,
			justificanteMime: ruta ? datos.justificante!.tipoMime : null,
			registradoPor: actor.id,
			creadoEn: ahora
		})
		.returning({ id: pago.id });

	const ids = filas.map((t) => t.id);
	await tx
		.update(ticket)
		.set({
			estado: 'pagado',
			pagoId: nuevo.id,
			version: sql`${ticket.version} + 1`,
			actualizadoEn: ahora
		})
		.where(inArray(ticket.id, ids));
	await tx.insert(historial).values(
		filas.map((t) => ({
			ticketId: t.id,
			usuarioId: actor.id,
			accion: 'pagar' as const,
			estadoOrigen: t.estado,
			estadoDestino: 'pagado' as const,
			pagoId: nuevo.id,
			creadoEn: ahora
		}))
	);
	return { ok: true, id: nuevo.id, importeTotalCentimos };
}
