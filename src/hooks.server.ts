import { error, redirect } from '@sveltejs/kit';
import { sequence, type Handle, type ServerInit } from '@sveltejs/kit/hooks';
import { URL_PUBLICA } from '$app/env/private';
import { asegurarTesoreroInicial } from '#lib/server/dominio/auth/tesorero-inicial.ts';
import { validarSesion } from '#lib/server/dominio/auth/sesiones.ts';
import { limpiarHuerfanos } from '#lib/server/dominio/ficheros/huerfanos.ts';
import { purgar } from '#lib/server/dominio/purga/purga.ts';
import { almacen } from '#lib/server/infra/almacenamiento/app.ts';
import { db } from '#lib/server/infra/db/app.ts';
import { programar } from '#lib/server/infra/tareas.ts';
import { hoyEnMadrid } from '#lib/formato.ts';
import { enlaceActivacion } from '#lib/server/web/enlaces.ts';
import { COOKIE_SESION, ponerCookieSesion, quitarCookieSesion } from '#lib/server/web/sesion.ts';

/** Al arrancar: tareas programadas y tesorero inicial si no hay ninguno activo (R-06). */
export const init: ServerInit = async () => {
	// Purga (HU-G05) cada día a las 18:55: así nada pasa de los 18 meses más de un día, aunque el
	// equipo esté apagado alguna tarde. Los ficheros se borran después del COMMIT; si alguno falla,
	// la tarea de huérfanos lo recoge. En el log, solo cifras: nada de datos personales.
	programar(
		db,
		'purga',
		'0 55 18 * * *',
		(tx) => purgar(tx, hoyEnMadrid()),
		async (r) => {
			if (!r.ok) return console.log('[tareas] purga: otro proceso ya la está ejecutando');
			const { tickets, pagos, ficheros } = r.resultado;
			const fallidos = (await Promise.allSettled(ficheros.map((f) => almacen.borrar(f)))).filter(
				(b) => b.status === 'rejected'
			).length;
			console.log(
				`[tareas] purga: ${tickets} tickets, ${pagos} pagos y ${ficheros.length - fallidos} ficheros eliminados` +
					(fallidos
						? ` (${fallidos} ficheros no se pudieron borrar: los recogerá la tarea de huérfanos)`
						: '')
			);
		}
	);
	// Huérfanos cada día a las 19:00: antes de la copia de seguridad (19:30) y del apagado (20:20).
	programar(
		db,
		'huerfanos',
		'0 0 19 * * *',
		(tx) => limpiarHuerfanos(tx, almacen, new Date()),
		(r) => {
			if (!r.ok) console.log('[tareas] huerfanos: otro proceso ya la está ejecutando');
			else if (!r.resultado.ok) {
				console.error(
					`[tareas] huerfanos: ${r.resultado.huerfanos} ficheros sin ticket ni pago; son demasiados y no se ha borrado ninguno. Revísalo a mano.`
				);
			} else {
				const { revisados, borrados } = r.resultado;
				console.log(`[tareas] huerfanos: ${revisados} revisados, ${borrados.length} borrados`);
				for (const ruta of borrados) console.log(`[tareas] huerfanos: borrado ${ruta}`);
			}
		}
	);

	try {
		const inicial = await asegurarTesoreroInicial(db, new Date());
		if (inicial) {
			console.log(
				[
					'',
					'================ TESORERO INICIAL (R-06) ================',
					'No hay ningún tesorero activo. Abre este enlace para activarlo',
					`con el teléfono ${inicial.telefono} y elige tu contraseña`,
					'(válido 7 días; se genera otro en cada arranque):',
					'',
					enlaceActivacion(URL_PUBLICA, inicial.codigo),
					'=========================================================',
					''
				].join('\n')
			);
		}
	} catch (e) {
		console.error('[tesorero inicial] No se pudo comprobar:', e);
	}
};

const RUTAS_PUBLICAS = ['/entrar', '/activar', '/restablecer', '/salud', '/ayuda'];
const esPublica = (ruta: string) =>
	RUTAS_PUBLICAS.some((p) => ruta === p || ruta.startsWith(`${p}/`));

const autenticar: Handle = async ({ event, resolve }) => {
	const token = event.cookies.get(COOKIE_SESION) ?? null;
	event.locals.usuario = null;
	event.locals.token = null;

	if (token) {
		const resultado = await validarSesion(db, token, new Date());
		if (resultado) {
			event.locals.usuario = resultado.usuario;
			event.locals.token = token;
			if (resultado.renovada) ponerCookieSesion(event.cookies, token, resultado.caducaEn);
		} else {
			quitarCookieSesion(event.cookies);
		}
	}
	return resolve(event);
};

/** Guarda de rutas (ADR-0003). Es una comodidad: la seguridad real se comprueba en el dominio. */
const guardar: Handle = async ({ event, resolve }) => {
	const ruta = event.url.pathname;
	const { usuario } = event.locals;

	if (!usuario && !esPublica(ruta)) {
		if (event.request.method !== 'GET') error(401, 'Tu sesión ha caducado. Vuelve a entrar.');
		const destino = new URL('/entrar', event.url);
		if (ruta !== '/') destino.searchParams.set('volver', ruta + event.url.search);
		redirect(303, destino.pathname + destino.search);
	}

	// Con sesión, «Entrar» y «Activar» no tienen sentido.
	if (usuario && (ruta === '/entrar' || ruta === '/activar')) redirect(303, '/');

	// Un recurso de gestión no existe para quien no es tesorero (R-01: 404, no 403).
	if (ruta.startsWith('/gestion') && !usuario?.esTesorero) error(404, 'No encontrado');

	return resolve(event);
};

const cabeceras: Handle = async ({ event, resolve }) => {
	const respuesta = await resolve(event);
	respuesta.headers.set('Referrer-Policy', 'same-origin');
	respuesta.headers.set('X-Frame-Options', 'DENY');
	respuesta.headers.set('X-Content-Type-Options', 'nosniff');
	respuesta.headers.set('Permissions-Policy', 'camera=(self), geolocation=(), microphone=()');
	return respuesta;
};

export const handle = sequence(autenticar, guardar, cabeceras);
