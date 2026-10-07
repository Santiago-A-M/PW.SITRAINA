document.addEventListener('DOMContentLoaded', () => {
    
    // --- 1. MENÚ HAMBURGUESA ---
    const btnMenu = document.getElementById('btn-menu');
    const menuPrincipal = document.getElementById('menu-principal');

    if (btnMenu && menuPrincipal) {
        btnMenu.onclick = function(e) {
            e.preventDefault();
            menuPrincipal.classList.toggle('active');
            // Cambia el icono de hamburguesa ☰ a X y viceversa
            this.textContent = menuPrincipal.classList.contains('active') ? '✕' : '☰';
        };
    }

    // --- 2. MODO OSCURO (CORREGIDO) ---
    const toggleDark = document.getElementById("toggle-oscuro");
    
    // Al cargar: verificar estado guardado
    if (localStorage.getItem("modoOscuro") === "true") {
        document.body.classList.add("dark-mode");
        if (toggleDark) toggleDark.textContent = "☀️";
    }

    if (toggleDark) {
        toggleDark.onclick = () => {
            document.body.classList.toggle("dark-mode");
            const esDark = document.body.classList.contains("dark-mode");
            localStorage.setItem("modoOscuro", esDark);
            
            // Feedback visual en el botón
            toggleDark.textContent = esDark ? "☀️" : "🌙";
        };
    }

    // --- 3. MODO ACCESIBILIDAD / DALTONISMO (NUEVO Y FUNCIONAL) ---
    const btnDaltonismo = document.getElementById("toggle-daltonismo");
    
    // Al cargar: verificar estado guardado
    if (localStorage.getItem("modoDaltonismo") === "true") {
        document.body.classList.add("modo-accesible");
    }

    if (btnDaltonismo) {
        btnDaltonismo.onclick = () => {
            document.body.classList.toggle("modo-accesible");
            const esAcc = document.body.classList.contains("modo-accesible");
            localStorage.setItem("modoDaltonismo", esAcc);
            
            //console.log("Accesibilidad:", esAcc); // Para pruebas
        };
    }

    // --- 4. ZOOM PARA EFEMÉRIDES (LIGHTBOX) ---
    const lightbox = document.getElementById("lightbox");
    const imgExpandida = document.getElementById("img-expandida");
    const cerrarBtn = document.querySelector(".cerrar-lightbox");

    if (lightbox && imgExpandida) {
        // Busca imágenes con la clase 'img-zoomable'
        const imagenesZoom = document.querySelectorAll('.img-zoomable');
        
        imagenesZoom.forEach(img => {
            img.onclick = function() {
                lightbox.style.display = "block";
                imgExpandida.src = this.src;
                // Bloquea el scroll del fondo
                document.body.style.overflow = "hidden";
            }
        });

        // Función para cerrar
        const cerrarZoom = () => {
            lightbox.style.display = "none";
            document.body.style.overflow = "auto";
        };

        if (cerrarBtn) cerrarBtn.onclick = cerrarZoom;
        
        // Cerrar al hacer clic en el fondo negro
        lightbox.onclick = (e) => {
            if (e.target !== imgExpandida) {
                cerrarZoom();
            }
        };
    }
});

