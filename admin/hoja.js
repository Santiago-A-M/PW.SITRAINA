/* Panel admin: publicar, editar y quitar volúmenes de la Hoja del Miércoles. */
(function () {
    var tokenCampo = document.getElementById('agenda-token');
    var form = document.getElementById('form-hoja-volumen');
    var lista = document.getElementById('lista-hoja-volumenes');
    var estado = document.getElementById('hoja-admin-estado');
    var btnGuardar = document.getElementById('hoja-guardar');
    var popup = document.getElementById('popup-hoja-editar');
    var formEditar = document.getElementById('form-hoja-editar');
    var campoId = document.getElementById('hoja-editar-id');
    var campoTitulo = document.getElementById('hoja-editar-nombre');
    var campoDesc = document.getElementById('hoja-editar-desc');
    var campoVideo = document.getElementById('hoja-editar-video');
    var estadoEditar = document.getElementById('hoja-editar-estado');
    var btnCerrar = document.getElementById('hoja-editar-cerrar');
    var btnCancelar = document.getElementById('hoja-editar-cancelar');
    var btnFondo = document.getElementById('hoja-editar-fondo');
    var btnGuardarEdicion = document.getElementById('hoja-editar-guardar');
    if (!tokenCampo || !form || !lista) return;

    var enviando = false;
    var cargado = false;
    var volumenes = [];
    var filtroBusqueda = '';
    var campoBuscar = document.getElementById('buscar-hoja');

    function escapar(texto) {
        return String(texto == null ? '' : texto)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function normalizarBusqueda(texto) {
        return String(texto == null ? '' : texto)
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/\s+/g, ' ')
            .trim();
    }

    function coincideBusqueda(haystack, consulta) {
        var q = normalizarBusqueda(consulta);
        if (!q) return true;
        return normalizarBusqueda(haystack).indexOf(q) !== -1;
    }

    function setEstado(nodo, texto, esError) {
        if (!nodo) return;
        nodo.textContent = texto || '';
        nodo.classList.toggle('hoja-admin-estado-error', !!esError);
        nodo.classList.toggle('hoja-admin-estado-ok', !!texto && !esError);
    }

    function mostrarEstado(texto, esError) {
        setEstado(estado, texto, esError);
    }

    function buscarVolumen(id) {
        for (var i = 0; i < volumenes.length; i++) {
            if (volumenes[i].id === id) return volumenes[i];
        }
        return null;
    }

    function pintarLista(itemsFuente) {
        if (arguments.length) {
            volumenes = Array.isArray(itemsFuente) ? itemsFuente.slice() : [];
        }
        var hayFiltro = !!normalizarBusqueda(filtroBusqueda);
        var items = volumenes.filter(function (item) {
            var texto = [item.id, item.titulo, item.desc].filter(Boolean).join(' ');
            return coincideBusqueda(texto, filtroBusqueda);
        }).reverse();
        if (!volumenes.length) {
            lista.innerHTML = '<p class="vacio-bloque">Todavía no hay volúmenes.</p>';
            return;
        }
        if (!items.length) {
            lista.innerHTML = '<p class="vacio-bloque">' + (hayFiltro
                ? 'No hay volúmenes que coincidan con esa búsqueda.'
                : 'Todavía no hay volúmenes.') + '</p>';
            return;
        }
        lista.innerHTML = items.map(function (item) {
            var admin = item.origen === 'admin';
            return '<article class="hoja-admin-item' + (admin ? ' hoja-admin-item-nuevo' : '') + '" data-id="' + escapar(item.id) + '">' +
                '<div class="hoja-admin-item-texto">' +
                '<strong>' + escapar(item.titulo || 'Volumen') + '</strong>' +
                '<span>' + escapar(item.desc || '') + '</span>' +
                '</div>' +
                '<div class="hoja-admin-item-acciones">' +
                '<button type="button" class="btn-atajo btn-atajo-secundario hoja-admin-editar" data-id="' + escapar(item.id) + '">Editar</button>' +
                '<button type="button" class="btn-atajo btn-atajo-peligro hoja-admin-borrar" data-id="' + escapar(item.id) + '">Quitar</button>' +
                '</div>' +
                '</article>';
        }).join('');
    }

    function cargar() {
        fetch('hoja.php', { credentials: 'same-origin', cache: 'no-store' })
            .then(function (r) { return r.json().catch(function () { return null; }); })
            .then(function (json) {
                if (!json || !json.ok) {
                    lista.innerHTML = '<p class="vacio-bloque">No se pudieron cargar los volúmenes.</p>';
                    return;
                }
                cargado = true;
                pintarLista(json.volumenes || []);
            })
            .catch(function () {
                lista.innerHTML = '<p class="vacio-bloque">No se pudieron cargar los volúmenes.</p>';
            });
    }

    window.adminCargarHoja = cargar;

    function abrirEdicion(id) {
        var item = buscarVolumen(id);
        if (!item || !popup) return;
        if (campoId) campoId.value = item.id || '';
        if (campoTitulo) campoTitulo.value = item.titulo || '';
        if (campoDesc) campoDesc.value = item.desc || '';
        if (campoVideo) campoVideo.value = '';
        setEstado(estadoEditar, '', false);
        popup.hidden = false;
        if (campoTitulo) campoTitulo.focus();
    }

    function cerrarEdicion() {
        if (!popup) return;
        popup.hidden = true;
        if (formEditar) formEditar.reset();
        if (campoId) campoId.value = '';
        setEstado(estadoEditar, '', false);
    }

    form.addEventListener('submit', function (ev) {
        ev.preventDefault();
        if (enviando) return;
        var titulo = document.getElementById('hoja-titulo');
        var video = document.getElementById('hoja-video');
        if (!titulo || !titulo.value.trim()) {
            mostrarEstado('Escribí el nombre o número del volumen.', true);
            return;
        }
        if (!video || !video.files || !video.files.length) {
            mostrarEstado('Elegí el video en MP4.', true);
            return;
        }
        enviando = true;
        if (btnGuardar) btnGuardar.disabled = true;
        mostrarEstado('Publicando…');
        var cuerpo = new FormData(form);
        cuerpo.append('token', tokenCampo.value || '');
        cuerpo.append('accion', 'agregar');
        fetch('hoja.php', { method: 'POST', body: cuerpo, credentials: 'same-origin', cache: 'no-store' })
            .then(function (r) { return r.json().catch(function () { return null; }); })
            .then(function (json) {
                if (!json || !json.ok) {
                    mostrarEstado((json && json.mensaje) || 'No se pudo publicar el volumen.', true);
                    return;
                }
                form.reset();
                mostrarEstado(json.mensaje || 'Volumen publicado.');
                pintarLista(json.volumenes || []);
                cargado = true;
            })
            .catch(function () {
                mostrarEstado('No se pudo publicar el volumen.', true);
            })
            .finally(function () {
                enviando = false;
                if (btnGuardar) btnGuardar.disabled = false;
            });
    });

    if (formEditar) {
        formEditar.addEventListener('submit', function (ev) {
            ev.preventDefault();
            if (enviando) return;
            if (!campoTitulo || !campoTitulo.value.trim()) {
                setEstado(estadoEditar, 'Escribí el nombre o número del volumen.', true);
                return;
            }
            if (!campoId || !campoId.value) {
                setEstado(estadoEditar, 'No se encontró el volumen.', true);
                return;
            }
            enviando = true;
            if (btnGuardarEdicion) btnGuardarEdicion.disabled = true;
            setEstado(estadoEditar, 'Guardando…');
            var cuerpo = new FormData(formEditar);
            cuerpo.append('token', tokenCampo.value || '');
            cuerpo.append('accion', 'editar');
            fetch('hoja.php', { method: 'POST', body: cuerpo, credentials: 'same-origin', cache: 'no-store' })
                .then(function (r) { return r.json().catch(function () { return null; }); })
                .then(function (json) {
                    if (!json || !json.ok) {
                        setEstado(estadoEditar, (json && json.mensaje) || 'No se pudo guardar el cambio.', true);
                        return;
                    }
                    pintarLista(json.volumenes || []);
                    mostrarEstado(json.mensaje || 'Se actualizó el volumen.');
                    cerrarEdicion();
                })
                .catch(function () {
                    setEstado(estadoEditar, 'No se pudo guardar el cambio.', true);
                })
                .finally(function () {
                    enviando = false;
                    if (btnGuardarEdicion) btnGuardarEdicion.disabled = false;
                });
        });
    }

    lista.addEventListener('click', function (ev) {
        var editar = ev.target.closest('.hoja-admin-editar');
        if (editar) {
            abrirEdicion(editar.getAttribute('data-id') || '');
            return;
        }
        var boton = ev.target.closest('.hoja-admin-borrar');
        if (!boton || enviando) return;
        var id = boton.getAttribute('data-id') || '';
        if (!id) return;
        var item = buscarVolumen(id);
        var nombre = item && item.titulo ? item.titulo : 'este volumen';
        var ok = window.confirm('¿Quitás "' + nombre + '" de la Hoja del Miércoles?');
        if (!ok) return;
        enviando = true;
        mostrarEstado('Quitando…');
        var cuerpo = new FormData();
        cuerpo.append('token', tokenCampo.value || '');
        cuerpo.append('accion', 'borrar');
        cuerpo.append('id', id);
        fetch('hoja.php', { method: 'POST', body: cuerpo, credentials: 'same-origin', cache: 'no-store' })
            .then(function (r) { return r.json().catch(function () { return null; }); })
            .then(function (json) {
                if (!json || !json.ok) {
                    mostrarEstado((json && json.mensaje) || 'No se pudo quitar el volumen.', true);
                    return;
                }
                mostrarEstado(json.mensaje || 'Se quitó el volumen.');
                pintarLista(json.volumenes || []);
            })
            .catch(function () {
                mostrarEstado('No se pudo quitar el volumen.', true);
            })
            .finally(function () {
                enviando = false;
            });
    });

    if (btnCerrar) btnCerrar.addEventListener('click', cerrarEdicion);
    if (btnCancelar) btnCancelar.addEventListener('click', cerrarEdicion);
    if (btnFondo) btnFondo.addEventListener('click', cerrarEdicion);
    document.addEventListener('keydown', function (ev) {
        if (ev.key === 'Escape' && popup && !popup.hidden) cerrarEdicion();
    });

    if (campoBuscar) {
        var aplicarFiltro = function () {
            filtroBusqueda = campoBuscar.value || '';
            pintarLista();
        };
        campoBuscar.addEventListener('input', aplicarFiltro);
        campoBuscar.addEventListener('search', aplicarFiltro);
    }
})();
