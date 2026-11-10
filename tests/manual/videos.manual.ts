// Vídeos de demostración para enseñar la app a la junta: uno del socio y otro del tesorero, en el
// móvil, con los datos de demostración. Rótulos en vez de voz y un círculo donde se pulsa. Se graban
// en WebM y ffmpeg los pasa a MP4, que se ve en cualquier móvil (docs/manual/README.md).
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { expect, test, type Browser, type Locator, type Page } from '@playwright/test';
import { entrar, enviarTicket } from './acciones.ts';
import {
	ALTA,
	CONTRASENA_OTROS,
	fotoTicket,
	OTROS_SOCIOS,
	prepararOtrosSocios,
	SOCIA,
	TESORERA
} from './demo.ts';

// Playwright graba al tamaño CSS del móvil (412 × 839); ffmpeg lo amplía al doble, que los
// reproductores y WhatsApp tratan mejor que un vídeo tan pequeño.
const TAMANO = { width: 412, height: 839 };
const LOGO = `data:image/png;base64,${readFileSync('static/logo.png').toString('base64')}`;

// Lo que se ve encima de la app: el rótulo de cada paso y un círculo donde se pulsa. Se monta en
// cada página nueva; el texto del rótulo sobrevive a la navegación en sessionStorage.
function escena() {
	const montar = () => {
		if (document.getElementById('demo-rotulo')) return;
		const rotulo = document.createElement('div');
		rotulo.id = 'demo-rotulo';
		Object.assign(rotulo.style, {
			position: 'fixed',
			left: '10px',
			right: '10px',
			bottom: '14px',
			zIndex: '2147483647',
			padding: '10px 14px',
			borderRadius: '12px',
			background: 'rgba(21, 23, 27, 0.9)',
			color: '#fff',
			font: '600 17px/1.35 system-ui, sans-serif',
			textAlign: 'center',
			pointerEvents: 'none',
			transition: 'opacity 0.3s'
		});
		rotulo.textContent = sessionStorage.getItem('demo-rotulo') ?? '';
		rotulo.style.opacity = rotulo.textContent ? '1' : '0';
		document.documentElement.append(rotulo);
		document.addEventListener(
			'pointerdown',
			(e) => {
				const circulo = document.createElement('div');
				Object.assign(circulo.style, {
					position: 'fixed',
					left: `${e.clientX - 22}px`,
					top: `${e.clientY - 22}px`,
					width: '44px',
					height: '44px',
					borderRadius: '50%',
					background: 'rgba(255, 196, 0, 0.55)',
					border: '2px solid rgba(200, 140, 0, 0.9)',
					zIndex: '2147483646',
					pointerEvents: 'none'
				});
				document.documentElement.append(circulo);
				circulo
					.animate(
						[
							{ transform: 'scale(0.6)', opacity: 1 },
							{ transform: 'scale(1.4)', opacity: 0 }
						],
						{ duration: 700, easing: 'ease-out' }
					)
					.finished.then(() => circulo.remove());
			},
			true
		);
	};
	if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', montar);
	else montar();
}

/** Graba una página del móvil. `tiempo()` da los segundos de vídeo transcurridos, para los cortes. */
async function grabadora(browser: Browser) {
	const contexto = await browser.newContext({
		recordVideo: { dir: 'test-results/videos', size: TAMANO }
	});
	await contexto.addInitScript(escena);
	const page = await contexto.newPage();
	const inicio = Date.now();
	return { contexto, page, tiempo: () => (Date.now() - inicio) / 1000 };
}

/** Cierra la grabación y la pasa a MP4 sin los tramos de `cortes` (en segundos). */
async function guardar(
	{ contexto, page }: Awaited<ReturnType<typeof grabadora>>,
	nombre: string,
	cortes: [number, number][] = []
) {
	await contexto.close();
	const webm = await page.video()!.path();
	const fuera = cortes.map(([a, b]) => `between(t,${a.toFixed(2)},${b.toFixed(2)})`).join('+');
	const filtro = [
		'fps=25',
		...(fuera ? [`select='not(${fuera})'`, 'setpts=N/25/TB'] : []),
		'scale=iw*2:ih*2:flags=lanczos'
	].join(',');
	const opciones = '-an -c:v libx264 -crf 22 -preset slow -pix_fmt yuv420p -movflags +faststart';
	const r = spawnSync(
		'ffmpeg',
		[
			'-y',
			'-loglevel',
			'error',
			'-i',
			webm,
			'-vf',
			filtro,
			...opciones.split(' '),
			`docs/manual/${nombre}.mp4`
		],
		{ stdio: 'inherit' }
	);
	if (r.error || r.status !== 0) {
		throw new Error(
			`ffmpeg no ha podido convertir el vídeo (¿está instalado?): ${r.error ?? r.status}`
		);
	}
}

