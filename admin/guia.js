/* Guía del panel admin: se abre desde Opciones del navbar. */
(function () {
    if (document.getElementById('guia-admin')) return;

    var pasos = [
        {
            titulo: 'Bienvenido al panel',
            texto: 'Arriba tenes el menu: Inicio, Afiliaciones, Afiliados, Citas con Asesoria, Horario y Contacto. Inicio es el resumen; Horario solo define dias y horas para citas con asesoria.',
            icono: '1'
        },
        {
            titulo: 'Afiliaciones, citas y contacto',
            texto: 'En Afiliaciones ves boletas (Consulta_Afiliacion). En Afiliados registrás o eliminás la cédula, el nombre y el correo. En Citas y Contacto respondés consultas. Abrí una casilla, elegí Aceptar, Rechazar o Respuesta neutral y enviá.',
            icono: '2'
        },
        {
            titulo: 'Seccion Horario',
            texto: 'En Horario configura unicamente la disponibilidad de citas con asesoria. «Agregar fecha y hora» abre el asistente: mes, tipo de fecha, dia y hora si aplica.',
            icono: '3'
        },
        {
            titulo: 'Hábil, ocupada o no hábil',
            texto: 'Antes del día elegís el estado: Hábil (se puede agendar), Ocupada (ya la tiene alguien) o No hábil (ese día no se ofrece). Solo afecta Solicitar cita.',
            icono: '4'
        },
        {
            titulo: 'Ver fechas guardadas',
            texto: 'Con «Ver fechas guardadas» revisás los horarios de asesoria. Para aceptar o rechazar una cita pedida usa la seccion Citas con Asesoria.',
            icono: '5'
        },
        {
            titulo: 'Casillas del horario',
            texto: 'En fechas guardadas ves casillas con meses, dias y horarios. Tocala para abrirla, ver la informacion o eliminarla.',
            icono: '6'
        },
        {
            titulo: 'Tono claro u oscuro',
            texto: 'El botón de sol o luna (arriba a la derecha) cambia el tono. Usa la misma preferencia que el sitio público.',
            icono: '7'
        },
        {
            titulo: 'Sitrabot Admin',
            texto: 'Abajo a la derecha está Sitrabot Admin. Explica el panel con palabras sencillas: consultas, afiliados, advertencias, horario y el tono de la página.',
            icono: '8'
        },
        {
            titulo: 'Listo para usar',
            texto: 'Cuando termines, abrí Opciones arriba a la derecha y elegí Cerrar sesión. Podés volver a abrir esta guía desde Opciones → Ayuda.',
            icono: '✓'
        }
    ];

    var indice = 0;
    var abierto = false;

    var raiz = document.createElement('div');
    raiz.id = 'guia-admin';
    raiz.innerHTML = [
        '<button type="button" class="guia-boton" id="guia-abrir" aria-expanded="false" aria-controls="guia-overlay" title="Guía del panel" hidden tabindex="-1">',
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

    var cajaOpciones = document.getElementById('admin-opciones');
    var btnOpciones = document.getElementById('admin-opciones-btn');
    var menuOpciones = document.getElementById('admin-opciones-menu');
    var btnAyudaNav = document.getElementById('admin-opcion-ayuda');

    function marcarVista() {
        try { localStorage.setItem('admin-guia-vista', '1'); } catch (e) {}
        if (btnOpciones) btnOpciones.classList.remove('guia-boton-nuevo');
    }

    function cerrarMenuMovilAlAbrirOpciones() {
        var nav = document.getElementById('admin-navbar');
        var toggle = document.getElementById('admin-menu-toggle');
        if (nav) nav.classList.remove('activo');
        if (toggle) {
            toggle.classList.remove('abierto');
            toggle.setAttribute('aria-expanded', 'false');
        }
    }

    function cerrarMenuOpciones() {
        if (!cajaOpciones || !btnOpciones || !menuOpciones) return;
        cajaOpciones.classList.remove('abierto');
        btnOpciones.setAttribute('aria-expanded', 'false');
        menuOpciones.hidden = true;
    }

    function abrirMenuOpciones() {
        if (!cajaOpciones || !btnOpciones || !menuOpciones) return;
        cerrarMenuMovilAlAbrirOpciones();
        cajaOpciones.classList.add('abierto');
        btnOpciones.setAttribute('aria-expanded', 'true');
        menuOpciones.hidden = false;
    }

    function toggleMenuOpciones() {
        if (!menuOpciones) return;
        if (menuOpciones.hidden) abrirMenuOpciones();
        else cerrarMenuOpciones();
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
        cerrarMenuOpciones();
        if (botonAbrir) {
            botonAbrir.classList.add('guia-boton-activo');
            botonAbrir.setAttribute('aria-expanded', 'true');
        }
        overlay.hidden = false;
        document.body.classList.add('guia-abierta');
        requestAnimationFrame(function () {
            overlay.classList.add('guia-visible');
        });
        mostrarPaso(0, 'der');
        marcarVista();
        if (botonSiguiente && botonSiguiente.focus) botonSiguiente.focus();
    }

    function cerrarGuia() {
        if (!abierto) return;
        abierto = false;
        overlay.classList.remove('guia-visible');
        if (botonAbrir) {
            botonAbrir.classList.remove('guia-boton-activo');
            botonAbrir.setAttribute('aria-expanded', 'false');
        }
        document.body.classList.remove('guia-abierta');
        window.setTimeout(function () {
            overlay.hidden = true;
        }, 320);
        if (btnOpciones && btnOpciones.focus) btnOpciones.focus();
    }

    if (btnOpciones) {
        btnOpciones.addEventListener('click', function (evento) {
            evento.stopPropagation();
            toggleMenuOpciones();
        });
    }
    if (btnAyudaNav) {
        btnAyudaNav.addEventListener('click', function () {
            abrirGuia();
        });
    }
    document.addEventListener('click', function (evento) {
        if (!cajaOpciones || !cajaOpciones.classList.contains('abierto')) return;
        if (cajaOpciones.contains(evento.target)) return;
        cerrarMenuOpciones();
    });
    document.addEventListener('keydown', function (evento) {
        if (evento.key === 'Escape' && cajaOpciones && cajaOpciones.classList.contains('abierto') && !abierto) {
            cerrarMenuOpciones();
            if (btnOpciones && btnOpciones.focus) btnOpciones.focus();
        }
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

    try {
        if (localStorage.getItem('admin-guia-vista') !== '1' && btnOpciones) {
            btnOpciones.classList.add('guia-boton-nuevo');
        }
    } catch (e) {}

    window.abrirGuiaAdmin = abrirGuia;
})();
