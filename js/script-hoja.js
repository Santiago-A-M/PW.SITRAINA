document.addEventListener('DOMContentLoaded', () => {
    const videos = document.querySelectorAll('.tarjeta-video video');

    videos.forEach(video => {
        // Pausar otros videos cuando uno empieza a reproducirse
        video.addEventListener('play', () => {
            videos.forEach(v => {
                if (v !== video) {
                    v.pause();
                }
            });
        });
    });
    
    console.log("Galería de videos cargada correctamente.");
});

function copiarVinculo(rutaVideo, boton) {
    // Construye la URL completa (esto toma la dirección actual de la página)
    const urlCompleta = window.location.origin + window.location.pathname.replace('galeria.html', '') + rutaVideo;

    // Intenta copiar al portapapeles
    navigator.clipboard.writeText(urlCompleta).then(() => {
        // Feedback visual: cambia el texto del botón temporalmente
        const textoOriginal = boton.innerHTML;
        boton.classList.add('copiado');
        boton.innerHTML = '<i class="fas fa-check"></i> ¡Copiado!';

        setTimeout(() => {
            boton.classList.remove('copiado');
            boton.innerHTML = textoOriginal;
        }, 2000);
    }).catch(err => {
        console.error('Error al copiar: ', err);
    });
}