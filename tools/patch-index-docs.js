const fs = require('fs');
const path = require('path');
const p = path.join(__dirname, '..', 'index.html');
let html = fs.readFileSync(p, 'utf8');

function findDivEnd(start) {
    const sub = html.slice(start);
    const re = /<\/?div\b[^>]*>/g;
    let d = 0;
    let match;
    while ((match = re.exec(sub))) {
        const tag = match[0];
        if (tag.startsWith('</')) {
            d -= 1;
            if (d === 0) return start + match.index + tag.length;
        } else if (!/\/>$/.test(tag)) {
            d += 1;
        }
    }
    return -1;
}

function replaceDivByClass(className, replacement, fromIndex) {
    const marker = '<div class="' + className + '">';
    const start = html.indexOf(marker, fromIndex || 0);
    if (start < 0) throw new Error('no ' + className);
    const end = findDivEnd(start);
    if (end < 0) throw new Error('no end ' + className);
    html = html.slice(0, start) + replacement + html.slice(end);
    console.log('patched', className, 'at', start);
}

replaceDivByClass(
    'lista-archivos',
    '<div class="lista-archivos" id="lista-docs-legales">\n      <p class="vacio-bloque">Cargando…</p>\n    </div>',
    html.indexOf('id="vista-legales"')
);
replaceDivByClass(
    'lista-archivos',
    '<div class="lista-archivos" id="lista-docs-informes">\n      <p class="vacio-bloque">Cargando…</p>\n    </div>',
    html.indexOf('id="vista-informes"')
);
replaceDivByClass(
    'lista-archivos',
    '<div class="lista-archivos" id="lista-docs-actas">\n      <p class="vacio-bloque">Cargando…</p>\n    </div>',
    html.indexOf('id="vista-actas"')
);
replaceDivByClass(
    'lista-efemerides',
    '<div class="lista-efemerides" id="lista-docs-efemerides">\n            <p class="vacio-bloque">Cargando…</p>\n        </div>',
    html.indexOf('id="vista-efemerides"')
);
replaceDivByClass(
    'grid-revista',
    '<div class="grid-revista" id="lista-docs-convenios">\n        <p class="vacio-bloque">Cargando…</p>\n    </div>',
    html.indexOf('id="vista-convenios"')
);

if (!html.includes('script-documentos.js')) {
    html = html.replace(
        '<script src="js/script-hoja.js?v=1.2"></script>',
        '<script src="js/script-documentos.js?v=1.0"></script>\n<script src="js/script-hoja.js?v=1.2"></script>'
    );
    console.log('script added');
}

fs.writeFileSync(p, html);
console.log('index.html updated, length', html.length);
