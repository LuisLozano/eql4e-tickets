// Antes de las capturas de la Ayuda: la base de datos, solo con los datos de demostración. Un
// tesorero ve todo lo que hay, así que no puede ser la de las pruebas e2e: tiene que ser una propia,
// acabada en «_manual», porque se vacía entera.
import postgres from 'postgres';
import { migrar } from '../../scripts/migrar.js';
import { prepararDemo } from './demo.ts';

/** Borra usuarios, tickets y pagos; en cascada, sesiones, códigos, ficheros e historial. Los
 * conceptos se quedan. */
export async function vaciar(url: string) {
	const sql = postgres(url, { max: 1, onnotice: () => {} });
	try {
		await sql`truncate usuario, ticket, pago restart identity cascade`;
	} finally {
		await sql.end();
	}
}

export default async function preparar() {
	const url = process.env.DATABASE_URL;
	if (!url || !new URL(url).pathname.endsWith('_manual')) {
		throw new Error(
			'Las capturas de la Ayuda necesitan DATABASE_URL de una base de datos propia acabada en «_manual»: se vacía entera.'
		);
	}
	await migrar(url);
	await vaciar(url);
	// La app arranca antes que esto y solo crea el tesorero inicial (R-06) al arrancar. Como la base
	// tiene ya a la tesorera de la vez anterior, o aún no tiene tablas la primera vez, no lo crea.
	await prepararDemo(url);
}
