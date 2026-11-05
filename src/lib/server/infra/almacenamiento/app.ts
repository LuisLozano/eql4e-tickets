// El almacén de la app (lee el entorno). Solo lo importan las rutas.
import { RUTA_FICHEROS } from '$app/env/private';
import { almacenEnDisco } from './disco.ts';

export const almacen = almacenEnDisco(RUTA_FICHEROS);
