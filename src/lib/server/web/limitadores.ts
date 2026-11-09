// Limitadores de las acciones públicas (RNF-15), por IP salvo que se diga otra cosa. Una instancia
// por proceso.
import { Limitador } from '#lib/server/dominio/auth/limitador.ts';

const QUINCE_MINUTOS = 15 * 60 * 1000;

export const limitadorEntrar = new Limitador(20, QUINCE_MINUTOS);
export const limitadorActivar = new Limitador(10, QUINCE_MINUTOS);
export const limitadorRestablecer = new Limitador(10, QUINCE_MINUTOS);
/** Por teléfono: que nadie llene de correos el buzón de un socio pidiendo enlaces (HU-A04). */
export const limitadorRestablecerTelefono = new Limitador(3, 60 * 60 * 1000);
