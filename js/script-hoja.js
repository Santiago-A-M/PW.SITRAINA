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

    const abrir = (boton) => {
        origen = boton;
        rutaActual = boton.dataset.src || '';
        titulo.textContent = boton.dataset.titulo || boton.textContent;
        descripcion.textContent = boton.dataset.desc || '';
        video.pause();
        video.src = rutaActual;
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
