import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { DATABASE_URL } from '$app/env/private';
import * as esquema from './esquema';

export const sql = postgres(DATABASE_URL, { max: 10 });

export const db = drizzle(sql, { schema: esquema });
