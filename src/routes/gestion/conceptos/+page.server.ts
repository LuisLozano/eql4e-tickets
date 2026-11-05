import { error, fail, redirect, type RequestEvent } from '@sveltejs/kit';
import { setError, superValidate } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { esquemaCrear, esquemaRenombrar } from '#lib/esquemas/concepto.ts';
import {
	cambiarActivo,
	crearConcepto,
	listarConceptos,
	moverConcepto,
	renombrarConcepto
} from '#lib/server/dominio/concepto/gestion.ts';
import { db } from '#lib/server/infra/db/app.ts';
import type { Actions, PageServerLoad } from './$types';

const DUPLICADO = 'Ya hay un concepto con ese nombre.';

export const load: PageServerLoad = async ({ url }) => {
	const conceptos = await listarConceptos(db);
	// Renombrar se abre en su fila con ?editar=<id>, así que funciona también sin JavaScript.
	const editando = conceptos.find((c) => String(c.id) === url.searchParams.get('editar'));
	return {
		conceptos,
		editando: editando?.id ?? null,
		crear: await superValidate(zod4(esquemaCrear), { id: 'crear' }),
		renombrar: await superValidate(
			editando ? { id: editando.id, nombre: editando.nombre } : {},
			zod4(esquemaRenombrar),
			{ id: 'renombrar', errors: false }
		)
	};
};

/** Las acciones de un botón solo envían el id del concepto. */
async function idDe({ request, locals }: RequestEvent) {
	if (!locals.usuario?.esTesorero) error(404, 'No encontrado');
	const id = Number((await request.formData()).get('id'));
	if (!Number.isInteger(id) || id <= 0) error(400, 'Concepto no válido');
	return id;
}

export const actions: Actions = {
	crear: async ({ request, locals }) => {
		if (!locals.usuario?.esTesorero) error(404, 'No encontrado');
		const form = await superValidate(request, zod4(esquemaCrear), { id: 'crear' });
		if (!form.valid) return fail(400, { form });

		const r = await crearConcepto(db, form.data.nombre);
		if (!r.ok) return setError(form, 'nombre', DUPLICADO);
		return { form };
	},

	renombrar: async ({ request, locals }) => {
		if (!locals.usuario?.esTesorero) error(404, 'No encontrado');
		const form = await superValidate(request, zod4(esquemaRenombrar), { id: 'renombrar' });
		if (!form.valid) return fail(400, { form });

		const r = await renombrarConcepto(db, form.data.id, form.data.nombre);
		if (!r.ok && r.motivo === 'duplicado') return setError(form, 'nombre', DUPLICADO);
		redirect(303, '/gestion/conceptos');
	},

	// Si otro tesorero lo borró o cambió entretanto, basta con que la lista se recargue.
	subir: async (evento) => {
		await moverConcepto(db, await idDe(evento), 'subir');
	},
	bajar: async (evento) => {
		await moverConcepto(db, await idDe(evento), 'bajar');
	},
	activar: async (evento) => {
		await cambiarActivo(db, await idDe(evento), true);
	},
	desactivar: async (evento) => {
		await cambiarActivo(db, await idDe(evento), false);
	}
};
