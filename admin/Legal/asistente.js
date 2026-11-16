(function () {
    var raiz = document.getElementById('legal-asistente');
    var abrirBtn = document.getElementById('legal-asistente-abrir');
    var panel = document.getElementById('legal-asistente-panel');
    var mensajes = document.getElementById('legal-asistente-mensajes');
    var form = document.getElementById('legal-asistente-form');
    var campo = document.getElementById('legal-asistente-texto');
    var estado = document.getElementById('legal-asistente-estado');
    var punto = document.getElementById('legal-asistente-punto');
    if (!raiz || !abrirBtn || !panel || !mensajes || !form || !campo) return;

    var bienvenida = '¡Hola! Soy el asistente de ayuda del panel de abogados de Sitraina. Puedo orientarte sobre cómo consultar citas, revisar información y utilizar las herramientas disponibles en este panel. ¿En qué puedo ayudarte?';
    var enviando = false;
    var token = document.body.getAttribute('data-token') || '';

    function burbuja(texto, quien) {
        var nodo = document.createElement('p');
        nodo.className = 'legal-asistente-burbuja legal-asistente-' + quien;
        nodo.textContent = texto;
        mensajes.appendChild(nodo);
        mensajes.scrollTop = mensajes.scrollHeight;
        return nodo;
    }

    function pintarHistorial(lista) {
        mensajes.textContent = '';
        burbuja(bienvenida, 'bot');
        (lista || []).forEach(function (item) {
            if (!item || !item.texto) return;
            burbuja(item.texto, item.rol === 'user' ? 'user' : 'bot');
        });
    }

    function marcarEstado(listo) {
        if (punto) punto.classList.toggle('legal-asistente-punto-listo', !!listo);
        if (estado) estado.textContent = listo ? 'Disponible' : 'Sin conexión';
    }

    function abierto() {
        return raiz.classList.contains('legal-asistente-abierto');
    }

    function mostrar(abrir) {
        raiz.classList.toggle('legal-asistente-abierto', abrir);
        if (abrir) raiz.classList.remove('legal-asistente-min');
        abrirBtn.setAttribute('aria-expanded', abrir ? 'true' : 'false');
        panel.setAttribute('aria-hidden', abrir ? 'false' : 'true');
        if (abrir) campo.focus();
    }

    fetch('asistente.php', { credentials: 'same-origin', cache: 'no-store' })
        .then(function (r) { return r.json().catch(function () { return null; }); })
        .then(function (json) {
            if (!json || !json.ok) {
                marcarEstado(false);
                pintarHistorial([]);
                return;
            }
            marcarEstado(!!json.listo);
            pintarHistorial(json.mensajes || []);
        })
        .catch(function () {
            marcarEstado(false);
            pintarHistorial([]);
        });

    abrirBtn.addEventListener('click', function () {
        mostrar(!abierto());
    });

    var cerrarBtn = document.getElementById('legal-asistente-cerrar');
    if (cerrarBtn) cerrarBtn.addEventListener('click', function () { mostrar(false); });

    var minBtn = document.getElementById('legal-asistente-min');
    if (minBtn) {
        minBtn.addEventListener('click', function () {
            var minimo = !raiz.classList.contains('legal-asistente-min');
            raiz.classList.toggle('legal-asistente-min', minimo);
            minBtn.setAttribute('aria-expanded', minimo ? 'false' : 'true');
        });
    }

    var nuevaBtn = document.getElementById('legal-asistente-nueva');
    if (nuevaBtn) {
        nuevaBtn.addEventListener('click', function () {
            if (enviando) return;
            var cuerpo = new FormData();
            cuerpo.append('token', token);
            cuerpo.append('accion', 'nueva');
            fetch('asistente.php', { method: 'POST', body: cuerpo, credentials: 'same-origin', cache: 'no-store' })
                .then(function (r) { return r.json().catch(function () { return null; }); })
                .then(function (json) {
                    if (!json || !json.ok) return;
                    pintarHistorial([]);
                })
                .catch(function () {});
        });
    }

    document.addEventListener('keydown', function (ev) {
        if (ev.key !== 'Escape' || !abierto()) return;
        var popup = document.getElementById('legal-popup');
        if (popup && !popup.hidden) return;
        mostrar(false);
    });

    form.addEventListener('submit', function (ev) {
        ev.preventDefault();
        if (enviando) return;
        var texto = campo.value.trim();
        if (!texto) return;
        enviando = true;
        campo.disabled = true;
        burbuja(texto, 'user');
        campo.value = '';
        var espera = burbuja('Estoy preparando la respuesta…', 'bot');
        espera.classList.add('legal-asistente-espera');
        var cuerpo = new FormData();
        cuerpo.append('token', token);
        cuerpo.append('accion', 'mensaje');
        cuerpo.append('mensaje', texto);
        fetch('asistente.php', { method: 'POST', body: cuerpo, credentials: 'same-origin', cache: 'no-store' })
            .then(function (r) {
                return r.json().catch(function () { return null; }).then(function (json) {
                    return { estado: r.status, json: json };
                });
            })
            .then(function (resultado) {
                var json = resultado.json;
                if (resultado.estado === 401) {
                    espera.textContent = 'La sesión se cerró. Volvé a entrar al panel.';
                    return;
                }
                if (!json || !json.ok) {
                    espera.textContent = (json && json.mensaje) || 'No hay conexión con el asistente en este momento. Probá de nuevo en un rato.';
                    return;
                }
                espera.textContent = json.respuesta || 'No pude preparar la respuesta. Probá de nuevo.';
            })
            .catch(function () {
                espera.textContent = 'No hay conexión con el asistente en este momento. Probá de nuevo en un rato.';
            })
            .then(function () {
                espera.classList.remove('legal-asistente-espera');
                enviando = false;
                campo.disabled = false;
                campo.focus();
                mensajes.scrollTop = mensajes.scrollHeight;
            });
    });
})();
