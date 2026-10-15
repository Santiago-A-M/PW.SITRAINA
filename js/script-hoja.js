/* Hoja del Miércoles: abre la edición con un clic y reproduce el video en el panel. */
document.addEventListener('DOMContentLoaded', () => {
    const popup = document.getElementById('hoja-popup');
    if (!popup) return;

    const video = document.getElementById('hoja-popup-video');
    const titulo = document.getElementById('hoja-popup-titulo');
    const descripcion = document.getElementById('hoja-popup-desc');
    const pdf = document.getElementById('hoja-popup-pdf');
    const copiar = document.getElementById('hoja-popup-copiar');
    const cerrar = popup.querySelector('.hoja-cerrar');
    let origen = null;
    let rutaActual = '';

    /* Muestra el primer cuadro del video para que no se vea en negro. */
    const mostrarCuadro = () => {
        if (!popup.classList.contains('abierta') || !video.getAttribute('src')) return;
        video.removeEventListener('loadeddata', mostrarCuadro);
        if (video.readyState < 2 || video.currentTime > 0) return;
        const detener = () => video.pause();
        video.addEventListener('seeked', detener, { once: true });
        try {
            video.currentTime = 0.05;
        } catch (error) {
            video.removeEventListener('seeked', detener);
        }
    };

    video.addEventListener('click', (evento) => {
        if (evento.target !== video) return;
        const desdeAbajo = video.clientHeight - evento.offsetY;
        if (desdeAbajo < 16) return;
        const estabaPausado = video.paused || video.ended;
        setTimeout(() => {
            if (!popup.classList.contains('abierta')) return;
            const sigueIgual = (video.paused || video.ended) === estabaPausado;
            if (!sigueIgual) return;
            if (estabaPausado) {
                const reproduccion = video.play();
                if (reproduccion) reproduccion.catch(() => {});
            } else {
                video.pause();
            }
        }, 0);
    });

    /* Abre el panel de una edición, carga su video y, si tiene, el PDF. */
    const abrir = (boton) => {
        origen = boton;
        rutaActual = boton.dataset.src || '';
        titulo.textContent = boton.dataset.titulo || boton.textContent;
        descripcion.textContent = boton.dataset.desc || '';
        video.pause();
        video.preload = 'auto';
        video.removeEventListener('loadeddata', mostrarCuadro);
        video.addEventListener('loadeddata', mostrarCuadro);
        video.src = rutaActual;
        video.load();
        if (boton.dataset.pdf) {
            pdf.hidden = false;
            pdf.href = boton.dataset.pdf;
            pdf.innerHTML = '<i class="fas fa-file-pdf"></i> ' + (boton.dataset.pdfNombre || 'Descargar');
        } else {
            pdf.hidden = true;
            pdf.removeAttribute('href');
        }
        popup.classList.add('abierta');
        popup.setAttribute('aria-hidden', 'false');
        document.body.classList.add('hoja-abierta');
        cerrar.focus();
    };

    /* Cierra el panel, detiene el video y devuelve el foco a la edición. */
    const cerrarPopup = () => {
        if (!popup.classList.contains('abierta')) return;
        video.pause();
        video.removeAttribute('src');
        video.load();
        popup.classList.remove('abierta');
        popup.setAttribute('aria-hidden', 'true');
        document.body.classList.remove('hoja-abierta');
        if (origen) origen.focus();
    };

    document.querySelectorAll('.hoja-titulo').forEach((boton) => {
        boton.addEventListener('click', () => abrir(boton));
    });

    cerrar.addEventListener('click', cerrarPopup);
    popup.addEventListener('click', (evento) => {
        if (evento.target === popup) cerrarPopup();
    });
    document.addEventListener('keydown', (evento) => {
        if (evento.key === 'Escape') cerrarPopup();
    });
    copiar.addEventListener('click', () => {
        if (rutaActual) copiarVinculo(rutaActual, copiar);
    });
});

/* Copia la dirección del video y cambia el botón a "Copiado" por dos segundos. */
function copiarVinculo(rutaVideo, boton) {
    const urlCompleta = window.location.origin + window.location.pathname.replace('galeria.html', '') + rutaVideo;

    navigator.clipboard.writeText(urlCompleta).then(() => {
        const textoOriginal = boton.innerHTML;
        boton.classList.add('copiado');
        boton.innerHTML = '<i class="fas fa-check"></i> ¡Copiado!';

        setTimeout(() => {
            boton.classList.remove('copiado');
            boton.innerHTML = textoOriginal;
        }, 2000);
    }).catch(() => {});
}
