/* Popups de resultado para formularios públicos y del panel. */
(function () {
    if (window.SitrainaAvisos) return;

    var raiz = null;
    var alCerrar = null;
    var firma = '';
    var tipoActual = '';
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
        if (!raiz || raiz.hidden) {
            soltar(resultado);
            return;
        }
        raiz.hidden = true;
        firma = '';
        tipoActual = '';
        document.body.classList.remove('sit-aviso-abierto');
        soltar(resultado);
    }

    function irVista(nombre) {
        var actual = (location.hash || '').replace('#', '');
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
        tituloNodo.textContent = titulo || '';
        textoNodo.textContent = texto || '';
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
                cerrar(false);
                irVista('ingresar');
            }));
            acciones.appendChild(boton('Crear una cuenta', 'sit-aviso-btn sit-aviso-btn-sec', function () {
                cerrar(false);
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
        sesion: function () {
            abrir(
                'sesion',
                'Inicia sesión para continuar.',
                'Para enviar solicitudes, consultas o utilizar nuestros formularios, necesitas tener una cuenta e iniciar sesión. Esto nos permite identificarte y gestionar tus solicitudes correctamente.'
            );
        },
        exigirSesion: function () {
            return fetch('php/usuario_auth.php?accion=estado', { credentials: 'same-origin', cache: 'no-store' })
                .then(function (r) { return r.json().catch(function () { return null; }); })
                .then(function (json) {
                    if (json && json.ok && json.ingresado) return true;
                    window.SitrainaAvisos.sesion();
                    return false;
                })
                .catch(function () {
                    window.SitrainaAvisos.error('No se pudo comprobar la sesión', 'Volvé a intentarlo en un momento. La solicitud no se envió.');
                    return false;
                });
        },
        cerrar: function () { cerrar(false); }
    };

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
