// Antes de las capturas de la Ayuda: la base de datos, solo con los datos de demostración. Un
// tesorero ve todo lo que hay, así que no puede ser la de las pruebas e2e: tiene que ser una propia,
// acabada en «_manual», porque se vacía entera.
import postgres from 'postgres';
import { migrar } from '../../scripts/migrar.js';
import { prepararDemo } from './demo.ts';

export default async function preparar() {
	const url = process.env.DATABASE_URL;
	if (!url || !new URL(url).pathname.endsWith('_manual')) {
		throw new Error(
			'Las capturas de la Ayuda necesitan DATABASE_URL de una base de datos propia acabada en «_manual»: se vacía entera.'
		);
	}
	await migrar(url);
	const sql = postgres(url, { max: 1, onnotice: () => {} });
	try {
		// En cascada: sesiones, códigos, ficheros e historial. Los conceptos se quedan.
		await sql`truncate usuario, ticket, pago restart identity cascade`;
	} finally {
		await sql.end();
	}
	// La app arranca antes que esto y solo crea el tesorero inicial (R-06) al arrancar. Como la base
	// tiene ya a la tesorera de la vez anterior, o aún no tiene tablas la primera vez, no lo crea.
	await prepararDemo(url);
}
