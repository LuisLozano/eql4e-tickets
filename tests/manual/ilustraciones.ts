// Ilustraciones esquemáticas de cómo se instala la app en Android (Chrome) e iPhone (Safari), para la
// Ayuda. Esos menús los dibuja el móvil, no la app, así que no se pueden capturar: se dibujan aquí,
// simplificados y sin imitar el aspecto exacto de cada navegador, con el paso resaltado.
import { readFileSync } from 'node:fs';

const datos = (ruta: string) => `data:image/png;base64,${readFileSync(ruta).toString('base64')}`;

/** Ancho y alto de cada ilustración, en píxeles CSS. */
export const TAMANO = { width: 360, height: 640 };

const URL = 'tickets-eql4e.ddns.net';
const RESALTE = '#d9480f';

const ICONO_COMPARTIR = `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 7l4-4 4 4"/><path d="M12 3v12"/><path d="M6 11H5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1h-1"/></svg>`;
const ICONO_MAS = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="3" width="18" height="18" rx="4"/><path d="M12 8v8M8 12h8"/></svg>`;

const ESTILO = `
* { box-sizing: border-box; }
body { margin: 0; width: ${TAMANO.width}px; height: ${TAMANO.height}px; overflow: hidden; position: relative;
	font: 15px/1.3 'DejaVu Sans', system-ui, sans-serif; color: #1c1c1e; background: #fff; }
.estado { height: 24px; display: flex; justify-content: space-between; align-items: center; padding: 0 14px;
	font-size: 12px; background: #f1f3f4; color: #444; }
.contenido { position: absolute; left: 0; right: 0; overflow: hidden; }
.contenido img { width: 100%; display: block; }
.velo { position: absolute; inset: 0; background: rgba(0, 0, 0, 0.4); }
.resalte { outline: 3px solid ${RESALTE}; outline-offset: 2px; border-radius: 8px; }
.marca { position: absolute; background: ${RESALTE}; color: #fff; font-weight: bold; font-size: 14px;
	padding: 6px 10px; border-radius: 16px; box-shadow: 0 2px 6px rgba(0,0,0,.3); white-space: nowrap; }
.pie { position: absolute; bottom: 0; left: 0; right: 0; padding: 4px; text-align: center; font-size: 11px;
	color: #666; background: rgba(255,255,255,.9); }
/* Android */
.chrome { height: 52px; display: flex; align-items: center; gap: 8px; padding: 0 8px; background: #f1f3f4; }
.url { flex: 1; height: 36px; border-radius: 18px; background: #e3e5e8; display: flex; align-items: center;
	padding: 0 14px; font-size: 14px; color: #333; }
.puntos { width: 36px; height: 36px; display: grid; place-items: center; font-size: 22px; font-weight: bold; }
.menu { position: absolute; top: 30px; right: 6px; width: 230px; background: #fff; border-radius: 10px;
	box-shadow: 0 6px 24px rgba(0,0,0,.35); padding: 6px 0; }
.menu div { padding: 11px 16px; font-size: 15px; color: #333; }
.menu div.resalte { margin: 2px 6px; padding: 9px 10px; font-weight: bold; color: #000; }
.dialogo { position: absolute; left: 24px; right: 24px; top: 210px; background: #fff; border-radius: 22px;
	padding: 22px; box-shadow: 0 6px 24px rgba(0,0,0,.35); }
.dialogo h3 { margin: 0 0 16px; font-size: 19px; font-weight: normal; }
.app { display: flex; align-items: center; gap: 12px; }
.app img { width: 44px; height: 44px; border-radius: 50%; border: 1px solid #ddd; }
.app small { display: block; color: #666; font-size: 12px; }
.botones { display: flex; justify-content: flex-end; gap: 18px; margin-top: 22px; font-weight: bold; color: #1a5fb4; }
.botones span { padding: 6px 8px; }
/* iPhone */
.safari { position: absolute; left: 0; right: 0; bottom: 0; background: #f2f2f7; border-top: 1px solid #ccc; padding: 8px 10px 18px; }
.safari .url { justify-content: center; background: #e3e3e8; border-radius: 10px; height: 38px; }
.herramientas { display: flex; justify-content: space-around; align-items: center; margin-top: 10px; color: #1a5fb4;
	font-size: 22px; height: 34px; }
.herramientas span { width: 40px; height: 34px; display: grid; place-items: center; }
.hoja { position: absolute; left: 0; right: 0; bottom: 0; background: #f2f2f7; border-radius: 14px 14px 0 0;
	padding: 12px 12px 26px; box-shadow: 0 -4px 20px rgba(0,0,0,.25); }
.hoja .cabeza { display: flex; align-items: center; gap: 10px; padding: 4px 4px 12px; border-bottom: 1px solid #ddd; }
.hoja .cabeza img { width: 40px; height: 40px; border-radius: 9px; }
.lista { background: #fff; border-radius: 10px; margin-top: 12px; }
.lista div { display: flex; justify-content: space-between; align-items: center; padding: 12px 14px;
	border-bottom: 1px solid #e5e5ea; font-size: 15px; }
.lista div:last-child { border-bottom: 0; }
.lista div.resalte { font-weight: bold; }
.modal { position: absolute; inset: 24px 0 0; background: #f2f2f7; border-radius: 12px 12px 0 0; }
.modal .barra { display: flex; justify-content: space-between; align-items: center; padding: 14px; font-size: 15px; }
.modal .barra b { font-size: 15px; }
.modal .azul { color: #1a5fb4; padding: 4px 6px; }
.modal .ficha { margin: 10px 14px; background: #fff; border-radius: 10px; padding: 12px; display: flex; gap: 12px; align-items: center; }
.modal .ficha img { width: 56px; height: 56px; border-radius: 13px; }
.modal .ficha .nombre { border-bottom: 1px solid #ddd; padding-bottom: 6px; margin-bottom: 6px; font-size: 16px; }
/* Pantalla de inicio */
.inicio { position: absolute; inset: 24px 0 0; background: linear-gradient(160deg, #2d4f6c, #6c8aa3 60%, #a9b8c4); }
.rejilla { display: grid; grid-template-columns: repeat(4, 1fr); gap: 22px 8px; padding: 30px 14px; }
.icono { display: flex; flex-direction: column; align-items: center; gap: 6px; color: #fff; font-size: 12px; }
.icono i { width: 58px; height: 58px; background: rgba(255,255,255,.35); display: block; }
.android .icono i { border-radius: 50%; }
.iphone .icono i { border-radius: 14px; }
.icono img { width: 58px; height: 58px; display: block; background: #fff; }
.android .icono img { border-radius: 50%; }
.iphone .icono img { border-radius: 14px; }
.icono.resalte { outline-color: #ffd43b; border-radius: 14px; padding: 4px; }
`;

const pagina = (clase: string, cuerpo: string) =>
	`<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>${ESTILO}</style>` +
	`<body class="${clase}">${cuerpo}<div class="pie">Ilustración: en tu móvil puede verse algo distinto.</div></body></html>`;

const estado = '<div class="estado"><span>10:30</span><span>▮▮▮ 85 %</span></div>';

function pantallaDeInicio(clase: string, icono: string) {
	const otras = ['Teléfono', 'Mensajes', 'Cámara', 'Fotos', 'Reloj', 'Ajustes', 'Mapas'];
	return pagina(
		clase,
		`${estado}<div class="inicio"><div class="rejilla">
			${otras.map((n) => `<div class="icono"><i></i>${n}</div>`).join('')}
			<div class="icono resalte"><img src="${icono}" alt="">Tickets</div>
		</div></div>
		<div class="marca" style="top: 236px; right: 10px">Tu app, lista</div>`
	);
}

/** Las ocho ilustraciones, por nombre de fichero. `misTickets` es la captura de «Mis tickets». */
export function ilustraciones(rutas: {
	misTickets: string;
	iconoAndroid: string;
	iconoIphone: string;
}) {
	const fondo = datos(rutas.misTickets);
	const android = datos(rutas.iconoAndroid);
	const iphone = datos(rutas.iconoIphone);

	const chrome = (puntosResaltados: boolean) =>
		`${estado}<div class="chrome"><div class="url">${URL}</div>
		<div class="puntos${puntosResaltados ? ' resalte' : ''}">⋮</div></div>
		<div class="contenido" style="top: 76px; bottom: 0"><img src="${fondo}" alt=""></div>`;
	const safari = (compartirResaltado: boolean) =>
		`${estado}<div class="contenido" style="top: 24px; bottom: 110px"><img src="${fondo}" alt=""></div>
		<div class="safari"><div class="url">${URL}</div><div class="herramientas">
			<span>‹</span><span>›</span>
			<span class="${compartirResaltado ? 'resalte' : ''}">${ICONO_COMPARTIR}</span>
			<span>▢</span><span>⧉</span>
		</div></div>`;

	return {
		'android-1': pagina(
			'android',
			`${chrome(true)}<div class="marca" style="top: 90px; right: 10px">1. Pulsa ⋮</div>`
		),
		'android-2': pagina(
			'android',
			`${chrome(false)}<div class="velo"></div><div class="menu">
				<div>Nueva pestaña</div><div>Historial</div><div>Descargas</div><div>Marcadores</div>
				<div>Compartir…</div><div class="resalte">Instalar aplicación</div><div>Ajustes</div>
			</div><div class="marca" style="top: 340px; right: 30px">2. Instalar aplicación</div>`
		),
		'android-3': pagina(
			'android',
			`${chrome(false)}<div class="velo"></div><div class="dialogo">
				<h3>¿Instalar aplicación?</h3>
				<div class="app"><img src="${android}" alt=""><div>Tickets<small>${URL}</small></div></div>
				<div class="botones"><span>Cancelar</span><span class="resalte">Instalar</span></div>
			</div><div class="marca" style="top: 410px; right: 30px">3. Instalar</div>`
		),
		'android-4': pantallaDeInicio('android', android),
		'iphone-1': pagina(
			'iphone',
			`${safari(true)}<div class="marca" style="bottom: 120px; left: 50%; transform: translateX(-50%)">1. Pulsa Compartir</div>`
		),
		'iphone-2': pagina(
			'iphone',
			`${safari(false)}<div class="velo"></div><div class="hoja">
				<div class="cabeza"><img src="${iphone}" alt=""><div>Tickets<br><small style="color:#666">${URL}</small></div></div>
				<div class="lista"><div>Copiar <span>⧉</span></div><div>Añadir a la lista de lectura <span>◎</span></div>
				<div>Añadir a favoritos <span>☆</span></div></div>
				<div class="lista"><div class="resalte">Añadir a pantalla de inicio ${ICONO_MAS}</div>
				<div>Buscar en la página <span>⌕</span></div></div>
			</div><div class="marca" style="top: 250px; left: 14px">2. Desliza y pulsa abajo</div>`
		),
		'iphone-3': pagina(
			'iphone',
			`${safari(false)}<div class="velo"></div><div class="modal">
				<div class="barra"><span class="azul">Cancelar</span><b>Añadir a inicio</b><span class="azul resalte">Añadir</span></div>
				<div class="ficha"><img src="${iphone}" alt=""><div style="flex:1"><div class="nombre">Tickets</div>
				<small style="color:#666">https://${URL}</small></div></div>
			</div><div class="marca" style="top: 80px; right: 10px">3. Añadir</div>`
		),
		'iphone-4': pantallaDeInicio('iphone', iphone)
	};
}
