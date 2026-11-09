// Petición de restablecimiento (HU-A04). Se responde sin esperar a nada: buscar el usuario, crear
// el código y enviar el correo solo pasan si el teléfono tiene cuenta, y si la respuesta los
// esperara, su tiempo delataría qué teléfonos la tienen. A diferencia de la invitación (ADR-0004),
// nadie necesita saber si el envío ha fallado: queda en el log.
import { solicitarRestablecimiento } from '#lib/server/dominio/auth/acceso.ts';
import { mensajeRestablecimiento } from '#lib/server/dominio/usuario/invitacion.ts';
import { correo } from '#lib/server/infra/correo/app.ts';
import { db } from '#lib/server/infra/db/app.ts';
import { enlaceRestablecimiento } from './enlaces.ts';

export function pedirRestablecimiento(urlPublica: string, telefono: string): void {
	let para = '';
	(async () => {
		const r = await solicitarRestablecimiento(db, { telefono }, new Date());
		if (!r) return;
		para = r.email;
		const enlace = enlaceRestablecimiento(urlPublica, r.codigo);
		await correo.enviar({ para, ...mensajeRestablecimiento({ ...r, enlace }) });
	})().catch((e) => console.error(`[correo] No se pudo enviar el restablecimiento a ${para}:`, e));
}
