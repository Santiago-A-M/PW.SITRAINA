function filtrar(categoria) {
    // 1. Seleccionar todos los botones de categoría y todas las tarjetas
    const botones = document.querySelectorAll('.btn-categoria');
    const tarjetas = document.querySelectorAll('.tarjeta-pagina');

    // 2. Quitar la clase 'active' de TODOS los botones
    botones.forEach(btn => btn.classList.remove('active'));

    // 3. Buscar el botón que se presionó y ponerle la clase 'active'
    // Buscamos el botón cuyo texto coincida con la categoría o que disparó el evento
    event.currentTarget.classList.add('active');

    // 4. Lógica de filtrado de las tarjetas
    tarjetas.forEach(tarjeta => {
        const catTarjeta = tarjeta.getAttribute('data-category');
        
        if (categoria === 'todos' || catTarjeta === categoria) {
            tarjeta.style.display = 'block'; // Mostrar
            setTimeout(() => { tarjeta.style.opacity = '1'; }, 10);
        } else {
            tarjeta.style.opacity = '0'; // Efecto de desvanecer
            setTimeout(() => { tarjeta.style.display = 'none'; }, 300); // Ocultar
        }
    });
}


function abrirImagen(src) {
    const modal = document.getElementById('modal-imagen');
    const imgMax = document.getElementById('imagen-maximizada');
    
    // Mostramos el modal y asignamos la fuente de la imagen
    modal.style.display = 'flex';
    imgMax.src = src;
    
    // Bloqueamos el scroll para que no se mueva el fondo
    document.body.style.overflow = 'hidden';
}

function cerrarImagen() {
    const modal = document.getElementById('modal-imagen');
    modal.style.display = 'none';
    
    // Devolvemos el scroll a la normalidad
    document.body.style.overflow = 'auto';
}
