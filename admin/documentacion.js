/* Panel admin: explorador de Documentación (6 categorías). */
(function () {
    var tokenCampo = document.getElementById('agenda-token');
    var btnAbrir = document.getElementById('docs-abrir-explorador');
    var popup = document.getElementById('popup-docs-explorador');
    var btnCerrar = document.getElementById('docs-explorador-cerrar');
    var btnFondo = document.getElementById('docs-explorador-fondo');
    var listaEl = document.getElementById('docs-lista');
    var tituloPanel = document.getElementById('docs-panel-titulo');
    var estadoEl = document.getElementById('docs-estado');
    var campoBuscar = document.getElementById('docs-buscar');
    var btnAgregar = document.getElementById('docs-agregar');
    var btnVistaSwitch = document.getElementById('docs-vista-switch');
    var popupForm = document.getElementById('popup-docs-form');
    var form = document.getElementById('form-docs');
    var formCampos = document.getElementById('docs-form-campos');
    var formTitulo = document.getElementById('docs-form-titulo');
    var formAyuda = document.getElementById('docs-form-ayuda');
    var formEstado = document.getElementById('docs-form-estado');
    var formId = document.getElementById('docs-form-id');
    var formAccion = document.getElementById('docs-form-accion');
    var formCategoria = document.getElementById('docs-form-categoria');
    var btnFormCerrar = document.getElementById('docs-form-cerrar');
    var btnFormCancelar = document.getElementById('docs-form-cancelar');
    var btnFormFondo = document.getElementById('docs-form-fondo');
    var btnFormGuardar = document.getElementById('docs-form-guardar');
    if (!tokenCampo || !popup || !listaEl) return;

    var nombres = {
        efemerides: 'Efemérides',
        hoja: 'Hoja del Miércoles',
        convenios: 'Convenios',
        legales: 'Documentos legales',
        informes: 'Informes de labores',
        actas: 'Actas de asamblea'
    };
    var categoriaActiva = 'efemerides';
    var modoVista = 'detalle';
    var filtro = '';
    var cache = {};
    var enviando = false;
    var itemActivoId = '';

    var SVG_DOC = '<svg viewBox="0 0 24 24"><path d="M7 3h7l5 5v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zm7 1.5V9h4.5" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M9 13h6M9 16h6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';
    var SVG_VIDEO = '<svg viewBox="0 0 24 24"><rect x="3" y="6" width="18" height="12" rx="2" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M10 9.5v5l5-2.5z" fill="currentColor"/></svg>';
    var SVG_IMG = '<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="9" cy="10" r="1.6" fill="currentColor"/><path d="M4.5 17l4.2-4.2 2.8 2.8 3.2-3.6 5.3 5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';

    function escapar(texto) {
        return String(texto == null ? '' : texto)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function normalizar(texto) {
        return String(texto == null ? '' : texto)
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/\s+/g, ' ')
            .trim();
    }

    function setEstado(nodo, texto, esError) {
        if (!nodo) return;
        nodo.textContent = texto || '';
        nodo.classList.toggle('hoja-admin-estado-error', !!esError);
        nodo.classList.toggle('hoja-admin-estado-ok', !!texto && !esError);
    }

    function tituloItem(item) {
        return item.titulo || item.fecha || 'Sin título';
    }

    function metaItem(cat, item) {
        if (cat === 'efemerides') return item.fecha || '';
        if (cat === 'convenios') return (item.rubro || '') + (item.nota ? ' · ' + item.nota : '');
        if (cat === 'hoja') return item.desc || '';
        return item.desc || '';
    }

    function textoBusqueda(cat, item) {
        return [
            tituloItem(item),
            metaItem(cat, item),
            item.fecha,
            item.desc,
            item.nota,
            item.creado_en,
            item.archivo,
            item.src,
            item.media,
            item.imagen,
            item.texto
        ].filter(Boolean).join(' ');
    }

    function rutaMedia(cat, item) {
        if (!item) return '';
        if (cat === 'hoja') return item.src || item.archivo || '';
        if (cat === 'efemerides') return item.media || '';
        if (cat === 'convenios') return item.imagen || '';
        return item.archivo || '';
    }

    function tipoArchivo(cat, item) {
        var ruta = String(rutaMedia(cat, item) || '').toLowerCase();
        if (cat === 'hoja' || /\.mp4($|\?)/.test(ruta)) return 'video';
        if (cat === 'convenios' || /\.(jpg|jpeg|png|webp|gif)($|\?)/.test(ruta)) return 'imagen';
        if (cat === 'efemerides') {
            if (/\.mp4($|\?)/.test(ruta)) return 'video';
            if (/\.(jpg|jpeg|png|webp|gif)($|\?)/.test(ruta)) return 'imagen';
        }
        return 'documento';
    }

    function iconoTipo(cat, item) {
        var tipo = tipoArchivo(cat, item);
        var svg = SVG_DOC;
        if (tipo === 'video') svg = SVG_VIDEO;
        else if (tipo === 'imagen') svg = SVG_IMG;
        return '<span class="docs-item-glyph docs-item-glyph-' + tipo + '" aria-hidden="true">' + svg + '</span>';
    }

    function htmlAcciones(item) {
        var id = escapar(item.id);
        var html = '<div class="docs-item-acciones">';
        html += '<button type="button" class="btn-atajo btn-atajo-secundario docs-editar" data-id="' + id + '">Editar</button>';
        html += '<button type="button" class="btn-atajo btn-atajo-peligro docs-borrar" data-id="' + id + '">Quitar</button>';
        html += '</div>';
        return html;
    }

    function urlPublica(ruta) {
        if (!ruta) return '';
        return '../' + String(ruta).replace(/^\//, '');
    }

    function esPdf(ruta) {
        return /\.pdf($|\?)/i.test(String(ruta || ''));
    }

    function htmlMedia(cat, item) {
        var ruta = rutaMedia(cat, item);
        var url = urlPublica(ruta);
        var tipo = tipoArchivo(cat, item);
        if (!url) {
            return '<p class="docs-visor-estado">Este elemento no tiene archivo para mostrar.</p>';
        }
        if (tipo === 'video') {
            return '<video class="docs-visor-video" controls playsinline preload="metadata" src="' + escapar(url) + '"></video>';
        }
        if (tipo === 'imagen') {
            return '<img class="docs-visor-imagen" src="' + escapar(url) + '" alt="' + escapar(tituloItem(item)) + '">';
        }
        if (esPdf(ruta)) {
            return '<iframe class="docs-visor-pdf" title="' + escapar(tituloItem(item)) + '" src="' + escapar(url) + '#toolbar=1"></iframe>';
        }
        return '<div class="docs-visor-archivo">' +
            '<p class="docs-visor-estado">Este formato no se puede previsualizar aquí.</p>' +
            '</div>';
    }

    function htmlFicha(item) {
        var id = escapar(item.id);
        var html = '<div class="docs-ficha-capa docs-visor-capa" data-id="' + id + '">';
        html += '<div class="docs-visor-barra">';
        html += '<button type="button" class="docs-ficha-atras" id="docs-ficha-atras" aria-label="Volver a la lista" title="Volver">';
        html += '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 6l-6 6 6 6" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
        html += '</button>';
        html += htmlAcciones(item);
        html += '</div>';
        html += '<div class="docs-visor-escenario" aria-label="' + escapar(tituloItem(item)) + '">';
        html += htmlMedia(categoriaActiva, item);
        html += '</div>';
        html += '</div>';
        return html;
    }

    function sincronizarVistaSwitch() {
        if (!btnVistaSwitch) return;
        var enIconos = modoVista === 'iconos';
        btnVistaSwitch.classList.toggle('docs-vista-iconos-activa', enIconos);
        btnVistaSwitch.setAttribute('aria-pressed', enIconos ? 'true' : 'false');
        btnVistaSwitch.title = enIconos ? 'Cambiar a lista detallada' : 'Cambiar a vista de iconos';
        btnVistaSwitch.setAttribute('aria-label', btnVistaSwitch.title);
        popup.classList.toggle('docs-modo-iconos', enIconos);
        popup.classList.toggle('docs-modo-detalle', !enIconos);
    }

    function pintarLista() {
        var items = cache[categoriaActiva] || [];
        var q = normalizar(filtro);
        var filtrados = !q ? items.slice() : items.filter(function (item) {
            return normalizar(textoBusqueda(categoriaActiva, item)).indexOf(q) !== -1;
        });
        listaEl.classList.toggle('docs-lista-detalle', modoVista === 'detalle' && !itemActivoId);
        listaEl.classList.toggle('docs-lista-iconos', modoVista === 'iconos' && !itemActivoId);
        listaEl.classList.toggle('docs-lista-ficha', !!itemActivoId);
        popup.classList.toggle('docs-viendo', !!itemActivoId);
        sincronizarVistaSwitch();

        if (itemActivoId && !filtrados.some(function (it) { return it.id === itemActivoId; })
            && !items.some(function (it) { return it.id === itemActivoId; })) {
            itemActivoId = '';
            popup.classList.remove('docs-viendo');
        }

        if (itemActivoId) {
            var abierto = buscarItem(itemActivoId);
            if (!abierto) {
                itemActivoId = '';
                popup.classList.remove('docs-viendo');
            } else {
                if (tituloPanel) tituloPanel.textContent = tituloItem(abierto);
                listaEl.innerHTML = htmlFicha(abierto);
                var btnAtras = document.getElementById('docs-ficha-atras');
                if (btnAtras) btnAtras.focus();
                return;
            }
        }

        if (tituloPanel) tituloPanel.textContent = nombres[categoriaActiva] || categoriaActiva;

        if (!items.length) {
            listaEl.innerHTML = '<p class="vacio-bloque">Todavía no hay elementos en esta categoría.</p>';
            return;
        }
        if (!filtrados.length) {
            listaEl.innerHTML = '<p class="vacio-bloque">No hay resultados para esa búsqueda.</p>';
            return;
        }

        var esIconos = modoVista === 'iconos';
        listaEl.innerHTML = filtrados.map(function (item) {
            var html = '<article class="docs-item" data-id="' + escapar(item.id) + '" tabindex="0" role="button">';
            html += '<div class="docs-item-icono">' + iconoTipo(categoriaActiva, item) + '</div>';
            html += '<div class="docs-item-texto">';
            html += '<strong>' + escapar(tituloItem(item)) + '</strong>';
            /* En iconos solo el título; la fecha/meta sigue en el buscador. */
            if (!esIconos && metaItem(categoriaActiva, item)) {
                html += '<span>' + escapar(metaItem(categoriaActiva, item)) + '</span>';
            }
            html += '</div>';
            if (!esIconos) {
                html += htmlAcciones(item);
            }
            html += '</article>';
            return html;
        }).join('');
    }

    function marcarCategoria(cat) {
        document.querySelectorAll('.docs-cat-btn').forEach(function (btn) {
            var activo = btn.getAttribute('data-docs-cat') === cat;
            btn.classList.toggle('activo', activo);
            btn.setAttribute('aria-current', activo ? 'true' : 'false');
        });
    }

    function cargarCategoria(cat, forzar) {
        categoriaActiva = cat;
        itemActivoId = '';
        marcarCategoria(cat);
        if (!forzar && cache[cat]) {
            pintarLista();
            return;
        }
        listaEl.innerHTML = '<p class="vacio-bloque">Cargando…</p>';
        fetch('documentacion.php?categoria=' + encodeURIComponent(cat), {
            credentials: 'same-origin',
            cache: 'no-store'
        })
            .then(function (r) { return r.json().catch(function () { return null; }); })
            .then(function (json) {
                if (!json || !json.ok) {
                    listaEl.innerHTML = '<p class="vacio-bloque">No se pudo cargar esta categoría.</p>';
                    return;
                }
                cache[cat] = json.items || [];
                pintarLista();
            })
            .catch(function () {
                listaEl.innerHTML = '<p class="vacio-bloque">No se pudo cargar esta categoría.</p>';
            });
    }

    function abrirExplorador() {
        popup.hidden = false;
        document.body.classList.add('asistente-abierto', 'docs-explorador-abierto');
        sincronizarVistaSwitch();
        window.requestAnimationFrame(function () {
            popup.classList.add('asistente-visible');
        });
        cargarCategoria(categoriaActiva, !cache[categoriaActiva]);
    }

    function cerrarExplorador() {
        cerrarForm();
        itemActivoId = '';
        popup.classList.remove('asistente-visible', 'docs-viendo');
        document.body.classList.remove('asistente-abierto', 'docs-explorador-abierto');
        window.setTimeout(function () {
            popup.hidden = true;
        }, 280);
    }

    function camposHtml(cat, item) {
        item = item || {};
        if (cat === 'hoja') {
            return '<label class="asistente-label" for="docs-campo-titulo">Nombre o número del volumen' +
                '<input id="docs-campo-titulo" name="titulo" maxlength="80" required value="' + escapar(item.titulo || '') + '"></label>' +
                '<label class="asistente-label" for="docs-campo-desc">Descripción' +
                '<input id="docs-campo-desc" name="desc" maxlength="280" value="' + escapar(item.desc || '') + '"></label>' +
                '<label class="asistente-label" for="docs-campo-archivo">Video (MP4)' +
                '<input id="docs-campo-archivo" name="archivo" type="file" accept="video/mp4,.mp4"' + (item.id ? '' : ' required') + '></label>' +
                (item.id ? '<p class="asistente-nota">Dejá el video vacío si solo querés cambiar el texto.</p>' : '');
        }
        if (cat === 'efemerides') {
            return '<label class="asistente-label" for="docs-campo-fecha">Fecha' +
                '<input id="docs-campo-fecha" name="fecha" maxlength="80" required value="' + escapar(item.fecha || '') + '" placeholder="14 de febrero"></label>' +
                '<label class="asistente-label" for="docs-campo-titulo">Título' +
                '<input id="docs-campo-titulo" name="titulo" maxlength="120" required value="' + escapar(item.titulo || '') + '"></label>' +
                '<label class="asistente-label" for="docs-campo-texto">Texto' +
                '<textarea id="docs-campo-texto" name="texto" maxlength="800" rows="4">' + escapar(item.texto || '') + '</textarea></label>' +
                '<label class="asistente-label" for="docs-campo-archivo">Imagen o video' +
                '<input id="docs-campo-archivo" name="archivo" type="file" accept="image/*,video/mp4,.mp4,.jpg,.jpeg,.png,.webp,.gif"' + (item.id ? '' : ' required') + '></label>' +
                (item.id ? '<p class="asistente-nota">Dejá el archivo vacío para conservar el actual.</p>' : '');
        }
        if (cat === 'convenios') {
            return '<label class="asistente-label" for="docs-campo-titulo">Nombre' +
                '<input id="docs-campo-titulo" name="titulo" maxlength="120" required value="' + escapar(item.titulo || '') + '"></label>' +
                '<label class="asistente-label" for="docs-campo-nota">Nota' +
                '<input id="docs-campo-nota" name="nota" maxlength="200" value="' + escapar(item.nota || '') + '"></label>' +
                '<label class="asistente-label" for="docs-campo-rubro">Rubro' +
                '<select id="docs-campo-rubro" name="rubro">' +
                '<option value="salud"' + (item.rubro === 'salud' ? ' selected' : '') + '>Salud</option>' +
                '<option value="educacion"' + ((item.rubro === 'educacion' || item.rubro === 'educación') ? ' selected' : '') + '>Educación</option>' +
                '<option value="turismo"' + (item.rubro === 'turismo' ? ' selected' : '') + '>Turismo</option>' +
                '</select></label>' +
                '<label class="asistente-label" for="docs-campo-archivo">Imagen' +
                '<input id="docs-campo-archivo" name="archivo" type="file" accept="image/*,.jpg,.jpeg,.png,.webp,.gif"' + (item.id ? '' : ' required') + '></label>' +
                (item.id ? '<p class="asistente-nota">Dejá la imagen vacía para conservar la actual.</p>' : '');
        }
        return '<label class="asistente-label" for="docs-campo-titulo">Título' +
            '<input id="docs-campo-titulo" name="titulo" maxlength="160" required value="' + escapar(item.titulo || '') + '"></label>' +
            '<label class="asistente-label" for="docs-campo-desc">Descripción' +
            '<input id="docs-campo-desc" name="desc" maxlength="200" value="' + escapar(item.desc || '') + '"></label>' +
            '<label class="asistente-label" for="docs-campo-archivo">Archivo (PDF o DOCX)' +
            '<input id="docs-campo-archivo" name="archivo" type="file" accept=".pdf,.doc,.docx,application/pdf"' + (item.id ? '' : ' required') + '></label>' +
            (item.id ? '<p class="asistente-nota">Dejá el archivo vacío para conservar el actual.</p>' : '');
    }

    function abrirForm(modo, item) {
        if (!popupForm || !form) return;
        formAccion.value = modo;
        formCategoria.value = categoriaActiva;
        formId.value = item && item.id ? item.id : '';
        formTitulo.textContent = modo === 'editar' ? 'Editar' : 'Agregar';
        formAyuda.textContent = 'Categoría: ' + (nombres[categoriaActiva] || categoriaActiva) + '.';
        formCampos.innerHTML = camposHtml(categoriaActiva, item || {});
        setEstado(formEstado, '', false);
        popupForm.hidden = false;
        window.requestAnimationFrame(function () {
            popupForm.classList.add('asistente-visible');
        });
        var primero = formCampos.querySelector('input, textarea, select');
        if (primero) primero.focus();
    }

    function cerrarForm() {
        if (!popupForm || popupForm.hidden) return;
        popupForm.classList.remove('asistente-visible');
        window.setTimeout(function () {
            popupForm.hidden = true;
            if (form) form.reset();
            formCampos.innerHTML = '';
            setEstado(formEstado, '', false);
        }, 280);
    }

    function buscarItem(id) {
        var items = cache[categoriaActiva] || [];
        for (var i = 0; i < items.length; i++) {
            if (items[i].id === id) return items[i];
        }
        return null;
    }

    function borrarItem(id) {
        var item = buscarItem(id);
        var nombre = item ? tituloItem(item) : 'este documento';
        if (!window.confirm('¿Quitás "' + nombre + '" de ' + (nombres[categoriaActiva] || categoriaActiva) + '?')) return;
        if (enviando) return;
        enviando = true;
        setEstado(estadoEl, 'Quitando…');
        var cuerpo = new FormData();
        cuerpo.append('token', tokenCampo.value || '');
        cuerpo.append('accion', 'borrar');
        cuerpo.append('categoria', categoriaActiva);
        cuerpo.append('id', id);
        fetch('documentacion.php', { method: 'POST', body: cuerpo, credentials: 'same-origin', cache: 'no-store' })
            .then(function (r) { return r.json().catch(function () { return null; }); })
            .then(function (json) {
                if (!json || !json.ok) {
                    setEstado(estadoEl, (json && json.mensaje) || 'No se pudo quitar.', true);
                    return;
                }
                if (itemActivoId === id) itemActivoId = '';
                cache[categoriaActiva] = json.items || [];
                setEstado(estadoEl, json.mensaje || 'Se quitó.');
                pintarLista();
            })
            .catch(function () { setEstado(estadoEl, 'No se pudo quitar.', true); })
            .finally(function () { enviando = false; });
    }

    function alternarVista() {
        modoVista = modoVista === 'detalle' ? 'iconos' : 'detalle';
        itemActivoId = '';
        pintarLista();
    }

    if (btnAbrir) btnAbrir.addEventListener('click', abrirExplorador);
    if (btnCerrar) btnCerrar.addEventListener('click', cerrarExplorador);
    if (btnFondo) btnFondo.addEventListener('click', cerrarExplorador);
    if (btnFormCerrar) btnFormCerrar.addEventListener('click', cerrarForm);
    if (btnFormCancelar) btnFormCancelar.addEventListener('click', cerrarForm);
    if (btnFormFondo) btnFormFondo.addEventListener('click', cerrarForm);
    if (btnVistaSwitch) btnVistaSwitch.addEventListener('click', alternarVista);

    document.querySelectorAll('.docs-cat-btn').forEach(function (btn) {
        btn.addEventListener('click', function () {
            var cat = btn.getAttribute('data-docs-cat') || 'efemerides';
            if (campoBuscar) campoBuscar.value = '';
            filtro = '';
            cargarCategoria(cat, false);
        });
    });

    if (campoBuscar) {
        var aplicarFiltro = function () {
            filtro = campoBuscar.value || '';
            pintarLista();
        };
        campoBuscar.addEventListener('input', aplicarFiltro);
        campoBuscar.addEventListener('search', aplicarFiltro);
    }

    if (btnAgregar) {
        btnAgregar.addEventListener('click', function () {
            abrirForm('agregar', null);
        });
    }

    function abrirFicha(id) {
        if (!id || !buscarItem(id)) return;
        itemActivoId = id;
        pintarLista();
    }

    function cerrarFicha() {
        if (!itemActivoId) return;
        var capa = listaEl.querySelector('.docs-visor-capa');
        var video = listaEl.querySelector('.docs-visor-video');
        if (video && !video.paused) {
            try { video.pause(); } catch (e) {}
        }
        if (capa && !capa.classList.contains('docs-visor-saliendo')) {
            capa.classList.add('docs-visor-saliendo');
            window.setTimeout(function () {
                itemActivoId = '';
                pintarLista();
            }, 280);
            return;
        }
        itemActivoId = '';
        pintarLista();
    }

    listaEl.addEventListener('click', function (ev) {
        var atras = ev.target.closest('.docs-ficha-atras');
        if (atras) {
            ev.preventDefault();
            ev.stopPropagation();
            cerrarFicha();
            return;
        }
        var editar = ev.target.closest('.docs-editar');
        if (editar) {
            ev.preventDefault();
            ev.stopPropagation();
            abrirForm('editar', buscarItem(editar.getAttribute('data-id') || ''));
            return;
        }
        var borrar = ev.target.closest('.docs-borrar');
        if (borrar) {
            ev.preventDefault();
            ev.stopPropagation();
            borrarItem(borrar.getAttribute('data-id') || '');
            return;
        }
        if (ev.target.closest('a, button, input, textarea, select, video, iframe')) return;
        if (itemActivoId) return;
        var tarjeta = ev.target.closest('.docs-item');
        if (!tarjeta || !listaEl.contains(tarjeta)) return;
        ev.preventDefault();
        ev.stopPropagation();
        abrirFicha(tarjeta.getAttribute('data-id') || '');
    });

    listaEl.addEventListener('keydown', function (ev) {
        if (itemActivoId) return;
        if (ev.key !== 'Enter' && ev.key !== ' ') return;
        if (ev.target.closest('.docs-editar, .docs-borrar, button, a, input')) return;
        var tarjeta = ev.target.closest('.docs-item');
        if (!tarjeta || !listaEl.contains(tarjeta)) return;
        ev.preventDefault();
        abrirFicha(tarjeta.getAttribute('data-id') || '');
    });

    if (form) {
        form.addEventListener('submit', function (ev) {
            ev.preventDefault();
            if (enviando) return;
            enviando = true;
            if (btnFormGuardar) btnFormGuardar.disabled = true;
            setEstado(formEstado, 'Guardando…');
            var cuerpo = new FormData(form);
            cuerpo.append('token', tokenCampo.value || '');
            fetch('documentacion.php', { method: 'POST', body: cuerpo, credentials: 'same-origin', cache: 'no-store' })
                .then(function (r) { return r.json().catch(function () { return null; }); })
                .then(function (json) {
                    if (!json || !json.ok) {
                        setEstado(formEstado, (json && json.mensaje) || 'No se pudo guardar.', true);
                        return;
                    }
                    cache[categoriaActiva] = json.items || [];
                    setEstado(estadoEl, json.mensaje || 'Guardado.');
                    cerrarForm();
                    pintarLista();
                })
                .catch(function () { setEstado(formEstado, 'No se pudo guardar.', true); })
                .finally(function () {
                    enviando = false;
                    if (btnFormGuardar) btnFormGuardar.disabled = false;
                });
        });
    }

    document.addEventListener('keydown', function (ev) {
        if (ev.key !== 'Escape') return;
        if (popupForm && !popupForm.hidden) {
            cerrarForm();
            return;
        }
        if (itemActivoId) {
            cerrarFicha();
            return;
        }
        if (popup && !popup.hidden) cerrarExplorador();
    });

    window.adminAbrirDocumentacion = abrirExplorador;
})();
