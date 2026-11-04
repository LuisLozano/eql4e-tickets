// Prepara un PostgreSQL limpio para cada ejecución de las pruebas de integración (ADR-0006, ADR-0007).
// - Con TEST_DATABASE_URL (en local, PostgreSQL de compose.dev): crea una base de datos temporal.
// - Sin ella (en la CI): levanta un contenedor con Testcontainers.
import postgres from 'postgres';
import type { TestProject } from 'vitest/node';
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { migrar } from '../../scripts/migrar.js';

declare module 'vitest' {
	export interface ProvidedContext {
		databaseUrl: string;
	}
}

export default async function preparar(project: TestProject) {
	const base = process.env.TEST_DATABASE_URL;

	if (base) {
		const nombre = `eql4e_prueba_${Date.now()}`;
		const admin = postgres(base, { max: 1, onnotice: () => {} });
		await admin.unsafe(`create database ${nombre}`);
		const url = new URL(base);
		url.pathname = `/${nombre}`;
		await migrar(url.toString());
		project.provide('databaseUrl', url.toString());
		return async () => {
			await admin.unsafe(`drop database if exists ${nombre} with (force)`);
			await admin.end();
		};
	}

	const contenedor = await new PostgreSqlContainer('postgres:18-alpine').start();
	await migrar(contenedor.getConnectionUri());
	project.provide('databaseUrl', contenedor.getConnectionUri());
	return async () => {
		await contenedor.stop();
	};
}
