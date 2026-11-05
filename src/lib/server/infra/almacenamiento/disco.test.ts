import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { almacenEnDisco } from './disco.ts';

let raiz: string;
beforeEach(async () => {
	raiz = await mkdtemp(join(tmpdir(), 'eql4e-almacen-'));
});
afterEach(() => rm(raiz, { recursive: true, force: true }));

const datos = new Uint8Array([1, 2, 3]);

describe('almacenEnDisco', () => {
	it('guarda, lee y borra creando las carpetas', async () => {
		const almacen = almacenEnDisco(raiz);
		await almacen.guardar('2026/11/a.webp', datos);
		expect(new Uint8Array(await almacen.leer('2026/11/a.webp'))).toEqual(datos);
		await almacen.borrar('2026/11/a.webp');
		expect(await readdir(join(raiz, '2026/11'))).toEqual([]);
	});

	it('no sobrescribe un fichero existente', async () => {
		const almacen = almacenEnDisco(raiz);
		await almacen.guardar('a.webp', datos);
		await expect(almacen.guardar('a.webp', datos)).rejects.toMatchObject({ code: 'EEXIST' });
	});

	it('borrar un fichero que no existe no falla', async () => {
		await expect(almacenEnDisco(raiz).borrar('no-existe.webp')).resolves.toBeUndefined();
	});

	it.each(['../fuera.webp', '/etc/passwd', '2026/../../fuera.webp', ''])(
		'no sale del almacén con «%s»',
		async (ruta) => {
			await expect(almacenEnDisco(raiz).guardar(ruta, datos)).rejects.toThrow(
				'Ruta fuera del almacén'
			);
		}
	);
});
