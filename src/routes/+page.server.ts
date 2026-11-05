import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

// La guarda de hooks.server.ts ya ha mandado a /entrar a quien no tiene sesión.
export const load: PageServerLoad = ({ locals }) => {
	redirect(303, locals.usuario?.esTesorero ? '/gestion/tickets' : '/tickets');
};
