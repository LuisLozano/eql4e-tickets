// Datos de demostración para las capturas de la Ayuda: personas y tickets con aspecto real, en vez
// de los de las pruebas e2e. Se crean en la base de datos de prueba antes de capturar.
import { createHash } from 'node:crypto';
import { hash } from '@node-rs/argon2';
import postgres from 'postgres';
import sharp from 'sharp';

export const SOCIA = {
	nombre: 'Lucía Martín',
	telefono: '+34699000201',
	email: 'lucia.martin@ejemplo.invalid',
	codigo: 'LUCI-AMAR-TINA-AAAA-AAAA-AAAA-AAAA',
	contrasena: 'una contraseña de ejemplo'
} as const;

export const TESORERA = {
	nombre: 'Marta Gil',
	telefono: '+34699000202',
	email: 'marta.gil@ejemplo.invalid',
	contrasena: 'contraseña de la tesorera de ejemplo'
} as const;

const sha256 = (texto: string) => createHash('sha256').update(texto).digest('hex');

/** Borra lo que quede de otra vez y crea a la socia (invitada, con su código) y a la tesorera. */
export async function prepararDemo(url: string) {
	const sql = postgres(url, { max: 1, onnotice: () => {} });
	try {
		const telefonos = [SOCIA.telefono, TESORERA.telefono];
		const suyos = sql`select id from usuario where telefono in ${sql(telefonos)}`;
		await sql`delete from ticket where socio_id in (${suyos})`;
		await sql`delete from historial where usuario_id in (${suyos})`;
		await sql`delete from pago where socio_id in (${suyos}) or registrado_por in (${suyos})`;
		await sql`delete from usuario where telefono in ${sql(telefonos)}`;

		const [{ id }] = await sql`
			insert into usuario (nombre, telefono, email)
			values (${SOCIA.nombre}, ${SOCIA.telefono}, ${SOCIA.email})
			returning id`;
		await sql`
			insert into codigo_acceso (usuario_id, codigo_hash, tipo, caduca_en)
			values (${id}, ${sha256(SOCIA.codigo.replaceAll('-', ''))}, 'activacion', now() + interval '1 day')`;
		await sql`
			insert into usuario (nombre, telefono, email, password_hash, estado, es_socio, es_tesorero)
			values (${TESORERA.nombre}, ${TESORERA.telefono}, ${TESORERA.email},
				${await hash(TESORERA.contrasena)}, 'activo', false, true)`;
	} finally {
		await sql.end();
	}
}

/** La foto de un ticket de compra, dibujada: comercio, líneas y total. */
export async function fotoTicket(datos: {
	comercio: string;
	lineas: [string, string][];
	total: string;
}) {
	const linea = (y: number, izq: string, der: string) =>
		`<text x="40" y="${y}">${izq}</text><text x="500" y="${y}" text-anchor="end">${der}</text>`;
	const filas = datos.lineas.map(([a, b], i) => linea(260 + i * 40, a, b)).join('');
	const yTotal = 300 + datos.lineas.length * 40;
	const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="540" height="${yTotal + 160}">
		<rect width="100%" height="100%" fill="#fbfaf6"/>
		<g font-family="DejaVu Sans Mono, monospace" font-size="24" fill="#222">
			<text x="270" y="80" text-anchor="middle" font-size="30" font-weight="bold">${datos.comercio}</text>
			<text x="270" y="120" text-anchor="middle">C/ Mayor, 12 · Madrid</text>
			<text x="270" y="160" text-anchor="middle">FACTURA SIMPLIFICADA</text>
			<line x1="40" y1="200" x2="500" y2="200" stroke="#222" stroke-dasharray="6 6"/>
			${filas}
			<line x1="40" y1="${yTotal - 20}" x2="500" y2="${yTotal - 20}" stroke="#222" stroke-dasharray="6 6"/>
			<g font-size="30" font-weight="bold">${linea(yTotal + 30, 'TOTAL', `${datos.total} €`)}</g>
			<text x="270" y="${yTotal + 100}" text-anchor="middle">¡Gracias por su visita!</text>
		</g>
	</svg>`;
	return sharp(Buffer.from(svg)).jpeg({ quality: 85 }).toBuffer();
}
