// Limitadores por IP de las acciones públicas (RNF-15). Una instancia por proceso.
import { Limitador } from '#lib/server/dominio/auth/limitador.ts';

const QUINCE_MINUTOS = 15 * 60 * 1000;

export const limitadorEntrar = new Limitador(20, QUINCE_MINUTOS);
export const limitadorActivar = new Limitador(10, QUINCE_MINUTOS);
