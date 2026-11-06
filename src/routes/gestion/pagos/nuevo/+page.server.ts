import { error, fail, redirect } from '@sveltejs/kit';
import { message, setError, superValidate, withFiles } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { esquemaPago, leerMarcado, ticketMarcado } from '#lib/esquemas/pago.ts';
import { hoyEnMadrid } from '#lib/formato.ts';
import { pendientesDeSocio } from '#lib/server/dominio/pago/consultas.ts';
import { registrarPago } from '#lib/server/dominio/pago/registrar.ts';
import { almacen } from '#lib/server/infra/almacenamiento/app.ts';
import { db } from '#lib/server/infra/db/app.ts';
import { prepararSubidos } from '#lib/server/infra/ficheros.ts';
import type { Actions, PageServerLoad } from './$types';

// Solo para tesoreros: lo comprueba la guarda de hooks.server.ts (404 para el resto).

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const load: PageServerLoad = async ({ url, locals }) => {
	const socioId = url.searchParams.get('socio') ?? '';
	// Sin socio (o el propio, que tiene que pagarlo otro, R-04): a elegirlo en «Pagos».
	if (!UUID.test(socioId) || socioId === locals.usuario!.id) redirect(303, '/gestion/pagos');
	const socio = await pendientesDeSocio(db, socioId);
	if (!socio) error(404, 'No encontrado');

	// Desde el detalle de un ticket (?ticket=<número>) solo va marcado ese; si no, todos.
	const desde = socio.tickets.find((t) => String(t.numero) === url.searchParams.get('ticket'));
	const marcados = (desde ? [desde] : socio.tickets).map((t) => ticketMarcado(t.numero, t.version));
	return {
		socio,
		hoy: hoyEnMadrid(),
		form: await superValidate(
			{ socio: socio.id, tickets: marcados, fechaPago: hoyEnMadrid() },
			zod4(esquemaPago),
			{ errors: false }
		)
	};
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const form = await superValidate(request, zod4(esquemaPago));
		if (!form.valid) return fail(400, withFiles({ form }));

		const subido = form.data.justificante?.size ? [form.data.justificante] : [];
		// El fichero no se devuelve al navegador: si algo falla, se vuelve a elegir.
		form.data.justificante = undefined;
		const preparado = await prepararSubidos(subido);
		if (!preparado.ok) return setError(form, 'justificante', preparado.error);

		const r = await registrarPago(
			db,
			almacen,
			locals.usuario!,
			{
				socioId: form.data.socio,
				tickets: form.data.tickets.map(leerMarcado),
				fechaPago: form.data.fechaPago,
				metodo: form.data.metodo,
				justificante: preparado.ficheros[0] ?? null
			},
			new Date()
		);
		if (!r.ok) {
			if (r.motivo === 'permiso') error(404, 'No encontrado');
			return message(
				form,
				r.motivo === 'propio'
					? 'Son tus tickets: los tiene que pagar otro tesorero.'
					: 'Algún ticket ha cambiado mientras registrabas el pago (puede que otro tesorero ya lo haya pagado). No se ha registrado nada: recarga la lista y revísala.',
				{ status: 409 }
			);
		}
		redirect(303, `/gestion/pagos/${r.id}?registrado`);
	}
};
