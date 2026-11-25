/* Comportamiento de las páginas públicas: menú, tono, documentos, Junta, efemérides y cita. */
document.addEventListener('DOMContentLoaded', () => {

    /* Sube la página de inmediato, sin el desplazamiento suave del sitio. */
    const subirPagina = (valor) => {
        const raiz = document.documentElement;
        raiz.style.scrollBehavior = 'auto';
        window.scrollTo(0, valor || 0);
    };
    
    // --- 1. MENÚ HAMBURGUESA ---
    const btnMenu = document.getElementById('btn-menu');
    const menuPrincipal = document.getElementById('menu-principal');

    if (btnMenu && menuPrincipal) {
        /* Abre o cierra el menú del celular y cambia el botón entre ☰ y X. */
        var pintarMenu = function (abierto) {
            menuPrincipal.classList.toggle('active', abierto);
            btnMenu.textContent = abierto ? '✕' : '☰';
            btnMenu.setAttribute('aria-expanded', abierto ? 'true' : 'false');
            btnMenu.setAttribute('aria-label', abierto ? 'Cerrar menú' : 'Abrir menú');
        };
        btnMenu.setAttribute('aria-controls', 'menu-principal');
        pintarMenu(false);
        btnMenu.onclick = function (e) {
            e.preventDefault();
            pintarMenu(!menuPrincipal.classList.contains('active'));
        };
    }

    // --- 2. TONO CLARO / OSCURO + ACCESIBILIDAD ---
    const toggleDark = document.getElementById("toggle-oscuro");

    /* Activa o quita el tono oscuro en toda la página. */
    const aplicarOscuro = (activo) => {
        document.documentElement.classList.toggle("dark-mode", activo);
        document.body.classList.toggle("dark-mode", activo);
    };

    const hojaDaltonico = () => {
        var href = "css/daltonico.css?v=1.45";
        try {
            var links = document.getElementsByTagName("link");
            for (var i = 0; i < links.length; i++) {
                var h = links[i].getAttribute("href") || "";
                if (h.indexOf("estilo.css") !== -1) {
                    href = h.replace(/estilo\.css.*/, "daltonico.css?v=1.45");
                    break;
                }
            }
        } catch (e) {}
        return href;
    };

    let daltonicoAnimTimer = null;
    let daltonicoCssListo = false;
    const preferirMenosMovimientoDal = () =>
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    /* Precarga la hoja para que el primer clic no quede bloqueado por la descarga. */
    const precargarDaltonicoCss = () => {
        if (document.getElementById("daltonico-css") || document.getElementById("daltonico-preload")) {
            daltonicoCssListo = !!document.getElementById("daltonico-css");
            return;
        }
        var pre = document.createElement("link");
        pre.id = "daltonico-preload";
        pre.rel = "preload";
        pre.as = "style";
        pre.href = hojaDaltonico();
        pre.onload = function () { daltonicoCssListo = true; };
        pre.onerror = function () { daltonicoCssListo = true; };
        document.head.appendChild(pre);
    };

    const asegurarHojaDaltonico = () => {
        var link = document.getElementById("daltonico-css");
        if (link) {
            document.head.appendChild(link);
            daltonicoCssListo = true;
            return link;
        }
        var pre = document.getElementById("daltonico-preload");
        link = document.createElement("link");
        link.id = "daltonico-css";
        link.rel = "stylesheet";
        /* media=print evita el bloqueo de pintado; al cargar pasa a all. */
        link.media = "print";
        link.href = (pre && pre.href) || hojaDaltonico();
        link.onload = function () {
            link.media = "all";
            daltonicoCssListo = true;
        };
        link.onerror = function () {
            link.media = "all";
            daltonicoCssListo = true;
        };
        document.head.appendChild(link);
        /* Si ya está en caché, algunos navegadores no disparan onload a tiempo. */
        if (link.sheet) {
            link.media = "all";
            daltonicoCssListo = true;
        } else {
            setTimeout(function () {
                if (link && link.getAttribute("media") === "print") link.media = "all";
                daltonicoCssListo = true;
            }, 60);
        }
        return link;
    };

    const aplicarDaltonico = (activo, conAnimacion) => {
        var animar = conAnimacion !== false && !preferirMenosMovimientoDal();
        var finalizar = function () {
            clearTimeout(daltonicoAnimTimer);
            daltonicoAnimTimer = setTimeout(function () {
                document.documentElement.classList.remove("tema-animando");
            }, 520);
        };

        if (animar) {
            document.documentElement.classList.add("tema-animando");
            void document.documentElement.offsetWidth;
        }

        if (activo) {
            asegurarHojaDaltonico();
            document.documentElement.classList.add("daltonico");
            document.body.classList.add("daltonico");
        } else {
            document.documentElement.classList.remove("daltonico");
            document.body.classList.remove("daltonico");
            var linkOff = document.getElementById("daltonico-css");
            if (linkOff) linkOff.remove();
        }

        if (animar) finalizar();
    };

    precargarDaltonicoCss();

    if (localStorage.getItem("modoOscuro") === "true") {
        aplicarOscuro(true);
    }
    if (localStorage.getItem("modoDaltonico") === "true") {
        aplicarDaltonico(true, false);
    }

    /* Menú tuerca: opción de colores para daltonismo. */
    (function montarOpcionesAccesibilidad() {
        var acciones = document.querySelector(".acciones-header");
        if (!acciones || document.getElementById("nav-opciones")) return;

        var caja = document.createElement("div");
        caja.className = "nav-opciones";
        caja.id = "nav-opciones";
        caja.innerHTML =
            '<button type="button" class="nav-opciones-btn" id="nav-opciones-btn" aria-expanded="false" aria-haspopup="true" aria-controls="nav-opciones-menu" title="Opciones" aria-label="Abrir opciones">' +
            '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4z" fill="none" stroke="currentColor" stroke-width="2"/><path d="M19.4 13a7.7 7.7 0 0 0 .05-2l2.05-1.6-2-3.46-2.45.98a7.9 7.9 0 0 0-1.73-1L14.9 2h-5.8L8.68 4.92a7.9 7.9 0 0 0-1.73 1L4.5 4.94l-2 3.46L4.55 11a7.7 7.7 0 0 0 0 2l-2.05 1.6 2 3.46 2.45-.98a7.9 7.9 0 0 0 1.73 1L9.1 22h5.8l.42-2.92a7.9 7.9 0 0 0 1.73-1l2.45.98 2-3.46L19.4 13z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>' +
            "</button>" +
            '<div class="nav-opciones-menu" id="nav-opciones-menu" role="menu" hidden>' +
            '<button type="button" class="nav-opciones-item" id="toggle-daltonico" role="menuitem" aria-pressed="false">' +
            '<span class="nav-opciones-item-icono" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12z" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="2.6" fill="none" stroke="currentColor" stroke-width="2"/></svg></span>' +
            "<span>Modo daltónico</span>" +
            '<span class="nav-opciones-item-estado" id="daltonico-estado">Off</span>' +
            "</button>" +
            '<button type="button" class="nav-opciones-item" id="opcion-ayuda-envio" role="menuitem" aria-haspopup="dialog" aria-controls="guia-fs-overlay">' +
            '<span class="nav-opciones-item-icono" aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><path d="M9.2 9.3a2.8 2.8 0 1 1 4.4 2.3c-.8.4-1.6 1-1.6 2V15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M12 17.6h.01" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></svg></span>' +
            "<span>Ayuda</span>" +
            "</button>" +
            '<a class="nav-opciones-item" id="opcion-ingresar" role="menuitem" href="#ingresar">' +
            '<span class="nav-opciones-item-icono" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4M10 16l4-4-4-4M3 12h11" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></span>' +
            "<span>Ingresar</span></a>" +
            '<a class="nav-opciones-item" id="opcion-registro" role="menuitem" href="#registro">' +
            '<span class="nav-opciones-item-icono" aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="3" fill="none" stroke="currentColor" stroke-width="2"/><path d="M3.5 19c.5-3 2.6-4.5 5.5-4.5s5 1.5 5.5 4.5M19 8v6M16 11h6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></span>' +
            "<span>Crear cuenta</span></a>" +
            '<a class="nav-opciones-item" id="opcion-citas" role="menuitem" href="#mis-citas" hidden>' +
            '<span class="nav-opciones-item-icono" aria-hidden="true"><svg viewBox="0 0 24 24"><rect x="4" y="5" width="16" height="15" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M8 3.5V7M16 3.5V7M4 10h16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></span>' +
            "<span>Citas</span></a>" +
            '<a class="nav-opciones-item" id="opcion-mensajes" role="menuitem" href="#cuenta" hidden>' +
            '<span class="nav-opciones-item-icono" aria-hidden="true"><svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M3 7l9 7 9-7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></span>' +
            "<span>Mis mensajes</span></a>" +
            '<button type="button" class="nav-opciones-item" id="opcion-salir" role="menuitem" hidden>' +
            '<span class="nav-opciones-item-icono" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M10 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4M15 16l4-4-4-4M9 12h10" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></span>' +
            "<span>Cerrar sesión</span></button></div>";
        acciones.appendChild(caja);

        var btn = document.getElementById("nav-opciones-btn");
        var menu = document.getElementById("nav-opciones-menu");
        var toggleDal = document.getElementById("toggle-daltonico");
        var estadoDal = document.getElementById("daltonico-estado");
        var ayudaEnvio = document.getElementById("opcion-ayuda-envio");

        var pintarDaltonico = function () {
            var on = document.documentElement.classList.contains("daltonico");
            if (toggleDal) {
                toggleDal.classList.toggle("activo", on);
                toggleDal.setAttribute("aria-pressed", on ? "true" : "false");
            }
            if (estadoDal) estadoDal.textContent = on ? "On" : "Off";
        };

        var cerrar = function () {
            caja.classList.remove("abierto");
            if (btn) btn.setAttribute("aria-expanded", "false");
            if (menu) menu.hidden = true;
        };

        var abrir = function () {
            precargarDaltonicoCss();
            caja.classList.add("abierto");
            if (btn) btn.setAttribute("aria-expanded", "true");
            if (menu) menu.hidden = false;
        };

        pintarDaltonico();
        if (btn) {
            btn.addEventListener("click", function (ev) {
                ev.preventDefault();
                ev.stopPropagation();
                if (menu && menu.hidden) abrir();
                else cerrar();
            });
        }
        if (toggleDal) {
            toggleDal.addEventListener("click", function (ev) {
                ev.preventDefault();
                ev.stopPropagation();
                var on = !document.documentElement.classList.contains("daltonico");
                localStorage.setItem("modoDaltonico", on ? "true" : "false");
                aplicarDaltonico(on, true);
                pintarDaltonico();
            });
        }
        if (ayudaEnvio) {
            ayudaEnvio.addEventListener("click", function (ev) {
                ev.preventDefault();
                ev.stopPropagation();
                cerrar();
                if (typeof window.abrirGuiaFormSubmit === "function") {
                    window.abrirGuiaFormSubmit("ayuda", ayudaEnvio);
                }
            });
        }
        caja.addEventListener("click", function (ev) {
            if (ev.target.closest("a.nav-opciones-item")) cerrar();
        });
        document.addEventListener("click", function (ev) {
            if (!caja.contains(ev.target)) cerrar();
        });
        document.addEventListener("keydown", function (ev) {
            if (ev.key === "Escape") cerrar();
        });
    })();

    if (toggleDark) {
        /* Cambia la etiqueta del botón de sol o luna según el tono actual. */
        const actualizarTono = () => {
            const esDark = document.body.classList.contains("dark-mode");
            const etiqueta = esDark ? "Activar tono claro" : "Activar tono oscuro";
            toggleDark.title = etiqueta;
            toggleDark.setAttribute("aria-label", etiqueta);
        };

        let temaAnimTimer = null;
        const preferirMenosMovimiento = () =>
            window.matchMedia("(prefers-reduced-motion: reduce)").matches;

        /* Aplica el tono y guarda la preferencia. */
        const cambiarTono = () => {
            aplicarOscuro(!document.body.classList.contains("dark-mode"));
            localStorage.setItem("modoOscuro", document.body.classList.contains("dark-mode"));
            actualizarTono();
        };

        actualizarTono();
        toggleDark.onclick = () => {
            if (preferirMenosMovimiento()) {
                cambiarTono();
                return;
            }
            /* El fundido de página no debe capturar el botón: el sol y la luna siguen su propio giro. */
            document.documentElement.classList.add("tema-animando");
            /* Fuerza un marco de estilo antes del cambio para que todos animen a la vez. */
            void document.documentElement.offsetWidth;
            cambiarTono();
            clearTimeout(temaAnimTimer);
            temaAnimTimer = setTimeout(() => {
                document.documentElement.classList.remove("tema-animando");
            }, 480);
        };
    }

    // --- 3. TIPOS DE DOCUMENTO ---
    const tiposDocumentos = document.querySelector('.tipos-documentos');
    const seccionesArchivos = document.querySelectorAll('.seccion-archivos');

    if (tiposDocumentos && seccionesArchivos.length && !document.querySelector('[data-vista-publica]')) {
        /* En Documentos, abre la sección del enlace (#legales, #informes o #actas). */
        const panelDocumentos = document.querySelector('.documentos-panel');
        const menosMovimiento = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        /* Separa el botón fijo del bloque que se desliza, para que no cambie de sitio. */
        const cuerpoDe = (seccion) => {
            let cuerpo = seccion.querySelector(':scope > .seccion-cuerpo');
            if (cuerpo) return cuerpo;
            cuerpo = document.createElement('div');
            cuerpo.className = 'seccion-cuerpo';
            const boton = seccion.querySelector(':scope > .btn-atras');
            let nodo = boton ? boton.nextSibling : seccion.firstChild;
            while (nodo) {
                const siguiente = nodo.nextSibling;
                cuerpo.appendChild(nodo);
                nodo = siguiente;
            }
            seccion.appendChild(cuerpo);
            return cuerpo;
        };
        seccionesArchivos.forEach(cuerpoDe);
        let direccionAbierta = 'derecha';
        let animando = false;

        /* Lee hacia dónde apunta la flecha de Abrir en este momento. */
        const direccionDe = (enlace) => {
            const flecha = enlace && enlace.querySelector('.tipo-doc-abrir svg');
            if (!flecha) return 'derecha';
            const transform = getComputedStyle(flecha).transform;
            if (!transform || transform === 'none') return 'derecha';
            const numeros = transform.match(/matrix\(([^)]+)\)/);
            if (!numeros) return 'derecha';
            const partes = numeros[1].split(',');
            const ejeX = parseFloat(partes[0]);
            const ejeY = parseFloat(partes[1]);
            const angulo = Math.atan2(ejeY, ejeX) * 180 / Math.PI;
            if (angulo > 45 && angulo < 135) return 'abajo';
            if (angulo < -45 && angulo > -135) return 'arriba';
            if (Math.abs(angulo) >= 135) return 'izquierda';
            return 'derecha';
        };

        const aplicarSeccion = (esArchivo, seccion) => {
            document.body.classList.remove('documentos-animando', 'documentos-eje-x', 'documentos-eje-y');
            const capas = [panelDocumentos, tiposDocumentos];
            seccionesArchivos.forEach((item) => {
                capas.push(item);
                const cuerpo = item.querySelector(':scope > .seccion-cuerpo');
                if (cuerpo) capas.push(cuerpo);
            });
            capas.forEach((item) => {
                if (!item) return;
                item.classList.remove('doc-sale', 'doc-entra', 'doc-reverso');
                item.style.removeProperty('--doc-x');
                item.style.removeProperty('--doc-y');
                item.style.removeProperty('--doc-desde-x');
                item.style.removeProperty('--doc-desde-y');
            });
            document.documentElement.style.removeProperty('overflow-anchor');
            document.documentElement.style.removeProperty('scroll-behavior');
            document.querySelector('.pagina-documentos')?.style.removeProperty('min-height');
            document.body.classList.toggle('vista-archivos', Boolean(esArchivo));
            seccionesArchivos.forEach((item) => {
                item.classList.toggle('activa', item === seccion);
                item.style.removeProperty('top');
                item.style.removeProperty('left');
                item.style.removeProperty('width');
                item.style.removeProperty('height');
            });
        };

        /* Desliza la lista de tipos y la sección en la dirección de la flecha. */
        const deslizar = (seccion, direccion, volver) => {
            const actual = document.querySelector('.seccion-archivos.activa');
            const destino = volver ? actual : seccion;
            const pagina = panelDocumentos && panelDocumentos.closest('.pagina-documentos');
            if (!destino || !panelDocumentos || !pagina) {
                aplicarSeccion(!volver, seccion);
                return;
            }
            animando = true;
            let termino = false;
            document.documentElement.style.overflowAnchor = 'none';
            subirPagina(0);
            const scroll = 0;
            if (!volver) {
                seccionesArchivos.forEach((item) => item.classList.toggle('activa', item === seccion));
            }
            const margenLista = parseFloat(getComputedStyle(destino).marginBottom) || 0;
            const rellenoPagina = parseFloat(getComputedStyle(pagina).paddingBottom) || 0;
            document.body.classList.add('documentos-animando');
            const base = pagina.getBoundingClientRect();
            const origen = panelDocumentos.getBoundingClientRect();
            const ancho = Math.round(origen.width);
            destino.style.top = (origen.top - base.top) + 'px';
            destino.style.left = (origen.left - base.left) + 'px';
            destino.style.width = ancho + 'px';
            destino.style.height = 'auto';
            pagina.style.minHeight = Math.ceil(destino.getBoundingClientRect().bottom - base.top + margenLista + rellenoPagina) + 'px';
            subirPagina(0);
            const alto = Math.max(Math.round(origen.height), Math.round(cuerpoDe(destino).offsetHeight));
            const par = direccion === 'izquierda'
                ? ['-' + ancho + 'px', '0px']
                : direccion === 'abajo'
                    ? ['0px', alto + 'px']
                    : direccion === 'arriba'
                        ? ['0px', '-' + alto + 'px']
                        : [ancho + 'px', '0px'];
            const marcar = (item, clase) => {
                const contrario = (valor) => (valor.charAt(0) === '-' ? valor.slice(1) : '-' + valor);
                item.style.setProperty('--doc-x', par[0]);
                item.style.setProperty('--doc-y', par[1]);
                item.style.setProperty('--doc-desde-x', contrario(par[0]));
                item.style.setProperty('--doc-desde-y', contrario(par[1]));
                item.classList.add(clase);
                if (volver) item.classList.add('doc-reverso');
            };
            const capa = cuerpoDe(destino);
            marcar(panelDocumentos, 'doc-sale');
            marcar(capa, 'doc-entra');
            const fijar = () => {
                if (Math.abs(window.scrollY - scroll) > 1) subirPagina(scroll);
            };
            window.addEventListener('scroll', fijar);
            fijar();
            const fin = () => {
                if (termino) return;
                termino = true;
                animando = false;
                aplicarSeccion(!volver, volver ? null : seccion);
                fijar();
                window.requestAnimationFrame(() => {
                    fijar();
                    window.removeEventListener('scroll', fijar);
                    document.documentElement.style.removeProperty('scroll-behavior');
                });
            };
            capa.addEventListener('animationend', fin, { once: true });
            window.setTimeout(fin, 750);
        };

        const mostrarSeccion = (animar) => {
            const id = location.hash.replace('#', '');
            const seccion = id ? document.getElementById(id) : null;
            const esArchivo = Boolean(seccion && seccion.classList.contains('seccion-archivos'));
            const abierto = document.body.classList.contains('vista-archivos');
            if (animando || !animar || menosMovimiento()) {
                if (!animando) {
                    aplicarSeccion(esArchivo, esArchivo ? seccion : null);
                    subirPagina(0);
                }
                return;
            }
            if (esArchivo && !abierto) {
                const enlace = tiposDocumentos.querySelector('.tipo-doc[href="#' + id + '"]');
                direccionAbierta = direccionDe(enlace);
                deslizar(seccion, direccionAbierta, false);
                return;
            }
            if (!esArchivo && abierto) {
                deslizar(null, direccionAbierta, true);
                return;
            }
            aplicarSeccion(esArchivo, esArchivo ? seccion : null);
        };

        mostrarSeccion(false);
        window.addEventListener('hashchange', () => mostrarSeccion(true));
        document.querySelectorAll('.seccion-archivos .btn-atras').forEach((volver) => {
            volver.addEventListener('click', (evento) => {
                evento.preventDefault();
                if (animando) return;
                history.pushState(null, '', location.pathname + location.search);
                mostrarSeccion(true);
            });
        });

        /* Efemérides, Hoja y Convenios se deslizan hacia su página y luego entran. */
        const recorrido = (direccion, volver) => {
            if (direccion === 'izquierda') return volver ? ['-100vw', '0px'] : ['100vw', '0px'];
            if (direccion === 'abajo') return volver ? ['0px', '100vh'] : ['0px', '-100vh'];
            if (direccion === 'arriba') return volver ? ['0px', '-100vh'] : ['0px', '100vh'];
            return volver ? ['100vw', '0px'] : ['-100vw', '0px'];
        };
        tiposDocumentos.querySelectorAll('.tipo-doc').forEach((enlace) => {
            const href = enlace.getAttribute('href') || '';
            if (!href) return;
            if (href.charAt(0) === '#') {
                enlace.addEventListener('click', (evento) => {
                    if (evento.metaKey || evento.ctrlKey || evento.shiftKey || evento.altKey || evento.button !== 0) return;
                    evento.preventDefault();
                    if (animando) return;
                    if (location.hash !== href) history.pushState(null, '', href);
                    subirPagina(0);
                    mostrarSeccion(true);
                });
                return;
            }
            enlace.addEventListener('click', (evento) => {
                if (evento.metaKey || evento.ctrlKey || evento.shiftKey || evento.altKey || evento.button !== 0) return;
                if (menosMovimiento() || animando) return;
                evento.preventDefault();
                subirPagina(0);
                const direccion = direccionDe(enlace);
                const par = recorrido(direccion, true);
                const pagina = document.querySelector('body > main');
                if (!pagina) {
                    location.href = enlace.href;
                    return;
                }
                animando = true;
                pagina.style.setProperty('--doc-x', par[0]);
                pagina.style.setProperty('--doc-y', par[1]);
                pagina.classList.add('doc-sale');
                document.documentElement.style.overflow = 'hidden';
                let listo = false;
                const ir = () => {
                    if (listo) return;
                    listo = true;
                    try {
                        sessionStorage.setItem('sitrainaDoc', JSON.stringify({ dir: direccion, volver: false }));
                    } catch (e) {}
                    location.href = enlace.href;
                };
                pagina.addEventListener('animationend', (fin) => {
                    if (fin.animationName === 'doc-sale') ir();
                });
                window.setTimeout(ir, 750);
            });
        });
    }

    /* La página de destino entra deslizándose; el botón de volver hace el camino inverso. */
    if (document.querySelector('.pagina-documentos, .contenedor-efemerides, .contenedor-galeria, .contenedor-catalogo')) {
        try { history.scrollRestoration = 'manual'; } catch (e) {}
        subirPagina(0);
        window.addEventListener('pageshow', () => subirPagina(0));
    }

    if (document.documentElement.classList.contains('doc-llegando')) {
        const quitarLlegada = () => document.documentElement.classList.remove('doc-llegando');
        const pieza = document.querySelector('body > main');
        if (pieza) {
            pieza.addEventListener('animationend', (evento) => {
                if (evento.animationName === 'doc-entra') quitarLlegada();
            });
        }
        window.setTimeout(quitarLlegada, 800);
    }

    /* El menú desliza la página hacia la sección de la derecha o de la izquierda. */
    const indiceNav = (ruta) => {
        const nombre = (ruta || '').split('/').pop() || 'index.html';
        const mapa = {
            '': 0,
            'index.html': 0,
            'quiensomos.html': 1,
            'mision-vision.html': 1,
            'afiliacion.html': 2,
            'asesoria-legal.html': 3,
            'solicitar-cita.html': 3,
            'documentos.html': 4,
            'efemerides.html': 4,
            'galeria.html': 4,
            'convenios.html': 4,
            'actas.html': 4,
            'legales.html': 4,
            'informes-secretaria.html': 4,
            'contacto.html': 5
        };
        return Object.prototype.hasOwnProperty.call(mapa, nombre) ? mapa[nombre] : -1;
    };
    const piezasNav = () => document.querySelectorAll('body > *:not(header):not(script):not(.btn-atras):not(.directiva-popup):not(.hoja-popup):not(#sitrabot):not(.visor-pdf)');
    document.querySelectorAll('.navbar a').forEach((enlace) => {
        enlace.addEventListener('click', (evento) => {
            if (evento.metaKey || evento.ctrlKey || evento.shiftKey || evento.altKey || evento.button !== 0) return;
            if (evento.defaultPrevented || enlace.target === '_blank') return;
            let url;
            try {
                url = new URL(enlace.href, location.href);
            } catch (e) {
                return;
            }
            if (url.origin !== location.origin) return;
            if (enlace.hasAttribute('data-public-nav')) return;
            if (url.hash && document.querySelector('[data-vista-publica="' + url.hash.replace('#', '') + '"]')) return;
            const destino = indiceNav(url.pathname);
            const actual = indiceNav(location.pathname);
            if (destino < 0 || actual < 0 || destino === actual) return;
            if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
            evento.preventDefault();
            const haciaDerecha = destino > actual;
            subirPagina(0);
            document.documentElement.style.setProperty('--nav-x', haciaDerecha ? '-100vw' : '100vw');
            document.documentElement.style.overflow = 'hidden';
            const piezas = piezasNav();
            piezas.forEach((item) => item.classList.add('nav-sale'));
            let listo = false;
            const ir = () => {
                if (listo) return;
                listo = true;
                try {
                    sessionStorage.setItem('sitrainaNav', JSON.stringify({ dir: haciaDerecha ? 'derecha' : 'izquierda' }));
                } catch (e) {}
                /* Congela el último fotograma del deslizamiento para no ver un flash blanco. */
                piezas.forEach((item) => {
                    item.style.transform = 'translate3d(' + (haciaDerecha ? '-100vw' : '100vw') + ',0,0)';
                });
                location.href = enlace.href;
            };
            const primera = piezas[0];
            if (primera) {
                primera.addEventListener('animationend', (fin) => {
                    if (fin.animationName === 'nav-sale') ir();
                });
            } else {
                ir();
            }
            window.setTimeout(ir, 480);
        });
    });

    if (document.documentElement.classList.contains('nav-llegando')) {
        subirPagina(0);
        const quitarNav = () => {
            document.documentElement.classList.remove('nav-llegando');
            document.documentElement.style.removeProperty('scroll-behavior');
        };
        const piezaNav = piezasNav()[0];
        if (piezaNav) {
            piezaNav.addEventListener('animationend', (evento) => {
                if (evento.animationName === 'nav-entra') quitarNav();
            });
        }
        window.setTimeout(quitarNav, 480);
    }

    document.querySelectorAll('body > a.btn-atras').forEach((volver) => {
        volver.addEventListener('click', (evento) => {
            if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
            if (evento.metaKey || evento.ctrlKey || evento.shiftKey || evento.altKey || evento.button !== 0) return;
            evento.preventDefault();
            subirPagina(0);
            let direccion = 'derecha';
            try {
                direccion = sessionStorage.getItem('sitrainaDocDir') || 'derecha';
            } catch (e) {}
            const par = direccion === 'izquierda'
                ? ['100vw', '0px']
                : direccion === 'abajo'
                    ? ['0px', '-100vh']
                    : direccion === 'arriba'
                        ? ['0px', '100vh']
                        : ['-100vw', '0px'];
            const piezas = document.querySelectorAll('body > main, .contenedor-titulo-galeria');
            piezas.forEach((item) => {
                item.style.setProperty('--doc-x', par[0]);
                item.style.setProperty('--doc-y', par[1]);
                item.classList.add('doc-sale');
            });
            document.documentElement.style.overflow = 'hidden';
            let listo = false;
            const ir = () => {
                if (listo) return;
                listo = true;
                try {
                    sessionStorage.setItem('sitrainaDoc', JSON.stringify({ dir: direccion, volver: true }));
                } catch (e) {}
                location.href = volver.href;
            };
            const primera = piezas[0];
            if (primera) {
                primera.addEventListener('animationend', (fin) => {
                    if (fin.animationName === 'doc-sale') ir();
                });
            } else {
                ir();
            }
            window.setTimeout(ir, 750);
        });
    });

    // --- 4. CARRUSEL Y FICHA DE LA JUNTA DIRECTIVA ---
    const pistaDirectiva = document.querySelector('.directiva-pista');
    const popupDirectiva = document.getElementById('directiva-popup');

    if (pistaDirectiva && popupDirectiva) {
        /* Mide el ancho de una tarjeta para mover el carrusel de una en una. */
        const pasoTarjeta = () => {
            const tarjeta = pistaDirectiva.querySelector('.directivo-card');
            if (!tarjeta) return 280;
            const estilo = getComputedStyle(pistaDirectiva);
            const espacio = parseFloat(estilo.columnGap || estilo.gap) || 18;
            return tarjeta.getBoundingClientRect().width + espacio;
        };

        const flechasDirectiva = document.querySelectorAll('.directiva-flecha');
        /* Apaga la flecha izquierda al inicio y la derecha al final del carrusel. */
        const actualizarFlechas = () => {
            const alInicio = pistaDirectiva.scrollLeft <= 2;
            const alFinal = pistaDirectiva.scrollLeft + pistaDirectiva.clientWidth >= pistaDirectiva.scrollWidth - 2;
            flechasDirectiva.forEach((boton) => {
                const direccion = Number(boton.dataset.dir) || 1;
                boton.disabled = direccion < 0 ? alInicio : alFinal;
            });
        };

        flechasDirectiva.forEach((boton) => {
            boton.addEventListener('click', () => {
                const direccion = Number(boton.dataset.dir) || 1;
                pistaDirectiva.scrollBy({ left: pasoTarjeta() * direccion, behavior: 'smooth' });
            });
        });

        pistaDirectiva.addEventListener('scroll', actualizarFlechas);
        actualizarFlechas();

        pistaDirectiva.addEventListener('keydown', (evento) => {
            if (evento.key === 'ArrowRight') {
                evento.preventDefault();
                pistaDirectiva.scrollBy({ left: pasoTarjeta(), behavior: 'smooth' });
            }
            if (evento.key === 'ArrowLeft') {
                evento.preventDefault();
                pistaDirectiva.scrollBy({ left: -pasoTarjeta(), behavior: 'smooth' });
            }
        });

        const fotoPopup = document.getElementById('directiva-popup-foto');
        const puestoPopup = document.getElementById('directiva-popup-puesto');
        const nombrePopup = document.getElementById('directiva-popup-nombre');
        const infoPopup = document.getElementById('directiva-popup-info');
        const correoPopup = document.getElementById('directiva-popup-correo');
        const cerrarPopup = popupDirectiva.querySelector('.directiva-cerrar');
        let origenPopup = null;
        let arrastre = false;
        let puntoX = 0;

        pistaDirectiva.addEventListener('pointerdown', (evento) => {
            puntoX = evento.clientX;
            arrastre = false;
        });
        pistaDirectiva.addEventListener('pointermove', (evento) => {
            if (Math.abs(evento.clientX - puntoX) > 8) arrastre = true;
        });

        /* Muestra la ficha de una persona de la Junta: foto, puesto, texto y correo. */
        const abrirFicha = (tarjeta) => {
            fotoPopup.src = tarjeta.dataset.foto;
            fotoPopup.alt = tarjeta.dataset.nombre;
            puestoPopup.textContent = tarjeta.dataset.puesto;
            nombrePopup.textContent = tarjeta.dataset.nombre;
            infoPopup.textContent = tarjeta.dataset.info;
            correoPopup.textContent = tarjeta.dataset.correo;
            correoPopup.href = 'mailto:' + tarjeta.dataset.correo;
            origenPopup = tarjeta;
            popupDirectiva.classList.add('abierta');
            popupDirectiva.setAttribute('aria-hidden', 'false');
            document.body.classList.add('directiva-abierta');
            cerrarPopup.focus();
        };

        /* Cierra la ficha y regresa el foco a la tarjeta que se abrió. */
        const cerrarFicha = () => {
            popupDirectiva.classList.remove('abierta');
            popupDirectiva.setAttribute('aria-hidden', 'true');
            document.body.classList.remove('directiva-abierta');
            if (origenPopup) origenPopup.focus();
        };

        pistaDirectiva.querySelectorAll('.directivo-card').forEach((tarjeta) => {
            tarjeta.addEventListener('click', () => {
                if (arrastre) return;
                abrirFicha(tarjeta);
            });
        });

        cerrarPopup.addEventListener('click', cerrarFicha);
        popupDirectiva.addEventListener('click', (evento) => {
            if (evento.target === popupDirectiva) cerrarFicha();
        });
        document.addEventListener('keydown', (evento) => {
            if (evento.key === 'Escape' && popupDirectiva.classList.contains('abierta')) {
                cerrarFicha();
            }
        });
    }

    // --- 4b. FICHA DE LOS ASESORES LEGALES ---
    const popupAsesoria = document.getElementById('asesoria-popup');
    const tarjetasAsesor = document.querySelectorAll('.tarjeta-asesor');

    if (popupAsesoria && tarjetasAsesor.length) {
        const fotoAsesor = document.getElementById('asesoria-popup-foto');
        const puestoAsesor = document.getElementById('asesoria-popup-puesto');
        const nombreAsesor = document.getElementById('asesoria-popup-nombre');
        const infoAsesor = document.getElementById('asesoria-popup-info');
        const cerrarAsesor = popupAsesoria.querySelector('.directiva-cerrar');
        let origenAsesor = null;

        /* Muestra la ficha del asesor: foto, papel, nombre y especialidad. */
        const abrirAsesor = (tarjeta) => {
            fotoAsesor.src = tarjeta.dataset.foto;
            fotoAsesor.alt = tarjeta.dataset.nombre;
            puestoAsesor.textContent = tarjeta.dataset.puesto;
            nombreAsesor.textContent = tarjeta.dataset.nombre;
            infoAsesor.textContent = tarjeta.dataset.info;
            origenAsesor = tarjeta;
            popupAsesoria.classList.add('abierta');
            popupAsesoria.setAttribute('aria-hidden', 'false');
            document.body.classList.add('directiva-abierta');
            cerrarAsesor.focus();
        };

        /* Cierra la ficha y regresa el foco a la casilla que se abrió. */
        const cerrarAsesorFicha = () => {
            popupAsesoria.classList.remove('abierta');
            popupAsesoria.setAttribute('aria-hidden', 'true');
            document.body.classList.remove('directiva-abierta');
            if (origenAsesor) origenAsesor.focus();
        };

        tarjetasAsesor.forEach((tarjeta) => {
            tarjeta.addEventListener('click', () => abrirAsesor(tarjeta));
        });

        cerrarAsesor.addEventListener('click', cerrarAsesorFicha);
        popupAsesoria.addEventListener('click', (evento) => {
            if (evento.target === popupAsesoria) cerrarAsesorFicha();
        });
        document.addEventListener('keydown', (evento) => {
            if (evento.key === 'Escape' && popupAsesoria.classList.contains('abierta')) {
                cerrarAsesorFicha();
            }
        });
    }

    // --- 4c. FICHA DE NUESTRA LABOR ---
    const popupLabor = document.getElementById('labor-popup');
    const tarjetasLabor = document.querySelectorAll('.tarjeta-labor');

    if (popupLabor && tarjetasLabor.length) {
        const fotoLabor = document.getElementById('labor-popup-foto');
        const tituloLabor = document.getElementById('labor-popup-titulo');
        const infoLabor = document.getElementById('labor-popup-info');
        const cerrarLabor = popupLabor.querySelector('.directiva-cerrar');
        let origenLabor = null;

        /* Abre el recuadro de una labor con su foto, título y explicación completa. */
        const abrirLabor = (tarjeta) => {
            fotoLabor.src = tarjeta.dataset.foto;
            fotoLabor.alt = tarjeta.dataset.titulo;
            tituloLabor.textContent = tarjeta.dataset.titulo;
            infoLabor.textContent = tarjeta.dataset.info;
            origenLabor = tarjeta;
            popupLabor.classList.add('abierta');
            popupLabor.setAttribute('aria-hidden', 'false');
            document.body.classList.add('directiva-abierta');
            cerrarLabor.focus();
        };

        const cerrarLaborFicha = () => {
            popupLabor.classList.remove('abierta');
            popupLabor.setAttribute('aria-hidden', 'true');
            document.body.classList.remove('directiva-abierta');
            if (origenLabor) origenLabor.focus();
        };

        tarjetasLabor.forEach((tarjeta) => {
            tarjeta.addEventListener('click', () => abrirLabor(tarjeta));
        });

        cerrarLabor.addEventListener('click', cerrarLaborFicha);
        popupLabor.addEventListener('click', (evento) => {
            if (evento.target === popupLabor) cerrarLaborFicha();
        });
        document.addEventListener('keydown', (evento) => {
            if (evento.key === 'Escape' && popupLabor.classList.contains('abierta')) {
                cerrarLaborFicha();
            }
        });
    }

    // --- 5. LISTA DE EFEMÉRIDES (delegación: también sirve si se cargan después) ---
    document.addEventListener('click', (evento) => {
        const boton = evento.target.closest('.efemeride-resumen');
        if (!boton) return;
        const item = boton.closest('.efemeride');
        if (!item) return;
        const estabaAbierta = item.classList.contains('abierta');

        document.querySelectorAll('.efemeride.abierta').forEach((otra) => {
            otra.classList.remove('abierta');
            const resumen = otra.querySelector('.efemeride-resumen');
            if (resumen) resumen.setAttribute('aria-expanded', 'false');
            otra.querySelectorAll('video').forEach((video) => video.pause());
        });

        if (!estabaAbierta) {
            item.classList.add('abierta');
            boton.setAttribute('aria-expanded', 'true');
        }
    });

    // La reserva de cita vive en js/cita-calendario.js.

    // --- 7. ZOOM PARA COMUNICADOS Y EFEMÉRIDES ---
    {
        var lightbox = document.getElementById('lightbox');
        if (!lightbox) {
            lightbox = document.createElement('div');
            lightbox.id = 'lightbox';
            lightbox.className = 'lightbox';
            lightbox.innerHTML = '<button type="button" class="cerrar-lightbox" aria-label="Cerrar imagen">&times;</button><img class="lightbox-contenido" id="img-expandida" alt=""><div class="luz-controles"><button type="button" data-zoom="menos" aria-label="Alejar">&minus;</button><button type="button" class="luz-magnitud" data-zoom="normal" aria-label="Magnitud 1×, volver al tamaño inicial">1×</button><button type="button" data-zoom="mas" aria-label="Acercar">+</button></div>';
            document.body.appendChild(lightbox);
        }
        if (!lightbox.querySelector('.luz-controles')) {
            var barra = document.createElement('div');
            barra.className = 'luz-controles';
            barra.innerHTML = '<button type="button" data-zoom="menos" aria-label="Alejar">&minus;</button><button type="button" class="luz-magnitud" data-zoom="normal" aria-label="Magnitud 1×, volver al tamaño inicial">1×</button><button type="button" data-zoom="mas" aria-label="Acercar">+</button>';
            lightbox.appendChild(barra);
        }
        var imgExpandida = document.getElementById('img-expandida');
        var cerrarBtn = lightbox.querySelector('.cerrar-lightbox');
        var escala = 1;
        var posX = 0;
        var posY = 0;
        var origen = null;
        var arrastrando = false;
        var movio = false;
        var inicioX = 0;
        var inicioY = 0;
        var baseX = 0;
        var baseY = 0;
        var dedos = {};
        var pinzaInicio = 0;
        var escalaPinza = 1;

        /* Escribe en el botón la magnitud real de la imagen. */
        var mostrarMagnitud = function () {
            var indicador = lightbox.querySelector('.luz-magnitud');
            if (!indicador) return;
            var visible = Math.round(Math.min(4, Math.max(1, escala)) * 10) / 10;
            var cifra = visible.toFixed(1).replace(/\.0$/, '').replace('.', ',');
            indicador.textContent = cifra + '\u00d7';
            indicador.setAttribute('aria-label', 'Magnitud ' + cifra + '\u00d7, volver al tamaño inicial');
            var menos = lightbox.querySelector('[data-zoom="menos"]');
            var mas = lightbox.querySelector('[data-zoom="mas"]');
            if (menos) menos.disabled = visible <= 1;
            if (mas) mas.disabled = visible >= 4;
        };

        /* Coloca la imagen ampliada según el acercamiento y el arrastre. */
        var pintarZoom = function () {
            var extra = Math.max(imgExpandida.offsetWidth, imgExpandida.offsetHeight) * 0.35;
            var topeX = (imgExpandida.offsetWidth * Math.max(0, escala - 1)) / 2 + extra;
            var topeY = (imgExpandida.offsetHeight * Math.max(0, escala - 1)) / 2 + extra;
            posX = Math.max(-topeX, Math.min(topeX, posX));
            posY = Math.max(-topeY, Math.min(topeY, posY));
            imgExpandida.style.transform = 'translate(' + posX + 'px,' + posY + 'px) scale(' + escala + ')';
            imgExpandida.classList.toggle('luz-cerca', escala > 1);
            mostrarMagnitud();
        };

        /* Vuelve la imagen al tamaño con el que se abrió. */
        var reiniciarZoom = function () {
            escala = 1;
            posX = 0;
            posY = 0;
            imgExpandida.style.transform = '';
            imgExpandida.classList.remove('luz-cerca');
            dedos = {};
            pinzaInicio = 0;
            mostrarMagnitud();
        };

        /* Cierra la imagen ampliada y devuelve el desplazamiento de la página. */
        var cerrarZoom = function () {
            lightbox.style.display = 'none';
            document.body.style.overflow = 'auto';
            reiniciarZoom();
            if (origen && origen.focus) origen.focus();
        };

        /* Abre el visor con la imagen elegida, lista para acercarla. */
        var abrirZoom = function (img) {
            origen = document.activeElement;
            reiniciarZoom();
            imgExpandida.src = img.currentSrc || img.src;
            imgExpandida.alt = img.alt || 'Imagen ampliada';
            lightbox.style.display = 'flex';
            document.body.style.overflow = 'hidden';
            if (cerrarBtn && cerrarBtn.focus) cerrarBtn.focus();
        };

        if (cerrarBtn && !cerrarBtn.hasAttribute('tabindex')) cerrarBtn.tabIndex = 0;
        if (cerrarBtn && !cerrarBtn.getAttribute('aria-label')) cerrarBtn.setAttribute('aria-label', 'Cerrar imagen');

        document.addEventListener('click', function (evento) {
            var img = evento.target.closest('.img-zoomable, .imagen-noticia img');
            if (!img || img.closest('#lightbox')) return;
            abrirZoom(img);
        });
        document.addEventListener('keydown', function (evento) {
            if (evento.key !== 'Enter' && evento.key !== ' ') return;
            var img = evento.target.closest('.img-zoomable, .imagen-noticia img');
            if (!img || img.closest('#lightbox')) return;
            evento.preventDefault();
            abrirZoom(img);
        });

        if (cerrarBtn) cerrarBtn.addEventListener('click', cerrarZoom);
        lightbox.querySelectorAll('[data-zoom]').forEach(function (boton) {
            boton.addEventListener('click', function () {
                var accion = boton.getAttribute('data-zoom');
                if (accion === 'mas') escala = Math.min(4, escala + 0.4);
                else if (accion === 'menos') escala = Math.max(1, escala - 0.4);
                else escala = 1;
                if (escala === 1) { posX = 0; posY = 0; }
                pintarZoom();
            });
        });
        lightbox.addEventListener('click', function (evento) {
            if (movio) {
                movio = false;
                return;
            }
            if (evento.target.closest('.luz-controles, .cerrar-lightbox, .lightbox-contenido')) return;
            cerrarZoom();
        });
        lightbox.addEventListener('wheel', function (evento) {
            if (lightbox.style.display !== 'flex') return;
            evento.preventDefault();
            escala = Math.min(4, Math.max(1, escala * (evento.deltaY < 0 ? 1.12 : 0.89)));
            if (escala < 1.05) escala = 1;
            if (escala === 1) { posX = 0; posY = 0; }
            pintarZoom();
        }, { passive: false });
        imgExpandida.addEventListener('dblclick', function () {
            escala = escala > 1 ? 1 : 2;
            if (escala === 1) { posX = 0; posY = 0; }
            pintarZoom();
        });
        imgExpandida.draggable = false;
        imgExpandida.addEventListener('dragstart', function (evento) {
            evento.preventDefault();
        });
        /* Distancia entre los dos dedos que están sobre la imagen. */
        var distanciaPinza = function () {
            var ids = Object.keys(dedos);
            if (ids.length < 2) return 0;
            var a = dedos[ids[0]];
            var b = dedos[ids[1]];
            return Math.hypot(a.x - b.x, a.y - b.y);
        };

        /* Mueve la imagen siguiendo el cursor mientras el clic sigue presionado. */
        imgExpandida.addEventListener('pointerdown', function (evento) {
            if (evento.button !== 0) return;
            evento.preventDefault();
            dedos[evento.pointerId] = { x: evento.clientX, y: evento.clientY };
            if (Object.keys(dedos).length >= 2) {
                pinzaInicio = distanciaPinza();
                escalaPinza = escala;
                arrastrando = false;
                imgExpandida.classList.remove('luz-arrastre');
            } else {
                arrastrando = true;
                movio = false;
                inicioX = evento.clientX;
                inicioY = evento.clientY;
                baseX = posX;
                baseY = posY;
                imgExpandida.classList.add('luz-arrastre');
            }
            try { imgExpandida.setPointerCapture(evento.pointerId); } catch (error) {}
        });
        imgExpandida.addEventListener('pointermove', function (evento) {
            if (!dedos[evento.pointerId]) return;
            dedos[evento.pointerId] = { x: evento.clientX, y: evento.clientY };
            if (Object.keys(dedos).length >= 2 && pinzaInicio > 0) {
                escala = Math.min(4, Math.max(1, escalaPinza * (distanciaPinza() / pinzaInicio)));
                if (escala < 1.05) escala = 1;
                if (escala === 1) { posX = 0; posY = 0; }
                movio = true;
                pintarZoom();
                return;
            }
            if (!arrastrando) return;
            var dx = evento.clientX - inicioX;
            var dy = evento.clientY - inicioY;
            if (Math.abs(dx) > 3 || Math.abs(dy) > 3) movio = true;
            posX = baseX + dx;
            posY = baseY + dy;
            pintarZoom();
        });
        var soltar = function (evento) {
            if (evento && evento.pointerId != null) delete dedos[evento.pointerId];
            if (Object.keys(dedos).length < 2) pinzaInicio = 0;
            arrastrando = false;
            imgExpandida.classList.remove('luz-arrastre');
        };
        imgExpandida.addEventListener('pointerup', soltar);
        imgExpandida.addEventListener('pointercancel', soltar);
        document.addEventListener('keydown', function (evento) {
            if (evento.key === 'Escape' && lightbox.style.display === 'flex') {
                evento.stopPropagation();
                cerrarZoom();
            }
        }, true);
    }

    /* Visor de PDF: abre cualquier PDF del sitio en la página, con páginas y zoom. */
    (function () {
        var visor = document.createElement('div');
        visor.className = 'visor-pdf';
        visor.hidden = true;
                visor.innerHTML = '<div class="visor-pdf-marco" role="dialog" aria-modal="true" aria-labelledby="visor-pdf-titulo"><h2 id="visor-pdf-titulo" class="visor-pdf-titulo"></h2><button type="button" class="visor-pdf-cerrar" aria-label="Cerrar documento">&times;</button><div class="visor-pdf-cuerpo"><button type="button" class="visor-pdf-flecha visor-pdf-anterior" aria-label="Página anterior"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 6l-6 6 6 6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></button><div class="visor-pdf-hoja"><div class="visor-pdf-clip"><p class="visor-pdf-estado">Un momento, estamos abriendo el documento.</p><canvas class="visor-pdf-lienzo" hidden></canvas><iframe class="visor-pdf-respaldo" hidden title="Documento"></iframe></div></div><button type="button" class="visor-pdf-flecha visor-pdf-siguiente" aria-label="Página siguiente"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></button></div><div class="visor-pdf-controles"><p class="visor-pdf-cuenta"><span class="visor-pdf-cuenta-etiqueta">Página</span> <input type="text" inputmode="numeric" pattern="[0-9]*" class="visor-pdf-pagina" value="" aria-label="Ir a la página" disabled> <span class="visor-pdf-cuenta-de">de</span> <span class="visor-pdf-pagina-total">0</span></p><div class="visor-pdf-zoom"><button type="button" data-pdf-zoom="menos" aria-label="Alejar">&minus;</button><button type="button" class="visor-pdf-zoom-cifra" data-pdf-zoom="normal" aria-label="Volver a 100%">100%</button><button type="button" data-pdf-zoom="mas" aria-label="Acercar">+</button></div><a class="visor-pdf-descarga" href="#" target="_blank" rel="noopener">Abrir en una pestaña</a></div></div>';
        document.body.appendChild(visor);

        var titulo = visor.querySelector('#visor-pdf-titulo');
        var cuenta = visor.querySelector('.visor-pdf-cuenta');
        var paginaInput = visor.querySelector('.visor-pdf-pagina');
        var paginaTotal = visor.querySelector('.visor-pdf-pagina-total');
        var estado = visor.querySelector('.visor-pdf-estado');
        var lienzo = visor.querySelector('.visor-pdf-lienzo');
        var respaldo = visor.querySelector('.visor-pdf-respaldo');
        var hoja = visor.querySelector('.visor-pdf-hoja');
        var clip = visor.querySelector('.visor-pdf-clip');
        var anterior = visor.querySelector('.visor-pdf-anterior');
        var siguiente = visor.querySelector('.visor-pdf-siguiente');
        var descarga = visor.querySelector('.visor-pdf-descarga');
        var zoomCifra = visor.querySelector('.visor-pdf-zoom-cifra');
        var botonZoomMenos = visor.querySelector('[data-pdf-zoom="menos"]');
        var botonZoomMas = visor.querySelector('[data-pdf-zoom="mas"]');
        var fijarMarco = function () {
            hoja.scrollLeft = 0;
            if (clip) clip.scrollLeft = 0;
        };
        var puedePanear = function () {
            return zoom > 2;
        };
        var centrarPan = function () {
            if (!puedePanear()) {
                fijarMarco();
                return;
            }
            requestAnimationFrame(function () {
                hoja.scrollLeft = Math.max(0, (hoja.scrollWidth - hoja.clientWidth) / 2);
                if (clip) clip.scrollLeft = 0;
            });
        };
        var documento = null;
        var pagina = 1;
        var total = 0;
        var zoom = 1;
        var tarea = null;
        var origen = null;
        var usandoLienzo = false;
        var listo = false;
        var cargaLibro = null;
        var arrastre = null;

        /* Actualiza el porcentaje y el estado de los botones de zoom. */
        var mostrarZoom = function () {
            var porcentaje = Math.round(zoom * 100);
            zoomCifra.textContent = porcentaje + '%';
            zoomCifra.setAttribute('aria-label', 'Zoom ' + porcentaje + '%, volver a 100%');
            botonZoomMenos.disabled = !listo || zoom <= 1;
            botonZoomMas.disabled = !listo || zoom >= 3;
            hoja.classList.toggle('visor-pdf-pan', puedePanear());
            if (!puedePanear()) fijarMarco();
        };

        var flecha = function () {
            anterior.disabled = !usandoLienzo || pagina <= 1;
            siguiente.disabled = !usandoLienzo || pagina >= total;
            if (usandoLienzo && total) {
                cuenta.classList.remove('visor-pdf-cuenta-simple');
                if (document.activeElement !== paginaInput) paginaInput.value = String(pagina);
                paginaTotal.textContent = String(total);
                paginaInput.disabled = !listo;
                paginaInput.setAttribute('maxlength', String(String(total).length));
                paginaInput.style.width = (String(total).length + 1.6) + 'ch';
                paginaInput.setAttribute('aria-label', 'Ir a la página (1 a ' + total + ')');
            } else {
                cuenta.classList.add('visor-pdf-cuenta-simple');
                paginaInput.value = '';
                paginaInput.disabled = true;
                paginaInput.style.width = '';
                paginaTotal.textContent = listo ? 'Documento' : '0';
            }
            mostrarZoom();
        };

        /* Salta a la página pedida, sin pasar del total. */
        var irAPagina = function (valor) {
            if (!usandoLienzo || !total) {
                flecha();
                return;
            }
            var n = parseInt(String(valor).replace(/\D/g, ''), 10);
            if (!n || n < 1) {
                paginaInput.value = String(pagina);
                return;
            }
            if (n > total) n = total;
            paginaInput.value = String(n);
            if (n === pagina) return;
            pagina = n;
            pintar();
        };

        var cambiarZoom = function (nuevo) {
            var siguienteZoom = Math.min(3, Math.max(1, Math.round(nuevo * 100) / 100));
            if (!listo || siguienteZoom === zoom) {
                mostrarZoom();
                return;
            }
            zoom = siguienteZoom;
            if (usandoLienzo) pintar();
            else mostrarZoom();
        };

        var cerrar = function () {
            visor.hidden = true;
            document.body.classList.remove('visor-pdf-abierto');
            if (tarea && tarea.cancel) tarea.cancel();
            documento = null;
            zoom = 1;
            listo = false;
            respaldo.hidden = true;
            respaldo.removeAttribute('src');
            lienzo.hidden = true;
            lienzo.style.width = '';
            lienzo.style.height = '';
            if (origen && origen.focus) origen.focus();
        };

        /* Dibuja la página nítida al tamaño del marco y al zoom actual. */
        var pintar = function () {
            if (!documento || !usandoLienzo) return;
            if (tarea && tarea.cancel) tarea.cancel();
            estado.hidden = false;
            estado.textContent = 'Un momento, estamos abriendo la página.';
            lienzo.hidden = true;
            documento.getPage(pagina).then(function (hojaPdf) {
                var estiloHoja = getComputedStyle(hoja);
                var rellenoX = parseFloat(estiloHoja.paddingLeft) + parseFloat(estiloHoja.paddingRight);
                var rellenoY = parseFloat(estiloHoja.paddingTop) + parseFloat(estiloHoja.paddingBottom);
                var ancho = Math.max(200, hoja.clientWidth - rellenoX - 8);
                var alto = Math.max(200, hoja.clientHeight - rellenoY - 8);
                var base = hojaPdf.getViewport({ scale: 1 });
                /* Nítido: se redibuja al zoom. Sin transform CSS ni arrastre horizontal. */
                var escalaBase = Math.min(ancho / base.width, alto / base.height);
                var escala = escalaBase * zoom;
                var pixel = Math.max(window.devicePixelRatio || 1, 2);
                if (pixel > 3) pixel = 3;
                var vista = hojaPdf.getViewport({ scale: escala * pixel });
                var anchoCss = Math.floor(base.width * escala);
                var altoCss = Math.floor(base.height * escala);
                lienzo.width = Math.floor(vista.width);
                lienzo.height = Math.floor(vista.height);
                lienzo.style.width = anchoCss + 'px';
                lienzo.style.height = altoCss + 'px';
                var contexto = lienzo.getContext('2d', { alpha: false });
                contexto.setTransform(1, 0, 0, 1, 0, 0);
                contexto.clearRect(0, 0, lienzo.width, lienzo.height);
                contexto.imageSmoothingEnabled = true;
                contexto.imageSmoothingQuality = 'high';
                tarea = hojaPdf.render({ canvasContext: contexto, viewport: vista });
                return tarea.promise.then(function () {
                    return { altoCss: altoCss };
                });
            }).then(function (medidas) {
                estado.hidden = true;
                lienzo.hidden = false;
                listo = true;
                var pasaAlto = medidas && medidas.altoCss > (hoja.clientHeight - 24);
                hoja.classList.toggle('visor-pdf-ampliado', (zoom > 1 && pasaAlto) || puedePanear());
                hoja.classList.toggle('visor-pdf-pan', puedePanear());
                hoja.scrollTop = 0;
                centrarPan();
                flecha();
            }).catch(function (error) {
                if (error && error.name === 'RenderingCancelledException') return;
                estado.hidden = false;
                estado.textContent = 'No se pudo mostrar esta página.';
                listo = false;
                mostrarZoom();
            });
            flecha();
        };

        var abrirConLienzo = function (url) {
            return cargarPdfJs().then(function (lib) {
                return lib.getDocument({ url: url, withCredentials: false }).promise;
            }).then(function (pdf) {
                documento = pdf;
                total = pdf.numPages;
                pagina = 1;
                zoom = 1;
                usandoLienzo = true;
                respaldo.hidden = true;
                pintar();
            });
        };

        var abrirRespaldo = function (url) {
            usandoLienzo = false;
            documento = null;
            zoom = 1;
            lienzo.hidden = true;
            estado.hidden = true;
            respaldo.hidden = false;
            respaldo.src = url + (url.indexOf('#') === -1 ? '#toolbar=0&navpanes=0&scrollbar=0&view=Fit' : '');
            listo = true;
            flecha();
        };

        var abrir = function (enlace) {
            origen = document.activeElement;
            var nombre = '';
            var item = enlace.closest('.archivo-item, article, li');
            var encabezado = item ? item.querySelector('h3') : null;
            if (encabezado) nombre = encabezado.textContent.trim();
            if (!nombre) nombre = (enlace.textContent || '').trim();
            if (!nombre || nombre.toLowerCase() === 'abrir') {
                try { nombre = decodeURIComponent(enlace.href.split('/').pop().split('?')[0]); } catch (error) { nombre = 'Documento'; }
            }
            titulo.textContent = nombre;
            descarga.href = enlace.href;
            visor.hidden = false;
            document.body.classList.add('visor-pdf-abierto');
            estado.hidden = false;
            estado.textContent = 'Un momento, estamos abriendo el documento.';
            lienzo.hidden = true;
            respaldo.hidden = true;
            usandoLienzo = false;
            listo = false;
            zoom = 1;
            flecha();
            visor.querySelector('.visor-pdf-cerrar').focus();
            abrirConLienzo(enlace.href).catch(function () { abrirRespaldo(enlace.href); });
        };

        function cargarPdfJs() {
            if (window.pdfjsLib) return Promise.resolve(window.pdfjsLib);
            if (cargaLibro) return cargaLibro;
            cargaLibro = new Promise(function (resolve, reject) {
                var script = document.createElement('script');
                script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
                script.onload = function () {
                    if (!window.pdfjsLib) { reject(); return; }
                    window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
                    resolve(window.pdfjsLib);
                };
                script.onerror = reject;
                document.head.appendChild(script);
            });
            return cargaLibro;
        }

        anterior.addEventListener('click', function () {
            if (pagina <= 1) return;
            pagina -= 1;
            pintar();
        });
        siguiente.addEventListener('click', function () {
            if (pagina >= total) return;
            pagina += 1;
            pintar();
        });
        botonZoomMenos.addEventListener('click', function (evento) {
            evento.preventDefault();
            evento.stopPropagation();
            cambiarZoom(zoom - 0.25);
        });
        botonZoomMas.addEventListener('click', function (evento) {
            evento.preventDefault();
            evento.stopPropagation();
            cambiarZoom(zoom + 0.25);
        });
        zoomCifra.addEventListener('click', function (evento) {
            evento.preventDefault();
            evento.stopPropagation();
            cambiarZoom(1);
        });
        paginaInput.addEventListener('focus', function () {
            paginaInput.select();
        });
        paginaInput.addEventListener('input', function () {
            var limpio = paginaInput.value.replace(/\D/g, '');
            if (limpio !== paginaInput.value) paginaInput.value = limpio;
            if (!limpio || !total) return;
            var n = parseInt(limpio, 10);
            if (n > total) paginaInput.value = String(total);
        });
        paginaInput.addEventListener('keydown', function (evento) {
            if (evento.key === 'Enter') {
                evento.preventDefault();
                evento.stopPropagation();
                irAPagina(paginaInput.value);
                paginaInput.blur();
            } else if (evento.key === 'Escape') {
                evento.preventDefault();
                evento.stopPropagation();
                paginaInput.value = String(pagina);
                paginaInput.blur();
            }
        });
        paginaInput.addEventListener('blur', function () {
            irAPagina(paginaInput.value);
        });
        paginaInput.addEventListener('click', function (evento) {
            evento.stopPropagation();
        });
        visor.querySelector('.visor-pdf-cerrar').addEventListener('click', cerrar);
        visor.addEventListener('click', function (evento) {
            if (evento.target === visor) cerrar();
        });
        hoja.addEventListener('wheel', function (evento) {
            if (visor.hidden) return;
            if (evento.ctrlKey || evento.metaKey) {
                if (!listo) return;
                evento.preventDefault();
                cambiarZoom(evento.deltaY < 0 ? zoom + 0.25 : zoom - 0.25);
                return;
            }
            /* Lateral solo con más de 200%. */
            if (Math.abs(evento.deltaX) > Math.abs(evento.deltaY) && !puedePanear()) {
                evento.preventDefault();
                fijarMarco();
            }
        }, { passive: false });
        hoja.addEventListener('scroll', function () {
            if (!puedePanear() && hoja.scrollLeft !== 0) hoja.scrollLeft = 0;
        });
        if (clip) {
            clip.addEventListener('scroll', function () {
                if (clip.scrollLeft !== 0) clip.scrollLeft = 0;
            });
        }
        hoja.addEventListener('pointerdown', function (evento) {
            if (!puedePanear() || evento.button !== 0) return;
            if (evento.target.closest('button, a, input, .visor-pdf-controles')) return;
            arrastre = {
                id: evento.pointerId,
                x: evento.clientX,
                y: evento.clientY,
                left: hoja.scrollLeft,
                top: hoja.scrollTop
            };
            try { hoja.setPointerCapture(evento.pointerId); } catch (error) { /* ignore */ }
        });
        hoja.addEventListener('pointermove', function (evento) {
            if (!arrastre || arrastre.id !== evento.pointerId || !puedePanear()) return;
            hoja.scrollLeft = arrastre.left - (evento.clientX - arrastre.x);
            hoja.scrollTop = arrastre.top - (evento.clientY - arrastre.y);
        });
        var soltarArrastre = function (evento) {
            if (!arrastre || (evento && arrastre.id !== evento.pointerId)) return;
            arrastre = null;
        };
        hoja.addEventListener('pointerup', soltarArrastre);
        hoja.addEventListener('pointercancel', soltarArrastre);
        lienzo.addEventListener('dragstart', function (evento) {
            evento.preventDefault();
        });
        document.addEventListener('keydown', function (evento) {
            if (visor.hidden) return;
            if (evento.key === 'Escape') { evento.stopPropagation(); cerrar(); }
            else if (evento.key === 'ArrowLeft' && !anterior.disabled) anterior.click();
            else if (evento.key === 'ArrowRight' && !siguiente.disabled) siguiente.click();
            else if ((evento.key === '+' || evento.key === '=') && listo) cambiarZoom(zoom + 0.25);
            else if ((evento.key === '-' || evento.key === '_') && listo) cambiarZoom(zoom - 0.25);
            else if (evento.key === '0' && listo) cambiarZoom(1);
        }, true);
        document.addEventListener('click', function (evento) {
            if (evento.defaultPrevented || evento.button !== 0) return;
            if (evento.metaKey || evento.ctrlKey || evento.shiftKey || evento.altKey) return;
            var enlace = evento.target.closest ? evento.target.closest('a[href]') : null;
            if (!enlace || enlace.closest('.visor-pdf')) return;
            var ruta = enlace.getAttribute('href') || '';
            var esPdf = /\.pdf($|[?#])/i.test(ruta);
            try { if (!esPdf) esPdf = /\.pdf$/i.test(enlace.pathname || ''); } catch (error) { /* ignore */ }
            if (!esPdf) return;
            evento.preventDefault();
            evento.stopPropagation();
            abrir(enlace);
        }, true);
    })();
});

/* Sitrabot: arma el chat, guarda la conversación de esta visita y elige la respuesta. */
(function () {
    if (document.getElementById('sitrabot')) return;

    /* Logo siempre desde la raíz del sitio (InfinityFree / subcarpetas). */
    var logoUrl = (function () {
        var origen = location.origin || '';
        var nodo = document.currentScript;
        if (!nodo || !nodo.src) {
            var lista = document.querySelectorAll('script[src*="script.js"]');
            nodo = lista[lista.length - 1];
        }
        if (nodo && nodo.src) {
            var base = nodo.src.replace(/js\/script\.js(?:\?[^#]*)?(?:#.*)?$/i, '');
            if (base && base !== nodo.src) return base + 'img/logo-bot.png';
        }
        return origen + '/img/logo-bot.png';
    })();
    var estilo = document.createElement('style');
    estilo.textContent = [
        '#sitrabot{position:fixed;right:20px;bottom:20px;z-index:4000;font-family:"Public Sans",sans-serif}',
        '#sitrabot *{box-sizing:border-box}',
        '.sitrabot-abrir{position:relative;z-index:1;width:64px;height:64px;border:2px solid #c81d25;border-radius:50%;padding:0;cursor:pointer;background:#f6f0ec;color:#f6f0ec;box-shadow:0 8px 18px rgba(110,18,24,.28);display:grid;place-items:center;overflow:hidden;transition:transform .4s cubic-bezier(0.22,1,0.36,1),box-shadow .4s cubic-bezier(0.22,1,0.36,1),opacity .32s cubic-bezier(0.22,1,0.36,1),visibility .32s,background-color .35s cubic-bezier(0.22,1,0.36,1),border-color .35s cubic-bezier(0.22,1,0.36,1)}',
        '.sitrabot-abrir img,.sitrabot-marca img{display:block;width:100%;height:100%;object-fit:cover;object-position:center;border:0;pointer-events:none;user-select:none}',
        '#sitrabot.sitrabot-abierto .sitrabot-abrir{opacity:0;visibility:hidden;pointer-events:none;transform:scale(.7)}',
        '.sitrabot-abrir:hover{transform:translateY(-2px);box-shadow:0 12px 22px rgba(110,18,24,.34)}',
        '.sitrabot-aviso{position:absolute;right:74px;bottom:16px;margin:0;padding:6px 12px;border-radius:999px;background:#6e1218;color:#fff;font-size:13px;font-weight:700;line-height:1.2;white-space:nowrap;pointer-events:none;opacity:0;visibility:hidden;transform:translateX(8px);transition:opacity .4s cubic-bezier(0.22,1,0.36,1),transform .4s cubic-bezier(0.22,1,0.36,1),visibility .4s cubic-bezier(0.22,1,0.36,1)}',
        '.sitrabot-abrir:hover+.sitrabot-aviso,.sitrabot-abrir:focus-visible+.sitrabot-aviso{opacity:1;visibility:visible;transform:none}',
        '@media (max-width:768px){.sitrabot-aviso{display:none}}',
        '.sitrabot-panel{position:fixed;z-index:2;right:20px;bottom:20px;width:min(380px,calc(100vw - 32px));height:min(520px,calc(100vh - 108px));max-height:calc(100vh - 108px);background:#fff;color:#2b211f;border-radius:18px;box-shadow:0 16px 40px rgba(28,22,20,.28);display:flex;flex-direction:column;overflow:hidden;opacity:0;visibility:hidden;pointer-events:none;transform:translateY(18px) scale(.96);transform-origin:right bottom;transition:opacity .42s cubic-bezier(0.22,1,0.36,1),transform .42s cubic-bezier(0.22,1,0.36,1),visibility .42s,background-color .35s cubic-bezier(0.22,1,0.36,1),color .35s cubic-bezier(0.22,1,0.36,1),box-shadow .42s cubic-bezier(0.22,1,0.36,1)}',
        '#sitrabot.sitrabot-abierto .sitrabot-panel{opacity:1;visibility:visible;pointer-events:auto;transform:none}',
        '.sitrabot-cabeza{position:relative;flex:0 0 auto;display:flex;align-items:center;gap:10px;min-height:72px;padding:14px 58px 14px 16px;background:#8e1a20;color:#f6f0ec}',
        '.sitrabot-marca{width:46px;height:46px;border-radius:50%;border:2px solid rgba(255,255,255,.55);background:#f6f0ec;display:grid;place-items:center;flex:0 0 auto;overflow:hidden;transition:background-color .35s cubic-bezier(0.22,1,0.36,1),border-color .35s cubic-bezier(0.22,1,0.36,1)}',
        '.sitrabot-cabeza strong{display:block;font-size:15px;letter-spacing:.04em}',
        '.sitrabot-cabeza span{display:block;font-size:12px;opacity:.92}',
        '.sitrabot-cerrar{position:absolute;top:16px;right:14px;width:36px;height:36px;border:0;border-radius:50%;background:#fff;color:#6e1218;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0;transition:background-color .35s cubic-bezier(0.22,1,0.36,1),color .35s cubic-bezier(0.22,1,0.36,1)}',
        '.sitrabot-cerrar svg{width:16px;height:16px;display:block}',
        '.sitrabot-mensajes{position:relative;flex:1 1 auto;min-height:0;overflow-x:hidden;overflow-y:auto;padding:16px;display:flex;flex-direction:column;justify-content:flex-start;align-items:stretch;gap:10px;background:#f6f0ec;scrollbar-color:#c81d25 #f3ebe6}',
        '.sitrabot-burbuja{flex:0 0 auto;max-width:86%;padding:10px 12px;border-radius:14px;line-height:1.45;font-size:14.5px;white-space:pre-wrap}',
        '.sitrabot-bot{align-self:flex-start;background:#fff;color:#2b211f;border:1px solid #e7ddd6}',
        '.sitrabot-user{align-self:flex-end;background:#8e1a20;color:#f6f0ec}',
        '.sitrabot-bot a{color:#8e1a20;font-weight:700}',
        '.sitrabot-form{position:relative;z-index:3;flex:0 0 auto;display:flex;align-items:center;gap:10px;padding:14px 16px 16px;border-top:1px solid #e7ddd6;background:#fff}',
        '.sitrabot-form input{flex:1;min-width:0;border:1px solid #e0d2cb;border-radius:999px;padding:11px 14px;font:inherit;color:#2b211f;background:#fff;transition:border-color .28s cubic-bezier(0.22,1,0.36,1),box-shadow .28s cubic-bezier(0.22,1,0.36,1),background-color .35s cubic-bezier(0.22,1,0.36,1),color .35s cubic-bezier(0.22,1,0.36,1)}',
        '.sitrabot-form input:hover{border-color:var(--campo-hover-borde);box-shadow:var(--campo-hover-sombra)}',
        '.sitrabot-form input:focus{outline:none;border-color:var(--campo-focus-borde);box-shadow:var(--campo-focus-sombra)}',
        '.sitrabot-form input:focus-visible{outline:var(--campo-focus-outline);outline-offset:2px;border-color:var(--campo-focus-borde);box-shadow:var(--campo-focus-sombra)}',
        '.sitrabot-form input:hover:focus,.sitrabot-form input:hover:focus-visible{border-color:var(--campo-focus-borde);box-shadow:var(--campo-focus-sombra)}',
        '.sitrabot-form button{flex:0 0 auto;width:46px;height:46px;border:0;border-radius:50%;background:#c81d25;color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0;box-shadow:0 4px 10px rgba(110,18,24,.22);transition:background-color .35s cubic-bezier(0.22,1,0.36,1),transform .35s cubic-bezier(0.22,1,0.36,1)}',
        '.sitrabot-form button svg{width:22px;height:22px;display:block}',
        '.sitrabot-form button:hover{background:#8e1a20;transform:translateY(-1px)}',
        '.sitrabot-espera{opacity:.7}',
        '.sitrabot-mensajes,.sitrabot-bot,.sitrabot-form,.sitrabot-form input{transition:background-color .35s cubic-bezier(0.22,1,0.36,1),color .35s cubic-bezier(0.22,1,0.36,1),border-color .28s cubic-bezier(0.22,1,0.36,1),box-shadow .28s cubic-bezier(0.22,1,0.36,1)}',
        /* El logo lleva azul oscuro: en tono oscuro se mantiene sobre círculo claro. */
        'body.dark-mode .sitrabot-abrir{background:#f6f0ec;border-color:#000;box-shadow:0 8px 20px rgba(0,0,0,.5)}',
        'body.dark-mode .sitrabot-abrir:hover{box-shadow:0 12px 24px rgba(0,0,0,.58)}',
        'body.dark-mode .sitrabot-marca{background:#f6f0ec;border-color:#000}',
        'body.dark-mode .sitrabot-cerrar{background:#f6f0ec;color:#6e1218}',
        'body.dark-mode .sitrabot-panel{background:#2c2320;color:#f7f2ee;box-shadow:0 16px 40px rgba(0,0,0,.5)}',
        'body.dark-mode .sitrabot-cabeza{background:#8e1a20 !important;color:#f6f0ec !important}',
        'body.dark-mode .sitrabot-mensajes{background:#1c1614;scrollbar-color:#c81d25 #2c2320}',
        'body.dark-mode .sitrabot-bot{background:#2c2320;color:#f7f2ee;border-color:#4a3d38}',
        'body.dark-mode .sitrabot-bot a{color:#ffc4bc !important}',
        'body.dark-mode .sitrabot-user{background:#8e1a20;color:#f6f0ec}',
        'body.dark-mode .sitrabot-form{background:#2c2320;border-top-color:#4a3d38}',
        'body.dark-mode .sitrabot-form input{background:#1c1614 !important;color:#f7f2ee !important;border-color:#6a564e !important}',
        'body.dark-mode .sitrabot-form input::placeholder{color:#b7a79f}',
        'body.dark-mode .sitrabot-form input:focus{outline-color:#ffc4bc;border-color:#ffc4bc !important}',
        'html.daltonico .sitrabot-abrir{border-color:#0072b2;box-shadow:0 8px 18px rgba(10,61,92,.28)}',
        'html.daltonico .sitrabot-abrir:hover{box-shadow:0 12px 22px rgba(10,61,92,.34)}',
        'html.daltonico .sitrabot-aviso{background:#0a3d5c;color:#fff}',
        'html.daltonico .sitrabot-cabeza{background:#0b4f7a;color:#f6f0ec}',
        'html.daltonico .sitrabot-cerrar{color:#0a3d5c;background:#fff}',
        'html.daltonico .sitrabot-mensajes{scrollbar-color:#0072b2 #f3ebe6}',
        'html.daltonico .sitrabot-user{background:#0b4f7a;color:#f6f0ec}',
        'html.daltonico .sitrabot-bot a{color:#0a3d5c}',
        'html.daltonico .sitrabot-form input::placeholder{color:#4a6a80}',
        'html.daltonico .sitrabot-form input:focus{outline:2px solid #0a3d5c;border-color:#0a3d5c}',
        'html.daltonico .sitrabot-form button{background:#0072b2;color:#fff;box-shadow:0 4px 10px rgba(10,61,92,.22)}',
        'html.daltonico .sitrabot-form button:hover{background:#0a3d5c;color:#fff}',
        'html.daltonico.dark-mode .sitrabot-cerrar,html.daltonico body.dark-mode .sitrabot-cerrar{color:#0a3d5c}',
        'html.daltonico.dark-mode .sitrabot-cabeza,html.daltonico body.dark-mode .sitrabot-cabeza{background:#0b4f7a !important;color:#f6f0ec !important}',
        'html.daltonico.dark-mode .sitrabot-mensajes,html.daltonico body.dark-mode .sitrabot-mensajes{scrollbar-color:#0072b2 #2c2320}',
        'html.daltonico.dark-mode .sitrabot-bot a,html.daltonico body.dark-mode .sitrabot-bot a{color:#9ad0f5 !important}',
        'html.daltonico.dark-mode .sitrabot-user,html.daltonico body.dark-mode .sitrabot-user{background:#0b4f7a;color:#f6f0ec}',
        'html.daltonico.dark-mode .sitrabot-form input:focus,html.daltonico body.dark-mode .sitrabot-form input:focus{outline-color:#56b4e9;border-color:#56b4e9 !important}',
        '@media (max-width:768px){#sitrabot{right:12px;bottom:12px}.sitrabot-panel{right:12px;bottom:12px;width:calc(100vw - 24px);height:min(520px,calc(100vh - 96px));max-height:calc(100vh - 96px)}}',
        '@media (prefers-reduced-motion:reduce){.sitrabot-abrir,.sitrabot-aviso,.sitrabot-panel,.sitrabot-mensajes,.sitrabot-bot,.sitrabot-form,.sitrabot-form input,.sitrabot-form button,.sitrabot-cerrar{transition:none}}'
    ].join('');
    document.head.appendChild(estilo);

    var raiz = /\/(hojamier|convenios)\//.test(location.pathname) && !document.querySelector('[data-vista-publica]') ? '../' : '';
    var clave = 'sitrabot-mensajes';
    var logoImg = '<img src="' + logoUrl.replace(/"/g, '&quot;') + '" alt="" width="64" height="64" decoding="async">';
    var marca = '<span class="sitrabot-marca" role="img" aria-label="SITRABOT">' + logoImg + '</span>';
    var historial = [];
    try { historial = JSON.parse(sessionStorage.getItem(clave) || '[]'); } catch (e) { historial = []; }

    /* Precarga el logo para que no llegue vacío al cambiar de página. */
    try {
        var precarga = new Image();
        precarga.src = logoUrl;
    } catch (eLogo) {}

    var caja = document.createElement('div');
    caja.id = 'sitrabot';
    caja.innerHTML = '<section class="sitrabot-panel" aria-hidden="true"><header class="sitrabot-cabeza">' + marca + '<div><strong>SITRABOT</strong><span>Asistente de SITRAINA</span></div><button type="button" class="sitrabot-cerrar" aria-label="Cerrar chat"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg></button></header><div class="sitrabot-mensajes" role="log" aria-live="polite"></div><form class="sitrabot-form"><input type="text" aria-label="Tu pregunta o duda laboral" placeholder="Tu pregunta o duda laboral..." autocomplete="off"><button type="submit" aria-label="Enviar mensaje"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h13M12 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg></button></form></section><button type="button" class="sitrabot-abrir" aria-label="Bot del SITRAINA" aria-expanded="false">' + logoImg + '</button><span class="sitrabot-aviso" aria-hidden="true">Bot del SITRAINA</span>';
    document.body.appendChild(caja);

    var panel = caja.querySelector('.sitrabot-panel');
    var abrir = caja.querySelector('.sitrabot-abrir');
    var cerrar = caja.querySelector('.sitrabot-cerrar');
    var mensajes = caja.querySelector('.sitrabot-mensajes');
    var form = caja.querySelector('.sitrabot-form');
    var campo = form.querySelector('input');

    /* Arma la ruta de un enlace, con ../ si la página está en una subcarpeta. */
    function pagina(ruta) { return raiz + ruta; }

    /* Pasa la pregunta a minúsculas y sin tildes para poder compararla. */
    function sinAcentos(texto) {
        return texto.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    }

    /* Agrega una burbuja al chat. Si la respuesta trae un enlace, lo vuelve un vínculo. */
    function pintar(entrada) {
        var burbuja = document.createElement('div');
        burbuja.className = 'sitrabot-burbuja ' + (entrada.rol === 'user' ? 'sitrabot-user' : 'sitrabot-bot');
        if (entrada.rol === 'user') {
            burbuja.textContent = entrada.texto;
        } else {
            entrada.partes.forEach(function (parte) {
                if (parte.tipo === 'enlace') {
                    var enlace = document.createElement('a');
                    enlace.href = pagina(parte.ruta);
                    enlace.textContent = parte.valor;
                    burbuja.appendChild(enlace);
                } else {
                    burbuja.appendChild(document.createTextNode(parte.valor));
                }
            });
        }
        var esPrimero = mensajes.children.length === 0;
        mensajes.appendChild(burbuja);
        mensajes.scrollTop = esPrimero ? 0 : Math.max(0, burbuja.offsetTop - 8);
        return burbuja;
    }

    /* Guarda la conversación solo en esta sesión del navegador. */
    function guardar() {
        sessionStorage.setItem(clave, JSON.stringify(historial));
    }

    /* Prepara una respuesta del bot, de un solo texto o de varias partes. */
    function bot(partes) {
        if (typeof partes === 'string') partes = [{ tipo: 'texto', valor: partes }];
        return { rol: 'bot', partes: partes };
    }

    /* Un trozo de texto dentro de una respuesta. */
    function txt(valor) { return { tipo: 'texto', valor: valor }; }
    /* Un enlace dentro de una respuesta, con el texto visible y la página de destino. */
    function enl(valor, ruta) { return { tipo: 'enlace', valor: valor, ruta: ruta }; }

    /* Saludo de apertura y lista corta de temas. */
    function bienvenida() {
        return bot('Hola, soy Sitrabot, el asistente de SITRAINA. Puedo orientarte sobre el sindicato, la afiliación, la asesoría legal, tu cuenta, Mis mensajes, los convenios, los documentos y el contacto. ¿Qué necesitás?');
    }

    /* Temas solo del panel / técnico del sitio: el bot público no debe orientar sobre esto. */
    function esTemaAdmin(q) {
        if (/administracion publica|ley general de la administracion|personal administrativo/.test(q)) return false;
        return (
            /panel (de )?(admin|administracion)|acceso (de |al )?admin|login (de |al )?(admin|panel)|entrar al (panel|admin)|cuenta(s)? (de )?admin|usuario(s)? (de )?admin|sitrabot admin|bot (de )?admin/.test(q) ||
            /config(_afiliados|_respuestas)?\.php|config\.php|admin\/config|php\/config|salir\.php|agenda\.php|solicitudes\.php/.test(q) ||
            /info_afiliados|info_consultas|info_cuentas|info_respuestas|admin_info|consulta_contacto|consulta_afiliacion|consulta_asesoria|respuesta_contacto|respuesta_afiliacion|respuesta_asesoria/.test(q) ||
            /phpmyadmin|mysql|mariadb|sql211|if0_|infinityfree|filezilla|\bftp\b|host(ing)? (mysql|de la base)|usuario (mysql|de la base)|clave (mysql|de la base|hash)|clave_hash/.test(q) ||
            /(como |donde )?(creo|crear|hago|hacer|subo|subir|publico|publicar|configuro|conectar|conexion) (la |una |el |las )?(base(s)? de datos|tabla(s)?|servidor|sitio)/.test(q) ||
            /base(s)? de datos|tabla (cuenta|agenda|cuentas)|sql\/0[1-4]|admin\.sql|usuarios\.sql|respuestas\.sql/.test(q) ||
            /papelera|ver solicitudes|aceptar (o |y )?rechazar|fechas guardadas|agregar fecha|horario del panel|dias habiles (del )?panel/.test(q) ||
            /contrasena(s)? (de )?(admin|panel|acceso)|password(s)?|clave_hash|cuenta santiago|santiagoabarcamateo|120360070/.test(q) ||
            /\bcursor\b.*(php|mysql|local|guardar)|localhost|vista previa estatica|codigo (del )?(panel|admin|sitio)|visual studio|vscode/.test(q)
        );
    }

    function rechazoAdmin() {
        return bot('Esa información es solo para quienes administran el sitio. Yo oriento sobre afiliación, asesoría, convenios, documentos y contacto. Para el trabajo interno, usá el acceso de Administración.');
    }

    /* Elige la respuesta. La primera regla que coincide gana, por eso las preguntas concretas van primero. */
    function responder(texto) {
        var q = sinAcentos(texto);
        if (/^(hola|holi|buenas( tardes| noches)?|buenos dias|buen dia|hey|saludos|gracias|muchas gracias|adios|chao|bye|ok|que tal|pura vida)[!. ]*$/.test(q)) return bienvenida();
        if (/que puedes|en que ayudas|que sabes|opciones del chat/.test(q) || /^(ayuda|ayudame|menu)[!. ]*$/.test(q)) return bienvenida();
        if (/que mas puedes|que mas sabes|otros temas|que otras preguntas|mas temas/.test(q)) {
            return bot('También puedo orientarte sobre tu cuenta, Mis mensajes, la etiqueta Editado, cómo pedir cita si tus datos no coinciden, la cuota del 1%, Gaudi, los convenios, las leyes y el tono claro, oscuro o para daltonismo.');
        }
        if (/quien eres|que eres|eres (un )?bot|eres humano|eres una persona|eres abogado|eres abogada/.test(q)) {
            return bot('Soy Sitrabot, el asistente de esta página. Oriento con la información publicada de SITRAINA. No soy una persona abogada ni sustituyo la asesoría legal.');
        }
        if (/guardas (el|la|los|las)? ?(chat|conversacion|mensajes)|privacidad del chat|quien ve (mis )?mensajes/.test(q)) {
            return bot('Las preguntas de este chat se quedan solo en esta visita, en este dispositivo. Para un caso personal, escribinos a sitraina@ina.ac.cr o pedí cita con la asesoría.');
        }
        if (esTemaAdmin(q)) return rechazoAdmin();
        if (/como (envio|enviar|mando|mandar|lleno|llenar|completo|se envia) (un |el |los )?formulari|enviar (un |el )?formulari|envio de formulari/.test(q)) {
            return bot([
                txt('Para enviar un formulario, primero entrá con tu cuenta. Si no hay sesión, el aviso te lleva a iniciar sesión o a crear una cuenta y después volvés a ese formulario. Hay tres: '),
                enl('Afiliación', 'afiliacion.html'),
                txt(' (completá los datos y pulsá Enviar Afiliación; después firmás la copia con Gaudi), '),
                enl('Contacto', 'contacto.html'),
                txt(' (nombre, correo y mensaje) y la cita en '),
                enl('Asesoría', 'asesoria-legal.html'),
                txt(' (motivo, un martes o jueves y la hora).')
            ]);
        }
        if (/informacion (de |del )?sitraina|datos (de |del )?sitraina|correo.{0,24}(numero|telefono).{0,24}direccion|direccion.{0,24}correo/.test(q)) {
            return bot('El correo es sitraina@ina.ac.cr. El teléfono es +506 2220-2480 y el WhatsApp es +506 8448-1450. SITRAINA queda en Avenida 59, Calle 106, Barrio Finca La Caja, Uruca, San José. El código postal es 10107.');
        }
        if (/secretarios|secretarias|todas las secretaria|lista de secretaria|uno por cada uno/.test(q)) {
            return bot('Las secretarías, una por una:\nSecretaría General: Luzmilda Cerdas Rojas, lcerdasrojas@ina.ac.cr.\nSecretaría de la Mujer: Raquel Uribe Berrios, ruribeberrios@ina.ac.cr.\nSecretaría de Investigación: Carlos González Castro, cgonzalezcastro@ina.ac.cr.\nSecretaría de la Educación y Docencia: Luis Diego González Esquivel, lgonzalezesquivel@ina.ac.cr.\nSecretaría de Finanzas: Eunice Villalobos Sanchez, EVillalobosSanchez@ina.ac.cr.\nSecretaría de Conflictos: Eduardo Ortega Rodríguez, EOrtegaRodriguez@ina.ac.cr.\nSecretaría de Propaganda: Vanessa Monge Castillo, VMongeCastillo@ina.ac.cr.');
        }
        if (/mis mensajes|donde (veo|estan|llegan) (las |mis )?respuestas/.test(q)) {
            return bot('Mis mensajes está en el engranaje de la barra, cuando ya entraste. Ahí ves las respuestas de contacto, afiliación o cita, si usaste el mismo correo de tu cuenta. Tocá un mensaje para leerlo completo.');
        }
        if (/etiqueta editado|dice editado|mensaje editado|respuesta editada|por que dice editado/.test(q)) {
            return bot('Editado significa que administración corrigió una respuesta que ya te había enviado. La primera vez que llega no lleva esa etiqueta. Solo aparece si la volvieron a enviar con un cambio.');
        }
        if (/crear cuenta|crear una cuenta|registrarme|iniciar sesion|ingresar a mi cuenta|cerrar sesion|ya inicie sesion/.test(q)) {
            return bot('En el engranaje de la barra están Ayuda, Ingresar y Crear cuenta. La cuenta pide tu nombre y tu cédula; el correo es opcional. Para ingresar usás la cédula. Cuando ya entraste, Ingresar y Crear cuenta se ocultan y quedan Citas, Mis mensajes y Cerrar sesión. Ayuda explica cómo moverte por la página. En Citas ves las confirmadas, las que no se aceptaron y las canceladas.');
        }
        if (/no (me )?deja (pedir|continuar|seguir)( con)?( la)? cita|no coinciden|datos no coinciden|no reconoce (mi |la )?cedula/.test(q)) {
            return bot('Para seguir con la cita, la cédula de 9 dígitos, el nombre completo y el correo tienen que ser exactamente los mismos que administración tiene registrados. Revisá tildes, espacios y el correo. Si siguen sin coincidir, escribí a sitraina@ina.ac.cr.');
        }
        if (/que paginas|que secciones|como navego|mapa del sitio/.test(q)) {
            return bot('El menú tiene Inicio, Conócenos, Afiliación, Asesoría, Documentos y Contacto. En Documentos se abren las efemérides, la Hoja del Miércoles, los convenios, los documentos legales, los informes y las actas.');
        }
        if (/que significa sitraina|siglas de sitraina|siglas|por que se llama sitraina|que quiere decir sitraina/.test(q)) {
            return bot('SITRAINA significa Sindicato de Trabajadores del Instituto Nacional de Aprendizaje.');
        }
        if (/que es el ina|instituto nacional de aprendizaje/.test(q) && !/sitraina/.test(q)) {
            return bot('El INA es el Instituto Nacional de Aprendizaje. SITRAINA es el sindicato de su personal: instructores, personal administrativo, técnicos y funcionarios.');
        }
        if (/cuando se fundo|fecha de fundacion|desde cuando existe|historia del sindicato|desde su fundacion/.test(q)) {
            return bot('En Conócenos se dice que, desde su fundación, SITRAINA defiende los intereses colectivos del personal del INA. Esa página no publica el año de fundación.');
        }
        if (/nuestra labor|defensa laboral|negociacion colectiva|que labor/.test(q)) {
            return bot('En Inicio, Nuestra labor resume tres tareas: defensa laboral, negociación colectiva con el INA y capacitación sindical en derechos, liderazgo y participación.');
        }
        if (/aguinaldo|vacacion|incapacidad|permiso laboral|horas extra|teletrabajo|traslado|ascenso|pension|riesgos del trabajo|salario minimo|aumento salarial|reajuste/.test(q)) {
            return bot([
                txt('Esta página no publica montos de salario, aguinaldo, vacaciones ni incapacidades. Esos temas se ven con la convención colectiva y la asesoría. La convención está en '),
                enl('Documentos', 'documentos.html'),
                txt(' y la cita en '),
                enl('Asesoría', 'asesoria-legal.html'),
                txt('.')
            ]);
        }
        if (/acoso|me acosan/.test(q)) {
            return bot('La Secretaría de Conflictos, Eduardo Ortega Rodríguez, EOrtegaRodriguez@ina.ac.cr, atiende reclamos de las personas afiliadas. También podés pedir apoyo jurídico en Asesoría. Para este tema, escribinos o pedí una cita.');
        }
        if (/huelga|paro laboral|irnos a paro/.test(q)) {
            return bot('El sitio presenta el diálogo, la negociación colectiva y la Secretaría de Conflictos como vías del sindicato. Para un caso concreto, pide cita con la asesoría legal.');
        }
        if (/sabado|domingo|feriado|dia festivo/.test(q)) {
            return bot('La oficina atiende de lunes a viernes, de 7:00 a. m. a 3:00 p. m. Las citas se ofrecen en los días disponibles, de 7:00 a. m. a 2:00 p. m. Un sábado, un domingo o un día que ya pasó no se puede elegir, salvo que ese día aparezca abierto.');
        }
        if (/horario de la cita|horario de citas|hora de la asesoria|a que hora son las citas|hasta que hora pido cita/.test(q)) {
            return bot('Las citas se piden en los días disponibles, entre 7:00 a. m. y 2:00 p. m. La oficina atiende hasta las 3:00 p. m.');
        }
        if (/cancelar (la |una )?cita|cambiar (la |una )?cita|reprogramar|mover la cita|15 dias|quince dias/.test(q)) {
            return bot('Si ya tenés una cita confirmada, en Opciones, dentro de Citas, podés cancelarla. Desde ese momento tenés 15 días para volver a pedir esa misma cita. La nueva queda para el mismo día en que la pedís, si ese día está disponible. Si el plazo se vence, la cita queda cancelada y ya no se recupera. Esos 15 días no impiden pedir otra cita distinta.');
        }
        if (/formsubmit|como (me )?llega (el )?correo|de donde llega (el )?correo|spam de la cita|remitente (del )?correo|respuesta (de la |a la )?cita|guia (del )?correo/.test(q)) {
            return bot([
                txt('La cita queda con el sindicato. Si ya entraste y usaste el correo de tu cuenta, la respuesta aparece en Mis mensajes. En '),
                enl('Solicitar cita', 'solicitar-cita.html'),
                txt(' podés abrir la guía del envío.')
            ]);
        }
        if (/puedo pedir cita si no|cita sin estar afiliad|no estoy afiliad|no soy afiliad/.test(q)) {
            return bot([
                txt('La asesoría legal y los convenios son para personas afiliadas. Si todavía no lo estás, la solicitud está en '),
                enl('Afiliación', 'afiliacion.html'),
                txt('. Para continuar, la cédula, el nombre completo y el correo tienen que coincidir con los que administración registró.')
            ]);
        }
        if (/9 digitos|cedula de la cita|dimex|que cedula/.test(q)) {
            return bot('Para continuar con la cita, escribí tu cédula de 9 dígitos. Es el mismo número que va en la solicitud de afiliación.');
        }
        if (/que datos (pide|lleva|necesita) (la |una )?cita|que debo poner en la cita|que llena la cita/.test(q)) {
            return bot('La solicitud pide nombre completo, cédula de 9 dígitos, correo, teléfono de 8 dígitos, sede o centro de trabajo y el motivo. La cédula, el nombre y el correo tienen que coincidir con los que administración registró. También hay que elegir un día y una hora.');
        }
        if (/cita presencial|cita virtual|es virtual|es presencial|videollamada|por zoom|por teams/.test(q)) {
            return bot('Al pedir la cita elegís si preferís verla en persona o en línea, junto con el día y la hora. Si tenés una duda, escribinos a sitraina@ina.ac.cr o llamá al +506 2220-2480.');
        }
        if (/descargar (el |la )?pdf|pdf de afiliacion|bajar la boleta/.test(q)) {
            return bot('Al enviar la afiliación, te llega una copia a tu correo y también podés descargarla en la misma página. Esa copia se firma con Gaudi y tu firma digital.');
        }
        if (/ya estoy afiliad|como se si estoy|consultar si estoy afiliad|estado de mi afiliacion/.test(q)) {
            return bot('La página no muestra la lista de afiliados. Al pedir cita sí revisa que la cédula, el nombre completo y el correo coincidan con el registro de administración. Para otra consulta, escribí a sitraina@ina.ac.cr.');
        }
        if (/codigo de afiliacion|codigo de afiliado|donde saco el codigo/.test(q)) {
            return bot('Asembis pide un código de afiliación. Los demás convenios piden identificarse como persona afiliada. Si no tienes el código, escribe a sitraina@ina.ac.cr.');
        }
        if (/facebook|instagram|tiktok|tik tok/.test(q)) {
            return bot('SITRAINA está en Facebook como sitraina.cr, en Instagram como sitrainacr y en TikTok como @sitraina. Los enlaces están en el pie de página.');
        }
        if (/codigo postal|10107/.test(q)) {
            return bot('El código postal de la oficina es 10107. La dirección es Avenida 59, Calle 106, Barrio Finca La Caja, Uruca, San José.');
        }
        if (/asembis/.test(q)) {
            return bot([
                txt('Asembis es un convenio para personas afiliadas y pide código de afiliación. Las fichas están en '),
                enl('Convenios', 'convenios/convenios.html'),
                txt('.')
            ]);
        }
        if (/zhen/.test(q)) {
            return bot([
                txt('Clínica Zhen es un convenio. Hay que identificarse como persona afiliada. Revísalo en '),
                enl('Convenios', 'convenios/convenios.html'),
                txt('.')
            ]);
        }
        if (/smartfit|smart fit|gimnasio/.test(q)) {
            return bot([
                txt('SmartFit es un convenio. Hay que identificarse como persona afiliada. Está en '),
                enl('Convenios', 'convenios/convenios.html'),
                txt('.')
            ]);
        }
        if (/fidelitas|santa lucia|sta\.? lucia|ciencias y artes|convenio universitario|universidades/.test(q)) {
            return bot([
                txt('Hay convenio con la Universidad de Ciencias y Artes, la Universidad Fidélitas y la Universidad Santa Lucía. Piden identificarse como persona afiliada. Están en '),
                enl('Convenios', 'convenios/convenios.html'),
                txt('.')
            ]);
        }
        if (/best wester|ponderosa|thermomania|hotel|termas/.test(q)) {
            return bot([
                txt('También hay convenio con Best Western, Ponderosa y Thermomanía, para personas afiliadas. Están en '),
                enl('Convenios', 'convenios/convenios.html'),
                txt('.')
            ]);
        }
        if (/lista de efemerides|que efemerides hay|cuales efemerides|fechas de efemerides/.test(q)) {
            return bot('Las efemérides, en orden, son: 14 de febrero, Amistad; 8 de marzo, Mujer; 11 de abril, Batalla de Rivas; 28 de abril, salud ocupacional; 1 de mayo, Trabajador; 29 de mayo, discapacidad; 5 de junio, ambiente; 12 de junio, océanos y descontaminación acústica; 15 de junio, sembrando futuro; 21 de junio, Padre; 26 de junio, pequeñas acciones; 30 de junio, vidrio por vidrio; 15 de julio, educación técnica; 25 de julio, Anexión de Nicoya; 15 de agosto, Madre; 9 de setiembre, Niñez; 15 de setiembre, Independencia. Al elegir una se abre su información.');
        }
        if (/amistad|san valentin|14 de febrero/.test(q)) {
            return bot('El Día de la Amistad está el 14 de febrero, en Efemérides. Al elegirlo se abre su imagen.');
        }
        if (/dia (internacional )?de la mujer|8 de marzo/.test(q)) {
            return bot('El Día Internacional de la Mujer está el 8 de marzo, en Efemérides. La Secretaría de la Mujer la ocupa Raquel Uribe Berrios, ruribeberrios@ina.ac.cr.');
        }
        if (/batalla de rivas|11 de abril/.test(q)) {
            return bot('El Día de la Batalla de Rivas está el 11 de abril, en Efemérides.');
        }
        if (/salud ocupacional|28 de abril/.test(q)) {
            return bot('El Día Mundial de la Salud Ocupacional está el 28 de abril, en Efemérides.');
        }
        if (/dia (mundial )?del trabajador|1 de mayo|primero de mayo/.test(q)) {
            return bot('El Día Mundial del Trabajador está el 1 de mayo, en Efemérides.');
        }
        if (/personas con discapacidad|29 de mayo/.test(q)) {
            return bot('El Día Nacional de las Personas con Discapacidad está el 29 de mayo, en Efemérides. En documentos legales también está la Ley de Igualdad de Oportunidades para las Personas con Discapacidad.');
        }
        if (/dia del ambiente|medio ambiente|5 de junio|oceanos|descontaminacion acustica|12 de junio|sembrando futuro|15 de junio/.test(q)) {
            return bot('En junio, Efemérides reúne el Día del ambiente (5), océanos y descontaminación acústica (12) y Sembrando futuro, cultivando vida (15).');
        }
        if (/dia del padre|21 de junio/.test(q)) {
            return bot('El Día del Padre está el 21 de junio, en Efemérides.');
        }
        if (/dia de la madre|15 de agosto/.test(q)) {
            return bot('El Día de la Madre está el 15 de agosto, en Efemérides.');
        }
        if (/dia de la ninez|ninez|9 de setiembre|9 de septiembre/.test(q)) {
            return bot('El Día de la Niñez está el 9 de setiembre, en Efemérides.');
        }
        if (/independencia|15 de setiembre|15 de septiembre/.test(q)) {
            return bot('El Día de la Independencia está el 15 de setiembre, en Efemérides.');
        }
        if (/anexion|nicoya|25 de julio|guanacaste/.test(q)) {
            return bot('La Anexión del Partido de Nicoya está el 25 de julio, en Efemérides. En Inicio también están los concursos de bomba y retahíla por esa fecha, publicados el 14 de julio de 2026.');
        }
        if (/vidrio/.test(q)) {
            return bot('El canje vidrio por vidrio está en Efemérides el 30 de junio y en Inicio como comunicado del 30 de junio de 2026.');
        }
        if (/artesania/.test(q)) {
            return bot('El Concurso de Artesanía Colectiva está en Inicio, con fecha 14 de julio de 2026. Invita a crear, con el centro, una artesanía de material reciclado e identidad regional por el 25 de julio. Hay premios en efectivo para los tres primeros lugares.');
        }
        if (/bomba/.test(q)) {
            return bot('El concurso Grabá una bomba está en Inicio, con fecha 14 de julio de 2026, por el 202 aniversario de la Anexión del Partido de Nicoya. Pide un video en vertical con una bomba, mencionar a SITRAINA y enviarlo por correo.');
        }
        if (/retahila/.test(q)) {
            return bot('El concurso Grabá una retahíla está en Inicio, con fecha 14 de julio de 2026. Pide iniciar con el grito típico guanacasteco, grabar en vertical, mencionar a SITRAINA y enviar el video por correo. Hay premios para los tres primeros lugares.');
        }
        if (/asamblea ordinaria|15 de mayo de 2026|asamblea del 15/.test(q)) {
            return bot('La Asamblea Ordinaria 2026 está comunicada en Inicio con fecha 15 de mayo de 2026. Las actas de asambleas ordinarias y extraordinarias se abren en Documentos, tipo Actas de asamblea.');
        }
        if (/constitucion/.test(q)) {
            return bot('La Constitución Política de Costa Rica está en Documentos, tipo Documentos legales.');
        }
        if (/administracion publica/.test(q)) {
            return bot('La Ley General de la Administración Pública está en Documentos, tipo Documentos legales.');
        }
        if (/corrupcion|enriquecimiento ilicito/.test(q)) {
            return bot('La Ley contra la Corrupción y el Enriquecimiento Ilícito está en Documentos, tipo Documentos legales.');
        }
        if (/empleo publico/.test(q)) {
            return bot('La Ley Marco de Empleo Público está en Documentos, tipo Documentos legales.');
        }
        if (/finanzas publicas/.test(q)) {
            return bot('La Ley de Fortalecimiento de las Finanzas Públicas está en Documentos, tipo Documentos legales. La Secretaría de Finanzas del sindicato la ocupa Eunice Villalobos Sanchez.');
        }
        if (/emergencias|prevencion de riesgos/.test(q)) {
            return bot('La Ley Nacional de Emergencias y Prevención de Riesgos está en Documentos, tipo Documentos legales.');
        }
        if (/igualdad de oportunidades|ley de discapacidad/.test(q)) {
            return bot('La Ley de Igualdad de Oportunidades para las Personas con Discapacidad está en Documentos, tipo Documentos legales.');
        }
        if (/reglamento autonomo/.test(q)) {
            return bot('El Reglamento Autónomo de Servicios del INA está en Documentos, tipo Documentos legales, junto con la convención colectiva y los estatutos.');
        }
        if (/machote|oficios 2026|modelo de oficio/.test(q)) {
            return bot('El machote de oficios 2026 está en Documentos, tipo Documentos legales.');
        }
        if (/que leyes|cuales leyes|lista de leyes|documentos legales/.test(q)) {
            return bot('En Documentos legales están la Constitución, el Código de Trabajo, la Ley General de la Administración Pública, la ley contra la corrupción, la Ley Marco de Empleo Público, la de finanzas públicas, la de igualdad de oportunidades, la de emergencias, la convención colectiva, el reglamento autónomo, los estatutos y el machote de oficios 2026.');
        }
        if (/aisha|blackwood/.test(q)) {
            return bot('Aisha Blackwood Barret es Vocal 1. Sustituye las vacantes de las personas titulares. Su correo es ABlackwoodBarret@ina.ac.cr.');
        }
        if (/marielos|bermudez/.test(q)) {
            return bot('Marielos Bermúdez Araya es Vocal 2. Sustituye las vacantes de las personas titulares. Su correo es MBermudezAraya@ina.ac.cr.');
        }
        if (/cristhofer|cristofer|hernandez guzman/.test(q)) {
            return bot('Cristhofer Hernández Guzmán es Vocal 3. Sustituye las vacantes de las personas titulares. Su correo es chernandezguzman@ina.ac.cr.');
        }
        if (/eduardo ortega|eortega/.test(q)) {
            return bot('Eduardo Ortega Rodríguez ocupa la Secretaría de Conflictos, EOrtegaRodriguez@ina.ac.cr. Previene conflictos, atiende reclamos individuales o colectivos y vela por el cumplimiento de la convención colectiva.');
        }
        if (/walia|baltodano/.test(q)) {
            return bot('Walia Baltodano Fernández tiene un informe de labores en Documentos, tipo Informes de labores.');
        }
        if (/como (abro|veo|reproduzco) (el |la |un )?video|video de la hoja/.test(q)) {
            return bot('En la Hoja del Miércoles se abre la edición con un clic. El video se reproduce ahí mismo. No hace falta pasar el cursor por encima.');
        }

        /* A partir de aquí siguen las respuestas de afiliación, asesoría, contacto, documentos y Junta. */
        if (/cuota|1 ?%|porcentaje|cuanto cuesta|cuanto se paga|cuanto pagan|cuanto descuent|descuento del salario|deduc/.test(q)) {
            return bot('La solicitud autoriza a Recursos Humanos del INA a deducir el 1% mensual del salario a favor de SITRAINA. La Secretaría de Finanzas administra esas cuotas.');
        }
        if (/gaudi|firma digital|certificado digital/.test(q)) {
            return bot('Al enviar la afiliación te llega una copia para descargar. Hay que firmarla con Gaudi y tu firma digital. Sin esa firma, la afiliación no queda en firme.');
        }
        if (/desafil|darme de baja|salirme|renunciar al sindicato|ya no quiero estar/.test(q)) {
            return bot([
                txt('Para dejar el sindicato, escribinos a sitraina@ina.ac.cr. La solicitud de ingreso está en '),
                enl('Afiliación', 'afiliacion.html'),
                txt('.')
            ]);
        }
        if (/quien puede|quienes pueden|requisito|no trabajo|no soy del ina|no soy funcionario|estudiante|puedo afiliarme si/.test(q)) {
            return bot('La afiliación es para personas trabajadoras del INA: instructores, personal administrativo, técnicos y funcionarios. Te pedimos nombre, cédula, correos, fecha de nacimiento, tipo de nombramiento, unidad, centro, puesto y teléfonos.');
        }
        if (/que gano|para que afil|por que afil|ventaja|beneficio de afil/.test(q)) {
            return bot([
                txt('Afiliarse es sumarse a la defensa de los derechos laborales del personal del INA. Quien está afiliado recibe apoyo jurídico en temas laborales y puede usar los convenios. La solicitud está en '),
                enl('Afiliación', 'afiliacion.html'),
                txt(' y los convenios en '),
                enl('Convenios', 'convenios/convenios.html'),
                txt('.')
            ]);
        }
        if (/secretaria de afiliacion|miguel vargas/.test(q)) {
            return bot('Las consultas de afiliación se atienden en sitraina@ina.ac.cr. La solicitud está en Afiliación.');
        }
        if (/afili|boleta|inscrib|unirme|hacerme miembro|como me uno/.test(q)) {
            return bot([
                txt('Completá la solicitud en '),
                enl('Afiliación', 'afiliacion.html'),
                txt('. Pide datos personales, ubicación laboral y teléfonos, y autoriza el 1% mensual del salario. Después hay que firmar la copia con Gaudi.')
            ]);
        }

        if (/alonso|arley|esteban calvo|mainor|quienes son los abogad|equipo juridico|equipo legal/.test(q)) {
            return bot([
                txt('El equipo está en '),
                enl('Asesoría', 'asesoria-legal.html'),
                txt('. Lic. Alonso Arley Alvarado, derecho laboral. Lic. Esteban Calvo, derecho laboral y convención colectiva. Lic. Mainor Castillo, consultor en derecho penal y procesal.')
            ]);
        }
        if (/gratis|gratuito|cuesta la asesoria|hay que pagar la cita/.test(q)) {
            return bot('SITRAINA ofrece apoyo jurídico gratuito a sus personas afiliadas en temas laborales. La cita se reserva en el calendario, entre hoy y los próximos 15 días, en un horario libre.');
        }
        if (/cita|asesor|abogad|juridic|consulta legal|defensa legal/.test(q)) {
            return bot([
                txt('La cita se pide en '),
                enl('Asesoría', 'asesoria-legal.html'),
                txt(' o directo en '),
                enl('solicitar cita', 'solicitar-cita.html'),
                txt('. Elegís un día disponible de los próximos 15 días, una hora libre y si preferís la cita en persona o en línea. Al confirmar, ese espacio queda reservado para vos.')
            ]);
        }

        if (/horario|hora de|atienden|abren|cierran|a que hora/.test(q)) {
            return bot('La oficina atiende de lunes a viernes, de 7:00 a. m. a 3:00 p. m.');
        }
        if (/whatsapp|whats app/.test(q)) {
            return bot('El WhatsApp de SITRAINA es +506 8448-1450.');
        }
        if (/telefono|llamar|numero de/.test(q)) {
            return bot('El teléfono de la oficina es +506 2220-2480. También está el WhatsApp +506 8448-1450.');
        }
        if (/direccion|ubicacion|donde queda|donde estan|donde queda|uruca|como llego|mapa/.test(q)) {
            return bot('SITRAINA queda en Avenida 59, Calle 106, Barrio Finca La Caja, Uruca, San José. El código postal es 10107.');
        }
        if (/correo|email|e-mail|contact|formulario/.test(q)) {
            return bot([
                txt('El correo es sitraina@ina.ac.cr. También podés llamar al +506 2220-2480 o escribir por WhatsApp al +506 8448-1450. Para escribirnos, entrá en '),
                enl('Contacto', 'contacto.html'),
                txt('.')
            ]);
        }

        if (/efemeride|conmemor|dia del trabajador|dia de la madre|independencia|nicoya/.test(q)) {
            return bot([
                txt('Las efemérides están en orden de fecha. Al elegir una se abre su información y la imagen o el video. Entra en '),
                enl('Efemérides', 'efemerides.html'),
                txt('.')
            ]);
        }
        if (/hoja del miercoles|hoja semanal|volumen/.test(q)) {
            return bot([
                txt('La Hoja del Miércoles reúne las ediciones semanales del sindicato. Se consulta en '),
                enl('Hoja del Miércoles', 'hojamier/galeria.html'),
                txt('.')
            ]);
        }
        if (/convenio|asembis|smartfit|zhen|fidelitas|ponderosa|thermoman|best wester|descuento|alianza|beneficio/.test(q)) {
            return bot([
                txt('Los convenios son beneficios y alianzas para personas afiliadas. En la página aparecen Asembis, Clínica Zhen, SmartFit, universidades, Best Western, Ponderosa y Thermomanía. Revísalos en '),
                enl('Convenios', 'convenios/convenios.html'),
                txt('.')
            ]);
        }
        if (/estatuto/.test(q)) {
            return bot([
                txt('Los estatutos están entre los documentos legales, junto con la convención colectiva, el reglamento autónomo y varias leyes. Ábrelos en '),
                enl('Documentos', 'documentos.html'),
                txt('.')
            ]);
        }
        if (/convencion colectiva|convenio colectivo/.test(q)) {
            return bot([
                txt('La convención colectiva del INA está en documentos legales. La Secretaría de Conflictos vela por su cumplimiento. El archivo se abre desde '),
                enl('Documentos', 'documentos.html'),
                txt('.')
            ]);
        }
        if (/acta|asamblea/.test(q)) {
            return bot([
                txt('Las actas de asambleas ordinarias y extraordinarias están en '),
                enl('Documentos', 'documentos.html'),
                txt(', en el tipo Actas de asamblea. En Inicio también está el comunicado de la Asamblea Ordinaria del 15 de mayo de 2026.')
            ]);
        }
        if (/informe/.test(q)) {
            return bot([
                txt('Los informes de labores de la Junta Directiva y de las secretarías están en '),
                enl('Documentos', 'documentos.html'),
                txt(', en el tipo Informes de labores.')
            ]);
        }
        if (/codigo de trabajo|leyes|ley |reglamento|documento|machote|oficio/.test(q)) {
            return bot([
                txt('En '),
                enl('Documentos', 'documentos.html'),
                txt(' se elige el tipo: efemérides, Hoja del Miércoles, convenios, documentos legales, informes o actas. Los legales incluyen la Constitución, el Código de Trabajo, la convención colectiva, el reglamento y los estatutos.')
            ]);
        }

        if (/concurso|artesania|bomba|retahila|comunicado|vidrio|noticia/.test(q)) {
            return bot([
                txt('En '),
                enl('Inicio', 'index.html'),
                txt(' están los últimos comunicados: concursos de artesanía, bomba y retahíla por la Anexión de Nicoya, la jornada vidrio por vidrio y la Asamblea Ordinaria del 15 de mayo de 2026.')
            ]);
        }
        if (/conflicto|reclamo|despid|desped|hostig|queja laboral|me estan|me quieren echar/.test(q)) {
            return bot([
                txt('La Secretaría de Conflictos, Eduardo Ortega Rodríguez, EOrtegaRodriguez@ina.ac.cr, atiende reclamos individuales o colectivos y vela por la convención colectiva. También puedes pedir cita en '),
                enl('Asesoría', 'asesoria-legal.html'),
                txt('.')
            ]);
        }

        if (/secretaria general|luzmilda/.test(q)) {
            return bot('La Secretaría General la ocupa Luzmilda Cerdas Rojas, lcerdasrojas@ina.ac.cr. Lleva la dirección estratégica, la representación legal y la coordinación general.');
        }
        if (/secretaria de la mujer|de la mujer|raquel/.test(q)) {
            return bot('La Secretaría de la Mujer la ocupa Raquel Uribe Berrios, ruribeberrios@ina.ac.cr. Promueve la participación de las mujeres trabajadoras y la defensa de sus derechos laborales.');
        }
        if (/investigacion|carlos gonzalez/.test(q)) {
            return bot('La Secretaría de Investigación la ocupa Carlos González Castro, cgonzalezcastro@ina.ac.cr. Hace estudios sobre condiciones laborales y propuestas de mejora.');
        }
        if (/docencia|educacion sindical|luis diego|talleres|capacitacion sindical/.test(q)) {
            return bot('La Secretaría de la Educación y Docencia la ocupa Luis Diego González Esquivel, lgonzalezesquivel@ina.ac.cr. Organiza capacitación sindical, talleres y formación en derechos laborales.');
        }
        if (/finanzas|eunice|presupuesto/.test(q)) {
            return bot('La Secretaría de Finanzas la ocupa Eunice Villalobos Sanchez, EVillalobosSanchez@ina.ac.cr. Administra el presupuesto, las cuotas y el control financiero.');
        }
        if (/propaganda|vanessa|redes sociales/.test(q)) {
            return bot('La Secretaría de Propaganda la ocupa Vanessa Monge Castillo, VMongeCastillo@ina.ac.cr. Coordina la comunicación, las publicaciones, las redes y las campañas de afiliación.');
        }
        if (/fiscal|maribel/.test(q)) {
            return bot('Las consultas de fiscalía se atienden en sitraina@ina.ac.cr.');
        }
        if (/vocal|aisha|marielos|cristhofer|cristofer/.test(q)) {
            return bot('Las vocalías las ocupan Aisha Blackwood Barret, Marielos Bermúdez Araya y Cristhofer Hernández Guzmán. Sustituyen las vacantes de las personas titulares. Sus correos se ven al elegir la tarjeta en Inicio.');
        }
        if (/junta|directiv|secretaria/.test(q)) {
            return bot([
                txt('La Junta Directiva está en '),
                enl('Inicio', 'index.html'),
                txt('. Se recorre con las flechas o la rueda del mouse. Al elegir una persona se abre su puesto, su correo y su fotografía.')
            ]);
        }

        if (/mision/.test(q)) {
            return bot([
                txt('La misión es promover la unidad y defender los derechos laborales de las personas trabajadoras del INA, con negociación colectiva y representación efectiva. Está en '),
                enl('Conócenos', 'quiensomos.html'),
                txt('.')
            ]);
        }
        if (/vision/.test(q)) {
            return bot([
                txt('La visión es ser un sindicato referente nacional, que impulse el desarrollo de sus afiliados y el sistema de educación técnica de Costa Rica. Está en '),
                enl('Conócenos', 'quiensomos.html'),
                txt('.')
            ]);
        }
        if (/valores/.test(q)) {
            return bot('Los valores de SITRAINA son unidad, justicia, solidaridad y transparencia.');
        }
        if (/quienes|que es sitraina|que es el sindicato|sindicato|que hacen|a que se dedican/.test(q)) {
            return bot([
                txt('SITRAINA es el Sindicato de Trabajadores del Instituto Nacional de Aprendizaje. Representa a instructores, personal administrativo, técnicos y funcionarios del INA, y defiende sus derechos con diálogo, negociación colectiva y apoyo legal. Más detalle en '),
                enl('Conócenos', 'quiensomos.html'),
                txt('.')
            ]);
        }
        if (/modo oscuro|modo claro|tono oscuro|tema oscuro|sol y luna|cambiar el color|dalton/.test(q)) {
            return bot('El botón de sol o luna, en la barra, cambia el tono claro u oscuro. En el engranaje también está el modo para daltonismo: cambia el rojo por azul para distinguir mejor los colores. La barra y el pie se mantienen del color del modo elegido.');
        }

        return bot([
            txt('No tengo esa respuesta exacta. Puedes escribir a sitraina@ina.ac.cr, llamar al +506 2220-2480 o usar '),
            enl('Contacto', 'contacto.html'),
            txt('. También puedo orientarte sobre afiliación, cuota, asesoría legal, convenios, documentos y la Junta Directiva.')
        ]);
    }

    /* Muestra el saludo solo la primera vez que se abre el chat en esta visita. */
    function mostrarBienvenida() {
        if (historial.length) return;
        var saludo = bienvenida();
        historial.push(saludo);
        pintar(saludo);
        guardar();
    }

    /* Abre el panel del chat y deja el cursor en la caja de la pregunta. */
    function abrirChat() {
        caja.classList.add('sitrabot-abierto');
        panel.setAttribute('aria-hidden', 'false');
        abrir.setAttribute('aria-expanded', 'true');
        abrir.setAttribute('aria-hidden', 'true');
        abrir.tabIndex = -1;
        mostrarBienvenida();
        mensajes.scrollTop = 0;
        campo.focus();
    }

    /* Cierra el panel y vuelve a mostrar el botón redondo del bot. */
    function cerrarChat(enfocar) {
        caja.classList.remove('sitrabot-abierto');
        panel.setAttribute('aria-hidden', 'true');
        abrir.setAttribute('aria-expanded', 'false');
        abrir.removeAttribute('aria-hidden');
        abrir.tabIndex = 0;
        if (enfocar !== false) abrir.focus();
    }

    historial.forEach(pintar);
    abrir.addEventListener('click', abrirChat);
    cerrar.addEventListener('click', cerrarChat);
    document.addEventListener('keydown', function (evento) {
        if (evento.key === 'Escape' && caja.classList.contains('sitrabot-abierto')) cerrarChat();
    });
    /* Un clic en la página, fuera del panel, cierra el chat. */
    document.addEventListener('pointerdown', function (evento) {
        if (!caja.classList.contains('sitrabot-abierto') || caja.contains(evento.target)) return;
        cerrarChat(false);
    });
    form.addEventListener('submit', function (evento) {
        evento.preventDefault();
        var texto = campo.value.trim();
        if (!texto) return;
        var usuario = { rol: 'user', texto: texto };
        historial.push(usuario);
        pintar(usuario);
        campo.value = '';
        guardar();
        var espera = pintar({ rol: 'bot', partes: [{ tipo: 'texto', valor: '…' }] });
        espera.classList.add('sitrabot-espera');
        window.setTimeout(function () {
            espera.remove();
            var respuesta = responder(texto);
            historial.push(respuesta);
            pintar(respuesta);
            guardar();
        }, 450);
    });
})();
