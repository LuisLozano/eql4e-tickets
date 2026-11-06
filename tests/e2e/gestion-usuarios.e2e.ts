import { expect, test } from './base.ts';
import { CONTRASENA_TESORERO, GESTION, TESOREROS, type Perfil } from './datos.ts';

test('un tesorero edita la ficha de un socio, lo da de baja, lo reactiva y le envía un enlace para otra contraseña (HU-G02, G03)', async ({
	page
}, info) => {
	const perfil = info.project.name as Perfil;
	const tesorero = TESOREROS[perfil];
	const socio = GESTION[perfil];
	const nombre = `${socio.nombre} editado`;

	await page.goto('/entrar');
	await page.getByLabel('Teléfono').fill(tesorero.telefono.slice(3));
	await page.getByLabel('Contraseña').fill(CONTRASENA_TESORERO);
	await page.getByRole('button', { name: 'Entrar' }).click();
	await expect(page).toHaveURL(/\/gestion\/tickets$/);

	// Su propia ficha: no puede darse de baja.
	await page.goto('/gestion/usuarios');
	await page
		.getByRole('main')
		.getByRole('link', { name: tesorero.nombre })
		.locator('visible=true')
		.click();
	await expect(page.getByRole('heading', { name: tesorero.nombre, level: 1 })).toBeVisible();
	await expect(page.getByRole('button', { name: 'Dar de baja…' })).toHaveCount(0);

	await page.goto('/gestion/usuarios');
	await page
		.getByRole('main')
		.getByRole('link', { name: socio.nombre })
		.locator('visible=true')
		.click();
	await expect(page.getByRole('heading', { name: socio.nombre, level: 1 })).toBeVisible();
	const datos = page.getByRole('region', { name: 'Datos' });

	// El teléfono de otro usuario, no.
	await datos.getByLabel('Teléfono').fill(tesorero.telefono.slice(3));
	await datos.getByRole('button', { name: 'Guardar cambios' }).click();
	await expect(datos.getByText('Ya hay otro usuario con ese teléfono.')).toBeVisible();

	await datos.getByLabel('Nombre').fill(nombre);
	await datos.getByLabel('Teléfono').fill(socio.nuevoTelefono.slice(3));
	await datos.getByRole('button', { name: 'Guardar cambios' }).click();
	await expect(datos.getByText('Cambios guardados.')).toBeVisible();
	await expect(page.getByRole('heading', { name: nombre, level: 1 })).toBeVisible();

	// Baja (con confirmación) y reactivación.
	const acceso = page.getByRole('region', { name: 'Acceso' });
	await acceso.getByRole('button', { name: 'Dar de baja…' }).click();
	await expect(acceso.getByRole('heading', { name: `¿Dar de baja a ${nombre}?` })).toBeFocused();
	await acceso.getByRole('button', { name: 'Dar de baja', exact: true }).click();
	await expect(page.getByText('Usuario dado de baja.')).toBeVisible();
	await expect(acceso.getByText(/^De baja/)).toBeVisible();
	await acceso.getByRole('button', { name: 'Reactivar' }).click();
	await expect(
		page.getByText('Usuario reactivado. Puede volver a entrar con su contraseña.')
	).toBeVisible();

	// Ha olvidado la contraseña: enlace para elegir otra.
	await acceso.getByRole('button', { name: 'Enviar enlace para otra contraseña' }).click();
	await expect(acceso.getByText('El envío de correos está desactivado')).toBeVisible();
	const enlace = await acceso.getByLabel('Enlace de activación').inputValue();
	expect(enlace).toMatch(/\/activar\?codigo=[A-Z2-7-]+$/);

	// El socio lo usa con su teléfono nuevo y entra con la contraseña nueva.
	await page.getByRole('button', { name: 'Salir' }).click();
	await page.goto(enlace);
	await page.getByLabel('Teléfono').fill(socio.nuevoTelefono.slice(3));
	await page.getByLabel('Contraseña nueva').fill('la contraseña recuperada');
	await page.getByLabel('Repite la contraseña').fill('la contraseña recuperada');
	await page.getByRole('button', { name: 'Activar y entrar' }).click();
	await expect(page.getByRole('heading', { name: 'Mis tickets' })).toBeVisible();
});
