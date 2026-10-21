/* Guía del panel admin: botón fijo, popups animados y flechas entre pasos. */
(function () {
    if (document.getElementById('guia-admin')) return;

    var pasos = [
        {
            titulo: 'Bienvenido al panel',
            texto: 'Desde aquí configurás la agenda pública: meses, días hábiles, horas y citas. Esta guía te muestra cada parte en pocos pasos.',
            icono: '1'
        },
        {
            titulo: 'Agregar fecha y hora',
            texto: 'El botón «Agregar fecha y hora» abre un asistente. Primero elegís el mes, después el tipo de fecha, luego el día y la hora si aplica.',
            icono: '2'
        },
        {
            titulo: 'Hábil, ocupada o no hábil',
            texto: 'Antes del día elegís el estado: Hábil (se puede agendar), Ocupada (ya la tiene alguien) o No hábil (ese día no se ofrece).',
            icono: '3'
        },
        {
            titulo: 'Ver fechas guardadas',
            texto: 'Con «Ver fechas guardadas» revisás lo de la base. En Citas reservadas solo comentás turnos ya pedidos (no creás citas nuevas) y podés eliminarlas.',
            icono: '4'
        },
        {
            titulo: 'Responder por correo',
            texto: 'Al abrir una cita reservada ves el correo de la persona. Escribí la respuesta y usá «Enviar respuesta»: sale desde sitraina@ina.ac.cr a ese correo.',
            icono: '5'
        },
        {
            titulo: 'Resumen del panel',
            texto: 'Abajo ves casillas con meses, días y horarios. Tocá una casilla para abrirla, ver la información o eliminarla.',
            icono: '6'
        },
        {
            titulo: 'Tono claro u oscuro',
            texto: 'El botón de sol o luna (arriba a la derecha) cambia el tono. Usa la misma preferencia que el sitio público.',
            icono: '7'
        },
        {
            titulo: 'Sitrabot Admin',
            texto: 'Abajo a la derecha está Sitrabot Admin. Respondé preguntas fijas sobre bases de datos, el panel, el diseño e InfinityFree.',
            icono: '8'
        },
        {
            titulo: 'Listo para usar',
            texto: 'Cuando termines, cerrá sesión con el enlace del final. Podés volver a abrir esta guía cuando quieras con el botón «Ayuda».',
            icono: '✓'
        }
    ];

    var indice = 0;
    var abierto = false;

    var raiz = document.createElement('div');
    raiz.id = 'guia-admin';
    raiz.innerHTML = [
        '<button type="button" class="guia-boton" id="guia-abrir" aria-expanded="false" aria-controls="guia-overlay" title="Guía del panel">',
        '  <span class="guia-boton-anillo" aria-hidden="true"></span>',
        '  <span class="guia-boton-icono" aria-hidden="true">?</span>',
        '  <span class="guia-boton-texto">Ayuda</span>',
        '</button>',
        '<div class="guia-overlay" id="guia-overlay" hidden>',
        '  <div class="guia-fondo" data-guia-cerrar="1" aria-hidden="true"></div>',
        '  <div class="guia-ventana" role="dialog" aria-modal="true" aria-labelledby="guia-titulo">',
        '    <button type="button" class="guia-cerrar" id="guia-cerrar" aria-label="Cerrar guía">×</button>',
        '    <p class="guia-progreso" id="guia-progreso" aria-live="polite"></p>',
        '    <div class="guia-icono-paso" id="guia-icono" aria-hidden="true"></div>',
        '    <h2 class="guia-titulo" id="guia-titulo"></h2>',
        '    <p class="guia-texto" id="guia-texto"></p>',
        '    <div class="guia-puntos" id="guia-puntos" role="tablist" aria-label="Pasos de la guía"></div>',
        '    <div class="guia-acciones">',
        '      <button type="button" class="guia-flecha guia-flecha-izq" id="guia-atras" aria-label="Paso anterior">',
        '        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 6l-6 6 6 6" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
        '        <span>Anterior</span>',
        '      </button>',
        '      <button type="button" class="guia-omitir" id="guia-omitir">Omitir</button>',
        '      <button type="button" class="guia-flecha guia-flecha-der" id="guia-siguiente" aria-label="Paso siguiente">',
        '        <span id="guia-siguiente-texto">Siguiente</span>',
        '        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
        '      </button>',
        '    </div>',
        '  </div>',
        '</div>'
    ].join('');
    document.body.appendChild(raiz);

    var botonAbrir = document.getElementById('guia-abrir');
    var overlay = document.getElementById('guia-overlay');
    var botonCerrar = document.getElementById('guia-cerrar');
    var botonAtras = document.getElementById('guia-atras');
    var botonSiguiente = document.getElementById('guia-siguiente');
    var botonOmitir = document.getElementById('guia-omitir');
    var textoSiguiente = document.getElementById('guia-siguiente-texto');
    var titulo = document.getElementById('guia-titulo');
    var texto = document.getElementById('guia-texto');
    var progreso = document.getElementById('guia-progreso');
    var icono = document.getElementById('guia-icono');
    var puntos = document.getElementById('guia-puntos');
    var ventana = raiz.querySelector('.guia-ventana');

    function marcarVista() {
        try { localStorage.setItem('admin-guia-vista', '1'); } catch (e) {}
    }

    function pintarPuntos() {
        puntos.innerHTML = '';
        pasos.forEach(function (_, i) {
            var punto = document.createElement('button');
            punto.type = 'button';
            punto.className = 'guia-punto' + (i === indice ? ' activo' : '');
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
            ventana.classList.remove('guia-entra-der', 'guia-entra-izq');
            void ventana.offsetWidth;
            ventana.classList.add(direccion === 'izq' ? 'guia-entra-izq' : 'guia-entra-der');
        }
        if (progreso) progreso.textContent = 'Paso ' + (indice + 1) + ' de ' + pasos.length;
        if (icono) icono.textContent = paso.icono;
        if (titulo) titulo.textContent = paso.titulo;
        if (texto) texto.textContent = paso.texto;
        if (botonAtras) botonAtras.disabled = indice === 0;
        if (textoSiguiente) textoSiguiente.textContent = indice === pasos.length - 1 ? 'Finalizar' : 'Siguiente';
        if (botonOmitir) botonOmitir.hidden = indice === pasos.length - 1;
        pintarPuntos();
    }

    function abrirGuia() {
        if (abierto) return;
        abierto = true;
        indice = 0;
        botonAbrir.classList.add('guia-boton-activo');
        botonAbrir.setAttribute('aria-expanded', 'true');
        overlay.hidden = false;
        document.body.classList.add('guia-abierta');
        requestAnimationFrame(function () {
            overlay.classList.add('guia-visible');
            botonAbrir.classList.add('guia-boton-click');
            window.setTimeout(function () {
                botonAbrir.classList.remove('guia-boton-click');
            }, 480);
        });
        mostrarPaso(0, 'der');
        marcarVista();
        if (botonSiguiente && botonSiguiente.focus) botonSiguiente.focus();
    }

    function cerrarGuia() {
        if (!abierto) return;
        abierto = false;
        overlay.classList.remove('guia-visible');
        botonAbrir.classList.remove('guia-boton-activo');
        botonAbrir.setAttribute('aria-expanded', 'false');
        document.body.classList.remove('guia-abierta');
        window.setTimeout(function () {
            overlay.hidden = true;
        }, 320);
        if (botonAbrir.focus) botonAbrir.focus();
    }

    botonAbrir.addEventListener('click', function () {
        if (abierto) cerrarGuia();
        else abrirGuia();
    });
    botonCerrar.addEventListener('click', cerrarGuia);
    botonOmitir.addEventListener('click', cerrarGuia);
    overlay.addEventListener('click', function (evento) {
        if (evento.target && evento.target.getAttribute('data-guia-cerrar') === '1') cerrarGuia();
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

    /* Primera visita al panel: pulso suave en el botón de ayuda. */
    try {
        if (localStorage.getItem('admin-guia-vista') !== '1') {
            botonAbrir.classList.add('guia-boton-nuevo');
        }
    } catch (e) {}
})();
