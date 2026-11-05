// Ficheros de tickets y justificantes en un volumen de disco (ADR-0002).
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, resolve, sep } from 'node:path';
import type { Almacen } from '#lib/server/dominio/ticket/crear.ts';

export interface AlmacenDisco extends Almacen {
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
		}
	};
}
