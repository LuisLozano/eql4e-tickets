// Envío de la invitación tras el alta (HU-G01) o al reenviarla (HU-G02). Síncrono (ADR-0004): si el
// correo falla, el alta o el código nuevo ya están guardados y el tesorero copia el enlace.
import { mensajeInvitacion } from '#lib/server/dominio/usuario/invitacion.ts';
import { correo } from '#lib/server/infra/correo/app.ts';
import { enlaceActivacion } from './enlaces.ts';

/** Lo que ve el tesorero. El enlace solo se puede mostrar ahora: se guarda su hash. */
export type ResultadoInvitacion = {
	email: string;
	caducaEn: string;
	enlace: string;
	envio: 'enviado' | 'desactivado' | 'fallido';
};

export async function enviarInvitacion(
	urlPublica: string,
	datos: { nombre: string; email: string; codigo: string; caducaEn: Date; restablecer?: boolean }
): Promise<ResultadoInvitacion> {
	const enlace = enlaceActivacion(urlPublica, datos.codigo);
	let envio: ResultadoInvitacion['envio'] = correo.envia ? 'enviado' : 'desactivado';
	try {
		await correo.enviar({
			para: datos.email,
			...mensajeInvitacion({ ...datos, enlace })
		});
	} catch (e) {
		console.error(`[correo] No se pudo enviar la invitación a ${datos.email}:`, e);
		envio = 'fallido';
	}
	return { email: datos.email, caducaEn: datos.caducaEn.toISOString(), enlace, envio };
}
