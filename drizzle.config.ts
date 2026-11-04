import { defineConfig } from 'drizzle-kit';

if (!process.env.DATABASE_URL) throw new Error('Falta DATABASE_URL');

export default defineConfig({
	schema: './src/lib/server/infra/db/esquema.ts',
	out: './drizzle',
	dialect: 'postgresql',
	dbCredentials: { url: process.env.DATABASE_URL },
	verbose: true,
	strict: true
});
