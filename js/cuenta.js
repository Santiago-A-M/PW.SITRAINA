/* Cuenta pública: sesión, ingreso, registro y bandeja. */
(function () {
    var token = '';
    var ingresado = false;
    var enviando = false;
    var relojCitas = null;
    var syncCitas = null;
    var desfaseCitas = 0;

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

    function estadoVisible(fila) {
        if (fila && fila.cancelado_en) {
            return parseInt(fila.plazo_vigente, 10) === 1 ? 'Cancelada' : 'Plazo vencido';
        }
        return etiquetaEstado(fila && fila.estado);
    }

    function mostrarOpcion(nodo, visible) {
        if (!nodo) return;
        nodo.hidden = !visible;
        nodo.style.display = visible ? '' : 'none';
    }

    function pintarMenu() {
        mostrarOpcion($('opcion-ingresar'), !ingresado);
        mostrarOpcion($('opcion-registro'), !ingresado);
        mostrarOpcion($('opcion-citas'), ingresado);
        mostrarOpcion($('opcion-mensajes'), ingresado);
        mostrarOpcion($('opcion-salir'), ingresado);
        mostrarOpcion($('cuenta-notas'), ingresado);
    }

    function etiquetaDia(iso) {
        var meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
        var partes = String(iso || '').slice(0, 10).split('-');
        if (partes.length < 3 || !partes[0]) return '';
        var mes = meses[Number(partes[1]) - 1] || '';
        return Number(partes[2]) + (mes ? ' de ' + mes : '') + ' de ' + partes[0];
    }

    function etiquetaHora(hora) {
        var partes = String(hora || '').split(':');
        var numero = parseInt(partes[0], 10);
        if (!partes[1] || isNaN(numero)) return String(hora || '');
        var sufijo = numero >= 12 ? 'p. m.' : 'a. m.';
        var doce = numero % 12;
        if (doce === 0) doce = 12;
        return doce + ':' + partes[1] + ' ' + sufijo;
    }

    function formatoRestante(segundos) {
        var total = Math.max(0, Math.floor(segundos));
        var dias = Math.floor(total / 86400);
        var horas = Math.floor((total % 86400) / 3600);
        var minutos = Math.floor((total % 3600) / 60);
        var segs = total % 60;
        return dias + ' d ' + horas + ' h ' + minutos + ' min ' + segs + ' s';
    }

    function detenerRelojCitas() {
        if (relojCitas) window.clearInterval(relojCitas);
        if (syncCitas) window.clearInterval(syncCitas);
        relojCitas = null;
        syncCitas = null;
    }

    function marcarCitaVencida(tarjeta) {
        if (!tarjeta || tarjeta.getAttribute('data-vencida') === '1') return;
        tarjeta.setAttribute('data-vencida', '1');
        tarjeta.classList.add('cita-vencida');
        var boton = tarjeta.querySelector('[data-cita-accion="reprogramar_cita"]');
        if (boton) boton.remove();
        var estado = tarjeta.querySelector('.cita-estado');
        if (estado) {
            estado.className = 'cita-estado cita-tachado';
            estado.textContent = 'CANCELADA';
        }
        var nota = tarjeta.querySelector('.cita-nota-vigente');
        if (nota) nota.textContent = 'El plazo de 15 días (360 horas) ya terminó. La cita queda en el historial.';
        var reloj = tarjeta.querySelector('.citas-reloj');
        if (reloj) reloj.hidden = true;
    }

    function pintarRelojesCitas() {
        var ahora = Math.floor(Date.now() / 1000) + desfaseCitas;
        document.querySelectorAll('#citas-lista [data-limite-unix]').forEach(function (nodo) {
            var limite = parseInt(nodo.getAttribute('data-limite-unix'), 10) || 0;
            var queda = limite - ahora;
            var salida = nodo.querySelector('.citas-restante');
            if (queda <= 0) {
                if (salida) salida.textContent = 'El plazo terminó.';
                marcarCitaVencida(nodo.closest('.cita-tarjeta'));
                return;
            }
            if (salida) salida.textContent = formatoRestante(queda);
        });
    }

    function asegurarRelojCitas() {
        if (!relojCitas) relojCitas = window.setInterval(pintarRelojesCitas, 1000);
        if (!syncCitas) {
            syncCitas = window.setInterval(function () {
                if ((location.hash || '').replace('#', '') === 'mis-citas') cargarCitas(true);
            }, 60000);
        }
        pintarRelojesCitas();
    }

    function htmlCita(fila) {
        var vigente = parseInt(fila.plazo_vigente, 10) === 1;
        var vencida = fila.grupo === 'cancelada' && !vigente;
        var html = '<article class="cita-tarjeta' + (vencida ? ' cita-vencida' : '') + '">';
        html += '<div class="cita-tarjeta-cuerpo">';
        if (vencida) {
            html += '<p class="cita-estado cita-tachado">CANCELADA</p>';
        } else if (fila.grupo === 'cancelada') {
            html += '<p class="cita-estado cita-estado-cancelada">Cancelada · todavía podés volver a agendarla</p>';
        } else if (fila.grupo === 'aprobada') {
            html += '<p class="cita-estado cita-estado-aprobada">Aprobada</p>';
        } else if (fila.grupo === 'rechazada') {
            html += '<p class="cita-estado cita-estado-rechazada">Rechazada</p>';
        } else {
            html += '<p class="cita-estado">En revisión</p>';
        }
        if (fila.fecha) {
            if (fila.grupo === 'cancelada') html += '<p class="cita-dato"><span class="cita-etiqueta">Día que tenía</span></p>';
            html += '<p class="cita-cuando">' + escapar(etiquetaDia(fila.fecha));
            if (fila.hora) html += '<span class="cita-hora-texto">' + escapar(etiquetaHora(fila.hora)) + '</span>';
            html += '</p>';
        }
        if (fila.modalidad === 'virtual' || fila.modalidad === 'presencial') {
            html += '<p class="cita-dato"><span class="cita-etiqueta">Modalidad</span><span>' + (fila.modalidad === 'virtual' ? 'Virtual' : 'Presencial') + '</span></p>';
        }
        if (fila.motivo) html += '<p class="cita-dato"><span class="cita-etiqueta">Motivo</span><span>' + escapar(fila.motivo) + '</span></p>';
        if (fila.creado_en) html += '<p class="cita-dato"><span class="cita-etiqueta">Solicitada</span><span>' + escapar(fila.creado_en) + '</span></p>';
        if (fila.respuesta) {
            html += '<p class="cita-dato"><span class="cita-etiqueta">Respuesta</span></p>';
            html += '<pre class="bandeja-cuerpo">' + escapar(fila.respuesta) + '</pre>';
        }
        if (fila.grupo === 'cancelada' && vigente) {
            html += '<p class="cita-nota-vigente">La cita está cancelada y todavía se puede volver a pedir. Queda para hoy, en la primera hora libre, si ese día está disponible.</p>';
            html += '<p class="citas-reloj" data-limite-unix="' + escapar(fila.limite_unix) + '">';
            html += '<span class="citas-reloj-etiqueta">Tiempo para volver a agendar</span>';
            html += '<span class="citas-restante" aria-live="polite"></span></p>';
        } else if (vencida) {
            html += '<p class="cita-nota-vigente">El plazo de 15 días ya terminó. La cita queda en tu historial.</p>';
        }
        html += '</div>';
        if (fila.grupo === 'cancelada' && vigente) {
            html += '<div class="bandeja-acciones"><button type="button" class="bandeja-accion" data-cita-accion="reprogramar_cita" data-cita-id="' + escapar(fila.id) + '">Volver a agendar para hoy</button></div>';
        } else if (parseInt(fila.puede_cancelar, 10) === 1) {
            html += '<div class="bandeja-acciones"><button type="button" class="bandeja-accion" data-cita-accion="cancelar_cita" data-cita-id="' + escapar(fila.id) + '">Cancelar cita</button></div>';
        }
        html += '</article>';
        return html;
    }

    function cargarCitas(silencioso) {
        var lista = $('citas-lista');
        if (!lista) return;
        if (!silencioso) lista.innerHTML = '<p class="vacio-bloque">Un momento, por favor.</p>';
        fetch('php/bandeja.php?accion=mis_citas', { credentials: 'same-origin', cache: 'no-store' })
            .then(function (r) {
                if (r.status === 401) {
                    location.hash = 'ingresar';
                    return null;
                }
                return r.json().catch(function () { return null; });
            })
            .then(function (json) {
                if (!lista) return;
                if (!json || !json.ok) {
                    detenerRelojCitas();
                    lista.innerHTML = '<p class="vacio-bloque">No se pudieron cargar las citas.</p>';
                    return;
                }
                desfaseCitas = (parseInt(json.ahora_unix, 10) || 0) - Math.floor(Date.now() / 1000);
                var filas = json.citas || [];
                if (!filas.length) {
                    detenerRelojCitas();
                    lista.innerHTML = '<p class="vacio-bloque">Todavía no enviaste solicitudes de cita con esta cuenta.</p>';
                    return;
                }
                var grupos = [
                    { id: 'aprobada', titulo: 'Aprobadas' },
                    { id: 'cancelada', titulo: 'Canceladas' },
                    { id: 'rechazada', titulo: 'Rechazadas' },
                    { id: 'revision', titulo: 'En revisión' }
                ];
                var html = '';
                grupos.forEach(function (grupo) {
                    var propias = filas.filter(function (fila) { return fila.grupo === grupo.id; });
                    if (!propias.length) return;
                    html += '<section class="cita-grupo"><h3>' + grupo.titulo + '</h3><div class="cita-grupo-rejilla">';
                    propias.forEach(function (fila) { html += htmlCita(fila); });
                    html += '</div></section>';
                });
                lista.innerHTML = html;
                if (lista.querySelector('[data-limite-unix]')) asegurarRelojCitas();
                else detenerRelojCitas();
            })
            .catch(function () {
                if (!lista) return;
                detenerRelojCitas();
                lista.innerHTML = '<p class="vacio-bloque">No se pudieron cargar las citas.</p>';
            });
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

    var pedidoEstado = null;

    function estado() {
        if (pedidoEstado) return pedidoEstado;
        pedidoEstado = fetch('php/usuario_auth.php?accion=estado', { credentials: 'same-origin' })
            .then(function (r) { return r.json().catch(function () { return null; }); })
            .then(function (json) {
                if (!json || !json.ok) return;
                token = json.token || '';
                ingresado = !!json.ingresado;
                if (ingresado && window.SitrainaAvisos && window.SitrainaAvisos.cuentaVerificada) {
                    window.SitrainaAvisos.cuentaVerificada();
                }
                pintarMenu();
                if (ingresado) consultarNotas();
                var saludo = $('cuenta-saludo');
                if (saludo) {
                    saludo.textContent = ingresado
                        ? ('Hola, ' + (json.nombre || 'cuenta') + '.')
                        : 'Ingresá para ver tus mensajes.';
                }
                var vista = location.hash.replace('#', '');
                if (ingresado && vista === 'cuenta') cargarBandeja();
                if (ingresado && vista === 'mis-citas') cargarCitas(false);
                if (!ingresado && (vista === 'cuenta' || vista === 'mis-citas')) {
                    location.hash = 'ingresar';
                }
            })
            .finally(function () {
                pedidoEstado = null;
            });
        return pedidoEstado;
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
        estado().then(function () {
            if (!token) {
                enviando = false;
                mostrarAvisoForm(avisoId, 'No pudimos preparar el ingreso. Recargá la página e intentá de nuevo.', true);
                return;
            }
            enviarAuthListo(accion, datos, avisoId, false);
        }).catch(function () {
            enviando = false;
            mostrarAvisoForm(avisoId, 'No pudimos preparar el ingreso. Recargá la página e intentá de nuevo.', true);
        });
    }

    function enviarAuthListo(accion, datos, avisoId, reintento) {
        var cuerpo = new FormData();
        cuerpo.append('accion', accion);
        cuerpo.append('token', token);
        Object.keys(datos).forEach(function (clave) {
            cuerpo.append(clave, datos[clave]);
        });
        fetch('php/usuario_auth.php', { method: 'POST', body: cuerpo, credentials: 'same-origin' })
            .then(function (r) { return r.json().catch(function () { return null; }); })
            .then(function (json) {
                var mensaje = (json && json.mensaje) || '';
                if ((!json || !json.ok) && !reintento && mensaje.indexOf('Volvé a intentarlo') !== -1) {
                    token = '';
                    return estado().then(function () {
                        if (!token) {
                            enviando = false;
                            mostrarAvisoForm(avisoId, mensaje || 'No se pudo completar.', true);
                            return;
                        }
                        enviarAuthListo(accion, datos, avisoId, true);
                    });
                }
                enviando = false;
                if (!json || !json.ok) {
                    mostrarAvisoForm(avisoId, mensaje || 'No se pudo completar.', true);
                    return estado();
                }
                if (window.SitrainaAvisos && window.SitrainaAvisos.cuentaVerificada) {
                    window.SitrainaAvisos.cuentaVerificada();
                }
                var volver = window.SitrainaAvisos && window.SitrainaAvisos.vistaDeRegreso
                    ? window.SitrainaAvisos.vistaDeRegreso()
                    : 'cuenta';
                recargarEn(volver);
            })
            .catch(function () {
                enviando = false;
                mostrarAvisoForm(avisoId, 'No se pudo completar.', true);
            });
    }

    function cargarBandeja(opciones) {
        opciones = opciones || {};
        var lista = $('bandeja-lista');
        if (!lista) return;
        lista.innerHTML = '<p class="vacio-bloque">Un momento, por favor.</p>';
        if (!opciones.conservar) cerrarMensaje();
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
                    html += '<span class="bandeja-item-tipo">' + escapar(etiquetaTipo(fila.tipo)) + ' · ' + escapar(estadoVisible(fila)) + '</span>';
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
        detalle.innerHTML = '<p class="vacio-bloque">Un momento, por favor.</p>';
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
                var acciones = '';
                if (parseInt(m.puede_cancelar, 10) === 1) {
                    acciones = '<div class="bandeja-acciones"><button type="button" class="bandeja-accion" data-cita-accion="cancelar_cita" data-cita-id="' + escapar(m.id) + '">Cancelar cita</button></div>';
                } else if (parseInt(m.puede_reprogramar, 10) === 1) {
                    acciones = '<div class="bandeja-acciones"><button type="button" class="bandeja-accion" data-cita-accion="reprogramar_cita" data-cita-id="' + escapar(m.id) + '">Reprogramar para hoy</button></div>';
                }
                detalle.innerHTML =
                    '<p class="bandeja-item-tipo">' + escapar(etiquetaTipo(m.tipo)) + ' · ' + escapar(estadoVisible(m)) + '</p>' +
                    '<h3 id="bandeja-popup-titulo">' + escapar(m.asunto) + '</h3>' +
                    '<p class="bandeja-item-fecha">' + escapar(m.creado_en) + '</p>' +
                    (m.editado ? '<p class="bandeja-editado">Editado</p>' : '') +
                    '<pre class="bandeja-cuerpo">' + escapar(m.cuerpo) + '</pre>' +
                    (m.aviso_plazo ? '<p class="bandeja-plazo">' + escapar(m.aviso_plazo) + '</p>' : '') +
                    acciones;
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

    function gestionarCita(accion, id) {
        if (enviando || !id) return;
        var esCancelar = accion === 'cancelar_cita';
        var texto = esCancelar
            ? 'Vas a cancelar una cita confirmada. Después tenés 15 días para volver a pedirla.'
            : 'La cita va a quedar para hoy, si ese día está disponible y libre. Si hoy no hay lugar, la cancelación sigue vigente.';
        var pedir = window.SitrainaAvisos
            ? window.SitrainaAvisos.confirmar(esCancelar ? {
                titulo: 'Cancelar cita confirmada',
                texto: 'Estás a punto de cancelar una cita que administración ya confirmó.',
                advertencia: 'Después de cancelarla tenés 15 días, desde este momento, para volver a pedir esa misma cita. Si el plazo se vence, queda cancelada y ya no se recupera.',
                confirmar: 'Confirmar cancelación',
                cancelar: 'Regresar',
                peligro: true
            } : {
                titulo: 'Volver a agendar',
                texto: texto,
                confirmar: 'Volver a agendar',
                cancelar: 'Regresar'
            })
            : Promise.resolve(window.confirm(esCancelar
                ? 'Vas a cancelar una cita confirmada. Después tenés 360 horas para volver a agendarla. ¿Confirmás la cancelación?'
                : texto));
        pedir.then(function (ok) {
            if (!ok || enviando) return;
            enviando = true;
            if (window.SitrainaAvisos) {
                window.SitrainaAvisos.procesando(esCancelar ? 'Cancelando cita' : 'Reprogramando cita', 'Estamos guardando el cambio. Esperá un momento.');
            }
            var cuerpo = new FormData();
            cuerpo.append('accion', accion);
            cuerpo.append('token', token);
            cuerpo.append('id', id);
            fetch('php/bandeja.php', { method: 'POST', body: cuerpo, credentials: 'same-origin' })
                .then(function (r) { return r.json().catch(function () { return null; }); })
                .then(function (json) {
                    enviando = false;
                    var enCitas = (location.hash || '').replace('#', '') === 'mis-citas';
                    if (!json || !json.ok) {
                        if (window.SitrainaAvisos) {
                            window.SitrainaAvisos.error(esCancelar ? 'No se pudo cancelar' : 'No se pudo reprogramar', (json && json.mensaje) || 'Volvé a intentarlo.');
                        }
                        if (enCitas) cargarCitas(true);
                        else abrirMensaje(id);
                        return;
                    }
                    if (window.SitrainaAvisos) window.SitrainaAvisos.exito('Listo', json.mensaje);
                    if (enCitas) cargarCitas(true);
                    else {
                        abrirMensaje(id);
                        cargarBandeja({ conservar: true });
                    }
                })
                .catch(function () {
                    enviando = false;
                    if (window.SitrainaAvisos) {
                        window.SitrainaAvisos.error(esCancelar ? 'No se pudo cancelar' : 'No se pudo reprogramar', 'Volvé a intentarlo.');
                    }
                });
        });
    }

    document.addEventListener('click', function (ev) {
        var accionCita = ev.target.closest ? ev.target.closest('[data-cita-accion]') : null;
        if (accionCita) {
            ev.preventDefault();
            gestionarCita(accionCita.getAttribute('data-cita-accion'), accionCita.getAttribute('data-cita-id'));
            return;
        }
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
        if (ev.key !== 'Escape') return;
        var aviso = document.querySelector('.sit-aviso');
        if (aviso && !aviso.hidden) return;
        cerrarMensaje();
    });

    function alEntrarCuenta() {
        var vista = (location.hash || '').replace('#', '');
        if (vista === 'cuenta' || vista === 'mis-citas') estado();
        else detenerRelojCitas();
    }

    var firmaNotas = '';
    var notasListas = false;
    var notasVistas = null;
    var notasBtn = $('cuenta-notas-btn');
    var notasMenu = $('cuenta-notas-menu');
    var notasLista = $('cuenta-notas-lista');
    var notasCuenta = $('cuenta-notas-cuenta');

    function textoNota(aviso) {
        var cuando = aviso.cuando ? ' · ' + aviso.cuando : '';
        return (aviso.titulo ? aviso.titulo + ': ' : '') + (aviso.texto || '') + cuando;
    }

    function mostrarNotaEsquina(texto, tipo) {
        if (!texto) return;
        var caja = $('cuenta-notas-flotantes');
        if (!caja) {
            caja = document.createElement('div');
            caja.id = 'cuenta-notas-flotantes';
            caja.className = 'sit-notas';
            caja.setAttribute('aria-live', 'polite');
            document.body.appendChild(caja);
        }
        var nota = document.createElement('p');
        nota.className = 'sit-nota sit-nota-' + (tipo || 'contacto');
        nota.textContent = texto;
        caja.appendChild(nota);
        window.setTimeout(function () {
            nota.classList.add('sit-nota-sale');
            window.setTimeout(function () {
                if (nota.parentNode) nota.parentNode.removeChild(nota);
            }, 280);
        }, 5600);
    }

    function pintarNotas(json) {
        if (!notasLista) return;
        var avisos = json.avisos || [];
        var n = typeof json.no_leidas === 'number' ? json.no_leidas : 0;
        var html = '';
        avisos.forEach(function (aviso) {
            if (typeof json.no_leidas !== 'number' && !aviso.leido) n += 1;
            html += '<button type="button" class="cuenta-notas-item cuenta-notas-' + escapar(aviso.tipo || 'contacto') + (aviso.leido ? ' cuenta-notas-leida' : '') + '" data-tipo="' + escapar(aviso.tipo) + '" data-id="' + escapar(aviso.origen_id) + '" data-marca="' + escapar(aviso.marca) + '">' + escapar(textoNota(aviso)) + '</button>';
        });
        notasLista.innerHTML = html || '<p class="cuenta-notas-vacio">No hay avisos por ahora.</p>';
        if (notasCuenta) {
            notasCuenta.hidden = n < 1;
            notasCuenta.textContent = n > 9 ? '9+' : String(n);
        }
    }

    function marcarNota(tipo, id, marca, todas) {
        if (!token) return;
        var cuerpo = new FormData();
        cuerpo.append('token', token);
        cuerpo.append('accion', todas ? 'leidas' : 'leida');
        if (!todas) {
            cuerpo.append('tipo', tipo || '');
            cuerpo.append('id', id || '');
            cuerpo.append('marca', marca || '');
        }
        fetch('php/notificaciones.php', { method: 'POST', body: cuerpo, credentials: 'same-origin', cache: 'no-store' })
            .then(function (r) { return r.json().catch(function () { return null; }); })
            .then(function (json) {
                if (!json || !json.ok) return;
                firmaNotas = json.firma || firmaNotas;
                pintarNotas(json);
            })
            .catch(function () {});
    }

    function consultarNotas() {
        if (!ingresado || document.hidden) return;
        fetch('php/notificaciones.php', { credentials: 'same-origin', cache: 'no-store' })
            .then(function (r) {
                if (r.status === 401) return null;
                return r.json().catch(function () { return null; });
            })
            .then(function (json) {
                if (!json || !json.ok) return;
                var cambio = notasListas && json.firma && json.firma !== firmaNotas;
                var primeras = !notasListas;
                firmaNotas = json.firma || '';
                notasListas = true;
                if (cambio) {
                    var vista = (location.hash || '').replace('#', '');
                    if (vista === 'cuenta') cargarBandeja({ conservar: true });
                    if (vista === 'mis-citas') cargarCitas(true);
                }
                var nuevas = [];
                if (!primeras) {
                    (json.avisos || []).forEach(function (aviso) {
                        if (aviso.leido) return;
                        var clave = aviso.tipo + ':' + aviso.origen_id + ':' + aviso.marca;
                        if (!notasVistas || notasVistas.indexOf(clave) === -1) nuevas.push(aviso);
                    });
                }
                notasVistas = (json.avisos || []).map(function (aviso) {
                    return aviso.tipo + ':' + aviso.origen_id + ':' + aviso.marca;
                });
                pintarNotas(json);
                nuevas.slice(0, 3).forEach(function (aviso) {
                    mostrarNotaEsquina(textoNota(aviso), aviso.tipo);
                });
            })
            .catch(function () {});
    }

    if (notasBtn && notasMenu) {
        notasBtn.addEventListener('click', function (ev) {
            ev.preventDefault();
            ev.stopPropagation();
            var abrirMenu = notasMenu.hidden;
            notasMenu.hidden = !abrirMenu;
            notasBtn.setAttribute('aria-expanded', abrirMenu ? 'true' : 'false');
        });
        document.addEventListener('click', function (ev) {
            var caja = $('cuenta-notas');
            if (caja && !caja.contains(ev.target)) {
                notasMenu.hidden = true;
                notasBtn.setAttribute('aria-expanded', 'false');
            }
        });
    }
    if (notasLista) {
        notasLista.addEventListener('click', function (ev) {
            var boton = ev.target.closest('.cuenta-notas-item');
            if (!boton) return;
            var tipo = boton.getAttribute('data-tipo');
            marcarNota(tipo, boton.getAttribute('data-id'), boton.getAttribute('data-marca'), false);
            if (notasMenu) notasMenu.hidden = true;
            location.hash = tipo === 'cita' ? 'mis-citas' : 'cuenta';
        });
    }
    var notasTodas = $('cuenta-notas-todas');
    if (notasTodas) notasTodas.addEventListener('click', function () { marcarNota('', '', '', true); });

    window.setInterval(function () {
        if (ingresado) estado();
    }, 20000);
    document.addEventListener('visibilitychange', function () {
        if (!document.hidden && ingresado) consultarNotas();
    });

    window.addEventListener('hashchange', alEntrarCuenta);
    document.addEventListener('sitraina-vista', function (ev) {
        if (ev.detail === 'cuenta') alEntrarCuenta();
    });

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', estado);
    else estado();
})();
