import { error, fail, redirect } from '@sveltejs/kit';
import { message, setError, superValidate, withFiles } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { conContenido, esquemaEdicion, OTRO } from '#lib/esquemas/ticket.ts';
import { hoyEnMadrid } from '#lib/formato.ts';
import { ticketParaEditar } from '#lib/server/dominio/ticket/consultas.ts';
import { conceptosActivos, datosDeFormulario } from '#lib/server/dominio/ticket/crear.ts';
import { editarTicket, type ResultadoEdicion } from '#lib/server/dominio/ticket/editar.ts';
import { almacen } from '#lib/server/infra/almacenamiento/app.ts';
import { db } from '#lib/server/infra/db/app.ts';
import { prepararSubidos } from '#lib/server/infra/ficheros.ts';
import type { Actions, PageServerLoad } from './$types';

// Ajeno, inexistente o mal escrito: siempre «no encontrado» (R-01).
function numeroDe(params: { numero: string }) {
	const numero = Number(params.numero);
	if (!Number.isSafeInteger(numero) || numero <= 0) error(404, 'No encontrado');
	return numero;
}

const importeATexto = (c: number) => (c / 100).toFixed(2).replace('.', ',');

export const load: PageServerLoad = async ({ params, locals }) => {
	const numero = numeroDe(params);
	const t = await ticketParaEditar(db, locals.usuario!.id, numero);
	if (!t) error(404, 'No encontrado');
	// Ya no se puede editar (autorizado, pagado o anulado): al detalle, que dice cómo está.
	if (t.estado !== 'pendiente_autorizar' && t.estado !== 'rechazado') {
		redirect(303, `/tickets/${numero}`);
	}

	const conceptos = await conceptosActivos(db);
	// El que ya tenía se puede conservar aunque se haya desactivado.
	if (t.conceptoId !== null && !conceptos.some((c) => c.id === t.conceptoId)) {
		conceptos.push({ id: t.conceptoId, nombre: t.concepto! });
	}
	return {
		ticket: t,
		conceptos,
		hoy: hoyEnMadrid(),
		form: await superValidate(
			{
				importe: importeATexto(t.importeCentimos),
				fechaCompra: t.fechaCompra,
				concepto: t.conceptoId === null ? OTRO : String(t.conceptoId),
				conceptoOtro: t.conceptoOtro ?? '',
				observaciones: t.observaciones ?? '',
				version: t.version,
				quitar: []
			},
			zod4(esquemaEdicion),
			{ errors: false }
		)
	};
};

const MENSAJE: Record<Exclude<ResultadoEdicion, { ok: true }>['motivo'], string> = {
	modificado:
		'Un tesorero ha revisado el ticket mientras lo editabas, así que no se ha guardado. Mira cómo está ahora.',
	estado: 'Este ticket ya no se puede editar. Mira cómo está ahora.',
	concepto: 'Ese concepto ya no está disponible. Elige otro.',
	ficheros: 'El ticket tiene que tener entre 1 y 5 fotos o PDF.',
	sin_cambios: 'No has cambiado nada.',
	no_encontrado: 'No encontrado'
};

export const actions: Actions = {
	default: async ({ request, params, locals }) => {
		const numero = numeroDe(params);
		const form = await superValidate(request, zod4(esquemaEdicion));
		if (!form.valid) return fail(400, withFiles({ form }));

		const subidos = conContenido(form.data.ficheros);
		// Los ficheros no se devuelven al navegador: si algo falla, el socio vuelve a elegirlos.
		form.data.ficheros = [];

		const preparados = await prepararSubidos(subidos);
		if (!preparados.ok) return setError(form, 'ficheros._errors', preparados.error);

		const r = await editarTicket(
			db,
			almacen,
			locals.usuario!,
			numero,
			{
				version: form.data.version,
				datos: datosDeFormulario(form.data),
				quitar: form.data.quitar,
				nuevos: preparados.ficheros
			},
			new Date()
		);
		if (!r.ok) {
			if (r.motivo === 'no_encontrado') error(404, 'No encontrado');
			if (r.motivo === 'concepto') return setError(form, 'concepto', MENSAJE.concepto);
			if (r.motivo === 'ficheros') return setError(form, 'ficheros._errors', MENSAJE.ficheros);
			if (r.motivo === 'sin_cambios') {
				return message(form, MENSAJE.sin_cambios, { status: 400 });
			}
			// Lo ha cambiado un tesorero (E-04): no se aplica nada.
			return message(form, MENSAJE[r.motivo], { status: 409 });
		}
		redirect(303, `/tickets/${numero}?${r.accion === 'reenviar' ? 'reenviado' : 'guardado'}`);
	}
};
