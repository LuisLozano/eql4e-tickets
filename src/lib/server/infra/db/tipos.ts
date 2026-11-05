// Tipos de conexión que reciben los servicios de dominio.
// No existe @Transactional: una función que deba formar parte de una transacción recibe
// `Conexion` y la usa en todas sus consultas (ver docs/arquitectura/04-estructura.md).
import type { crearConexion } from './cliente.ts';

export type Db = ReturnType<typeof crearConexion>['db'];
export type Tx = Parameters<Parameters<Db['transaction']>[0]>[0];
export type Conexion = Db | Tx;
