/* Guía FormSubmit en solicitar cita: botón fijo y popups con flechas. */
(function () {
    if (document.getElementById('guia-cita')) return;

    var pasos = [
        {
            titulo: 'Cómo te llega el correo',
            texto: 'Tu solicitud de cita llega a SITRAINA por FormSubmit. La respuesta de administración te la escribe sitraina@ina.ac.cr al correo que pusiste en el formulario.',
            icono: '✉'
        },
        {
            titulo: 'Usá un correo que revisés',
            texto: 'En el formulario poné el mismo correo al que querés que te escriban. Ahí llegará la respuesta de administración sobre tu cita.',
            icono: '1'
        },
        {
            titulo: 'Al enviar tu solicitud',
            texto: 'FormSubmit lleva tus datos a SITRAINA. En esta misma página verás la confirmación; no hace falta quedarte en otra web.',
            icono: '2'
        },
        {
            titulo: 'Cómo se ve el remitente',
            texto: 'La confirmación de envío puede mencionar FormSubmit. Cuando administración te responda, el remitente debería ser sitraina@ina.ac.cr y el asunto hablará de tu cita.',
            icono: '3'
        },
        {
            titulo: 'Revisá spam',
            texto: 'A veces el primer correo cae en spam. Si no lo ves en la bandeja principal, buscá “SITRAINA”, “cita” o sitraina@ina.ac.cr.',
            icono: '4'
        },
        {
            titulo: 'Cuando te respondan',
            texto: 'Administración te escribe desde sitraina@ina.ac.cr a ese mismo correo. El mensaje trae la fecha y hora de tu cita y el texto de la respuesta.'
            icono: '5'
        },
        {
            titulo: 'Tip final',
            texto: 'Marcá el mensaje como “no es spam” o agregalo a favoritos para que las próximas respuestas lleguen directo a la bandeja de entrada. Podés volver a abrir esta guía cuando quieras.',
            icono: '✓'
        }
    ];

    var indice = 0;
    var abierto = false;

    var raiz = document.createElement('div');
    raiz.id = 'guia-cita';
    raiz.innerHTML = [
        '<button type="button" class="guia-cita-boton" id="guia-cita-abrir" aria-expanded="false" aria-controls="guia-cita-overlay" title="Guía del correo FormSubmit">',
        '  <span class="guia-cita-anillo" aria-hidden="true"></span>',
        '  <span class="guia-cita-icono" aria-hidden="true">✉</span>',
        '  <span class="guia-cita-texto">Guía correo</span>',
        '</button>',
        '<div class="guia-cita-overlay" id="guia-cita-overlay" hidden>',
        '  <div class="guia-cita-fondo" data-guia-cita-cerrar="1" aria-hidden="true"></div>',
        '  <div class="guia-cita-ventana" role="dialog" aria-modal="true" aria-labelledby="guia-cita-titulo">',
        '    <button type="button" class="guia-cita-cerrar" id="guia-cita-cerrar" aria-label="Cerrar guía">×</button>',
        '    <p class="guia-cita-progreso" id="guia-cita-progreso" aria-live="polite"></p>',
        '    <div class="guia-cita-icono-paso" id="guia-cita-icono" aria-hidden="true"></div>',
        '    <h2 class="guia-cita-titulo" id="guia-cita-titulo"></h2>',
        '    <p class="guia-cita-cuerpo" id="guia-cita-cuerpo"></p>',
        '    <div class="guia-cita-puntos" id="guia-cita-puntos" role="tablist" aria-label="Pasos de la guía"></div>',
        '    <div class="guia-cita-acciones">',
        '      <button type="button" class="guia-cita-flecha guia-cita-flecha-izq" id="guia-cita-atras" aria-label="Paso anterior">',
        '        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 6l-6 6 6 6" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
        '        <span>Anterior</span>',
        '      </button>',
        '      <button type="button" class="guia-cita-omitir" id="guia-cita-omitir">Omitir</button>',
        '      <button type="button" class="guia-cita-flecha guia-cita-flecha-der" id="guia-cita-siguiente" aria-label="Paso siguiente">',
        '        <span id="guia-cita-siguiente-texto">Siguiente</span>',
        '        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
        '      </button>',
        '    </div>',
        '  </div>',
        '</div>'
    ].join('');
    document.body.appendChild(raiz);

    var botonAbrir = document.getElementById('guia-cita-abrir');
    var overlay = document.getElementById('guia-cita-overlay');
    var botonCerrar = document.getElementById('guia-cita-cerrar');
    var botonAtras = document.getElementById('guia-cita-atras');
    var botonSiguiente = document.getElementById('guia-cita-siguiente');
    var botonOmitir = document.getElementById('guia-cita-omitir');
    var textoSiguiente = document.getElementById('guia-cita-siguiente-texto');
    var titulo = document.getElementById('guia-cita-titulo');
    var cuerpo = document.getElementById('guia-cita-cuerpo');
    var progreso = document.getElementById('guia-cita-progreso');
    var icono = document.getElementById('guia-cita-icono');
    var puntos = document.getElementById('guia-cita-puntos');
    var ventana = raiz.querySelector('.guia-cita-ventana');

    function marcarVista() {
        try { localStorage.setItem('cita-guia-correo-vista', '1'); } catch (e) {}
    }

    function pintarPuntos() {
        puntos.innerHTML = '';
        pasos.forEach(function (_, i) {
            var punto = document.createElement('button');
            punto.type = 'button';
            punto.className = 'guia-cita-punto' + (i === indice ? ' activo' : '');
            punto.setAttribute('aria-label', 'Ir al paso ' + (i + 1));
            punto.setAttribute('aria-current', i === indice ? 'step' : 'false');
            punto.addEventListener('click', function () {
                mostrarPaso(i, i > indice ? 'der' : 'izq');
            });
            puntos.appendChild(punto);
        });
    }

    function mostrarPaso(nuevo, direccion) {
        indice = Math.max(0, Math.min(pasos.length - 1, nuevo));
        var paso = pasos[indice];
        if (ventana) {
            ventana.classList.remove('guia-cita-entra-der', 'guia-cita-entra-izq');
            void ventana.offsetWidth;
            ventana.classList.add(direccion === 'izq' ? 'guia-cita-entra-izq' : 'guia-cita-entra-der');
        }
        if (progreso) progreso.textContent = 'Paso ' + (indice + 1) + ' de ' + pasos.length;
        if (icono) icono.textContent = paso.icono;
        if (titulo) titulo.textContent = paso.titulo;
        if (cuerpo) cuerpo.textContent = paso.texto;
        if (botonAtras) botonAtras.disabled = indice === 0;
        if (textoSiguiente) textoSiguiente.textContent = indice === pasos.length - 1 ? 'Finalizar' : 'Siguiente';
        if (botonOmitir) botonOmitir.hidden = indice === pasos.length - 1;
        pintarPuntos();
    }

    function abrirGuia() {
        if (abierto) return;
        abierto = true;
        indice = 0;
        botonAbrir.classList.add('guia-cita-activo');
        botonAbrir.setAttribute('aria-expanded', 'true');
        overlay.hidden = false;
        document.body.classList.add('guia-cita-abierta');
        requestAnimationFrame(function () {
            overlay.classList.add('guia-cita-visible');
            botonAbrir.classList.add('guia-cita-click');
            window.setTimeout(function () {
                botonAbrir.classList.remove('guia-cita-click');
            }, 480);
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
        window.setTimeout(function () {
            overlay.hidden = true;
        }, 320);
        if (botonAbrir.focus) botonAbrir.focus();
    }

    window.abrirGuiaCorreoCita = abrirGuia;

    botonAbrir.addEventListener('click', function () {
        if (abierto) cerrarGuia();
        else abrirGuia();
    });
    botonCerrar.addEventListener('click', cerrarGuia);
    botonOmitir.addEventListener('click', cerrarGuia);
    overlay.addEventListener('click', function (evento) {
        if (evento.target && evento.target.getAttribute('data-guia-cita-cerrar') === '1') cerrarGuia();
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
            cerrarGuia();
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

    var inline = document.getElementById('cita-guia-abrir-inline');
    if (inline) {
        inline.addEventListener('click', abrirGuia);
    }

    try {
        if (localStorage.getItem('cita-guia-correo-vista') !== '1') {
            botonAbrir.classList.add('guia-cita-nuevo');
        }
    } catch (e) {}
})();