const pausa = (page: Page, ms: number) => page.waitForTimeout(ms);

/** Cambia el rótulo y deja tiempo para leerlo. */
async function rotulo(page: Page, texto: string, ms = 2200) {
	await page.evaluate((t) => {
		sessionStorage.setItem('demo-rotulo', t);
		const r = document.getElementById('demo-rotulo');
		if (r) {
			r.textContent = t;
			r.style.opacity = t ? '1' : '0';
		}
	}, texto);
	await pausa(page, ms);
}

/** Pulsa como una persona: primero lo pone a la vista y se detiene un momento. */
async function pulsar(l: Locator, despues = 1200) {
	await l.scrollIntoViewIfNeeded();
	await l.page().waitForTimeout(500);
	await l.click();
	await l.page().waitForTimeout(despues);
}

async function escribir(l: Locator, texto: string) {
	await l.scrollIntoViewIfNeeded();
	await l.click();
	await l.pressSequentially(texto, { delay: 60 });
	await l.page().waitForTimeout(400);
}

/** Desplaza la página poco a poco, como con el dedo. */
async function desplazar(page: Page, px: number) {
	for (let i = 0; i < Math.abs(px) / 40; i++) {
		await page.mouse.wheel(0, Math.sign(px) * 40);
		await pausa(page, 30);
	}
	await pausa(page, 800);
}

/** Pantalla de título, fuera de la app. */
async function portada(page: Page, titulo: string, texto: string, ms = 3500) {
	await page.setContent(`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width">
		<body style="margin:0;height:100vh;display:grid;place-content:center;gap:18px;padding:0 28px;
			text-align:center;background:#eef0f2;color:#15171b;font-family:system-ui,sans-serif">
			<img src="${LOGO}" alt="" style="width:140px;margin:0 auto">
			<h1 style="font-size:28px;line-height:1.2;margin:0">${titulo}</h1>
			<p style="font-size:18px;line-height:1.4;margin:0;color:#4b5058">${texto}</p>
		</body>`);
	await pausa(page, ms);
}

const TICKETS = {
	tornillos: {
		comercio: 'FERRETERÍA EL CLAVO',
		lineas: [
			['Tornillos 4x40 (100)', '6,95'],
			['Tacos nylon (50)', '4,50'],
			['Brocas de pared', '12,00']
		],
		total: '23,45',
		concepto: 'Ferretería'
	},
	agua: {
		comercio: 'SUPERMERCADO LA PLAZA',
		lineas: [
			['Agua 1,5 l (x12)', '7,20'],
			['Galletas surtidas', '5,60']
		],
		total: '12,80',
		concepto: 'Alimentación'
	},
	taxi: {
		comercio: 'RADIO TAXI MADRID',
		lineas: [['Trayecto al almacén', '18,40']],
		total: '18,40',
		concepto: 'Transporte'
	},
	cartulinas: {
		comercio: 'PAPELERÍA EL LÁPIZ',
		lineas: [
			['Cartulinas A3 (x20)', '9,00'],
			['Rotuladores', '6,50']
		],
		total: '15,50',
		concepto: 'Otro',
		otro: 'Material para el taller'
	},
	cena: {
		comercio: 'RESTAURANTE EL PATIO',
		lineas: [
			['Menú del día (x3)', '36,00'],
			['Cafés (x3)', '6,00']
		],
		total: '42,00',
		concepto: 'Representación'
	},
	pintura: {
		comercio: 'FERRETERÍA EL CLAVO',
		lineas: [
			['Pintura blanca 750 ml', '7,40'],
			['Rodillo', '2,50']
		],
		total: '9,90',
		concepto: 'Ferretería'
	},
	gasolina: {
		comercio: 'ESTACIÓN DE SERVICIO NORTE',
		lineas: [['Gasolina 95 (20,1 l)', '31,20']],
		total: '31,20',
		concepto: 'Transporte'
	},
	fotocopias: {
		comercio: 'COPISTERÍA CENTRAL',
		lineas: [
			['Fotocopias B/N (x200)', '8,00'],
			['Encuadernación', '3,50']
		],
		total: '11,50',
		concepto: 'Otro',
		otro: 'Fotocopias de la asamblea'
	}
} satisfies Record<string, Parameters<typeof enviarTicket>[1]>;

