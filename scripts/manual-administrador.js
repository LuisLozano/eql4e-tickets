// Manual de administrador en PDF (D-01): deploy/README.md tal cual, con un índice y los enlaces
// relativos apuntando a GitHub. Uso: pnpm manual:admin → docs/manual/manual-administrador.pdf
import { readFileSync } from 'node:fs';
import { chromium } from '@playwright/test';
import { marked } from 'marked';

const ORIGEN = 'deploy/README.md';
const DESTINO = 'docs/manual/manual-administrador.pdf';
const REPOSITORIO = 'https://github.com/LuisLozano/eql4e-tickets/blob/main/deploy/';

const slug = (/** @type {string} */ texto) =>
	texto
		.replace(/<[^>]+>/g, '')
		.toLowerCase()
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '')
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-|-$/g, '');

/** @type {{ id: string; texto: string }[]} */
const apartados = [];
let cuerpo = marked
	.parse(readFileSync(ORIGEN, 'utf8'), { async: false })
	// Los enlaces relativos del README no llevan a ningún sitio desde un PDF.
	.replace(
		/href="(?!https?:|#|mailto:)([^"]+)"/g,
		(_, ruta) => `href="${new URL(ruta, REPOSITORIO)}"`
	)
	.replace(/<h2>(.*?)<\/h2>/g, (_, texto) => {
		const id = slug(texto);
		apartados.push({ id, texto });
		return `<h2 id="${id}">${texto}</h2>`;
	});
// El índice, detrás de la introducción (el primer párrafo).
const indice = `<nav><h2>Índice</h2><ul>${apartados
	.map((a) => `<li><a href="#${a.id}">${a.texto}</a></li>`)
	.join('')}</ul></nav>`;
cuerpo = cuerpo.replace('</p>', `</p>${indice}`);

const html = `<!doctype html><html lang="es"><meta charset="utf-8"><title>Manual de administrador</title><style>
body { font: 10pt/1.45 'DejaVu Sans', sans-serif; color: #111; }
h1 { font-size: 20pt; margin: 0 0 8pt; }
h2 { font-size: 14pt; border-bottom: 1px solid #999; margin-top: 18pt; break-after: avoid; }
h3 { font-size: 11.5pt; margin-top: 14pt; break-after: avoid; }
nav ul { columns: 2; padding-left: 0; list-style: none; } nav a { text-decoration: none; }
nav h2 { border: 0; }
code { font-family: 'DejaVu Sans Mono', monospace; font-size: 8.5pt; background: #eee; padding: 0 2pt; }
pre { background: #eee; padding: 6pt; white-space: pre-wrap; overflow-wrap: anywhere; break-inside: avoid; }
pre code { background: none; padding: 0; }
table { border-collapse: collapse; width: 100%; font-size: 8.5pt; }
th, td { border: 1px solid #888; padding: 3pt 4pt; text-align: left; vertical-align: top; }
th { background: #e4e4e4; } tr { break-inside: avoid; }
/* En las tablas de cuatro columnas (scripts, tareas), la descripción necesita sitio. */
table:has(th:nth-child(4)) td:last-child { width: 38%; }
blockquote { margin: 8pt 0; padding: 4pt 10pt; border-left: 3pt solid #b00; background: #fbecec; }
a { color: #1a4f8b; overflow-wrap: anywhere; }
li { margin: 2pt 0; }
</style><body>${cuerpo}</body></html>`;

const fecha = new Date().toLocaleDateString('es-ES', { timeZone: 'Europe/Madrid' });
const navegador = await chromium.launch();
try {
	const pagina = await navegador.newPage();
	await pagina.setContent(html);
	await pagina.pdf({
		path: DESTINO,
		format: 'A4',
		margin: { top: '15mm', bottom: '15mm', left: '14mm', right: '14mm' },
		displayHeaderFooter: true,
		headerTemplate: '<span></span>',
		footerTemplate: `<div style="font-size:7.5pt;width:100%;text-align:center;color:#555">EQL4E Tickets · Manual de administrador · ${fecha} · <span class="pageNumber"></span>/<span class="totalPages"></span></div>`
	});
} finally {
	await navegador.close();
}
console.log(`✔ ${DESTINO}`);
