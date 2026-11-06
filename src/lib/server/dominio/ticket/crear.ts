// Enviar un ticket (HU-S01): ficheros en el volumen y, después, una sola transacción con el ticket,
// sus ficheros y la entrada «crear» del historial (ADR-0002).
import { randomUUID } from 'node:crypto';
import { asc, eq } from 'drizzle-orm';
import { OTRO, type CamposFormulario } from '#lib/esquemas/ticket.ts';
import { importeACentimos } from '#lib/importe.ts';
import { concepto, historial, ticket, ticketFichero } from '#lib/server/infra/db/esquema.ts';
import type { Conexion } from '#lib/server/infra/db/tipos.ts';

/** Dónde se guardan los ficheros. Se inyecta: en la app es el volumen de disco. */
export interface Almacen {
	guardar(ruta: string, datos: Uint8Array): Promise<void>;
	borrar(ruta: string): Promise<void>;
}

/** Un fichero ya comprobado y, si es imagen, recodificado. */
export type FicheroNuevo = {
	nombreOriginal: string;
	tipoMime: string;
	extension: string;
	datos: Uint8Array;
};

export type DatosTicket = {
	importeCentimos: number;
	fechaCompra: string;
	/** Nulo si el concepto es «Otro». */
	conceptoId: number | null;
	conceptoOtro: string | null;
	observaciones: string | null;
};

/** Los datos del formulario ya validado (esquemaTicket o esquemaEdicion), como se guardan. */
export function datosDeFormulario(f: CamposFormulario): DatosTicket {
	const otro = f.concepto === OTRO;
	return {
		importeCentimos: importeACentimos(f.importe)!,
		fechaCompra: f.fechaCompra,
		conceptoId: otro ? null : Number(f.concepto),
		conceptoOtro: otro ? f.conceptoOtro : null,
		observaciones: f.observaciones || null
	};
}

export type ResultadoCrearTicket =
	{ ok: true; id: string; numero: number } | { ok: false; motivo: 'concepto' };

/** Los conceptos que se ofrecen al enviar un ticket, en su orden. «Otro…» lo añade el formulario. */
export async function conceptosActivos(conexion: Conexion) {
	return conexion
		.select({ id: concepto.id, nombre: concepto.nombre })
		.from(concepto)
		.where(eq(concepto.activo, true))
		.orderBy(asc(concepto.orden), asc(concepto.id));
}

export async function crearTicket(
	conexion: Conexion,
	almacen: Almacen,
	socioId: string,
	datos: DatosTicket,
	ficheros: FicheroNuevo[],
	ahora: Date
): Promise<ResultadoCrearTicket> {
	if (datos.conceptoId !== null) {
		const [c] = await conexion
			.select({ activo: concepto.activo })
			.from(concepto)
			.where(eq(concepto.id, datos.conceptoId));
		if (!c?.activo) return { ok: false, motivo: 'concepto' };
	}

	const { rutas, deshacer } = await guardarFicheros(almacen, ficheros, ahora);
	try {
		return await conexion.transaction(async (tx) => {
			const [nuevo] = await tx
				.insert(ticket)
				.values({ socioId, ...datos })
				.returning({ id: ticket.id, numero: ticket.numero });
			await tx.insert(ticketFichero).values(
				ficheros.map((f, i) => ({
					ticketId: nuevo.id,
					ruta: rutas[i],
					nombreOriginal: f.nombreOriginal,
					tipoMime: f.tipoMime,
					tamanoBytes: f.datos.length,
					orden: i + 1
				}))
			);
			await tx.insert(historial).values({
				ticketId: nuevo.id,
				usuarioId: socioId,
				accion: 'crear',
				estadoDestino: 'pendiente_autorizar',
				creadoEn: ahora
			});
			return { ok: true, ...nuevo } as const;
		});
	} catch (e) {
		await deshacer();
		throw e;
	}
}

/**
 * Guarda los ficheros en el almacén con la ruta interna {año}/{mes}/{uuid}.{ext}: el nombre original
 * nunca forma parte de ella. `deshacer` los borra si luego no se guarda el ticket; si alguno no se
 * puede borrar, lo hará la limpieza de huérfanos.
 */
export async function guardarFicheros(almacen: Almacen, ficheros: FicheroNuevo[], ahora: Date) {
	const carpeta = ahora.toISOString().slice(0, 7).replace('-', '/');
	const rutas = ficheros.map((f) => `${carpeta}/${randomUUID()}.${f.extension}`);
	const guardados: string[] = [];
	const deshacer = async () => {
		await Promise.allSettled(guardados.map((ruta) => almacen.borrar(ruta)));
	};
	try {
		for (const [i, f] of ficheros.entries()) {
			await almacen.guardar(rutas[i], f.datos);
			guardados.push(rutas[i]);
		}
	} catch (e) {
		await deshacer();
		throw e;
	}
	return { rutas, deshacer };
}