/** Abre una sesión aparte, sin grabar, y hace lo que haga falta en ella. */
async function aparte(
	browser: Browser,
	telefono: string,
	contrasena: string,
	hacer: (p: Page) => Promise<unknown>
) {
	const contexto = await browser.newContext();
	const page = await contexto.newPage();
	await entrar(page, telefono, contrasena);
	await expect(page).not.toHaveURL(/\/entrar/);
	await hacer(page);
	await contexto.close();
}

async function revisar(page: Page, numero: number, accion: 'autorizar' | 'rechazar', motivo = '') {
	await page.goto(`/gestion/tickets/${numero}`);
	if (accion === 'autorizar') {
		await page.getByRole('button', { name: 'Autorizar' }).click();
		await expect(page.getByText('Ticket autorizado. Queda pendiente de pago.')).toBeVisible();
	} else {
		await page.getByRole('button', { name: 'Rechazar' }).click();
		await page.getByLabel('Motivo del rechazo').fill(motivo);
		await page.getByRole('button', { name: 'Confirmar rechazo' }).click();
		await expect(page.getByText('Ticket rechazado. El socio verá el motivo.')).toBeVisible();
	}
}

const ticketDeLista = (page: Page, importe: string) =>
	page
		.getByRole('main')
		.getByRole('link', { name: new RegExp(importe) })
		.locator('visible=true');

// En orden: el tesorero revisa lo que ha dejado el socio.
test.describe.configure({ mode: 'serial' });

test('vídeo del socio', async ({ browser }) => {
	test.setTimeout(240_000);
	const g = await grabadora(browser);
	const { page } = g;

	await portada(
		page,
		'EQL4E Tickets',
		'Lo que puede hacer un socio<br><small>(con datos de ejemplo)</small>'
	);

	await page.goto(`/activar?codigo=${SOCIA.codigo}`);
	await rotulo(
		page,
		'Te llega una invitación con un enlace. Lo abres y eliges tu contraseña.',
		3000
	);
	await escribir(page.getByLabel('Teléfono'), SOCIA.telefono.slice(3));
	await escribir(page.getByLabel('Contraseña nueva'), SOCIA.contrasena);
	await escribir(page.getByLabel('Repite la contraseña'), SOCIA.contrasena);
	await pulsar(page.getByRole('button', { name: 'Activar y entrar' }));
	await expect(page.getByRole('heading', { name: 'Mis tickets' })).toBeVisible();
	await rotulo(page, 'Ya estás dentro. Aquí verás tus tickets.');

	await rotulo(page, 'Para pedir un reembolso, envías el ticket.', 1500);
	await pulsar(page.getByRole('link', { name: 'Nuevo ticket' }));
	await rotulo(page, 'Haces una foto del ticket (o la eliges de la galería)…');
	await page.locator('input[type=file]:not([capture])').setInputFiles({
		name: 'ticket.jpg',
		mimeType: 'image/jpeg',
		buffer: await fotoTicket(TICKETS.tornillos)
	});
	await expect(page.getByRole('list', { name: 'Ficheros del ticket' })).toBeVisible();
	await pausa(page, 1500);
	await rotulo(page, '…escribes el importe y eliges el concepto.', 1200);
	await escribir(page.getByLabel('Importe (€)'), TICKETS.tornillos.total);
	await pulsar(page.locator('label', { hasText: TICKETS.tornillos.concepto }));
	await pulsar(page.getByRole('button', { name: 'Enviar ticket' }));
	await expect(page.getByText(/Ticket T-\d+ enviado/)).toBeVisible();
	await rotulo(page, 'Enviado. Queda pendiente de que un tesorero lo autorice.', 3000);
	const tornillos = Number(new URL(page.url()).searchParams.get('enviado'));

	// Mientras se ve el aviso de «unos días después», sin grabar: más tickets y la tesorera.
	await portada(
		page,
		'Unos días después…',
		'Has enviado más tickets y el tesorero los ha revisado.',
		0
	);
	const desde = g.tiempo() + 3.5;
	const numeros: Record<string, number> = {};
	await aparte(browser, SOCIA.telefono, SOCIA.contrasena, async (p) => {
		for (const t of ['agua', 'taxi', 'cartulinas'] as const)
			numeros[t] = await enviarTicket(p, TICKETS[t]);
	});
	await aparte(browser, TESORERA.telefono, TESORERA.contrasena, async (p) => {
		await revisar(p, numeros.agua, 'autorizar');
		await revisar(p, numeros.taxi, 'autorizar');
		await p.goto(`/gestion/tickets/${numeros.agua}`);
		await p.getByRole('link', { name: 'Registrar pago' }).click();
		await p.getByRole('button', { name: /Registrar pago de/ }).click();
		await expect(p.getByText('Pago registrado.')).toBeVisible();
		await revisar(
			p,
			numeros.cartulinas,
			'rechazar',
			'En la foto no se lee el total. Haz otra con más luz.'
		);
	});
	const hasta = g.tiempo();
	await pausa(page, 200);

	await page.goto('/tickets');
	await rotulo(
		page,
		'En la lista ves en qué está cada uno: pendiente, autorizado, pagado o rechazado.',
		4000
	);
	await desplazar(page, 300);
	await desplazar(page, -300);

	await rotulo(page, 'Si te rechazan uno, ves el motivo…', 1200);
	await pulsar(ticketDeLista(page, TICKETS.cartulinas.total));
	await page.getByRole('region', { name: 'Motivo del rechazo' }).scrollIntoViewIfNeeded();
	await pausa(page, 2500);
	await rotulo(page, '…y lo corriges: aquí, con una foto mejor.', 1200);
	await pulsar(page.getByRole('link', { name: 'Corregir y reenviar' }));
	await page.locator('input[type=file]:not([capture])').setInputFiles({
		name: 'ticket-nitido.jpg',
		mimeType: 'image/jpeg',
		buffer: await fotoTicket(TICKETS.cartulinas)
	});
	await pausa(page, 1500);
	await pulsar(page.getByRole('button', { name: 'Guardar y reenviar' }));
	await expect(
		page.getByText('Ticket reenviado. Vuelve a estar pendiente de autorizar.')
	).toBeVisible();
	await rotulo(page, 'Reenviado: vuelve a estar pendiente.', 2500);

	await page.goto(`/tickets/${tornillos}`);
	await rotulo(page, 'Mientras está pendiente, puedes editarlo o anularlo.', 1500);
	await page.getByRole('region', { name: 'Acciones' }).scrollIntoViewIfNeeded();
	await pausa(page, 1500);
	await pulsar(page.getByRole('button', { name: 'Anular ticket' }), 2500);
	await pulsar(page.getByRole('button', { name: 'Cancelar' }));

	await page.goto('/ayuda');
	await rotulo(
		page,
		'Y si tienes dudas, la Ayuda lo explica todo, también cómo instalar la app en el móvil.',
		3000
	);
	await desplazar(page, 1200);

	await portada(
		page,
		'EQL4E Tickets',
		'Tus tickets, desde el móvil,<br>sin papeles ni hojas de cálculo.',
		4000
	);
	await guardar(g, 'video-socio', [[desde, hasta]]);
});

