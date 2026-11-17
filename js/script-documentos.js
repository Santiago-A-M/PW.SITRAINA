/* Documentos públicos: carga legales, informes, actas, efemérides y convenios desde el catálogo. */
(function () {
    function escapar(texto) {
        return String(texto == null ? '' : texto)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function cargar(categoria) {
        return fetch('php/documentos_catalogo.php?categoria=' + encodeURIComponent(categoria), {
            credentials: 'same-origin',
            cache: 'no-store'
        })
            .then(function (r) { return r.json().catch(function () { return null; }); })
            .then(function (json) {
                if (!json || !json.ok) return [];
                return json.items || [];
            })
            .catch(function () { return []; });
    }

    function pintarArchivos(contenedor, items) {
        if (!contenedor) return;
        if (!items.length) {
            contenedor.innerHTML = '<p class="vacio-bloque">Todavía no hay documentos en esta sección.</p>';
            return;
        }
        contenedor.innerHTML = items.map(function (item) {
            return '<article class="archivo-item">' +
                '<div><h3>' + escapar(item.titulo || 'Documento') + '</h3>' +
                '<p>' + escapar(item.desc || 'Documento') + '</p></div>' +
                '<a class="btn" href="' + escapar(item.archivo || '#') + '" target="_blank" rel="noopener">Abrir</a>' +
                '</article>';
        }).join('');
    }

    function pintarEfemerides(contenedor, items) {
        if (!contenedor) return;
        if (!items.length) {
            contenedor.innerHTML = '<p class="vacio-bloque">Todavía no hay efemérides publicadas.</p>';
            return;
        }
        contenedor.innerHTML = items.map(function (item) {
            var media = item.media || '';
            var esVideo = /\.mp4$/i.test(media);
            var mediaHtml = '';
            if (media) {
                if (esVideo) {
                    mediaHtml = '<video controls preload="metadata" src="' + escapar(media) + '"></video>';
                } else {
                    mediaHtml = '<img src="' + escapar(media) + '" alt="' + escapar(item.titulo || '') + '" class="img-zoomable">';
                }
            }
            return '<article class="efemeride">' +
                '<button type="button" class="efemeride-resumen" aria-expanded="false">' +
                '<span class="efemeride-fecha">' + escapar(item.fecha || '') + '</span>' +
                '<span class="efemeride-titulo">' + escapar(item.titulo || '') + '</span>' +
                '</button>' +
                '<div class="efemeride-panel">' +
                (mediaHtml ? '<div class="efemeride-media">' + mediaHtml + '</div>' : '') +
                (item.texto ? '<p>' + escapar(item.texto) + '</p>' : '') +
                '</div></article>';
        }).join('');
    }

    function pintarConvenios(contenedor, items) {
        if (!contenedor) return;
        if (!items.length) {
            contenedor.innerHTML = '<p class="vacio-bloque">Todavía no hay convenios publicados.</p>';
            return;
        }
        contenedor.innerHTML = items.map(function (item) {
            return '<div class="tarjeta-pagina" data-category="' + escapar(item.rubro || 'salud') + '">' +
                '<div class="foto-convenio">' +
                '<img src="' + escapar(item.imagen || '') + '" loading="lazy" alt="' + escapar(item.titulo || '') + '" onclick="abrirImagen(this.src)">' +
                '</div>' +
                '<div class="pie-pagina">' +
                '<h3>' + escapar(item.titulo || '') + '</h3>' +
                '<p>' + escapar(item.nota || '') + '</p>' +
                '</div></div>';
        }).join('');
        document.querySelectorAll('.btn-categoria').forEach(function (btn, i) {
            btn.classList.toggle('active', i === 0);
        });
    }

    function iniciar() {
        var legales = document.getElementById('lista-docs-legales');
        var informes = document.getElementById('lista-docs-informes');
        var actas = document.getElementById('lista-docs-actas');
        var efemerides = document.getElementById('lista-docs-efemerides');
        var convenios = document.getElementById('lista-docs-convenios');

        if (legales) {
            legales.innerHTML = '<p class="vacio-bloque">Cargando…</p>';
            cargar('legales').then(function (items) { pintarArchivos(legales, items); });
        }
        if (informes) {
            informes.innerHTML = '<p class="vacio-bloque">Cargando…</p>';
            cargar('informes').then(function (items) { pintarArchivos(informes, items); });
        }
        if (actas) {
            actas.innerHTML = '<p class="vacio-bloque">Cargando…</p>';
            cargar('actas').then(function (items) { pintarArchivos(actas, items); });
        }
        if (efemerides) {
            efemerides.innerHTML = '<p class="vacio-bloque">Cargando…</p>';
            cargar('efemerides').then(function (items) { pintarEfemerides(efemerides, items); });
        }
        if (convenios) {
            convenios.innerHTML = '<p class="vacio-bloque">Cargando…</p>';
            cargar('convenios').then(function (items) { pintarConvenios(convenios, items); });
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', iniciar);
    } else {
        iniciar();
    }
})();
