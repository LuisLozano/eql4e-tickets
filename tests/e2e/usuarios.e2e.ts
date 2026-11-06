import { expect, test } from './base.ts';
import { ALTAS, CONTRASENA_TESORERO, TESOREROS, type Perfil } from './datos.ts';

test('un tesorero da de alta a un socio y el socio activa su cuenta (HU-G01, A01)', async ({
	page
}, info) => {
	const perfil = info.project.name as Perfil;
	const tesorero = TESOREROS[perfil];
	const alta = ALTAS[perfil];
	const numero = alta.telefono.slice(3);

	await page.goto('/entrar');
	await page.getByLabel('Teléfono').fill(tesorero.telefono.slice(3));
	await page.getByLabel('Contraseña').fill(CONTRASENA_TESORERO);
	await page.getByRole('button', { name: 'Entrar' }).click();
	await expect(page.getByRole('heading', { name: 'Tickets', exact: true })).toBeVisible();

	await page.getByRole('link', { name: 'Usuarios' }).click();
	await expect(page.getByRole('heading', { name: 'Usuarios', level: 1 })).toBeVisible();

	// Sin roles no se puede.
	const formulario = page.getByRole('region', { name: 'Nuevo usuario' });
	await formulario.getByLabel('Nombre').fill(alta.nombre);
	await formulario.getByLabel('Teléfono').fill(numero);
	await formulario.getByLabel('Email').fill(alta.email);
	await formulario.getByLabel('Socio').uncheck();
	await formulario.getByRole('button', { name: 'Dar de alta y enviar invitación' }).click();
	await expect(formulario.getByText('Marca al menos un rol.')).toBeVisible();

	await formulario.getByLabel('Socio').check();
	await formulario.getByRole('button', { name: 'Dar de alta y enviar invitación' }).click();
	// En las pruebas el correo está en modo consola: se avisa y se ofrece el enlace.
	await expect(formulario.getByText('El envío de correos está desactivado')).toBeVisible();
	const enlace = await formulario.getByLabel('Enlace de activación').inputValue();
	expect(enlace).toMatch(/\/activar\?codigo=[A-Z2-7-]+$/);
	await expect(page.getByText(alta.email, { exact: true }).filter({ visible: true })).toBeVisible();
	await expect(
		page
			.getByText(/Invitado · caduca/)
			.filter({ visible: true })
			.first()
	).toBeVisible();

	// El mismo teléfono otra vez: error en su campo.
	await formulario.getByLabel('Nombre').fill('Otra persona');
	await formulario.getByLabel('Teléfono').fill(numero);
	await formulario.getByLabel('Email').fill(`otra.${alta.email}`);
	await formulario.getByRole('button', { name: 'Dar de alta y enviar invitación' }).click();
	await expect(formulario.getByText('Ya hay un usuario con ese teléfono.')).toBeVisible();

	// El socio abre el enlace (sin sesión) y activa su cuenta.
	await page.getByRole('button', { name: 'Salir' }).click();
	await page.goto(enlace);
	await page.getByLabel('Teléfono').fill(numero);
	await page.getByLabel('Contraseña nueva').fill('la contraseña del socio');
	await page.getByLabel('Repite la contraseña').fill('la contraseña del socio');
	await page.getByRole('button', { name: 'Activar y entrar' }).click();
	await expect(page.getByRole('heading', { name: 'Mis tickets' })).toBeVisible();
	await expect(page.getByRole('link', { name: alta.nombre })).toBeVisible();
});
