/* Botón de tono del panel admin: misma animación sol/luna que el sitio público. */
(function () {
    var boton = document.getElementById('toggle-oscuro');
    if (!boton) return;

    var aplicarOscuro = function (activo) {
        document.documentElement.classList.toggle('dark-mode', activo);
        document.body.classList.toggle('dark-mode', activo);
    };

    if (localStorage.getItem('modoOscuro') === 'true') {
        aplicarOscuro(true);
    } else if (document.documentElement.classList.contains('dark-mode')) {
        document.body.classList.add('dark-mode');
    }

    var actualizarTono = function () {
        var esDark = document.body.classList.contains('dark-mode');
        var etiqueta = esDark ? 'Activar tono claro' : 'Activar tono oscuro';
        boton.title = etiqueta;
        boton.setAttribute('aria-label', etiqueta);
    };

    var temaAnimTimer = null;
    var preferirMenosMovimiento = function () {
        return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    };

    var cambiarTono = function () {
        aplicarOscuro(!document.body.classList.contains('dark-mode'));
        localStorage.setItem('modoOscuro', document.body.classList.contains('dark-mode'));
        actualizarTono();
    };

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
})();
