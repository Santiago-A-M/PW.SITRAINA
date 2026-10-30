/* Cuenta pública: sesión, ingreso, registro y bandeja. */
(function () {
    var token = '';
    var ingresado = false;
    var enviando = false;

    function $(id) {
        return document.getElementById(id);
    }

    function escapar(texto) {
        return String(texto == null ? '' : texto)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function etiquetaTipo(tipo) {
        if (tipo === 'cita') return 'Cita';
        if (tipo === 'afiliacion') return 'Afiliación';
        return 'Contacto';
    }

    function iconoEstado(estado) {
        if (estado === 'aceptada') return '✓';
        if (estado === 'rechazada') return '✕';
        return 'i';
    }

    function etiquetaEstado(estado) {
        if (estado === 'aceptada') return 'Aceptada';
        if (estado === 'rechazada') return 'Rechazada';
        return 'Información';
    }

    function mostrarOpcion(nodo, visible) {
        if (!nodo) return;
        nodo.hidden = !visible;
        nodo.style.display = visible ? '' : 'none';
    }

    function pintarMenu() {
        mostrarOpcion($('opcion-ingresar'), !ingresado);
        mostrarOpcion($('opcion-registro'), !ingresado);
        mostrarOpcion($('opcion-mensajes'), ingresado);
        mostrarOpcion($('opcion-salir'), ingresado);
    }

    function recargarEn(hash) {
        var destino = '#' + hash;
        if (window.location.hash !== destino) window.location.hash = destino;
        window.location.reload();
    }

    function mostrarAvisoForm(id, texto, error) {
        if (window.SitrainaAvisos && texto) {
            if (error) window.SitrainaAvisos.error('No se pudo completar', texto);
            else window.SitrainaAvisos.exito('Listo', texto);
        }
        var nodo = $(id);
        if (!nodo) return;
        nodo.hidden = true;
    }

    function estado() {
        return fetch('php/usuario_auth.php?accion=estado', { credentials: 'same-origin' })
            .then(function (r) { return r.json().catch(function () { return null; }); })
            .then(function (json) {
                if (!json || !json.ok) return;
                token = json.token || '';
                ingresado = !!json.ingresado;
                pintarMenu();
                var saludo = $('cuenta-saludo');
                if (saludo) {
                    saludo.textContent = ingresado
                        ? ('Hola, ' + (json.nombre || 'cuenta') + '.')
                        : 'Ingresá para ver tus mensajes.';
                }
                if (ingresado && location.hash.replace('#', '') === 'cuenta') {
                    cargarBandeja();
                }
                if (!ingresado && location.hash.replace('#', '') === 'cuenta') {
                    location.hash = 'ingresar';
                }
            });
    }

    function enviarAuth(accion, datos, avisoId) {
        if (enviando) return;
        if (accion === 'registrar') {
            if (!String(datos.nombre || '').trim() || !String(datos.correo || '').trim()) {
                if (window.SitrainaAvisos) window.SitrainaAvisos.campos('Revisá la información', 'El nombre y el correo son obligatorios.');
                return;
            }
        } else if (!String(datos.correo || '').trim()) {
            if (window.SitrainaAvisos) window.SitrainaAvisos.campos('Revisá la información', 'Escribí el correo de la cuenta.');
            return;
        }
        enviando = true;
        if (window.SitrainaAvisos) {
            window.SitrainaAvisos.procesando(accion === 'registrar' ? 'Creando cuenta' : 'Ingresando', 'Estamos comprobando los datos. No vuelvas a enviar.');
        }
        var cuerpo = new FormData();
        cuerpo.append('accion', accion);
        cuerpo.append('token', token);
        Object.keys(datos).forEach(function (clave) {
            cuerpo.append(clave, datos[clave]);
        });
        fetch('php/usuario_auth.php', { method: 'POST', body: cuerpo, credentials: 'same-origin' })
            .then(function (r) { return r.json().catch(function () { return null; }); })
            .then(function (json) {
                enviando = false;
                if (!json || !json.ok) {
                    mostrarAvisoForm(avisoId, (json && json.mensaje) || 'No se pudo completar.', true);
                    return estado();
                }
                recargarEn('cuenta');
            })
            .catch(function () {
                enviando = false;
                mostrarAvisoForm(avisoId, 'No se pudo completar.', true);
            });
    }

    function cargarBandeja() {
        var lista = $('bandeja-lista');
        if (!lista) return;
        lista.innerHTML = '<p class="vacio-bloque">Cargando…</p>';
        cerrarMensaje();
        fetch('php/bandeja.php?accion=listar', { credentials: 'same-origin' })
            .then(function (r) {
                if (r.status === 401) {
                    location.hash = 'ingresar';
                    return null;
                }
                return r.json().catch(function () { return null; });
            })
            .then(function (json) {
                if (!json) {
                    lista.innerHTML = '<p class="vacio-bloque">No se pudieron cargar los mensajes.</p>';
                    return;
                }
                if (!json.ok) {
                    lista.innerHTML = '<p class="vacio-bloque">No se pudieron cargar los mensajes.</p>';
                    if (window.SitrainaAvisos) window.SitrainaAvisos.error('No se pudo abrir Mis mensajes', json.mensaje || 'Volvé a intentarlo.');
                    return;
                }
                var filas = json.mensajes || [];
                if (!filas.length) {
                    lista.innerHTML = '<p class="vacio-bloque">Todavía no hay mensajes. Cuando administración responda a una solicitud que enviaste con esta cuenta ya iniciada, aparece aquí.</p>';
                    return;
                }
                var html = '<ul class="bandeja-rejilla">';
                filas.forEach(function (fila) {
                    html += '<li>';
                    html += '<button type="button" class="bandeja-item" data-bandeja-id="' + escapar(fila.id) + '">';
                    html += '<span class="bandeja-icono bandeja-icono-' + escapar(fila.estado) + '" aria-hidden="true">' + iconoEstado(fila.estado) + '</span>';
                    html += '<span class="bandeja-item-cuerpo">';
                    html += '<span class="bandeja-item-tipo">' + escapar(etiquetaTipo(fila.tipo)) + ' · ' + escapar(etiquetaEstado(fila.estado)) + '</span>';
                    if (fila.editado) html += '<span class="bandeja-editado">Editado</span>';
                    html += '<span class="bandeja-item-asunto">' + escapar(fila.asunto) + '</span>';
                    html += '<span class="bandeja-item-fecha">' + escapar(fila.creado_en) + '</span>';
                    html += '</span></button></li>';
                });
                html += '</ul>';
                lista.innerHTML = html;
            })
            .catch(function () {
                lista.innerHTML = '<p class="vacio-bloque">No se pudieron cargar los mensajes.</p>';
            });
    }

    function cerrarMensaje() {
        var popup = $('bandeja-popup');
        if (popup) popup.hidden = true;
    }

    function abrirMensaje(id) {
        var popup = $('bandeja-popup');
        var detalle = $('bandeja-popup-cuerpo');
        if (!popup || !detalle) return;
        popup.hidden = false;
        detalle.innerHTML = '<p class="vacio-bloque">Cargando…</p>';
        var cuerpo = new FormData();
        cuerpo.append('accion', 'leer');
        cuerpo.append('token', token);
        cuerpo.append('id', String(id));
        fetch('php/bandeja.php', { method: 'POST', body: cuerpo, credentials: 'same-origin' })
            .then(function (r) {
                if (r.status === 401 || r.status === 403 || r.status === 404) {
                    throw new Error('No se pudo abrir ese mensaje.');
                }
                return r.json().catch(function () { return null; });
            })
            .then(function (json) {
                if (!json || !json.ok || !json.mensaje) {
                    throw new Error((json && json.mensaje) || 'No se pudo abrir ese mensaje.');
                }
                var m = json.mensaje;
                detalle.innerHTML =
                    '<p class="bandeja-item-tipo">' + escapar(etiquetaTipo(m.tipo)) + ' · ' + escapar(etiquetaEstado(m.estado)) + '</p>' +
                    '<h3 id="bandeja-popup-titulo">' + escapar(m.asunto) + '</h3>' +
                    '<p class="bandeja-item-fecha">' + escapar(m.creado_en) + '</p>' +
                    (m.editado ? '<p class="bandeja-editado">Editado</p>' : '') +
                    '<pre class="bandeja-cuerpo">' + escapar(m.cuerpo) + '</pre>';
            })
            .catch(function (err) {
                detalle.textContent = err.message || 'No se pudo abrir ese mensaje.';
            });
    }

    var formIngreso = $('form-ingreso');
    if (formIngreso) {
        formIngreso.addEventListener('submit', function (ev) {
            ev.preventDefault();
            enviarAuth('ingresar', {
                correo: ($('ingreso-correo') || {}).value || ''
            }, 'ingreso-aviso');
        });
    }

    var formRegistro = $('form-registro');
    if (formRegistro) {
        formRegistro.addEventListener('submit', function (ev) {
            ev.preventDefault();
            enviarAuth('registrar', {
                nombre: ($('registro-nombre') || {}).value || '',
                correo: ($('registro-correo') || {}).value || '',
                cedula: ($('registro-cedula') || {}).value || ''
            }, 'registro-aviso');
        });
    }

    document.addEventListener('click', function (ev) {
        var item = ev.target.closest('[data-bandeja-id]');
        if (item) {
            abrirMensaje(item.getAttribute('data-bandeja-id'));
            return;
        }
        if (ev.target.id === 'bandeja-popup' || ev.target.closest('#bandeja-popup-cerrar')) {
            cerrarMensaje();
            return;
        }
        if (ev.target.closest('#opcion-salir')) {
            ev.preventDefault();
            if (enviando) return;
            enviando = true;
            var cuerpo = new FormData();
            cuerpo.append('accion', 'salir');
            cuerpo.append('token', token);
            fetch('php/usuario_auth.php', { method: 'POST', body: cuerpo, credentials: 'same-origin' })
                .then(function (r) { return r.json().catch(function () { return null; }); })
                .then(function (json) {
                    if (!json || !json.ok) {
                        enviando = false;
                        if (window.SitrainaAvisos) {
                            window.SitrainaAvisos.error('No se pudo cerrar la sesión', (json && json.mensaje) || 'Volvé a intentarlo.');
                        }
                        return;
                    }
                    recargarEn('inicio');
                })
                .catch(function () {
                    enviando = false;
                    if (window.SitrainaAvisos) window.SitrainaAvisos.error('No se pudo cerrar la sesión', 'Volvé a intentarlo.');
                });
        }
    });

    document.addEventListener('keydown', function (ev) {
        if (ev.key === 'Escape') cerrarMensaje();
    });

    function alEntrarCuenta() {
        if ((location.hash || '').replace('#', '') === 'cuenta') estado();
    }

    window.addEventListener('hashchange', alEntrarCuenta);
    document.addEventListener('sitraina-vista', function (ev) {
        if (ev.detail === 'cuenta') alEntrarCuenta();
    });

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', estado);
    else estado();
})();
