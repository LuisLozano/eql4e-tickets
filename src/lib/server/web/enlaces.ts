// Enlaces absolutos para los correos y el log: parten de URL_PUBLICA, no de la petición.

/** → https://…/activar?codigo=XXXX-… */
export function enlaceActivacion(urlPublica: string, codigo: string): string {
	const enlace = new URL('/activar', urlPublica);
	enlace.searchParams.set('codigo', codigo);
	return enlace.toString();
}
