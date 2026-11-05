// Limitador en memoria por clave (IP) con ventana fija (ADR-0003, RNF-15).
// Basta con una instancia de la app; si se escalara, pasaría a PostgreSQL.

export class Limitador {
	readonly #intentos = new Map<string, { desde: number; cuenta: number }>();

	constructor(
		private readonly maximo: number,
		private readonly ventanaMs: number,
		private readonly limiteClaves = 10_000
	) {}

	/** Registra un intento. Falso si la clave ha superado el máximo dentro de la ventana. */
	intentar(clave: string, ahora: number): boolean {
		const entrada = this.#intentos.get(clave);
		if (!entrada || ahora - entrada.desde >= this.ventanaMs) {
			if (this.#intentos.size >= this.limiteClaves) this.#limpiar(ahora);
			this.#intentos.set(clave, { desde: ahora, cuenta: 1 });
			return true;
		}
		entrada.cuenta++;
		return entrada.cuenta <= this.maximo;
	}

	#limpiar(ahora: number) {
		for (const [clave, entrada] of this.#intentos) {
			if (ahora - entrada.desde >= this.ventanaMs) this.#intentos.delete(clave);
		}
		// Si todas siguen vigentes (ataque con muchas IP), se descarta la más antigua.
		if (this.#intentos.size >= this.limiteClaves) {
			this.#intentos.delete(this.#intentos.keys().next().value!);
		}
	}

	get claves(): number {
		return this.#intentos.size;
	}
}
