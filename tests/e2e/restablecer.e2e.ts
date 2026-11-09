import { expect, test } from './base.ts';
import { CONTRASENA_TESORERO, RESTABLECER, TESOREROS, type Perfil } from './datos.ts';

const NUEVA = 'contraseña recuperada e2e';

test('un socio que olvidó la contraseña elige otra con el enlace del correo (HU-A04)', async ({
	page
}, info) => {
	const socio = RESTABLECER[info.project.name as Perfil];
	const numero = socio.telefono.slice(3);

	// Sin correo configurado (las pruebas usan el modo consola), «Entrar» no ofrece restablecer.
	await page.goto('/entrar');
	await expect(page.getByRole('link', { name: '¿Has olvidado tu contraseña?' })).toHaveCount(0);

	// El enlace del correo: con otro teléfono no vale.
	await page.goto(`/restablecer/${socio.codigo}`);
	await expect(page.getByRole('heading', { name: 'Elige una contraseña nueva' })).toBeVisible();
	await page.getByLabel('Teléfono').fill('699999999');
	await page.getByLabel('Contraseña nueva').fill(NUEVA);
	await page.getByLabel('Repite la contraseña').fill(NUEVA);
	await page.getByRole('button', { name: 'Guardar y entrar' }).click();
	await expect(page.getByText('El enlace no vale')).toBeVisible();

	// Con el suyo entra directamente.
	await page.getByLabel('Teléfono').fill(numero);
	await page.getByLabel('Contraseña nueva').fill(NUEVA);
	await page.getByLabel('Repite la contraseña').fill(NUEVA);
	await page.getByRole('button', { name: 'Guardar y entrar' }).click();
	await expect(page.getByRole('heading', { name: 'Mis tickets' })).toBeVisible();

	// La contraseña anterior ya no vale; la nueva, sí.
	await page.getByRole('button', { name: 'Salir' }).click();
	await page.getByLabel('Teléfono').fill(numero);
	await page.getByLabel('Contraseña').fill(CONTRASENA_TESORERO);
	await page.getByRole('button', { name: 'Entrar' }).click();
	await expect(page.getByText('Teléfono o contraseña incorrectos.')).toBeVisible();
	await page.getByLabel('Contraseña').fill(NUEVA);
	await page.getByRole('button', { name: 'Entrar' }).click();
	await expect(page.getByRole('heading', { name: 'Mis tickets' })).toBeVisible();

	// El enlace solo vale una vez.
	await page.getByRole('button', { name: 'Salir' }).click();
	await page.goto(`/restablecer/${socio.codigo}`);
	await page.getByLabel('Teléfono').fill(numero);
	await page.getByLabel('Contraseña nueva').fill(NUEVA);
	await page.getByLabel('Repite la contraseña').fill(NUEVA);
	await page.getByRole('button', { name: 'Guardar y entrar' }).click();
	await expect(page.getByText('El enlace no vale')).toBeVisible();
});

test('pedir el enlace responde igual exista o no el teléfono (HU-A04)', async ({ page }, info) => {
	// Un teléfono con cuenta activa que no es el de la otra prueba: pedir un enlace invalida el anterior.
	const activo = TESOREROS[info.project.name as Perfil];
	const respuesta = 'Si el teléfono es de una cuenta activa, te hemos enviado un enlace';
	for (const telefono of [activo.telefono.slice(3), '699999997']) {
		await page.goto('/restablecer');
		// Sin correo configurado, avisa de que no llegará.
		await expect(page.getByText('Ahora mismo la app no envía correos.')).toBeVisible();
		await page.getByLabel('Teléfono').fill(telefono);
		await page.getByRole('button', { name: 'Enviar enlace' }).click();
		await expect(page.getByText(respuesta)).toBeVisible();
		await expect(page.getByRole('button', { name: 'Enviar enlace' })).toHaveCount(0);
	}
});
