// Recuperar el acceso desde el servidor, cuando nadie puede hacerlo desde la app: un tesorero que
// ha olvidado su contraseña y no hay otro que le envíe el enlace (HU-G02), ni correo para pedirlo él
// (HU-A04). No cambia la contraseña: genera el mismo enlace de un solo uso que la app.
//
//   cd /opt/eql4e-tickets && sudo docker compose exec app node scripts/restablecer-acceso.js 600123456
//
// Es JavaScript suelto, como migrar.js, porque el dominio va empaquetado en build/. Repite lo que
// hacen dominio/auth/tokens.ts y codigos.ts; la prueba de integración comprueba que la app acepta
// sus enlaces (tests/integracion/restablecer-acceso.test.ts).
import { createHash, randomBytes } from 'node:crypto';
import postgres from 'postgres';

const BASE32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const HORA = 60 * 60 * 1000;

/** 28 caracteres base32 (140 bits, RNF-14) en grupos de 4, como `generarCodigo`. */
function generarCodigo() {
	const caracteres = Array.from(randomBytes(28), (byte) => BASE32[byte & 31]).join('');
	return caracteres.replace(/(.{4})(?=.)/g, '$1-');
}

const sha256 = (/** @type {string} */ texto) => createHash('sha256').update(texto).digest('hex');

/** «600 123 456», «0034600…» o «+34 600…» → «+34600123456». Nulo si no lo parece. */
export function normalizarTelefono(/** @type {string} */ texto) {
	const limpio = texto.replace(/[\s.()-]/g, '').replace(/^00/, '+');
	if (/^\d{9}$/.test(limpio)) return `+34${limpio}`;
	return /^\+\d{8,15}$/.test(limpio) ? limpio : null;
}

/**
 * @typedef {{ nombre: string; esSocio: boolean; esTesorero: boolean }} Persona
 * @typedef {{ ok: true; persona: Persona; tipo: 'restablecer' | 'activacion'; enlace: string; caducaEn: Date }} Hecho
 * @typedef {{ ok: false; motivo: 'telefono' } | { ok: false; motivo: 'no_existe' }} SinUsuario
 * @typedef {{ ok: false; motivo: 'baja'; persona: Persona }} DeBaja
 * @typedef {Hecho | SinUsuario | DeBaja} Resultado
 */

/**
 * Activo: enlace para elegir otra contraseña, de 1 hora (/restablecer/…). Invitado: invitación
 * nueva, de 7 días (/activar?codigo=…). De baja: nada. Los códigos anteriores del mismo tipo dejan
 * de valer; la contraseña actual sigue valiendo hasta que se use el enlace.
 * @param {string} url
 * @param {string} telefono
 * @param {string} urlPublica
 * @returns {Promise<Resultado>}
 */
export async function restablecerAcceso(url, telefono, urlPublica, ahora = new Date()) {
	const normalizado = normalizarTelefono(telefono);
	if (!normalizado) return { ok: false, motivo: 'telefono' };

	const sql = postgres(url, { max: 1, onnotice: () => {} });
	try {
		return await sql.begin(async (tx) => {
			const [u] = await tx`
				select id, nombre, es_socio, es_tesorero, estado from usuario
				where telefono = ${normalizado} for update`;
			if (!u) return { ok: false, motivo: 'no_existe' };
			const persona = { nombre: u.nombre, esSocio: u.es_socio, esTesorero: u.es_tesorero };
			if (u.estado === 'baja') return { ok: false, motivo: 'baja', persona };

			const tipo = u.estado === 'activo' ? 'restablecer' : 'activacion';
			const caducaEn = new Date(ahora.getTime() + (tipo === 'restablecer' ? HORA : 7 * 24 * HORA));
			const codigo = generarCodigo();
			await tx`
				update codigo_acceso set usado_en = ${ahora}
				where usuario_id = ${u.id} and tipo = ${tipo} and usado_en is null`;
			await tx`
				insert into codigo_acceso (usuario_id, codigo_hash, tipo, caduca_en)
				values (${u.id}, ${sha256(codigo.replaceAll('-', ''))}, ${tipo}, ${caducaEn})`;

			// Como web/enlaces.ts.
			const enlace = new URL(
				tipo === 'restablecer' ? `/restablecer/${codigo}` : '/activar',
				urlPublica
			);
			if (tipo === 'activacion') enlace.searchParams.set('codigo', codigo);
			return { ok: true, persona, tipo, enlace: enlace.toString(), caducaEn };
		});
	} finally {
		await sql.end();
	}
}

if (import.meta.url === `file://${process.argv[1]}`) {
	const telefono = process.argv.slice(2).join(' ');
	const { DATABASE_URL, URL_PUBLICA } = process.env;
	if (!telefono || !DATABASE_URL || !URL_PUBLICA) {
		console.error('Uso: node scripts/restablecer-acceso.js <teléfono>');
		console.error(
			'Necesita DATABASE_URL y URL_PUBLICA: ejecútalo dentro del contenedor de la app.'
		);
		process.exit(1);
	}
	const r = await restablecerAcceso(DATABASE_URL, telefono, URL_PUBLICA).catch((error) => {
		console.error('Error:', error);
		process.exit(1);
	});
	if (!r.ok) {
		if (r.motivo === 'telefono') {
			console.error('Ese teléfono no es válido. Escríbelo como «600 123 456» o «+34 600 123 456».');
		} else if (r.motivo === 'no_existe') {
			console.error('No hay ningún usuario con ese teléfono.');
		} else {
			console.error(
				`${r.persona.nombre} está de baja: otro tesorero tiene que reactivarlo. Si no queda ningún tesorero activo, reinicia la app y saldrá en el log el enlace del tesorero inicial.`
			);
		}
		process.exit(1);
	}
	const roles = [r.persona.esSocio && 'socio', r.persona.esTesorero && 'tesorero'].filter(Boolean);
	const caduca = r.caducaEn.toLocaleString('es-ES', { timeZone: 'Europe/Madrid' });
	console.log(`${r.persona.nombre} (${roles.join(' y ')})`);
	console.log(
		r.tipo === 'restablecer'
			? 'Enlace para elegir otra contraseña. La actual vale hasta que se use.'
			: 'Nunca activó su cuenta: invitación nueva. La anterior ya no vale.'
	);
	console.log(`\n  ${r.enlace}\n`);
	console.log(`Caduca el ${caduca} y solo vale una vez. No lo compartas por un canal público.`);
}
