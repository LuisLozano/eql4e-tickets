import { error, fail, redirect } from '@sveltejs/kit';
import { setError, superValidate, withFiles } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { conContenido, esquemaTicket, OTRO } from '#lib/esquemas/ticket.ts';
import { hoyEnMadrid } from '#lib/formato.ts';
import { importeACentimos } from '#lib/importe.ts';
import {
	conceptosActivos,
	crearTicket,
	type FicheroNuevo
} from '#lib/server/dominio/ticket/crear.ts';
import { almacen } from '#lib/server/infra/almacenamiento/app.ts';
import { db } from '#lib/server/infra/db/app.ts';
import { prepararFichero, type ResultadoPreparar } from '#lib/server/infra/ficheros.ts';
import type { Actions, PageServerLoad } from './$types';

const PROBLEMAS: Record<Extract<ResultadoPreparar, { ok: false }>['motivo'], string> = {
	tipo: 'solo se admiten fotos (JPEG, PNG o WebP) y PDF',
	heic: 'las fotos HEIC no se admiten; en el iPhone, adjúntala desde «Fotos» o cambia el formato de la cámara a «Más compatible»',
	imagen: 'la imagen está dañada o no se puede leer',
	tamano: 'ocupa más de 10 MB'
};

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.usuario?.esSocio) error(404, 'No encontrado');
	return {
		conceptos: await conceptosActivos(db),
		hoy: hoyEnMadrid(),
		form: await superValidate({ fechaCompra: hoyEnMadrid() }, zod4(esquemaTicket), {
			errors: false
		})
	};
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		if (!locals.usuario?.esSocio) error(404, 'No encontrado');
		const form = await superValidate(request, zod4(esquemaTicket));
		if (!form.valid) return fail(400, withFiles({ form }));

		const subidos = conContenido(form.data.ficheros);
		// Los ficheros no se devuelven al navegador: si algo falla, el socio vuelve a elegirlos.
		form.data.ficheros = [];

		const ficheros: FicheroNuevo[] = [];
		for (const f of subidos) {
			const r = await prepararFichero(f.name, new Uint8Array(await f.arrayBuffer()));
			if (!r.ok) return setError(form, 'ficheros._errors', `«${f.name}»: ${PROBLEMAS[r.motivo]}.`);
			ficheros.push(r.fichero);
		}

		const { importe, fechaCompra, concepto, conceptoOtro, observaciones } = form.data;
		const otro = concepto === OTRO;
		const r = await crearTicket(
			db,
			almacen,
			locals.usuario.id,
			{
				importeCentimos: importeACentimos(importe)!,
				fechaCompra,
				conceptoId: otro ? null : Number(concepto),
				conceptoOtro: otro ? conceptoOtro : null,
				observaciones: observaciones || null
			},
			ficheros,
			new Date()
		);
		if (!r.ok) {
			return setError(form, 'concepto', 'Ese concepto ya no está disponible. Elige otro.');
		}
		redirect(303, `/tickets?enviado=${r.numero}`);
	}
};
