import { expect, test } from './base.ts';
import { SOCIOS, type Perfil } from './datos.ts';

const CONTRASENA = 'mi contraseña de prueba';

test('/salud responde ok con la base de datos', async ({ request }) => {
	const respuesta = await request.get('/salud');
	expect(respuesta.status()).toBe(200);
	expect(await respuesta.json()).toEqual({ estado: 'ok' });
});

test('la app se puede instalar: el manifiesto y sus iconos se sirven sin sesión', async ({
	page
}) => {
	await page.goto('/entrar');
	const href = await page.locator('link[rel="manifest"]').getAttribute('href');
	const respuesta = await page.request.get(new URL(href!, page.url()).href);
	expect(respuesta.status()).toBe(200);
	const manifiesto = await respuesta.json();
	expect(manifiesto).toMatchObject({
		short_name: 'Tickets',
		start_url: '/',
		display: 'standalone'
	});
	for (const icono of manifiesto.icons) {
		const imagen = await page.request.get(icono.src);
		expect(imagen.status(), icono.src).toBe(200);
		expect(imagen.headers()['content-type']).toBe('image/png');
	}
});

test('las páginas llevan las cabeceras de seguridad, con una CSP con nonce', async ({ page }) => {
	const respuesta = await page.goto('/entrar');
	const cabeceras = respuesta!.headers();
	const csp = cabeceras['content-security-policy'];
	expect(csp).toContain("default-src 'self'");
	expect(csp).toContain("frame-ancestors 'none'");
	expect(csp).not.toContain('unsafe-eval');
	// Un nonce distinto en cada respuesta, y el mismo en los <script> de la página.
	const nonce = /script-src 'self' 'nonce-([^']+)'/.exec(csp)![1];
	await expect(page.locator(`script[nonce]`).first()).toBeAttached();
	expect(
		await page
			.locator('script[nonce]')
			.first()
			.evaluate((s) => (s as HTMLScriptElement).nonce)
	).toBe(nonce);
	const otra = (await page.request.get('/entrar')).headers()['content-security-policy'];
	expect(otra).not.toContain(nonce);
	expect(cabeceras).toMatchObject({
		'x-frame-options': 'DENY',
		'x-content-type-options': 'nosniff',
		'referrer-policy': 'same-origin'
	});
});

test('un socio activa su cuenta, sale y vuelve a entrar (HU-A01, A02, A03)', async ({
	page
}, info) => {
	const socio = SOCIOS[info.project.name as Perfil];
	const numero = socio.telefono.slice(3);

	// Sin sesión, cualquier página lleva a «Entrar» y recuerda adónde iba.
	await page.goto('/tickets');
	await expect(page).toHaveURL(/\/entrar\?volver=%2Ftickets$/);

	// El enlace del correo trae el código rellenado.
	await page.goto(`/activar?codigo=${socio.codigo}`);
	const campoCodigo = page.getByLabel('Código de invitación');
	await expect(campoCodigo).toHaveValue(socio.codigo);
	// Se ve entero y con los colores de la app (antes perdía sus estilos y salía cortado).
	const estilo = await campoCodigo.evaluate((el: HTMLInputElement) => ({
		cabe: el.scrollWidth <= el.clientWidth,
		ocupaElRecuadro: el.offsetWidth === el.parentElement!.clientWidth,
		fondo: getComputedStyle(el).backgroundColor
	}));
	expect(estilo).toEqual({ cabe: true, ocupaElRecuadro: true, fondo: 'rgba(0, 0, 0, 0)' });

	// El teléfono se agrupa al escribir, y borrar quita cifras, no espacios.
	const campoTelefono = page.getByLabel('Teléfono');
	const agrupado = numero.replace(/(\d{3})(\d{3})(\d{3})/, '$1 $2 $3');
	await campoTelefono.pressSequentially(numero);
	await expect(campoTelefono).toHaveValue(agrupado);
	await campoTelefono.press('Backspace');
	await expect(campoTelefono).toHaveValue(agrupado.slice(0, -1));
	await campoTelefono.pressSequentially(numero.slice(-1));
	await expect(campoTelefono).toHaveValue(agrupado);
	await page.getByLabel('Contraseña nueva').fill('12345678');
	await page.getByLabel('Repite la contraseña').fill('12345678');
	await page.getByRole('button', { name: 'Activar y entrar' }).click();
	await expect(page.getByText('demasiado común')).toBeVisible();

	await page.getByLabel('Contraseña nueva').fill(CONTRASENA);
	await page.getByLabel('Repite la contraseña').fill(CONTRASENA);
	await page.getByRole('button', { name: 'Activar y entrar' }).click();
	await expect(page.getByRole('heading', { name: 'Mis tickets' })).toBeVisible();
	await expect(page.getByRole('link', { name: socio.nombre })).toBeVisible();

	// Un socio no ve la gestión (404, R-01).
	const gestion = await page.goto('/gestion/tickets');
	expect(gestion?.status()).toBe(404);

	// Salir y volver a entrar.
	await page.goto('/tickets');
	await page.getByRole('button', { name: 'Salir' }).click();
	await expect(page).toHaveURL(/\/entrar$/);

	await page.getByLabel('Teléfono').fill(numero);
	await page.getByLabel('Contraseña').fill('no es esta');
	await page.getByRole('button', { name: 'Entrar' }).click();
	await expect(page.getByText('Teléfono o contraseña incorrectos.')).toBeVisible();

	await page.getByLabel('Contraseña').fill(CONTRASENA);
	await page.getByRole('button', { name: 'Entrar' }).click();
	await expect(page.getByRole('heading', { name: 'Mis tickets' })).toBeVisible();

	// Con sesión, «Entrar» lleva a su inicio.
	await page.goto('/entrar');
	await expect(page).toHaveURL(/\/tickets$/);
});
