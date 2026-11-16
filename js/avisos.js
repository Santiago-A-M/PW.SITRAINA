/* Popups de resultado para formularios públicos y del panel. */
(function () {
    if (window.SitrainaAvisos) return;

    var raiz = null;
    var alCerrar = null;
    var firma = '';
    var tipoActual = '';
    var cierreToken = 0;
    var menosMovimiento = false;
    try {
        menosMovimiento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch (e) {}

    var iconos = {
        exito: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><path d="M8 12.5l2.5 2.5L16 9.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
        error: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><path d="M9 9l6 6M15 9l-6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
        campos: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.5l9 16H3l9-16z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M12 10v4M12 16.5h.01" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
        confirmar: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 7h14M9 7V5h6v2M8 7l1 13h6l1-13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
        sesion: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="3.2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M5.5 19.2c1.2-3 3.5-4.5 6.5-4.5s5.3 1.5 6.5 4.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
        afiliado: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="3.2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M5.5 19.2c1.2-3 3.5-4.5 6.5-4.5s5.3 1.5 6.5 4.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
        proceso: ''
    };

    function asegurar() {
        if (raiz) return;
        raiz = document.createElement('div');
        raiz.className = 'sit-aviso';
        raiz.hidden = true;
        raiz.innerHTML =
            '<div class="sit-aviso-caja" role="dialog" aria-modal="true" aria-labelledby="sit-aviso-titulo" aria-describedby="sit-aviso-texto">' +
            '<button type="button" class="sit-aviso-cerrar" aria-label="Cerrar">×</button>' +
            '<div class="sit-aviso-icono" id="sit-aviso-icono" aria-hidden="true"></div>' +
            '<h2 class="sit-aviso-titulo" id="sit-aviso-titulo"></h2>' +
            '<p class="sit-aviso-texto" id="sit-aviso-texto"></p>' +
            '<div class="sit-aviso-acciones" id="sit-aviso-acciones"></div>' +
            '</div>';
        document.body.appendChild(raiz);
        raiz.addEventListener('click', function (ev) {
            if (tipoActual === 'proceso') return;
            if (ev.target === raiz) cerrar(false);
        });
        raiz.querySelector('.sit-aviso-cerrar').addEventListener('click', function () {
            if (tipoActual === 'proceso') return;
            cerrar(false);
        });
        document.addEventListener('keydown', function (ev) {
            if (ev.key !== 'Escape' || !raiz || raiz.hidden || tipoActual === 'proceso') return;
            ev.preventDefault();
            cerrar(false);
        });
    }

    function soltar(resultado) {
        var fn = alCerrar;
        alCerrar = null;
        if (fn) fn(resultado);
    }

    function cerrar(resultado) {
        if (!raiz || raiz.hidden || raiz.classList.contains('sit-aviso-saliendo')) {
            if (!raiz || raiz.hidden) soltar(resultado);
            return;
        }
        var token = ++cierreToken;
        var terminar = function () {
            if (!raiz || token !== cierreToken) return;
            raiz.hidden = true;
            raiz.classList.remove('sit-aviso-saliendo');
            firma = '';
            tipoActual = '';
            document.body.classList.remove('sit-aviso-abierto');
            soltar(resultado);
        };
        if (menosMovimiento) {
            terminar();
            return;
        }
        raiz.classList.add('sit-aviso-saliendo');
        window.setTimeout(terminar, 180);
    }

    var vistasFormulario = { afiliacion: true, contacto: true, cita: true };
    var claveVolver = 'sitraina-volver-formulario';

    function vistaActual() {
        return (location.hash || '').replace('#', '');
    }

    function recordarFormulario() {
        var nombre = vistaActual();
        try {
            if (vistasFormulario[nombre]) sessionStorage.setItem(claveVolver, nombre);
        } catch (e) {}
    }

    function vistaDeRegreso() {
        var nombre = '';
        try {
            nombre = sessionStorage.getItem(claveVolver) || '';
            sessionStorage.removeItem(claveVolver);
        } catch (e) {}
        return vistasFormulario[nombre] ? nombre : 'cuenta';
    }

    function irVista(nombre) {
        var actual = vistaActual();
        if (actual === nombre && typeof window.mostrarVistaPublica === 'function') {
            window.mostrarVistaPublica(nombre);
            return;
        }
        location.hash = nombre;
    }

    function boton(etiqueta, clase, alPulsar) {
        var nodo = document.createElement('button');
        nodo.type = 'button';
        nodo.className = clase;
        nodo.textContent = etiqueta;
        nodo.addEventListener('click', alPulsar);
        return nodo;
    }

    function abrir(tipo, titulo, texto, extra) {
        asegurar();
        var nueva = tipo + '|' + titulo + '|' + texto;
        cierreToken++;
        if (raiz && !raiz.hidden && nueva === firma && tipo !== 'confirmar' && tipo !== 'sesion') return;
        if (alCerrar) soltar(false);
        firma = nueva;
        tipoActual = tipo;
        extra = extra || {};
        var caja = raiz.querySelector('.sit-aviso-caja');
        var icono = document.getElementById('sit-aviso-icono');
        var tituloNodo = document.getElementById('sit-aviso-titulo');
        var textoNodo = document.getElementById('sit-aviso-texto');
        var acciones = document.getElementById('sit-aviso-acciones');
        var equis = raiz.querySelector('.sit-aviso-cerrar');
        raiz.className = 'sit-aviso sit-aviso-' + tipo;
        if (extra.peligro) raiz.classList.add('sit-aviso-peligro');
        var alertaPrevia = raiz.querySelector('.sit-aviso-alerta');
        if (alertaPrevia) alertaPrevia.remove();
        tituloNodo.textContent = titulo || '';
        textoNodo.textContent = texto || '';
        if (extra.advertencia) {
            var alerta = document.createElement('p');
            alerta.className = 'sit-aviso-alerta';
            alerta.textContent = extra.advertencia;
            textoNodo.insertAdjacentElement('afterend', alerta);
        }
        acciones.innerHTML = '';
        if (tipo === 'proceso') {
            icono.innerHTML = '<span class="sit-aviso-giro"></span>';
            equis.hidden = true;
            caja.setAttribute('aria-busy', 'true');
        } else {
            icono.innerHTML = iconos[tipo] || iconos.error;
            equis.hidden = false;
            caja.removeAttribute('aria-busy');
        }
        if (tipo === 'confirmar') {
            acciones.appendChild(boton(extra.cancelar || 'Cancelar', 'sit-aviso-btn sit-aviso-btn-sec', function () {
                cerrar(false);
            }));
            acciones.appendChild(boton(extra.confirmar || 'Confirmar', 'sit-aviso-btn', function () {
                cerrar(true);
            }));
        } else if (tipo === 'sesion') {
            acciones.appendChild(boton('Iniciar sesión', 'sit-aviso-btn', function () {
                recordarFormulario();
                cerrar('ingresar');
                irVista('ingresar');
            }));
            acciones.appendChild(boton('Crear una cuenta', 'sit-aviso-btn sit-aviso-btn-sec', function () {
                recordarFormulario();
                cerrar('registro');
                irVista('registro');
            }));
            acciones.appendChild(boton('Ahora no', 'sit-aviso-btn sit-aviso-btn-sec', function () {
                cerrar(false);
            }));
        } else if (tipo !== 'proceso') {
            acciones.appendChild(boton('Entendido', 'sit-aviso-btn', function () {
                cerrar(false);
            }));
        }
        raiz.hidden = false;
        document.body.classList.add('sit-aviso-abierto');
        if (!menosMovimiento) {
            caja.style.animation = 'none';
            void caja.offsetWidth;
            caja.style.animation = '';
        }
        var foco = tipo === 'proceso' ? null : (acciones.querySelector('.sit-aviso-btn:not(.sit-aviso-btn-sec)') || equis);
        if (tipo === 'confirmar') foco = acciones.querySelector('.sit-aviso-btn-sec') || foco;
        if (foco && foco.focus) foco.focus();
    }

    function mensajesDe(form) {
        var lista = [];
        Array.prototype.forEach.call(form.elements, function (campo) {
            if (!campo.willValidate || campo.disabled || campo.type === 'hidden') return;
            if (campo.checkValidity()) return;
            if (campo.validationMessage && lista.indexOf(campo.validationMessage) === -1) {
                lista.push(campo.validationMessage);
            }
        });
        return lista;
    }

    function avisoContextual(tipo, texto, ambito) {
        if (/No se pudo leer la agenda/.test(texto || '')) {
            return { tipo: 'error', titulo: 'No se pudo abrir el horario', texto: texto };
        }
        if (/Inicia sesión/.test(texto || '')) {
            return { tipo: 'error', titulo: 'Hay que volver a entrar', texto: texto };
        }
        var proceso = tipo === 'proceso' || /…$/.test(texto || '');
        var revision = tipo === 'campos' || /^(La cédula|Escribí|Elegí|Seleccioná|Esa cita no|Ese día está)/.test(texto || '');
        var error = !proceso && !revision && (tipo === 'error' || tipo === 'peligro');
        var titulos = {
            cita: proceso ? 'Actualizando la cita' : (revision ? 'Revisá la cita' : (error ? 'No se pudo actualizar la cita' : 'Cita actualizada')),
            horario: proceso ? 'Guardando el horario' : (revision ? 'Revisá el horario' : (error ? 'No se pudo guardar el horario' : 'Horario actualizado')),
            afiliado: proceso ? 'Actualizando la cuenta' : (revision ? 'Revisá la cuenta' : (error ? 'No se pudo actualizar la cuenta' : 'Cuenta de afiliado actualizada')),
            contacto: proceso ? 'Actualizando el contacto' : (revision ? 'Revisá el mensaje' : (error ? 'No se pudo responder el contacto' : 'Contacto actualizado')),
            papelera: proceso ? 'Actualizando la papelera' : (revision ? 'Revisá la papelera' : (error ? 'No se pudo actualizar la papelera' : 'Papelera actualizada')),
            solicitud: proceso ? 'Actualizando la solicitud' : (revision ? 'Revisá la solicitud' : (error ? 'No se pudo gestionar la solicitud' : 'Solicitud actualizada'))
        };
        var genericos = {
            'No se pudo guardar.': {
                horario: 'No se pudo guardar el horario. Las fechas y horas siguen como estaban. Revisá si ese día ya tiene una cita aceptada y volvé a intentarlo.',
                cita: 'No se pudo guardar la cita. La fecha, la hora o los comentarios no se actualizaron.',
                afiliado: 'No se pudo guardar el afiliado. La cuenta no se creó.',
                contacto: 'No se pudo guardar la respuesta. El mensaje de contacto sigue pendiente.',
                solicitud: 'No se pudo guardar la solicitud. El registro no cambió.'
            },
            'Guardado.': {
                horario: 'El horario quedó guardado. Esas fechas y horas ya se pueden ofrecer para las citas.',
                cita: 'La cita quedó guardada.'
            },
            'No se pudo bloquear ese período.': {
                horario: 'No se pudo reservar ese período de 15 días. Comprobá que el día de inicio no esté ocupado por una cita aceptada.'
            },
            'No se pudo quitar el mes.': {
                horario: 'No se pudo quitar el mes del horario. Esas fechas siguen registradas como estaban.'
            },
            'No se pudieron guardar los comentarios.': {
                cita: 'No se pudieron guardar los comentarios de la cita. Los cambios no quedaron registrados.'
            },
            'No se pudo eliminar la cita.': {
                cita: 'No se pudo eliminar la cita. El registro sigue en Citas guardadas.'
            },
            'No se pudo enviar la respuesta.': {
                cita: 'No se pudo enviar la respuesta de la cita. El correo no salió y el mensaje no quedó registrado.'
            },
            'No se pudo borrar.': {
                papelera: 'No se pudo quitar esa solicitud de la papelera. El registro sigue ahí.',
                solicitud: 'No se pudo borrar la solicitud. El registro sigue en la lista.'
            },
            'No se pudo eliminar.': {
                afiliado: 'No se pudo eliminar el afiliado. La cuenta sigue registrada.',
                cita: 'No se pudo eliminar la solicitud de cita. Sigue en la lista.',
                contacto: 'No se pudo eliminar la consulta de contacto. Sigue en la lista.',
                papelera: 'No se pudo eliminar el registro de la papelera. Sigue en la lista.',
                solicitud: 'No se pudo eliminar la solicitud. Sigue en la lista.'
            },
            'No se pudo enviar.': {
                cita: 'No se pudo enviar la respuesta de la cita. El estado de la solicitud no cambió.',
                contacto: 'No se pudo enviar la respuesta de contacto. El mensaje sigue pendiente.',
                solicitud: 'No se pudo enviar la respuesta. La solicitud no cambió.'
            },
            'No se pudieron cargar las solicitudes.': {
                cita: 'No se pudieron cargar las citas. Volvé a abrir Citas con asesoría.',
                afiliado: 'No se pudieron cargar las cuentas de afiliados. Volvé a abrir esa sección.',
                contacto: 'No se pudieron cargar los mensajes de contacto. Volvé a abrir esa sección.',
                solicitud: 'No se pudieron cargar las solicitudes. Volvé a abrir la sección.'
            },
            'Consultas borradas.': {
                papelera: 'Las consultas seleccionadas salieron de la papelera.',
                solicitud: 'Las consultas seleccionadas quedaron borradas.'
            },
            'Consulta eliminada.': {
                cita: 'La solicitud de cita quedó eliminada.',
                contacto: 'La consulta de contacto quedó eliminada.',
                solicitud: 'La solicitud quedó eliminada.'
            },
            'Afiliado eliminado.': {
                afiliado: 'La cuenta del afiliado quedó eliminada.'
            },
            'Afiliado registrado.': {
                afiliado: 'La cuenta del afiliado quedó registrada.'
            },
            'Respuesta guardada.': {
                cita: 'La respuesta de la cita quedó guardada.',
                contacto: 'La respuesta de contacto quedó guardada.',
                solicitud: 'La respuesta quedó guardada.'
            },
            'Comentarios guardados.': {
                cita: 'Los comentarios de la cita quedaron guardados.'
            },
            'Cita eliminada.': {
                cita: 'La cita quedó eliminada.'
            },
            'Fechas guardadas.': {
                horario: 'Las fechas del horario quedaron guardadas.'
            },
            'Mes quitado.': {
                horario: 'El mes se quitó del horario. Esas fechas ya no están registradas.'
            },
            'Eliminando…': {
                cita: 'Se está eliminando la solicitud de cita. Esperá un momento y no repitas la acción.',
                contacto: 'Se está eliminando la consulta de contacto. Esperá un momento y no repitas la acción.',
                afiliado: 'Se está eliminando la cuenta. Esperá un momento y no repitas la acción.',
                papelera: 'Se está quitando el registro de la papelera. Esperá un momento y no repitas la acción.',
                solicitud: 'Se está eliminando la solicitud. Esperá un momento y no repitas la acción.'
            },
            'Borrando…': {
                papelera: 'Se están borrando las consultas de la papelera. Esperá un momento y no repitas la acción.',
                solicitud: 'Se están borrando las consultas. Esperá un momento y no repitas la acción.'
            },
            'Guardando…': {
                cita: 'Se está guardando la respuesta de la cita. Esperá un momento y no la envíes de nuevo.',
                horario: 'Se está guardando el horario. Esperá un momento.',
                contacto: 'Se está guardando la respuesta de contacto. Esperá un momento y no la envíes de nuevo.',
                afiliado: 'Se está guardando la cuenta. Esperá un momento.',
                solicitud: 'Se está guardando la solicitud. Esperá un momento.'
            }
        };
        var cuerpo = texto;
        if (genericos[texto] && genericos[texto][ambito]) cuerpo = genericos[texto][ambito];
        var titulo = titulos[ambito] || (error ? 'No se pudo completar' : 'Listo');
        if (!proceso && !revision && /eliminad/i.test(cuerpo || texto || '')) {
            var borrados = {
                cita: error ? 'No se pudo eliminar la cita' : 'Cita eliminada',
                horario: error ? 'No se pudo quitar el horario' : 'Horario actualizado',
                afiliado: error ? 'No se pudo eliminar la cuenta' : 'Cuenta eliminada',
                contacto: error ? 'No se pudo eliminar el contacto' : 'Contacto eliminado',
                papelera: error ? 'No se pudo vaciar la papelera' : 'Papelera actualizada',
                solicitud: error ? 'No se pudo eliminar la solicitud' : 'Solicitud eliminada'
            };
            titulo = borrados[ambito] || titulo;
        }
        return {
            tipo: proceso ? 'proceso' : (revision ? 'campos' : (error ? 'error' : 'exito')),
            titulo: titulo,
            texto: cuerpo
        };
    }

    window.SitrainaAvisos = {
        exito: function (titulo, texto) {
            abrir('exito', titulo || '¡Solicitud enviada!', texto || 'La información fue recibida correctamente.');
        },
        error: function (titulo, texto) {
            abrir('error', titulo || 'No se pudo enviar', texto || 'Ocurrió un problema al procesar la solicitud. Volvé a intentarlo.');
        },
        campos: function (titulo, texto) {
            abrir('campos', titulo || 'Revisá la información', texto || 'Faltan datos obligatorios o hay información incorrecta.');
        },
        procesando: function (titulo, texto) {
            abrir('proceso', titulo || 'Enviando solicitud', texto || 'Estamos procesando la información. Esperá un momento y no vuelvas a enviarla.');
        },
        confirmar: function (opciones) {
            opciones = opciones || {};
            return new Promise(function (resolve) {
                abrir('confirmar', opciones.titulo || 'Confirmar acción', opciones.texto || 'Esta acción necesita tu autorización.', opciones);
                alCerrar = function (ok) { resolve(!!ok); };
            });
        },
        revisar: function (form) {
            if (!form || form.checkValidity()) return true;
            var lista = mensajesDe(form);
            abrir('campos', 'Revisá la información', lista.join(' ') || 'Faltan datos obligatorios o hay información incorrecta.');
            var primero = form.querySelector(':invalid');
            if (primero && primero.focus) primero.focus();
            return false;
        },
        contextual: function (tipo, texto, ambito) {
            var pack = avisoContextual(tipo, texto, ambito || 'solicitud');
            if (pack.tipo === 'proceso') abrir('proceso', pack.titulo, pack.texto);
            else abrir(pack.tipo, pack.titulo, pack.texto);
        },
        vistaDeRegreso: vistaDeRegreso,
        sesion: function (alTerminar) {
            abrir(
                'sesion',
                'No se pudo verificar su cuenta',
                'No se pudo verificar su cuenta. Los campos donde se escribe quedan bloqueados.'
            );
            if (typeof alTerminar === 'function') alCerrar = alTerminar;
        },
        cuentaVerificada: function () {
            ['contacto', 'cita'].forEach(function (nombre) {
                window.SitrainaAvisos.marcarFormulario(nombre, false);
            });
            if (tipoActual === 'sesion') cerrar(false);
            window.SitrainaAvisos.estado().then(function (json) {
                if (yaEsAfiliado(json)) marcarAfiliacionCerrada();
                else soltarAfiliacion();
            });
        },
        yaAfiliado: function () {
            abrir(
                'afiliado',
                'Ya estás afiliado',
                'Tu cuenta ya está registrada como afiliada a SITRAINA. Este formulario queda solo para consulta: los campos se ven tachados y no se pueden escribir.'
            );
        },
        marcarFormulario: function (nombre, bloquear) {
            var raiz = formularioDe(nombre);
            if (!raiz) return;
            raiz.classList.toggle('formulario-sin-cuenta', !!bloquear);
            if (bloquear && nombre === 'cita' && !raiz.querySelector('.reserva-abrir') && !raiz.querySelector('.reserva-tarjeta') && !raiz.querySelector('textarea, input:not([type="hidden"]):not([name="_honey"])')) {
                raiz.insertAdjacentHTML(
                    'beforeend',
                    '<label class="reserva-motivo-label" for="reserva-motivo-bloqueado">Describí brevemente la consulta</label>' +
                    '<textarea id="reserva-motivo-bloqueado" class="reserva-motivo" rows="4" disabled placeholder="Escribí el motivo"></textarea>'
                );
            }
            raiz.querySelectorAll('input, textarea, select, button').forEach(function (campo) {
                if (campo.name === '_honey' || campo.closest('.cita-trampa')) return;
                if (campo.classList.contains('reserva-abrir')) return;
                if (campo.closest('.reserva-nav, .reserva-dias, .reserva-horas, .reserva-modalidades, .reserva-popup')) return;
                var tipo = (campo.getAttribute('type') || '').toLowerCase();
                if (tipo === 'hidden') return;
                if (bloquear) {
                    if (!campo.disabled) campo.setAttribute('data-cuenta-bloqueado', '1');
                    campo.disabled = true;
                } else if (campo.getAttribute('data-cuenta-bloqueado') === '1') {
                    campo.disabled = false;
                    campo.removeAttribute('data-cuenta-bloqueado');
                }
            });
        },
        estado: function () {
            return fetch('php/usuario_auth.php?accion=estado', { credentials: 'same-origin', cache: 'no-store' })
                .then(function (r) { return r.json().catch(function () { return null; }); })
                .catch(function () { return null; });
        },
        exigirSesion: function () {
            return window.SitrainaAvisos.estado()
                .then(function (json) {
                    if (json && json.ok && json.ingresado) return true;
                    if (!json || !json.ok) {
                        window.SitrainaAvisos.sesion();
                        return false;
                    }
                    window.SitrainaAvisos.sesion();
                    return false;
                });
        },
        cerrar: function () { cerrar(false); }
    };

    function formularioDe(nombre) {
        if (nombre === 'afiliacion') return document.getElementById('form-afiliacion');
        if (nombre === 'contacto') return document.getElementById('formulario-contacto-pagina');
        if (nombre === 'cita') return document.getElementById('reserva-cita');
        return null;
    }

    function cuentaLista(json) {
        return !!(json && json.ok && json.ingresado);
    }

    function yaEsAfiliado(json) {
        return !!(json && json.ok && json.ingresado && json.afiliado);
    }

    function marcarAfiliacionCerrada() {
        var form = formularioDe('afiliacion');
        if (form) form.classList.add('formulario-ya-afiliado');
        window.SitrainaAvisos.marcarFormulario('afiliacion', true);
    }

    function soltarAfiliacion() {
        var form = formularioDe('afiliacion');
        if (form) form.classList.remove('formulario-ya-afiliado');
        window.SitrainaAvisos.marcarFormulario('afiliacion', false);
    }

    document.addEventListener('submit', function (ev) {
        var form = ev.target;
        if (form && form.classList && (form.classList.contains('formulario-sin-cuenta') || form.classList.contains('formulario-ya-afiliado'))) {
            ev.preventDefault();
            ev.stopPropagation();
        }
    }, true);

    window.addEventListener('hashchange', function () {
        var nombre = vistaActual();
        if (nombre === 'ingresar' || nombre === 'registro') return;
        var guardado = '';
        try { guardado = sessionStorage.getItem(claveVolver) || ''; } catch (e) {}
        if (nombre === guardado) return;
        try { sessionStorage.removeItem(claveVolver); } catch (e) {}
    });

    document.addEventListener('sitraina-vista', function (ev) {
        var nombre = ev && ev.detail;
        if (nombre !== 'afiliacion' && nombre !== 'contacto' && nombre !== 'cita') {
            if (nombre !== 'ingresar' && nombre !== 'registro' && (tipoActual === 'sesion' || tipoActual === 'afiliado')) {
                cerrar(false);
            }
            return;
        }
        window.SitrainaAvisos.estado().then(function (json) {
            if (nombre === 'afiliacion' && yaEsAfiliado(json)) {
                marcarAfiliacionCerrada();
                window.SitrainaAvisos.yaAfiliado();
                return;
            }
            if (nombre === 'afiliacion') soltarAfiliacion();
            if (cuentaLista(json)) {
                if (nombre !== 'afiliacion') window.SitrainaAvisos.marcarFormulario(nombre, false);
                if (tipoActual === 'sesion' || tipoActual === 'afiliado') cerrar(false);
                return;
            }
            window.SitrainaAvisos.marcarFormulario(nombre, true);
            window.SitrainaAvisos.sesion();
        });
    });

    document.addEventListener('DOMContentLoaded', function () {
        var cuerpo = document.body;
        if (!cuerpo) return;
        var tipo = cuerpo.getAttribute('data-sit-aviso');
        if (!tipo || !window.SitrainaAvisos[tipo]) return;
        window.SitrainaAvisos[tipo](
            cuerpo.getAttribute('data-sit-titulo') || '',
            cuerpo.getAttribute('data-sit-texto') || ''
        );
    });
})();