test('vídeo del tesorero', async ({ browser }) => {
	test.setTimeout(300_000);

	// Antes de grabar: tickets de otros dos socios, para que la lista tenga de todo.
	await prepararOtrosSocios(process.env.DATABASE_URL!);
	const [javier, carmen] = OTROS_SOCIOS;
	const numeros: Record<string, number> = {};
	await aparte(browser, javier.telefono, CONTRASENA_OTROS, async (p) => {
		for (const t of ['cena', 'gasolina'] as const) numeros[t] = await enviarTicket(p, TICKETS[t]);
	});
	await aparte(browser, carmen.telefono, CONTRASENA_OTROS, async (p) => {
		for (const t of ['pintura', 'fotocopias'] as const)
			numeros[t] = await enviarTicket(p, TICKETS[t]);
	});

	const g = await grabadora(browser);
	const { page } = g;
	await portada(
		page,
		'EQL4E Tickets',
		'Lo que puede hacer un tesorero<br><small>(con datos de ejemplo)</small>'
	);

	await page.goto('/entrar');
	await rotulo(page, 'Entras con tu teléfono y tu contraseña.', 1500);
	await escribir(page.getByLabel('Teléfono'), TESORERA.telefono.slice(3));
	await escribir(page.getByLabel('Contraseña'), TESORERA.contrasena);
	await pulsar(page.getByRole('button', { name: 'Entrar' }));
	await expect(page.getByRole('heading', { name: 'Tickets', exact: true })).toBeVisible();
	await rotulo(
		page,
		'Ves los tickets de todos los socios. Primero, los pendientes de autorizar.',
		3500
	);
	await desplazar(page, 500);
	await desplazar(page, -500);

	await rotulo(page, 'Abres uno para revisarlo…', 1200);
	await pulsar(ticketDeLista(page, TICKETS.tornillos.total));
	await rotulo(page, '…y miras la foto del ticket, tan grande como necesites.', 1200);
	await pulsar(page.getByRole('button', { name: /^Ampliar / }).first(), 2000);
	await pulsar(page.getByRole('button', { name: 'Ver a tamaño real' }), 2000);
	await pulsar(page.getByRole('button', { name: 'Cerrar' }));
	await rotulo(page, 'Si está bien, lo autorizas.', 1200);
	await pulsar(page.getByRole('button', { name: 'Autorizar' }));
	await expect(page.getByText('Ticket autorizado. Queda pendiente de pago.')).toBeVisible();
	await pausa(page, 1500);

	await page.goto(`/gestion/tickets/${numeros.gasolina}`);
	await rotulo(
		page,
		'Si algo no cuadra, lo rechazas explicando el motivo. El socio lo verá y podrá corregirlo.',
		3000
	);
	await pulsar(page.getByRole('button', { name: 'Rechazar' }));
	await escribir(page.getByLabel('Motivo del rechazo'), 'Falta el recibo de la gasolinera.');
	await pulsar(page.getByRole('button', { name: 'Confirmar rechazo' }));
	await expect(page.getByText('Ticket rechazado. El socio verá el motivo.')).toBeVisible();
	await pausa(page, 1500);

	await page.goto('/gestion/tickets');
	await rotulo(page, 'También puedes autorizar varios a la vez.', 1500);
	for (const t of ['cena', 'pintura'] as const) {
		await pulsar(
			page
				.locator('tr, li')
				.filter({ hasText: `T-${String(numeros[t]).padStart(6, '0')}` })
				.getByRole('checkbox')
				.locator('visible=true'),
			600
		);
	}
	await pulsar(page.getByRole('button', { name: 'Autorizar 2 tickets' }));
	await expect(page.getByText('2 tickets autorizados. Quedan pendientes de pago.')).toBeVisible();
	await pausa(page, 1500);

	await pulsar(
		page.getByRole('navigation', { name: 'Principal' }).getByRole('link', { name: 'Pagos' })
	);
	await rotulo(page, 'En Pagos ves cuánto se le debe a cada socio.', 3000);
	await pulsar(
		page
			.getByRole('list', { name: 'Socios con tickets pendientes de pago' })
			.getByRole('link', { name: new RegExp(SOCIA.nombre) })
	);
	await rotulo(
		page,
		'Le pagas por Bizum, transferencia o en efectivo y lo registras, con el justificante si quieres.',
		3500
	);
	await desplazar(page, 400);
	await pulsar(page.getByRole('button', { name: /Registrar pago de/ }));
	await expect(page.getByText('Pago registrado.')).toBeVisible();
	await rotulo(page, 'El socio ve en su lista que ya está pagado.', 2500);

	await page.goto('/gestion/tickets');
	await rotulo(
		page,
		'Puedes filtrar por socio, estado o fechas, y exportarlo a una hoja de cálculo.',
		1500
	);
	await pulsar(page.getByText('Filtros y orden'));
	await page.getByLabel('Socio').selectOption({ label: javier.nombre });
	await pausa(page, 1000);
	await pulsar(page.getByRole('button', { name: 'Aplicar' }), 2000);
	const exportar = page.getByRole('link', { name: 'Exportar CSV' });
	await exportar.scrollIntoViewIfNeeded();
	const descarga = page.waitForEvent('download');
	await pulsar(exportar, 1500);
	await descarga;

	await pulsar(
		page.getByRole('navigation', { name: 'Principal' }).getByRole('link', { name: 'Usuarios' })
	);
	await rotulo(page, 'Das de alta a los socios con su nombre, teléfono y email…', 1200);
	const alta = page.getByRole('region', { name: 'Nuevo usuario' });
	await escribir(alta.getByLabel('Nombre'), ALTA.nombre);
	await escribir(alta.getByLabel('Teléfono'), ALTA.telefono.slice(3));
	await escribir(alta.getByLabel('Email'), ALTA.email);
	await pulsar(alta.getByRole('button', { name: 'Dar de alta y enviar invitación' }), 1500);
	await rotulo(
		page,
		'…y reciben su enlace para entrar por correo, o se lo pasas tú por WhatsApp.',
		4000
	);

	await pulsar(
		page.getByRole('navigation', { name: 'Principal' }).getByRole('link', { name: 'Conceptos' })
	);
	await rotulo(page, 'Y decides qué conceptos de gasto pueden elegir los socios.', 3000);

	await portada(
		page,
		'EQL4E Tickets',
		'Todo el control de los reembolsos,<br>desde el móvil.',
		4000
	);
	await guardar(g, 'video-tesorero');
});
