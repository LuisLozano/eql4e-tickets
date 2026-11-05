// Alta de un usuario por un tesorero (HU-G01): queda invitado, con un código de activación de 7 días.
import { eq } from 'drizzle-orm';
import { normalizarTelefono } from '#lib/telefono.ts';
import { usuario } from '#lib/server/infra/db/esquema.ts';
import type { Conexion } from '#lib/server/infra/db/tipos.ts';
import { crearCodigo } from '../auth/codigos.ts';

export type DatosAlta = {
	nombre: string;
	telefono: string;
	email: string;
	esSocio: boolean;
	esTesorero: boolean;
};

export type ResultadoAlta =
	| { ok: true; usuarioId: string; email: string; codigo: string; caducaEn: Date }
	| { ok: false; campo: 'telefono'; motivo: 'invalido' | 'duplicado' }
	| { ok: false; campo: 'email'; motivo: 'duplicado' };

export async function darDeAlta(
	conexion: Conexion,
	datos: DatosAlta,
	creadoPor: string,
	ahora: Date
): Promise<ResultadoAlta> {
	const telefono = normalizarTelefono(datos.telefono);
	if (!telefono) return { ok: false, campo: 'telefono', motivo: 'invalido' };
	const email = datos.email.trim().toLowerCase();

	return conexion.transaction(async (tx) => {
		// Sin consulta previa: la unicidad la garantiza la base de datos, también con dos altas a la vez.
		const [nuevo] = await tx
			.insert(usuario)
			.values({
				nombre: datos.nombre.trim(),
				telefono,
				email,
				esSocio: datos.esSocio,
				esTesorero: datos.esTesorero
			})
			.onConflictDoNothing()
			.returning({ id: usuario.id });

		if (!nuevo) {
			const [mismoTelefono] = await tx
				.select({ id: usuario.id })
				.from(usuario)
				.where(eq(usuario.telefono, telefono));
			return mismoTelefono
				? ({ ok: false, campo: 'telefono', motivo: 'duplicado' } as const)
				: ({ ok: false, campo: 'email', motivo: 'duplicado' } as const);
		}

		const { codigo, caducaEn } = await crearCodigo(
			tx,
			{ usuarioId: nuevo.id, tipo: 'activacion', creadoPor },
			ahora
		);
		return { ok: true, usuarioId: nuevo.id, email, codigo, caducaEn } as const;
	});
}
