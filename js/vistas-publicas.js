/* Navegación entre secciones públicas, misma receta que el panel (salida 0,34 s / entrada 0,48 s). */
(function () {
    var nodos = document.querySelectorAll('[data-vista-publica]');
    if (!nodos.length) return;

    var vistas = {};
    nodos.forEach(function (el) {
        vistas[el.getAttribute('data-vista-publica')] = el;
    });

    var alias = { identidad: 'conocenos' };
    var navDe = {
        inicio: 'inicio',
        conocenos: 'conocenos',
        afiliacion: 'afiliacion',
        asesoria: 'asesoria',
        cita: 'asesoria',
        documentos: 'documentos',
        legales: 'documentos',
        informes: 'documentos',
        actas: 'documentos',
        efemerides: 'documentos',
        hoja: 'documentos',
        convenios: 'documentos',
        contacto: 'contacto',
        ingresar: 'inicio',
        registro: 'inicio',
        cuenta: 'inicio'
    };
    var guias = { afiliacion: 1, cita: 1, contacto: 1 };

    var vistaActiva = null;
    var cambiandoVista = false;
    var timerVista = null;
    var anclaPendiente = null;

    function preferirMenosMovimiento() {
        try {
            return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        } catch (e) {
            return false;
        }
    }

    function nombreDeHash() {
        var bruto = (location.hash || '').replace('#', '');
        if (!bruto) return 'inicio';
        if (alias[bruto]) {
            anclaPendiente = bruto;
            return alias[bruto];
        }
        return vistas[bruto] ? bruto : 'inicio';
    }

    function limpiarClases(el) {
        if (!el) return;
        el.classList.remove('vista-publica-saliendo', 'vista-publica-entrando', 'vista-publica-visible');
    }

    function cerrarMenuMovil() {
        var menu = document.getElementById('menu-principal');
        var btn = document.getElementById('btn-menu');
        if (!menu || !btn) return;
        menu.classList.remove('active');
        btn.textContent = '☰';
        btn.setAttribute('aria-expanded', 'false');
        btn.setAttribute('aria-label', 'Abrir menú');
    }

    function pausarMedia(raiz) {
        if (!raiz) return;
        raiz.querySelectorAll('video, audio').forEach(function (m) {
            try { m.pause(); } catch (e) {}
        });
    }

    var subDocumentos = {
        legales: 1,
        informes: 1,
        actas: 1,
        efemerides: 1,
        hoja: 1,
        convenios: 1
    };

    function sincronizarLogoAtras(nombre) {
        var atrasDocs = !!subDocumentos[nombre];
        document.body.classList.toggle('con-atras-docs', atrasDocs);
        var logo = document.getElementById('logo-sitio');
        if (!logo) return;
        if (atrasDocs) {
            logo.setAttribute('href', '#documentos');
            logo.setAttribute('data-public-nav', 'documentos');
            logo.setAttribute('aria-label', 'Volver a documentos');
            logo.setAttribute('title', 'Volver a documentos');
        } else {
            logo.setAttribute('href', '#inicio');
            logo.setAttribute('data-public-nav', 'inicio');
            logo.setAttribute('aria-label', 'SITRAINA, ir al inicio');
            logo.removeAttribute('title');
        }
    }

    function aplicarChrome(nombre) {
        var navClave = navDe[nombre] || 'inicio';
        document.querySelectorAll('.navbar [data-public-nav]').forEach(function (enlace) {
            enlace.classList.toggle('active', enlace.getAttribute('data-public-nav') === navClave);
        });
        document.body.classList.toggle('pagina-inicio', nombre === 'inicio');
        sincronizarLogoAtras(nombre);
        if (guias[nombre]) document.body.setAttribute('data-guia-activa', nombre);
        else document.body.removeAttribute('data-guia-activa');
        var hash = anclaPendiente || nombre;
        anclaPendiente = null;
        if (location.hash.replace('#', '') !== hash) {
            try {
                history.replaceState(null, '', location.pathname + location.search + '#' + hash);
            } catch (e) {}
        }
        cerrarMenuMovil();
        if (nombre === 'inicio') {
            window.dispatchEvent(new Event('resize'));
        }
        if (nombre === 'cita' && typeof window.sitrainaRefrescarCita === 'function') {
            window.sitrainaRefrescarCita();
        }
        if (hash === 'identidad') {
            var destino = document.getElementById('identidad');
            if (destino) {
                window.setTimeout(function () {
                    destino.scrollIntoView({ behavior: preferirMenosMovimiento() ? 'auto' : 'smooth', block: 'start' });
                }, 80);
                return;
            }
        }
        window.scrollTo({ top: 0, behavior: preferirMenosMovimiento() ? 'auto' : 'smooth' });
    }

    function mostrarVista(nombre, animar) {
        if (alias[nombre]) {
            anclaPendiente = nombre;
            nombre = alias[nombre];
        }
        if (!vistas[nombre]) nombre = 'inicio';
        if (cambiandoVista) return;
        if (nombre === vistaActiva) {
            aplicarChrome(nombre);
            return;
        }

        var anterior = vistaActiva ? vistas[vistaActiva] : null;
        var siguiente = vistas[nombre];
        if (!siguiente) return;
        var sinMotion = !animar || preferirMenosMovimiento();

        if (timerVista) {
            window.clearTimeout(timerVista);
            timerVista = null;
        }

        Object.keys(vistas).forEach(function (clave) {
            if (clave === vistaActiva || clave === nombre) return;
            vistas[clave].hidden = true;
            vistas[clave].setAttribute('aria-hidden', 'true');
            limpiarClases(vistas[clave]);
        });

        var mostrarSiguiente = function () {
            vistaActiva = nombre;
            if (anterior) {
                pausarMedia(anterior);
                anterior.hidden = true;
                anterior.setAttribute('aria-hidden', 'true');
                limpiarClases(anterior);
            }
            limpiarClases(siguiente);
            if (sinMotion) {
                siguiente.hidden = false;
                siguiente.setAttribute('aria-hidden', 'false');
                siguiente.classList.add('vista-publica-visible');
                cambiandoVista = false;
                aplicarChrome(nombre);
                return;
            }
            siguiente.classList.add('vista-publica-entrando');
            siguiente.hidden = false;
            siguiente.setAttribute('aria-hidden', 'false');
            void siguiente.offsetWidth;
            requestAnimationFrame(function () {
                requestAnimationFrame(function () {
                    siguiente.classList.remove('vista-publica-entrando');
                    siguiente.classList.add('vista-publica-visible');
                });
            });
            aplicarChrome(nombre);
            timerVista = window.setTimeout(function () {
                cambiandoVista = false;
                timerVista = null;
            }, 500);
        };

        cambiandoVista = true;
        if (!anterior || anterior.hidden || sinMotion) {
            mostrarSiguiente();
            return;
        }
        anterior.classList.remove('vista-publica-entrando', 'vista-publica-visible');
        anterior.classList.add('vista-publica-saliendo');
        timerVista = window.setTimeout(mostrarSiguiente, 320);
    }

    window.mostrarVistaPublica = function (nombre) {
        mostrarVista(nombre, true);
    };

    function destinoDesdeEnlace(enlace) {
        if (!enlace) return '';
        var dato = enlace.getAttribute('data-public-nav');
        if (dato) return dato;
        var href = enlace.getAttribute('href') || '';
        if (href.charAt(0) === '#') return href.slice(1);
        return '';
    }

    document.addEventListener('click', function (evento) {
        if (evento.metaKey || evento.ctrlKey || evento.shiftKey || evento.altKey || evento.button !== 0) return;
        var enlace = evento.target.closest('[data-public-nav], a[href^="#"]');
        if (!enlace || enlace.target === '_blank') return;
        var destino = destinoDesdeEnlace(enlace);
        if (!destino) return;
        if (!vistas[destino] && !alias[destino]) return;
        evento.preventDefault();
        var actual = (location.hash || '').replace('#', '');
        if (actual === destino) {
            mostrarVista(destino, true);
            document.dispatchEvent(new CustomEvent('sitraina-vista', { detail: destino }));
            return;
        }
        location.hash = destino;
    }, true);

    window.addEventListener('hashchange', function () {
        mostrarVista(nombreDeHash(), true);
    });

    mostrarVista(nombreDeHash(), false);
})();
