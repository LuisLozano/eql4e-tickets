import { mkdtemp, rm, utimes } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
	GRACIA_MS,
	MAX_BORRADOS,
	limpiarHuerfanos
} from '../../src/lib/server/dominio/ficheros/huerfanos.ts';
import { almacenEnDisco } from '../../src/lib/server/infra/almacenamiento/disco.ts';
import { pago, ticket, ticketFichero } from '../../src/lib/server/infra/db/esquema.ts';
import { ejecutarEnExclusiva } from '../../src/lib/server/infra/tareas.ts';
import { conexionDePrueba } from './conexion.ts';
import { crearUsuario } from './datos.ts';

const { db } = conexionDePrueba();
const ahora = new Date('2026-11-07T19:00:00Z');
const hace = (ms: number) => new Date(ahora.getTime() - ms);
const datos = new Uint8Array([1, 2, 3]);

let raiz: string;
beforeEach(async () => {
	raiz = await mkdtemp(join(tmpdir(), 'eql4e-huerfanos-'));
});
afterEach(() => rm(raiz, { recursive: true, force: true }));

/** Guarda un fichero con la fecha de modificación indicada. */
async function fichero(ruta: string, modificado: Date) {
	await almacenEnDisco(raiz).guardar(ruta, datos);
	await utimes(join(raiz, ruta), modificado, modificado);
	return ruta;
}

/** Rutas únicas en la base de datos compartida. */
const ruta = (nombre: string) => `2026/11/${crypto.randomUUID()}-${nombre}`;

describe('ficheros huérfanos', () => {
	it('borra solo los que no nombra ningún ticket ni pago y tienen más de un día', async () => {
		const socio = await crearUsuario(db);
		const tesorero = await crearUsuario(db, { esTesorero: true });
		const viejo = hace(GRACIA_MS + 60_000);

		const deTicket = await fichero(ruta('ticket.webp'), viejo);
		const sustituido = await fichero(ruta('sustituido.webp'), viejo);
		const justificante = await fichero(ruta('justificante.pdf'), viejo);
		const huerfano = await fichero(ruta('huerfano.webp'), viejo);
		const reciente = await fichero(ruta('reciente.webp'), hace(60_000));

		const [t] = await db
			.insert(ticket)
			.values({
				socioId: socio.id,
				importeCentimos: 100,
				fechaCompra: '2026-11-01',
				conceptoOtro: 'x'
			})
			.returning();
		await db.insert(ticketFichero).values([
			{
				ticketId: t.id,
				ruta: deTicket,
				nombreOriginal: 'a',
				tipoMime: 'image/webp',
				tamanoBytes: 3,
				orden: 1
			},
			{
				ticketId: t.id,
				ruta: sustituido,
				nombreOriginal: 'b',
				tipoMime: 'image/webp',
				tamanoBytes: 3,
				orden: 2,
				sustituidoEn: viejo,
				sustituidoPor: socio.id
			}
		]);
		await db.insert(pago).values({
			socioId: socio.id,
			fechaPago: '2026-11-01',
			metodo: 'bizum',
			importeTotalCentimos: 100,
			justificanteRuta: justificante,
			justificanteMime: 'application/pdf',
			registradoPor: tesorero.id,
			anuladoEn: viejo,
			anuladoPor: tesorero.id,
			motivoAnulacion: 'pago deshecho: su justificante se conserva'
		});

		const r = await limpiarHuerfanos(db, almacenEnDisco(raiz), ahora);
		expect(r).toEqual({ ok: true, revisados: 5, borrados: [huerfano] });
		const quedan = (await almacenEnDisco(raiz).listar()).map((f) => f.ruta).sort();
		expect(quedan).toEqual([deTicket, sustituido, justificante, reciente].sort());
	});

	it('si salen demasiados, no borra ninguno', async () => {
		const viejo = hace(GRACIA_MS + 60_000);
		for (let i = 0; i <= MAX_BORRADOS; i++) await fichero(ruta(`h${i}.webp`), viejo);
		const r = await limpiarHuerfanos(db, almacenEnDisco(raiz), ahora);
		expect(r).toEqual({
			ok: false,
			motivo: 'demasiados',
			revisados: MAX_BORRADOS + 1,
			huerfanos: MAX_BORRADOS + 1
		});
		expect(await almacenEnDisco(raiz).listar()).toHaveLength(MAX_BORRADOS + 1);
	});
});

describe('tareas en exclusiva', () => {
	it('mientras una se ejecuta, la otra con el mismo nombre no espera: queda «ocupada»', async () => {
		let soltar!: () => void;
		const esperando = new Promise<void>((r) => (soltar = r));
		let empezada!: () => void;
		const haEmpezado = new Promise<void>((r) => (empezada = r));
		const nombre = `prueba-${crypto.randomUUID()}`;

		const primera = ejecutarEnExclusiva(db, nombre, async () => {
			empezada();
			await esperando;
			return 'hecha';
		});
		await haEmpezado;
		expect(await ejecutarEnExclusiva(db, nombre, async () => 'no')).toEqual({
			ok: false,
			motivo: 'ocupada'
		});
		// Con otro nombre, sí.
		expect(await ejecutarEnExclusiva(db, `${nombre}-otra`, async () => 'sí')).toEqual({
			ok: true,
			resultado: 'sí'
		});
		soltar();
		expect(await primera).toEqual({ ok: true, resultado: 'hecha' });
		// Al terminar, el bloqueo se suelta.
		expect(await ejecutarEnExclusiva(db, nombre, async () => 'otra vez')).toEqual({
			ok: true,
			resultado: 'otra vez'
		});
	});
});
