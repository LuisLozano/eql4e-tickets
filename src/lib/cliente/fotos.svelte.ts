// Las fotos que el socio elige al enviar o editar un ticket: se comprimen en el móvil y se guardan
// aquí, en orden, hasta que se envía el formulario.
import { MAX_BYTES, MAX_FICHEROS } from '#lib/esquemas/ticket.ts';
import { comprimir } from './compresion.ts';

export type Elegido = { id: number; fichero: File; antes: number; vista?: string };

export class Fotos {
	elegidos = $state<Elegido[]>([]);
	preparando = $state(0);
	aviso = $state<string | null>(null);
	#siguiente = 0;
	// Una cola: aunque se elija con los dos botones a la vez, se añaden en el orden en que se eligieron.
	#cola = Promise.resolve();
	/** Los ficheros que ya tiene el ticket y se conservan (al editar); también cuentan. */
	#conservados: () => number;

	constructor(conservados = () => 0) {
		this.#conservados = conservados;
	}

	/** Cuántos ficheros más caben, contando los que se están preparando. */
	get hueco() {
		return MAX_FICHEROS - this.#conservados() - this.elegidos.length - this.preparando;
	}

	anadirElegido(fichero: File, antes: number) {
		const vista = fichero.type.startsWith('image/') ? URL.createObjectURL(fichero) : undefined;
		this.elegidos.push({ id: ++this.#siguiente, fichero, antes, vista });
	}

	anadir(input: HTMLInputElement) {
		const nuevos = [...(input.files ?? [])];
		input.value = '';
		this.aviso = null;
		for (const fichero of nuevos) {
			if (this.hueco <= 0) {
				this.aviso = `Puedes añadir ${MAX_FICHEROS} ficheros como máximo.`;
				break;
			}
			this.preparando++;
			this.#cola = this.#cola.then(() => this.#preparar(fichero)).finally(() => this.preparando--);
		}
	}

	async #preparar(fichero: File) {
		const r = await comprimir(fichero);
		if (!r.ok) {
			this.aviso = `«${fichero.name}»: esta foto HEIC no se puede usar. En el iPhone, adjúntala desde «Fotos» o cambia el formato de la cámara a «Más compatible».`;
		} else if (r.fichero.size > MAX_BYTES) {
			this.aviso = `«${fichero.name}»: ocupa más de 10 MB.`;
		} else {
			this.anadirElegido(r.fichero, r.antes);
		}
	}

	quitar(id: number) {
		const e = this.elegidos.find((x) => x.id === id);
		if (e?.vista) URL.revokeObjectURL(e.vista);
		this.elegidos = this.elegidos.filter((x) => x.id !== id);
		this.aviso = null;
	}

	vaciar() {
		for (const e of this.elegidos) if (e.vista) URL.revokeObjectURL(e.vista);
		this.elegidos = [];
	}

	/** Cambia los ficheros del envío por los elegidos, ya comprimidos. */
	alEnviar(formData: FormData) {
		formData.delete('ficheros');
		for (const e of this.elegidos) formData.append('ficheros', e.fichero, e.fichero.name);
	}
}
