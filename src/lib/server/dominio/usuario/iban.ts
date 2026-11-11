// IBAN donde el socio recibe los pagos (HU-S07). Lo pone el propio socio (al activar la cuenta o en
// «Mi cuenta») o un tesorero desde su ficha. Se borra al darle de baja (gestion.ts).
import { eq } from 'drizzle-orm';
import { normalizarIban } from '#lib/iban.ts';
import { usuario } from '#lib/server/infra/db/esquema.ts';
import type { Conexion } from '#lib/server/infra/db/tipos.ts';
import type { UsuarioSesion } from '../auth/sesiones.ts';

export type ResultadoIban =
	{ ok: true } | { ok: false; motivo: 'invalido' | 'permiso' | 'no_encontrado' };

/** Texto vacío: lo borra. Un socio solo puede cambiar el suyo; un tesorero, el de cualquiera. */
export async function cambiarIban(
	conexion: Conexion,
	actor: UsuarioSesion,
	usuarioId: string,
	texto: string
): Promise<ResultadoIban> {
	if (actor.id !== usuarioId && !actor.esTesorero) return { ok: false, motivo: 'permiso' };
	const vacio = texto.trim() === '';
	const iban = vacio ? null : normalizarIban(texto);
	if (!vacio && !iban) return { ok: false, motivo: 'invalido' };
	const cambiados = await conexion
		.update(usuario)
		.set({ iban })
		.where(eq(usuario.id, usuarioId))
		.returning({ id: usuario.id });
	return cambiados.length ? { ok: true } : { ok: false, motivo: 'no_encontrado' };
}

/** El IBAN guardado, o nulo. */
export async function ibanDe(conexion: Conexion, usuarioId: string): Promise<string | null> {
	const [u] = await conexion
		.select({ iban: usuario.iban })
		.from(usuario)
		.where(eq(usuario.id, usuarioId));
	return u?.iban ?? null;
}
