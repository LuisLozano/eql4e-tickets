import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';
import {
	cambiarActivo,
	crearConcepto,
	listarConceptos,
	moverConcepto,
	renombrarConcepto
} from '../../src/lib/server/dominio/concepto/gestion.ts';
import { concepto, ticket } from '../../src/lib/server/infra/db/esquema.ts';
import type { Conexion } from '../../src/lib/server/infra/db/tipos.ts';
import { conexionDePrueba } from './conexion.ts';
import { crearUsuario } from './datos.ts';

const { db } = conexionDePrueba();

// Cada prueba trabaja en una transacción que se deshace al final: los conceptos son una lista
// compartida y otros ficheros de pruebas cuentan con los cuatro iniciales en su orden.
class Deshacer extends Error {}
async function sinGuardar(prueba: (tx: Conexion) => Promise<void>) {
	await expect(
		db.transaction(async (tx) => {
			await prueba(tx);
			throw new Deshacer();
		})
	).rejects.toBeInstanceOf(Deshacer);
}

async function crear(tx: Conexion, nombre: string) {
	const r = await crearConcepto(tx, nombre);
	if (!r.ok) throw new Error(`no se pudo crear ${nombre}`);
	return r.id;
}

const nombres = async (tx: Conexion) => (await listarConceptos(tx)).map((c) => c.nombre);

describe('crear concepto (HU-G04)', () => {
	it('lo añade al final, sin espacios sobrantes', () =>
		sinGuardar(async (tx) => {
			await crear(tx, '  Imprenta ');
			await crear(tx, 'Librería');
			expect((await nombres(tx)).slice(-2)).toEqual(['Imprenta', 'Librería']);
		}));

	it('no admite un nombre repetido, sin distinguir mayúsculas', () =>
		sinGuardar(async (tx) => {
			expect(await crearConcepto(tx, 'FERRETERÍA')).toEqual({ ok: false, motivo: 'duplicado' });
		}));
});

describe('listar conceptos', () => {
	it('cuenta los tickets de cada concepto', () =>
		sinGuardar(async (tx) => {
			const id = await crear(tx, 'Imprenta');
			const socio = await crearUsuario(tx);
			await tx.insert(ticket).values(
				[500, 700].map((importeCentimos) => ({
					socioId: socio.id,
					importeCentimos,
					fechaCompra: '2026-11-04',
					conceptoId: id
				}))
			);
			const fila = (await listarConceptos(tx)).find((c) => c.id === id);
			expect(fila).toEqual({ id, nombre: 'Imprenta', activo: true, tickets: 2 });
		}));
});

describe('renombrar concepto', () => {
	it('cambia el nombre, también solo las mayúsculas', () =>
		sinGuardar(async (tx) => {
			const id = await crear(tx, 'imprenta');
			expect(await renombrarConcepto(tx, id, ' Imprenta ')).toEqual({ ok: true });
			expect(await nombres(tx)).toContain('Imprenta');
		}));

	it('no admite el nombre de otro concepto', () =>
		sinGuardar(async (tx) => {
			const id = await crear(tx, 'Imprenta');
			expect(await renombrarConcepto(tx, id, 'transporte')).toEqual({
				ok: false,
				motivo: 'duplicado'
			});
		}));

	it('avisa si el concepto no existe', () =>
		sinGuardar(async (tx) => {
			expect(await renombrarConcepto(tx, 999_999, 'Imprenta')).toEqual({
				ok: false,
				motivo: 'no_existe'
			});
		}));
});

describe('reordenar conceptos', () => {
	it('sube y baja un puesto', () =>
		sinGuardar(async (tx) => {
			const id = await crear(tx, 'Imprenta');
			await moverConcepto(tx, id, 'subir');
			expect((await nombres(tx)).slice(-2)).toEqual(['Imprenta', 'Transporte']);
			await moverConcepto(tx, id, 'bajar');
			expect((await nombres(tx)).slice(-2)).toEqual(['Transporte', 'Imprenta']);
		}));

	it('en los extremos no hace nada', () =>
		sinGuardar(async (tx) => {
			const antes = await listarConceptos(tx);
			expect(await moverConcepto(tx, antes[0].id, 'subir')).toEqual({ ok: true });
			expect(await moverConcepto(tx, antes.at(-1)!.id, 'bajar')).toEqual({ ok: true });
			// Solo el orden: otros ficheros de pruebas crean tickets a la vez y cambian los recuentos.
			const ids = (lista: typeof antes) => lista.map((c) => c.id);
			expect(ids(await listarConceptos(tx))).toEqual(ids(antes));
		}));

	it('deshace los empates de orden', () =>
		sinGuardar(async (tx) => {
			const a = await crear(tx, 'Imprenta');
			const b = await crear(tx, 'Librería');
			await tx.update(concepto).set({ orden: 99 }).where(eq(concepto.id, a));
			await tx.update(concepto).set({ orden: 99 }).where(eq(concepto.id, b));

			await moverConcepto(tx, b, 'subir');
			expect((await nombres(tx)).slice(-2)).toEqual(['Librería', 'Imprenta']);
			const ordenes = (await tx.select({ orden: concepto.orden }).from(concepto)).map(
				(f) => f.orden
			);
			expect(new Set(ordenes).size).toBe(ordenes.length);
		}));

	it('avisa si el concepto no existe', () =>
		sinGuardar(async (tx) => {
			expect(await moverConcepto(tx, 999_999, 'subir')).toEqual({
				ok: false,
				motivo: 'no_existe'
			});
		}));
});

describe('activar y desactivar', () => {
	it('desactivado, sus tickets lo conservan; se puede reactivar', () =>
		sinGuardar(async (tx) => {
			const id = await crear(tx, 'Imprenta');
			const socio = await crearUsuario(tx);
			const [t] = await tx
				.insert(ticket)
				.values({
					socioId: socio.id,
					importeCentimos: 500,
					fechaCompra: '2026-11-04',
					conceptoId: id
				})
				.returning();

			expect(await cambiarActivo(tx, id, false)).toEqual({ ok: true });
			const fila = (await listarConceptos(tx)).find((c) => c.id === id);
			expect(fila).toMatchObject({ activo: false, tickets: 1 });
			const [guardado] = await tx.select().from(ticket).where(eq(ticket.id, t.id));
			expect(guardado.conceptoId).toBe(id);

			await cambiarActivo(tx, id, true);
			expect((await listarConceptos(tx)).find((c) => c.id === id)?.activo).toBe(true);
		}));

	it('avisa si el concepto no existe', () =>
		sinGuardar(async (tx) => {
			expect(await cambiarActivo(tx, 999_999, false)).toEqual({ ok: false, motivo: 'no_existe' });
		}));
});
