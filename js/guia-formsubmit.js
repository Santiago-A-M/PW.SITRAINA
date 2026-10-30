/* Guía de envío reutilizable: Opciones, cita, afiliación o contacto. */
(function () {
    if (document.getElementById('guia-formsubmit')) return;

    var tipoForzado = '';
    var origenFoco = null;
    var tipo = 'ayuda';
    var configs = {
        ayuda: {
            storageKey: 'ayuda-envio-vista',
            botonTitulo: 'Cómo llega tu solicitud',
            botonTexto: 'Cómo llega tu solicitud',
            omitir: false,
            pasos: [
                {
                    titulo: '¿Qué ocurre cuando envías una solicitud?',
                    texto: 'Cuando completás un formulario del sitio y lo enviás, SITRAINA recibe tu solicitud. Puede ser un mensaje de contacto, una cita o consulta de asesoría, o una petición de afiliación.',
                    icono: '1'
                },
                {
                    titulo: '¿Qué sucede con tus datos?',
                    texto: 'Tu solicitud queda en el panel. La respuesta llega a Mis mensajes si ya iniciaste sesión y el formulario incluye el correo de esa cuenta. El sindicato no recibe un correo automático en sitraina@ina.ac.cr.',
                    icono: '2'
                },
                {
                    titulo: '¿Quién revisa la solicitud?',
                    texto: 'Las personas administradoras de SITRAINA revisan lo que enviaste y deciden la respuesta que corresponde.',
                    icono: '3'
                },
                {
                    titulo: '¿Cómo recibirás una respuesta?',
                    texto: 'Primero iniciá sesión. Después enviá la solicitud con el correo de esa cuenta. La respuesta de administración aparece en Opciones → Mis mensajes. Si no había sesión, la respuesta queda solo en el panel.',
                    icono: '4'
                },
                {
                    titulo: 'Recomendaciones',
                    texto: 'Usá información correcta y un correo que revisés. Antes de enviar, comprobá los datos y guardá lo que te ayude a identificar la solicitud. La respuesta depende de la revisión de los administradores. Podés cerrar esta ayuda cuando quieras.',
                    icono: '✓'
                }
            ]
        },
        cita: {
            storageKey: 'cita-guia-correo-vista',
            botonTitulo: 'Guía del correo',
            botonTexto: 'Guía correo',
            omitir: true,
            pasos: [
                {
                    titulo: 'Cómo te llega el correo',
                    texto: 'Tu solicitud de cita queda en el panel de SITRAINA. La respuesta llega a Mis mensajes si ya iniciaste sesión y el formulario lleva el correo de esa cuenta.',
                    icono: '✉'
                },
                {
                    titulo: 'Usá un correo que revisés',
                    texto: 'Iniciá sesión y, en el formulario, poné el correo de esa cuenta. Así la respuesta de administración vuelve a Mis mensajes.',
                    icono: '1'
                },
                {
                    titulo: 'Al enviar tu solicitud',
                    texto: 'Tus datos llegan a SITRAINA. En esta misma página verás la confirmación; no hace falta quedarte en otra web.',
                    icono: '2'
                },
                {
                    titulo: 'Cómo se ve el remitente',
                    texto: 'La respuesta aparece en Mis mensajes, no como un correo automático.',
                    icono: '3'
                },
                {
                    titulo: 'Revisá spam',
                    texto: 'A veces el correo cae en spam. Si no lo ves en la bandeja principal, buscá “SITRAINA”, “cita” o sitraina@ina.ac.cr.',
                    icono: '4'
                },
                {
                    titulo: 'Cuando te respondan',
                    texto: 'Abrí Opciones → Mis mensajes. Ahí ves la decisión (aceptada, rechazada o información) y el texto de administración.',
                    icono: '5'
                },
                {
                    titulo: 'Tip final',
                    texto: 'Marcá el mensaje como “no es spam” o agregalo a favoritos para que las próximas respuestas lleguen directo a la bandeja de entrada. Podés volver a abrir esta guía cuando quieras.',
                    icono: '✓'
                }
            ]
        },
        afiliacion: {
            storageKey: 'afiliacion-guia-correo-vista',
            botonTitulo: 'Guía del correo',
            botonTexto: 'Guía correo',
            omitir: true,
            pasos: [
                {
                    titulo: 'Cómo llega tu boleta',
                    texto: 'Tu boleta queda en el panel. La respuesta llega a Mis mensajes si ya iniciaste sesión y el correo INA o el personal es el de esa cuenta.',
                    icono: '✉'
                },
                {
                    titulo: 'Correos del formulario',
                    texto: 'Completá correo INA y/o personal. Si ya iniciaste sesión y uno de esos correos es el de tu cuenta, la respuesta llega a Mis mensajes.',
                    icono: '1'
                },
                {
                    titulo: 'Al enviar la boleta',
                    texto: 'La página te muestra la confirmación y tu boleta queda en el panel.',
                    icono: '2'
                },
                {
                    titulo: 'Remitente de la respuesta',
                    texto: 'Cuando te acepten, rechacen o escriban, el correo vendrá de sitraina@ina.ac.cr.',
                    icono: '3'
                },
                {
                    titulo: 'Revisá spam',
                    texto: 'Si no ves el mensaje, mirá spam o promociones y buscá “SITRAINA” o sitraina@ina.ac.cr.',
                    icono: '4'
                },
                {
                    titulo: 'Tip final',
                    texto: 'Guardá sitraina@ina.ac.cr en contactos para que las próximas respuestas lleguen a la bandeja principal. Podés reabrir esta guía cuando quieras.',
                    icono: '✓'
                }
            ]
        },
        contacto: {
            storageKey: 'contacto-guia-correo-vista',
            botonTitulo: 'Guía del correo',
            botonTexto: 'Guía correo',
            omitir: true,
            pasos: [
                {
                    titulo: 'Cómo llega tu mensaje',
                    texto: 'Tu consulta queda en el panel. La respuesta llega a Mis mensajes si ya iniciaste sesión y el formulario usa el correo de esa cuenta.',
                    icono: '✉'
                },
                {
                    titulo: 'Poné un correo válido',
                    texto: 'Iniciá sesión antes de enviar y usá el correo de esa cuenta si querés ver la respuesta en Mis mensajes.',
                    icono: '1'
                },
                {
                    titulo: 'Al enviar',
                    texto: 'Verás la confirmación en la página. Tu mensaje queda en el panel.',
                    icono: '2'
                },
                {
                    titulo: 'Cuando te respondan',
                    texto: 'La respuesta queda en Mis mensajes si enviaste el formulario con la cuenta ya iniciada y con el correo de esa cuenta.',
                    icono: '3'
                },
                {
                    titulo: 'Revisá spam',
                    texto: 'Si no aparece, buscá en spam “SITRAINA” o sitraina@ina.ac.cr.',
                    icono: '4'
                },
                {
                    titulo: 'Tip final',
                    texto: 'Marcá el correo como confiable. Podés volver a abrir esta guía cuando quieras.',
                    icono: '✓'
                }
            ]
        }
    };

    var cfg = configs.ayuda;
    var pasos = cfg.pasos;
    var indice = 0;
    var abierto = false;

    var raiz = document.createElement('div');
    raiz.id = 'guia-formsubmit';
    raiz.className = 'guia-cita';
    raiz.innerHTML = [
        '<button type="button" class="guia-cita-boton" id="guia-fs-abrir" hidden aria-expanded="false" aria-controls="guia-fs-overlay" title="' + cfg.botonTitulo + '">',
        '  <span class="guia-cita-anillo" aria-hidden="true"></span>',
        '  <span class="guia-cita-icono" aria-hidden="true">✉</span>',
        '  <span class="guia-cita-texto">' + cfg.botonTexto + '</span>',
        '</button>',
        '<div class="guia-cita-overlay" id="guia-fs-overlay" hidden>',
        '  <div class="guia-cita-fondo" data-guia-fs-cerrar="1" aria-hidden="true"></div>',
        '  <div class="guia-cita-ventana" role="dialog" aria-modal="true" aria-labelledby="guia-fs-titulo">',
        '    <button type="button" class="guia-cita-cerrar" id="guia-fs-cerrar" aria-label="Cerrar ayuda">×</button>',
        '    <div class="guia-cita-contenido" id="guia-fs-contenido">',
        '      <div class="guia-cita-icono-paso" id="guia-fs-icono" aria-hidden="true"></div>',
        '      <h2 class="guia-cita-titulo" id="guia-fs-titulo"></h2>',
        '      <p class="guia-cita-cuerpo" id="guia-fs-cuerpo"></p>',
        '    </div>',
        '    <p class="guia-cita-progreso" id="guia-fs-progreso" aria-live="polite"></p>',
        '    <div class="guia-cita-puntos" id="guia-fs-puntos" role="tablist" aria-label="Pasos de la guía"></div>',
        '    <div class="guia-cita-acciones">',
        '      <button type="button" class="guia-cita-flecha guia-cita-flecha-izq" id="guia-fs-atras" aria-label="Paso anterior">',
        '        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 6l-6 6 6 6" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
        '        <span>Anterior</span>',
        '      </button>',
        '      <button type="button" class="guia-cita-omitir" id="guia-fs-omitir">Omitir</button>',
        '      <button type="button" class="guia-cita-flecha guia-cita-flecha-der" id="guia-fs-siguiente" aria-label="Paso siguiente">',
        '        <span id="guia-fs-siguiente-texto">Siguiente</span>',
        '        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
        '      </button>',
        '    </div>',
        '  </div>',
        '</div>'
    ].join('');
    document.body.appendChild(raiz);

    var botonAbrir = document.getElementById('guia-fs-abrir');
    var overlay = document.getElementById('guia-fs-overlay');
    var botonCerrar = document.getElementById('guia-fs-cerrar');
    var botonAtras = document.getElementById('guia-fs-atras');
    var botonSiguiente = document.getElementById('guia-fs-siguiente');
    var botonOmitir = document.getElementById('guia-fs-omitir');
    var textoSiguiente = document.getElementById('guia-fs-siguiente-texto');
    var titulo = document.getElementById('guia-fs-titulo');
    var cuerpo = document.getElementById('guia-fs-cuerpo');
    var progreso = document.getElementById('guia-fs-progreso');
    var icono = document.getElementById('guia-fs-icono');
    var puntos = document.getElementById('guia-fs-puntos');
    var contenido = document.getElementById('guia-fs-contenido');
    var ventana = raiz.querySelector('.guia-cita-ventana');

    function controlesFoco() {
        if (!ventana) return [];
        return Array.prototype.slice.call(ventana.querySelectorAll(
            'button:not([hidden]):not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )).filter(function (el) {
            return el.offsetParent !== null || el === botonCerrar;
        });
    }

    function aplicarTipoGuia(tipoPedido) {
        if (tipoPedido && configs[tipoPedido]) {
            tipoForzado = tipoPedido;
        }
        if (tipoForzado && configs[tipoForzado]) {
            tipo = tipoForzado;
        } else {
            tipo = (document.body.getAttribute('data-guia-activa') || document.body.getAttribute('data-guia-formsubmit') || 'ayuda').toLowerCase();
        }
        cfg = configs[tipo] || configs.ayuda;
        pasos = cfg.pasos;
        if (botonAbrir) {
            botonAbrir.setAttribute('title', cfg.botonTitulo);
            var textoBtn = botonAbrir.querySelector('.guia-cita-texto');
            if (textoBtn) textoBtn.textContent = cfg.botonTexto;
        }
        if (botonOmitir) {
            botonOmitir.hidden = !cfg.omitir;
        }
    }

    function marcarVista() {
        try { localStorage.setItem(cfg.storageKey, '1'); } catch (e) {}
    }

    function pintarPuntos() {
        puntos.innerHTML = '';
        pasos.forEach(function (_, i) {
            var punto = document.createElement('button');
            punto.type = 'button';
            punto.className = 'guia-cita-punto' + (i === indice ? ' activo' : '');
            punto.setAttribute('aria-label', 'Ir al paso ' + (i + 1));
            if (i === indice) punto.setAttribute('aria-current', 'step');
            else punto.removeAttribute('aria-current');
            punto.addEventListener('click', function () {
                mostrarPaso(i, i > indice ? 'der' : 'izq');
            });
            puntos.appendChild(punto);
        });
    }

    function mostrarPaso(nuevo, direccion) {
        indice = Math.max(0, Math.min(pasos.length - 1, nuevo));
        var paso = pasos[indice];
        var ultimo = indice === pasos.length - 1;
        if (contenido) {
            contenido.classList.remove('guia-cita-entra-der', 'guia-cita-entra-izq');
            void contenido.offsetWidth;
            contenido.classList.add(direccion === 'izq' ? 'guia-cita-entra-izq' : 'guia-cita-entra-der');
        }
        if (progreso) progreso.textContent = (indice + 1) + ' / ' + pasos.length;
        if (icono) icono.textContent = paso.icono;
        if (titulo) titulo.textContent = paso.titulo;
        if (cuerpo) cuerpo.textContent = paso.texto;
        if (botonAtras) {
            botonAtras.hidden = indice === 0;
            botonAtras.disabled = indice === 0;
        }
        if (textoSiguiente) textoSiguiente.textContent = ultimo ? 'Finalizar' : 'Siguiente';
        if (botonSiguiente) {
            botonSiguiente.setAttribute('aria-label', ultimo ? 'Finalizar ayuda' : 'Paso siguiente');
        }
        if (botonOmitir) {
            botonOmitir.hidden = !cfg.omitir || ultimo;
        }
        pintarPuntos();
    }

    function abrirGuia(tipoPedido, origen) {
        if (abierto) return;
        origenFoco = origen && origen.focus ? origen : document.activeElement;
        aplicarTipoGuia(tipoPedido);
        abierto = true;
        indice = 0;
        botonAbrir.classList.add('guia-cita-activo');
        botonAbrir.setAttribute('aria-expanded', 'true');
        overlay.hidden = false;
        document.body.classList.add('guia-cita-abierta');
        requestAnimationFrame(function () {
            overlay.classList.add('guia-cita-visible');
        });
        mostrarPaso(0, 'der');
        marcarVista();
        if (botonSiguiente && botonSiguiente.focus) botonSiguiente.focus();
    }

    function cerrarGuia() {
        if (!abierto) return;
        abierto = false;
        overlay.classList.remove('guia-cita-visible');
        botonAbrir.classList.remove('guia-cita-activo');
        botonAbrir.setAttribute('aria-expanded', 'false');
        document.body.classList.remove('guia-cita-abierta');
        tipoForzado = '';
        window.setTimeout(function () {
            overlay.hidden = true;
        }, 320);
        var destino = origenFoco;
        origenFoco = null;
        if (destino && destino.focus && document.contains(destino)) {
            destino.focus();
        }
    }

    window.abrirGuiaFormSubmit = abrirGuia;

    botonAbrir.addEventListener('click', function () {
        if (abierto) cerrarGuia();
        else abrirGuia();
    });
    var inlineGuia = document.getElementById('cita-guia-abrir-inline');
    if (inlineGuia) {
        inlineGuia.addEventListener('click', function () {
            if (abierto) cerrarGuia();
            else abrirGuia('cita', inlineGuia);
        });
    }
    botonCerrar.addEventListener('click', cerrarGuia);
    botonOmitir.addEventListener('click', cerrarGuia);
    overlay.addEventListener('click', function (evento) {
        if (evento.target && evento.target.getAttribute('data-guia-fs-cerrar') === '1') cerrarGuia();
    });
    botonAtras.addEventListener('click', function () {
        if (indice > 0) mostrarPaso(indice - 1, 'izq');
    });
    botonSiguiente.addEventListener('click', function () {
        if (indice >= pasos.length - 1) {
            cerrarGuia();
            return;
        }
        mostrarPaso(indice + 1, 'der');
    });
    document.addEventListener('keydown', function (evento) {
        if (!abierto) return;
        if (evento.key === 'Escape') {
            evento.preventDefault();
            cerrarGuia();
            return;
        }
        if (evento.key === 'Tab') {
            var lista = controlesFoco();
            if (!lista.length) return;
            var primero = lista[0];
            var ultimoEl = lista[lista.length - 1];
            if (evento.shiftKey && document.activeElement === primero) {
                evento.preventDefault();
                ultimoEl.focus();
            } else if (!evento.shiftKey && document.activeElement === ultimoEl) {
                evento.preventDefault();
                primero.focus();
            }
            return;
        }
        if (evento.key === 'ArrowRight') {
            evento.preventDefault();
            if (indice >= pasos.length - 1) cerrarGuia();
            else mostrarPaso(indice + 1, 'der');
        }
        if (evento.key === 'ArrowLeft') {
            evento.preventDefault();
            if (indice > 0) mostrarPaso(indice - 1, 'izq');
        }
    });
})();
