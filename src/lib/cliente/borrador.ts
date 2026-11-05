// Borrador del ticket en IndexedDB (ADR-0005): si falla el envío o se cierra la página, no se pierde
// nada. Se guarda justo antes de enviar y se borra cuando el servidor lo confirma.

export type Borrador = {
	campos: Record<string, string>;
	ficheros: { nombre: string; tipo: string; antes: number; datos: Blob }[];
};

const BASE = 'eql4e';
const ALMACEN = 'borradores';

function abrir(): Promise<IDBDatabase> {
	return new Promise((resolver, rechazar) => {
		const peticion = indexedDB.open(BASE, 1);
		peticion.onupgradeneeded = () => peticion.result.createObjectStore(ALMACEN);
		peticion.onsuccess = () => resolver(peticion.result);
		peticion.onerror = () => rechazar(peticion.error);
	});
}

async function operar<T>(modo: IDBTransactionMode, accion: (a: IDBObjectStore) => IDBRequest<T>) {
	const base = await abrir();
	try {
		return await new Promise<T>((resolver, rechazar) => {
			const peticion = accion(base.transaction(ALMACEN, modo).objectStore(ALMACEN));
			peticion.onsuccess = () => resolver(peticion.result);
			peticion.onerror = () => rechazar(peticion.error);
		});
	} finally {
		base.close();
	}
}

// Sin IndexedDB (navegación privada en algunos navegadores) el formulario funciona igual, sin borrador.
export async function guardarBorrador(clave: string, borrador: Borrador) {
	try {
		await operar('readwrite', (a) => a.put(borrador, clave));
	} catch {
		/* sin borrador */
	}
}

export async function leerBorrador(clave: string): Promise<Borrador | undefined> {
	try {
		return await operar<Borrador | undefined>('readonly', (a) => a.get(clave));
	} catch {
		return undefined;
	}
}

export async function borrarBorrador(clave: string) {
	try {
		await operar('readwrite', (a) => a.delete(clave));
	} catch {
		/* nada que borrar */
	}
}
