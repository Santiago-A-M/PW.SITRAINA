/* Extrae el catálogo semilla desde index.html hacia documentos/catalogo/*.json */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const outDir = path.join(root, 'documentos', 'catalogo');
fs.mkdirSync(outDir, { recursive: true });

function section(id) {
    const marker = 'id="vista-' + id + '"';
    const start = html.indexOf(marker);
    if (start < 0) return '';
    // Saltar el data-vista-publica del mismo elemento de apertura.
    const afterOpen = html.indexOf('>', start);
    const from = afterOpen > 0 ? afterOpen + 1 : start + marker.length;
    const next = html.indexOf('data-vista-publica="', from);
    return next > 0 ? html.slice(from, next) : html.slice(from, from + 80000);
}

function archivos(id) {
    const chunk = section(id);
    const items = [];
    const re = /<article class="archivo-item">[\s\S]*?<h3>([\s\S]*?)<\/h3>\s*<p>([\s\S]*?)<\/p>[\s\S]*?href="([^"]+)"/g;
    let m;
    let i = 0;
    while ((m = re.exec(chunk))) {
        items.push({
            id: id + '-' + (++i),
            titulo: m[1].replace(/\s+/g, ' ').trim(),
            desc: m[2].replace(/\s+/g, ' ').trim(),
            archivo: decodeURIComponent(m[3]),
            origen: 'base'
        });
    }
    return items;
}

['legales', 'informes', 'actas'].forEach(function (id) {
    const items = archivos(id);
    fs.writeFileSync(path.join(outDir, id + '.json'), JSON.stringify(items, null, 2) + '\n');
    console.log(id, items.length);
});

const eChunk = section('efemerides');
const eItems = [];
const eRe = /<article class="efemeride">[\s\S]*?<span class="efemeride-fecha">([\s\S]*?)<\/span>\s*<span class="efemeride-titulo">([\s\S]*?)<\/span>[\s\S]*?<div class="efemeride-panel">([\s\S]*?)<\/div>\s*<\/article>/g;
let em;
let ei = 0;
while ((em = eRe.exec(eChunk))) {
    const panel = em[3];
    const img = (panel.match(/src="([^"]+)"/) || [])[1] || '';
    const texto = (panel.match(/<p>([\s\S]*?)<\/p>/) || [])[1] || '';
    eItems.push({
        id: 'efemerides-' + (++ei),
        fecha: em[1].replace(/\s+/g, ' ').trim(),
        titulo: em[2].replace(/\s+/g, ' ').trim(),
        texto: texto.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim(),
        media: img,
        origen: 'base'
    });
}
fs.writeFileSync(path.join(outDir, 'efemerides.json'), JSON.stringify(eItems, null, 2) + '\n');
console.log('efemerides', eItems.length);

const cChunk = section('convenios');
const cItems = [];
const cRe = /<div class="tarjeta-pagina" data-category="([^"]+)">[\s\S]*?<img src="([^"]+)"[\s\S]*?<h3>([\s\S]*?)<\/h3>\s*<p>([\s\S]*?)<\/p>/g;
let cm;
let ci = 0;
while ((cm = cRe.exec(cChunk))) {
    cItems.push({
        id: 'convenios-' + (++ci),
        rubro: cm[1],
        imagen: cm[2],
        titulo: cm[3].replace(/\s+/g, ' ').trim(),
        nota: cm[4].replace(/\s+/g, ' ').trim(),
        origen: 'base'
    });
}
fs.writeFileSync(path.join(outDir, 'convenios.json'), JSON.stringify(cItems, null, 2) + '\n');
console.log('convenios', cItems.length);
