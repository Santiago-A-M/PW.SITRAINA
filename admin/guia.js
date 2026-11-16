/* Guía del panel admin: se abre desde Opciones del navbar. */
(function () {
    if (document.getElementById('guia-admin')) return;

    var pasos = [
        {
            titulo: 'El menú',
            texto: 'Arriba están Inicio, Afiliaciones, Afiliados, Citas con Asesoría y Contacto. Elegí la sección en la que querés trabajar. En el teléfono, las tres rayas abren ese mismo menú.',
            icono: '1'
        },
        {
            titulo: 'Inicio',
            texto: 'En Inicio ves lo que está pendiente y lo que llegó hace poco. El aviso de arriba indica lo que todavía espera respuesta. En la papelera revisás las solicitudes que no se aceptaron y, si lo decidís, las quitás para siempre.',
            icono: '2'
        },
        {
            titulo: 'Cómo responder',
            texto: 'En Afiliaciones, Citas con Asesoría o Contacto, abrí cada solicitud. Elegí Aceptar, Rechazar o Sin decisión, escribí el mensaje con respeto y envialo. Si la persona ya había entrado con ese correo, la respuesta le llega a Mis mensajes.',
            icono: '3'
        },
        {
            titulo: 'Personas afiliadas',
            texto: 'En Afiliados anotás la cédula, el nombre y el correo de quien puede pedir cita. Esos tres datos tienen que ser los mismos que la persona escribe. Para quitar a alguien, abrí su tarjeta y elegí Quitar para siempre.',
            icono: '4'
        },
        {
            titulo: 'Días y horas',
            texto: 'En Citas con Asesoría, Agregar fecha y hora es para excepciones. Los martes y jueves de los próximos 15 días cambian solos. Acá podés cerrar uno de esos días si el abogado no va, abrir un día que no sea martes o jueves, o indicar hasta qué hora atiende. Esa hora es el cierre de ese día y no mueve los 15 días.',
            icono: '5'
        },
        {
            titulo: 'Las citas',
            texto: 'En Citas con Asesoría, la lista muestra las citas que pidieron las personas, con el nombre, el día y la hora. Abrí una para responder. Si no la aceptás, esa hora queda libre.',
            icono: '6'
        },
        {
            titulo: 'Tono, ayuda y salida',
            texto: 'El sol o la luna cambia entre claro y oscuro. En Opciones está el modo daltónico, que usa azul en lugar de rojo. Abajo a la derecha, Sitrabot responde dudas sobre estas secciones. Esta guía se vuelve a abrir en Opciones, en Ayuda. Para salir, elegí Cerrar sesión.',
            icono: '✓'
        }
    ];

    var indice = 0;
    var abierto = false;

    var raiz = document.createElement('div');
    raiz.id = 'guia-admin';
    raiz.innerHTML = [
        '<button type="button" class="guia-boton" id="guia-abrir" aria-expanded="false" aria-controls="guia-overlay" title="Guía de ayuda" hidden tabindex="-1">',
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
