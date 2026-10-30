/* Botón de tono del panel admin + modo daltónico (tuerca / Opciones). */
(function () {
    var boton = document.getElementById('toggle-oscuro');

    var aplicarOscuro = function (activo) {
        document.documentElement.classList.toggle('dark-mode', activo);
        document.body.classList.toggle('dark-mode', activo);
    };

    var preferirMenosMovimiento = function () {
        return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    };

    var hojaDaltonicoAdmin = function () {
        var href = 'daltonico-admin.css?v=1.26';
        try {
            var scripts = document.getElementsByTagName('script');
            for (var i = 0; i < scripts.length; i++) {
                var src = scripts[i].src || '';
                if (src.indexOf('tono.js') !== -1) {
                    href = src.replace(/tono\.js.*$/, 'daltonico-admin.css?v=1.26');
                    break;
                }
            }
        } catch (e) {}
        return href;
    };

    var daltonicoAnimTimer = null;
    var daltonicoCssListo = false;

    var precargarDaltonicoCss = function () {
        if (document.getElementById('daltonico-css') || document.getElementById('daltonico-preload')) {
            daltonicoCssListo = !!document.getElementById('daltonico-css');
            return;
        }
        var pre = document.createElement('link');
        pre.id = 'daltonico-preload';
        pre.rel = 'preload';
        pre.as = 'style';
        pre.href = hojaDaltonicoAdmin();
        pre.onload = function () { daltonicoCssListo = true; };
        pre.onerror = function () { daltonicoCssListo = true; };
        document.head.appendChild(pre);
    };

    var asegurarHojaDaltonico = function () {
        var link = document.getElementById('daltonico-css');
        if (link) {
            document.head.appendChild(link);
            daltonicoCssListo = true;
            return link;
        }
        var pre = document.getElementById('daltonico-preload');
        link = document.createElement('link');
        link.id = 'daltonico-css';
        link.rel = 'stylesheet';
        link.media = 'print';
        link.href = (pre && pre.href) || hojaDaltonicoAdmin();
        link.onload = function () {
            link.media = 'all';
            daltonicoCssListo = true;
        };
        link.onerror = function () {
            link.media = 'all';
            daltonicoCssListo = true;
        };
        document.head.appendChild(link);
        if (link.sheet) {
            link.media = 'all';
            daltonicoCssListo = true;
        } else {
            setTimeout(function () {
                if (link && link.getAttribute('media') === 'print') link.media = 'all';
                daltonicoCssListo = true;
            }, 60);
        }
        return link;
    };

    var aplicarDaltonico = function (activo, conAnimacion) {
        var animar = conAnimacion !== false && !preferirMenosMovimiento();
        var finalizar = function () {
            clearTimeout(daltonicoAnimTimer);
            daltonicoAnimTimer = setTimeout(function () {
                document.documentElement.classList.remove('tema-animando');
            }, 520);
        };

        if (animar) {
            document.documentElement.classList.add('tema-animando');
            void document.documentElement.offsetWidth;
        }

        if (activo) {
            asegurarHojaDaltonico();
            document.documentElement.classList.add('daltonico');
            document.body.classList.add('daltonico');
        } else {
            document.documentElement.classList.remove('daltonico');
            document.body.classList.remove('daltonico');
            var linkOff = document.getElementById('daltonico-css');
            if (linkOff) linkOff.remove();
        }

        if (animar) finalizar();
    };

    precargarDaltonicoCss();

    if (localStorage.getItem('modoOscuro') === 'true') {
        aplicarOscuro(true);
    } else if (document.documentElement.classList.contains('dark-mode')) {
        document.body.classList.add('dark-mode');
    }

    if (localStorage.getItem('modoDaltonico') === 'true') {
        aplicarDaltonico(true, false);
    } else if (document.documentElement.classList.contains('daltonico')) {
        document.body.classList.add('daltonico');
        asegurarHojaDaltonico();
    }

    var actualizarTono = function () {
        if (!boton) return;
        var esDark = document.body.classList.contains('dark-mode');
        var etiqueta = esDark ? 'Activar tono claro' : 'Activar tono oscuro';
        boton.title = etiqueta;
        boton.setAttribute('aria-label', etiqueta);
    };

    var temaAnimTimer = null;

    var cambiarTono = function () {
        aplicarOscuro(!document.body.classList.contains('dark-mode'));
        localStorage.setItem('modoOscuro', document.body.classList.contains('dark-mode'));
        actualizarTono();
    };

    if (boton) {
        actualizarTono();
        boton.addEventListener('click', function () {
            if (preferirMenosMovimiento()) {
                cambiarTono();
                return;
            }
            document.documentElement.classList.add('tema-animando');
            void document.documentElement.offsetWidth;
            cambiarTono();
            clearTimeout(temaAnimTimer);
            temaAnimTimer = setTimeout(function () {
                document.documentElement.classList.remove('tema-animando');
            }, 480);
        });
    }

    var pintarEstadoDaltonico = function (btn) {
        if (!btn) return;
        var on = document.documentElement.classList.contains('daltonico');
        btn.classList.toggle('activo', on);
        btn.setAttribute('aria-pressed', on ? 'true' : 'false');
        var estado = btn.querySelector('.admin-opciones-item-estado, .nav-opciones-item-estado');
        if (estado) estado.textContent = on ? 'On' : 'Off';
    };

    var cablearToggleDaltonico = function (btn) {
        if (!btn || btn.getAttribute('data-daltonico-ok') === '1') return;
        btn.setAttribute('data-daltonico-ok', '1');
        pintarEstadoDaltonico(btn);
        btn.addEventListener('click', function (ev) {
            if (ev) {
                ev.preventDefault();
                ev.stopPropagation();
            }
            var on = !document.documentElement.classList.contains('daltonico');
            localStorage.setItem('modoDaltonico', on ? 'true' : 'false');
            aplicarDaltonico(on, true);
            pintarEstadoDaltonico(btn);
            document.querySelectorAll('#toggle-daltonico, #admin-opcion-daltonico').forEach(function (otro) {
                if (otro !== btn) pintarEstadoDaltonico(otro);
            });
        });
    };

    /* Panel: ítem dentro de Opciones. */
    cablearToggleDaltonico(document.getElementById('admin-opcion-daltonico'));

    /* Login u otras vistas sin menú Opciones: tuerca junto al tono. */
    if (!document.getElementById('admin-opciones') && boton && boton.parentElement) {
        var wrap = document.createElement('div');
        wrap.className = 'admin-nav-opciones';
        wrap.id = 'admin-nav-opciones';
        wrap.innerHTML =
            '<button type="button" class="nav-opciones-btn" id="admin-nav-opciones-btn" aria-expanded="false" title="Opciones" aria-label="Abrir opciones">' +
            '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4z" fill="none" stroke="currentColor" stroke-width="2"/><path d="M19.4 13a7.7 7.7 0 0 0 .05-2l2.05-1.6-2-3.46-2.45.98a7.9 7.9 0 0 0-1.73-1L14.9 2h-5.8L8.68 4.92a7.9 7.9 0 0 0-1.73 1L4.5 4.94l-2 3.46L4.55 11a7.7 7.7 0 0 0 0 2l-2.05 1.6 2 3.46 2.45-.98a7.9 7.9 0 0 0 1.73 1L9.1 22h5.8l.42-2.92a7.9 7.9 0 0 0 1.73-1l2.45.98 2-3.46L19.4 13z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>' +
            '</button>' +
            '<div class="nav-opciones-menu" role="menu">' +
            '<button type="button" class="admin-opciones-item" id="toggle-daltonico" role="menuitem" aria-pressed="false">' +
            '<span class="admin-opciones-item-icono" aria-hidden="true">◐</span>' +
            '<span>Modo daltónico</span>' +
            '<span class="admin-opciones-item-estado">Off</span>' +
            '</button></div>';
        boton.parentElement.appendChild(wrap);
        var btnGear = document.getElementById('admin-nav-opciones-btn');
        if (btnGear) {
            btnGear.addEventListener('click', function (ev) {
                ev.preventDefault();
                ev.stopPropagation();
                precargarDaltonicoCss();
                wrap.classList.toggle('abierto');
                btnGear.setAttribute('aria-expanded', wrap.classList.contains('abierto') ? 'true' : 'false');
            });
            document.addEventListener('click', function (ev) {
                if (!wrap.contains(ev.target)) {
                    wrap.classList.remove('abierto');
                    btnGear.setAttribute('aria-expanded', 'false');
                }
            });
        }
        cablearToggleDaltonico(document.getElementById('toggle-daltonico'));
    }
})();
