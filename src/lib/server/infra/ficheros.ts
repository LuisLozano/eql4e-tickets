// Comprobación y recodificación de lo que sube el socio (ADR-0002, RNF-16).
import { fileTypeFromBuffer } from 'file-type';
import sharp from 'sharp';
import type { FicheroNuevo } from '#lib/server/dominio/ticket/crear.ts';
import { MAX_BYTES } from '#lib/esquemas/ticket.ts';

export type ResultadoPreparar =
	| { ok: true; fichero: FicheroNuevo }
	| { ok: false; motivo: 'tipo' | 'heic' | 'imagen' | 'tamano' };

const IMAGENES = new Set(['image/jpeg', 'image/png', 'image/webp']);
export const LADO_MAXIMO = 2000;

/**
 * Mira el tipo real (no la extensión). Las imágenes se recodifican a WebP con el lado mayor de
 * 2000 px: se giran según el EXIF y después se descartan sus metadatos (ubicación GPS incluida).
 * Los PDF se guardan tal cual.
 */
export async function prepararFichero(
	nombreOriginal: string,
	bytes: Uint8Array
): Promise<ResultadoPreparar> {
	const tipo = await fileTypeFromBuffer(bytes);
	const nombre = nombreOriginal.slice(0, 255) || 'fichero';

	if (tipo?.mime === 'application/pdf') {
		if (bytes.length > MAX_BYTES) return { ok: false, motivo: 'tamano' };
		return {
			ok: true,
			fichero: { nombreOriginal: nombre, tipoMime: tipo.mime, extension: 'pdf', datos: bytes }
		};
	}
	if (tipo?.mime === 'image/heic' || tipo?.mime === 'image/heif')
		return { ok: false, motivo: 'heic' };
	if (!tipo || !IMAGENES.has(tipo.mime)) return { ok: false, motivo: 'tipo' };

	let datos: Uint8Array;
	try {
		datos = await sharp(bytes)
			.rotate()
			.resize({
				width: LADO_MAXIMO,
				height: LADO_MAXIMO,
				fit: 'inside',
				withoutEnlargement: true
			})
			.webp({ quality: 80 })
			.toBuffer();
	} catch {
		return { ok: false, motivo: 'imagen' };
	}
	if (datos.length > MAX_BYTES) return { ok: false, motivo: 'tamano' };
	return {
		ok: true,
		fichero: { nombreOriginal: nombre, tipoMime: 'image/webp', extension: 'webp', datos }
	};
}

const PROBLEMAS: Record<Extract<ResultadoPreparar, { ok: false }>['motivo'], string> = {
	tipo: 'solo se admiten fotos (JPEG, PNG o WebP) y PDF',
	heic: 'las fotos HEIC no se admiten; en el iPhone, adjúntala desde «Fotos» o cambia el formato de la cámara a «Más compatible»',
	imagen: 'la imagen está dañada o no se puede leer',
	tamano: 'ocupa más de 10 MB'
};

/** Prepara lo subido en un formulario; en el primero que no vale, el error para el socio. */
export async function prepararSubidos(
	subidos: File[]
): Promise<{ ok: true; ficheros: FicheroNuevo[] } | { ok: false; error: string }> {
	const ficheros: FicheroNuevo[] = [];
	for (const f of subidos) {
		const r = await prepararFichero(f.name, new Uint8Array(await f.arrayBuffer()));
		if (!r.ok) return { ok: false, error: `«${f.name}»: ${PROBLEMAS[r.motivo]}.` };
		ficheros.push(r.fichero);
	}
	return { ok: true, ficheros };
}
