// La conexión de la aplicación. Solo se importa desde rutas y hooks (capa SvelteKit);
// el dominio la recibe como parámetro (regla de ESLint en eslint.config.js).
import { DATABASE_URL } from '$app/env/private';
import { crearConexion } from './cliente.ts';

export const { sql, db } = crearConexion(DATABASE_URL);
