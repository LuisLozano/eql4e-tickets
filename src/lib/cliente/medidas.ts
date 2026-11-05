/** Medidas para que el lado mayor no pase de `lado`, sin agrandar ni deformar. */
export function medidas(ancho: number, alto: number, lado: number) {
	const escala = Math.min(1, lado / Math.max(ancho, alto));
	return { ancho: Math.round(ancho * escala), alto: Math.round(alto * escala) };
}
