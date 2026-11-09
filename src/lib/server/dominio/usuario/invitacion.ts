// Textos de los correos de acceso. La invitación (HU-G01, HU-A01: el enlace abre la activación con
// el código); si el usuario ya estaba activo, el mismo enlace le sirve para elegir otra contraseña
// (HU-G02). Y el restablecimiento que pide el propio usuario (HU-A04).
import { formatoFecha, formatoFechaHora } from '#lib/formato.ts';

const escapar = (texto: string) =>
	texto.replace(
		/[&<>"']/g,
		(c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!
	);

export function mensajeInvitacion(datos: {
	nombre: string;
	enlace: string;
	caducaEn: Date;
	restablecer?: boolean;
}) {
	const caduca = formatoFecha(datos.caducaEn);
	const asunto = datos.restablecer
		? 'Elige una contraseña nueva en EQL4E Tickets'
		: 'Tu invitación a EQL4E Tickets';
	const intro = datos.restablecer
		? 'Un tesorero te ha enviado un enlace para elegir una contraseña nueva en EQL4E Tickets. Cuando la elijas, la anterior dejará de valer.'
		: 'Te han dado de alta en <b>EQL4E Tickets</b>, la app de la asociación para enviar los tickets de compra y que te los reembolsen.';
	const instruccion = datos.restablecer
		? 'Abre este enlace, escribe tu teléfono y elige la contraseña nueva:'
		: 'Para activar tu cuenta, abre este enlace, escribe tu teléfono y elige una contraseña:';
	const boton = datos.restablecer ? 'Elegir contraseña' : 'Activar mi cuenta';
	const texto = [
		`Hola, ${datos.nombre}:`,
		'',
		intro.replaceAll(/<\/?b>/g, ''),
		'',
		instruccion,
		'',
		datos.enlace,
		'',
		`El enlace caduca el ${caduca}. Si caduca, pide otro a un tesorero.`
	].join('\n');

	const html = `<p>Hola, ${escapar(datos.nombre)}:</p>
<p>${intro}</p>
<p>${instruccion}</p>
<p><a href="${escapar(datos.enlace)}">${boton}</a></p>
<p>El enlace caduca el ${caduca}. Si caduca, pide otro a un tesorero.</p>`;

	return { asunto, texto, html };
}

export function mensajeRestablecimiento(datos: { nombre: string; enlace: string; caducaEn: Date }) {
	const asunto = 'Elige una contraseña nueva en EQL4E Tickets';
	const intro = 'Has pedido elegir una contraseña nueva en EQL4E Tickets.';
	const instruccion = 'Abre este enlace, escribe tu teléfono y elige la contraseña nueva:';
	const caduca = `El enlace caduca el ${formatoFechaHora(datos.caducaEn)} y solo vale una vez.`;
	const ignorar = 'Si no lo has pedido tú, no hagas nada: tu contraseña no cambia.';
	const texto = [
		`Hola, ${datos.nombre}:`,
		'',
		intro,
		'',
		instruccion,
		'',
		datos.enlace,
		'',
		caduca,
		ignorar
	].join('\n');

	const html = `<p>Hola, ${escapar(datos.nombre)}:</p>
<p>${intro}</p>
<p>${instruccion}</p>
<p><a href="${escapar(datos.enlace)}">Elegir contraseña</a></p>
<p>${caduca}</p>
<p>${ignorar}</p>`;

	return { asunto, texto, html };
}
