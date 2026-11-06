// Quién puede ver qué (docs/requisitos/02-roles-permisos.md). Puro: sin base de datos.

export type Lector = { id: string; esTesorero: boolean };

/**
 * R-01: un socio solo ve sus tickets y ficheros; un tesorero, todos. Si no puede, la ruta
 * responde 404 (no 403), para no revelar que existe.
 */
export function puedeVerTicket(lector: Lector, ticket: { socioId: string }): boolean {
	return lector.esTesorero || ticket.socioId === lector.id;
}
