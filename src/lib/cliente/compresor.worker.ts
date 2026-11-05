// Web worker de compresión (ADR-0005): reduce la foto sin bloquear la pantalla.
import { medidas } from './medidas.ts';

export type Peticion = { id: number; fichero: File; lado: number; calidad: number };
export type Respuesta = { id: number; blob: Blob } | { id: number; error: string };

self.onmessage = async ({ data }: MessageEvent<Peticion>) => {
	const { id, fichero, lado, calidad } = data;
	try {
		// Respeta la orientación EXIF, como haría la galería del móvil.
		const imagen = await createImageBitmap(fichero, { imageOrientation: 'from-image' });
		const { ancho, alto } = medidas(imagen.width, imagen.height, lado);
		const lienzo = new OffscreenCanvas(ancho, alto);
		const ctx = lienzo.getContext('2d')!;
		// JPEG no tiene transparencia: fondo blanco en vez de negro.
		ctx.fillStyle = '#fff';
		ctx.fillRect(0, 0, ancho, alto);
		ctx.drawImage(imagen, 0, 0, ancho, alto);
		imagen.close();
		const blob = await lienzo.convertToBlob({ type: 'image/jpeg', quality: calidad });
		self.postMessage({ id, blob } satisfies Respuesta);
	} catch (e) {
		self.postMessage({ id, error: String(e) } satisfies Respuesta);
	}
};
