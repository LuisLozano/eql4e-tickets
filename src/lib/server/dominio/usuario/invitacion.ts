// Texto del correo de invitación (HU-G01, HU-A01: el enlace abre la activación con el código).
import { formatoFecha } from '#lib/formato.ts';

const escapar = (texto: string) =>
	texto.replace(
		/[&<>"']/g,
		(c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!
	);

export function mensajeInvitacion(datos: { nombre: string; enlace: string; caducaEn: Date }) {
	const caduca = formatoFecha(datos.caducaEn);
	const asunto = 'Tu invitación a EQL4E Tickets';
	const texto = [
		`Hola, ${datos.nombre}:`,
		'',
		'Te han dado de alta en EQL4E Tickets, la app de la asociación para enviar los tickets de compra y que te los reembolsen.',
		'',
		'Para activar tu cuenta, abre este enlace, escribe tu teléfono y elige una contraseña:',
		'',
		datos.enlace,
		'',
		`El enlace caduca el ${caduca}. Si caduca, pide otro a un tesorero.`
	].join('\n');

	const html = `<p>Hola, ${escapar(datos.nombre)}:</p>
<p>Te han dado de alta en <b>EQL4E Tickets</b>, la app de la asociación para enviar los tickets de compra y que te los reembolsen.</p>
<p>Para activar tu cuenta, abre este enlace, escribe tu teléfono y elige una contraseña:</p>
<p><a href="${escapar(datos.enlace)}">Activar mi cuenta</a></p>
<p>El enlace caduca el ${caduca}. Si caduca, pide otro a un tesorero.</p>`;

	return { asunto, texto, html };
}
