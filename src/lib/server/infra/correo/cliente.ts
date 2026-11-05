// Envío de correo (ADR-0004): SMTP con Nodemailer en producción y «consola» en desarrollo y
// pruebas, que nunca envía nada. No lee variables de entorno: la configuración llega por parámetro.
import { createTransport } from 'nodemailer';

export type Mensaje = { para: string; asunto: string; texto: string; html: string };

export interface Correo {
	/** Falso en modo consola: el correo no le llega a nadie. */
	readonly envia: boolean;
	enviar(mensaje: Mensaje): Promise<void>;
}

export type ConfigCorreo = {
	modo: 'smtp' | 'consola';
	host?: string;
	puerto: number;
	usuario?: string;
	contrasena?: string;
	remitente?: string;
};

export function crearCorreo(config: ConfigCorreo): Correo {
	return config.modo === 'smtp' ? correoSmtp(config) : correoConsola();
}

/** Escribe el correo en el log, con el enlace, en vez de enviarlo. */
export function correoConsola(escribir: (texto: string) => void = console.log): Correo {
	return {
		envia: false,
		async enviar({ para, asunto, texto }) {
			escribir(
				[
					'',
					'================ CORREO (modo consola, no se envía) ================',
					`Para: ${para}`,
					`Asunto: ${asunto}`,
					'',
					texto,
					'====================================================================',
					''
				].join('\n')
			);
		}
	};
}

function correoSmtp(config: ConfigCorreo): Correo {
	const { host, usuario, contrasena, remitente } = config;
	const faltan = Object.entries({
		SMTP_HOST: host,
		SMTP_USER: usuario,
		SMTP_PASS: contrasena,
		SMTP_FROM: remitente
	})
		.filter(([, valor]) => !valor)
		.map(([nombre]) => nombre);

	// Sin configuración la app arranca igual: cada envío falla y el tesorero copia el enlace.
	if (faltan.length) {
		const motivo = `CORREO_MODO=smtp necesita ${faltan.join(', ')}`;
		return {
			envia: true,
			enviar: async () => {
				throw new Error(motivo);
			}
		};
	}

	// 465: TLS desde el principio; el resto (587), STARTTLS obligatorio.
	const transporte = createTransport({
		host,
		port: config.puerto,
		secure: config.puerto === 465,
		requireTLS: config.puerto !== 465,
		auth: { user: usuario, pass: contrasena }
	});
	return {
		envia: true,
		async enviar({ para, asunto, texto, html }) {
			await transporte.sendMail({ from: remitente, to: para, subject: asunto, text: texto, html });
		}
	};
}
