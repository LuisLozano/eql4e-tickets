// Ficheros de tickets y justificantes en un volumen de disco (ADR-0002).
import { mkdir, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, join, relative, resolve, sep } from 'node:path';
import type { AlmacenListable } from '#lib/server/dominio/ficheros/huerfanos.ts';

export interface AlmacenDisco extends AlmacenListable {
	leer(ruta: string): Promise<Uint8Array>;
}

export function almacenEnDisco(raiz: string): AlmacenDisco {
	const base = resolve(raiz);
	// Las rutas las genera la app, pero se comprueba igualmente que no salgan del volumen.
	const completa = (ruta: string) => {
		const destino = resolve(base, ruta);
		if (!destino.startsWith(base + sep)) throw new Error(`Ruta fuera del almacén: ${ruta}`);
		return destino;
	};

	return {
		async guardar(ruta, datos) {
			const destino = completa(ruta);
			await mkdir(dirname(destino), { recursive: true });
			// «wx»: nunca sobrescribe un fichero existente.
			await writeFile(destino, datos, { flag: 'wx', mode: 0o640 });
		},
		async leer(ruta) {
			return readFile(completa(ruta));
		},
		async borrar(ruta) {
			await rm(completa(ruta), { force: true });
		},
		async listar() {
			const entradas = await readdir(base, { recursive: true, withFileTypes: true }).catch(
				(e: NodeJS.ErrnoException) => (e.code === 'ENOENT' ? [] : Promise.reject(e))
			);
			return Promise.all(
				entradas
					.filter((e) => e.isFile())
					.map(async (e) => {
						const completo = join(e.parentPath, e.name);
						return {
							ruta: relative(base, completo).split(sep).join('/'),
							modificadoEn: (await stat(completo)).mtime
						};
					})
			);
		}
	};
}
