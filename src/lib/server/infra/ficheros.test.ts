import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { prepararFichero } from './ficheros.ts';

const PDF = new TextEncoder().encode('%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n');

/** Una foto apaisada de 3000×1000 con orientación EXIF 6 (girada) y ubicación GPS. */
async function fotoConGps() {
	return sharp({ create: { width: 3000, height: 1000, channels: 3, background: '#c33' } })
		.jpeg()
		.withExif({
			IFD0: { Make: 'Telefono' },
			IFD3: { GPSLatitudeRef: 'N', GPSLatitude: '40/1 25/1 0/1' }
		})
		.withMetadata({ orientation: 6 })
		.toBuffer();
}

describe('prepararFichero', () => {
	it('recodifica la foto a WebP, la gira según el EXIF, la reduce y le quita los metadatos', async () => {
		const r = await prepararFichero('IMG_0001.jpg', new Uint8Array(await fotoConGps()));
		if (!r.ok) throw new Error(r.motivo);
		expect(r.fichero).toMatchObject({
			nombreOriginal: 'IMG_0001.jpg',
			tipoMime: 'image/webp',
			extension: 'webp'
		});
		const meta = await sharp(r.fichero.datos).metadata();
		expect(meta).toMatchObject({ format: 'webp', width: 667, height: 2000 });
		expect(meta.exif).toBeUndefined();
		expect(meta.orientation).toBeUndefined();
	});

	it('no agranda las imágenes pequeñas', async () => {
		const png = await sharp({ create: { width: 40, height: 30, channels: 4, background: '#0000' } })
			.png()
			.toBuffer();
		const r = await prepararFichero('captura.png', new Uint8Array(png));
		if (!r.ok) throw new Error(r.motivo);
		expect(await sharp(r.fichero.datos).metadata()).toMatchObject({ width: 40, height: 30 });
	});

	it('guarda los PDF tal cual', async () => {
		expect(await prepararFichero('factura.pdf', PDF)).toEqual({
			ok: true,
			fichero: {
				nombreOriginal: 'factura.pdf',
				tipoMime: 'application/pdf',
				extension: 'pdf',
				datos: PDF
			}
		});
	});

	it('rechaza un PDF de más de 10 MB', async () => {
		const grande = new Uint8Array(10 * 1024 * 1024 + 1);
		grande.set(PDF);
		expect(await prepararFichero('grande.pdf', grande)).toEqual({ ok: false, motivo: 'tamano' });
	});

	it('mira el contenido, no la extensión', async () => {
		const texto = new TextEncoder().encode('esto no es una foto');
		expect(await prepararFichero('ticket.jpg', texto)).toEqual({ ok: false, motivo: 'tipo' });
		const gif = await sharp({ create: { width: 2, height: 2, channels: 3, background: '#000' } })
			.gif()
			.toBuffer();
		expect(await prepararFichero('ticket.gif', new Uint8Array(gif))).toEqual({
			ok: false,
			motivo: 'tipo'
		});
	});

	it('rechaza HEIC: no se le pueden quitar los metadatos', async () => {
		// Cabecera mínima de un HEIC: caja «ftyp» con la marca «heic».
		const heic = new Uint8Array([
			0,
			0,
			0,
			24,
			...new TextEncoder().encode('ftypheic'),
			0,
			0,
			0,
			0,
			...new TextEncoder().encode('mif1heic')
		]);
		expect(await prepararFichero('IMG_0002.HEIC', heic)).toEqual({ ok: false, motivo: 'heic' });
	});

	it('rechaza una imagen dañada', async () => {
		const jpeg = await sharp({ create: { width: 50, height: 50, channels: 3, background: '#000' } })
			.jpeg()
			.toBuffer();
		expect(await prepararFichero('rota.jpg', new Uint8Array(jpeg.subarray(0, 40)))).toEqual({
			ok: false,
			motivo: 'imagen'
		});
	});

	it('pone un nombre si no lo hay y recorta los muy largos', async () => {
		const r1 = await prepararFichero('', PDF);
		const r2 = await prepararFichero('x'.repeat(300), PDF);
		expect(r1.ok && r1.fichero.nombreOriginal).toBe('fichero');
		expect(r2.ok && r2.fichero.nombreOriginal).toHaveLength(255);
	});
});
