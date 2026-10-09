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

    // --- 2. TONO CLARO / OSCURO ---
    const toggleDark = document.getElementById("toggle-oscuro");
    localStorage.removeItem("modoDaltonismo");

    const aplicarOscuro = (activo) => {
        document.documentElement.classList.toggle("dark-mode", activo);
        document.body.classList.toggle("dark-mode", activo);
    };

    if (localStorage.getItem("modoOscuro") === "true") {
        aplicarOscuro(true);
    }

    if (toggleDark) {
        const actualizarTono = () => {
            const esDark = document.body.classList.contains("dark-mode");
            const etiqueta = esDark ? "Activar tono claro" : "Activar tono oscuro";
            toggleDark.title = etiqueta;
            toggleDark.setAttribute("aria-label", etiqueta);
        };

        actualizarTono();
        toggleDark.onclick = () => {
            aplicarOscuro(!document.body.classList.contains("dark-mode"));
            localStorage.setItem("modoOscuro", document.body.classList.contains("dark-mode"));
            actualizarTono();
        };
    }

    // --- 3. TIPOS DE DOCUMENTO ---
    const tiposDocumentos = document.querySelector('.tipos-documentos');
    const seccionesArchivos = document.querySelectorAll('.seccion-archivos');

    if (tiposDocumentos && seccionesArchivos.length) {
        const mostrarSeccion = () => {
            const id = location.hash.replace('#', '');
            const seccion = id ? document.getElementById(id) : null;
            const esArchivo = seccion && seccion.classList.contains('seccion-archivos');

            document.body.classList.toggle('vista-archivos', Boolean(esArchivo));
            seccionesArchivos.forEach((item) => {
                item.classList.toggle('activa', item === seccion);
            });

            if (esArchivo) {
                window.scrollTo(0, 0);
            }
        };

        mostrarSeccion();
        window.addEventListener('hashchange', mostrarSeccion);
    }

    // --- 4. CARRUSEL Y FICHA DE LA JUNTA DIRECTIVA ---
    const pistaDirectiva = document.querySelector('.directiva-pista');
    const popupDirectiva = document.getElementById('directiva-popup');

    if (pistaDirectiva && popupDirectiva) {
        const pasoTarjeta = () => {
            const tarjeta = pistaDirectiva.querySelector('.directivo-card');
            if (!tarjeta) return 280;
            const estilo = getComputedStyle(pistaDirectiva);
            const espacio = parseFloat(estilo.columnGap || estilo.gap) || 18;
            return tarjeta.getBoundingClientRect().width + espacio;
        };

        const flechasDirectiva = document.querySelectorAll('.directiva-flecha');
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

    // --- 5. LISTA DE EFEMÉRIDES ---
    document.querySelectorAll('.efemeride-resumen').forEach((boton) => {
        boton.addEventListener('click', () => {
            const item = boton.closest('.efemeride');
            const estabaAbierta = item.classList.contains('abierta');

            document.querySelectorAll('.efemeride.abierta').forEach((otra) => {
                otra.classList.remove('abierta');
                otra.querySelector('.efemeride-resumen').setAttribute('aria-expanded', 'false');
                otra.querySelectorAll('video').forEach((video) => video.pause());
            });

            if (!estabaAbierta) {
                item.classList.add('abierta');
                boton.setAttribute('aria-expanded', 'true');
            }
        });
    });

    // --- 6. CITA CON ASESORÍA LEGAL ---
    const formCita = document.getElementById('form-cita');

    if (formCita) {
        const diasCita = document.getElementById('cita-dias');
        const tituloMes = document.getElementById('cita-mes-titulo');
        const horasCita = document.getElementById('cita-horas');
        const listaHoras = document.getElementById('cita-hora-lista');
        const campoFecha = document.getElementById('cita-fecha');
        const campoHora = document.getElementById('cita-hora');
        const resumenCita = document.getElementById('cita-resumen');
        const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'setiembre', 'octubre', 'noviembre', 'diciembre'];
        const horas = ['07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00'];
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);
        const limite = new Date(hoy.getFullYear(), hoy.getMonth() + 3, hoy.getDate());
        let vista = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
        let fechaElegida = '';

        const iso = (fecha) => {
            const mes = String(fecha.getMonth() + 1).padStart(2, '0');
            const dia = String(fecha.getDate()).padStart(2, '0');
            return fecha.getFullYear() + '-' + mes + '-' + dia;
        };

        const etiquetaFecha = (valor) => {
            const partes = valor.split('-');
            return Number(partes[2]) + ' de ' + meses[Number(partes[1]) - 1] + ' de ' + partes[0];
        };

        const actualizarResumen = () => {
            if (!fechaElegida || !campoHora.value) {
                resumenCita.textContent = 'Elige un día hábil y una hora.';
                return;
            }
            const hora = campoHora.value;
            resumenCita.textContent = 'Cita: ' + etiquetaFecha(fechaElegida) + ', a las ' + hora.slice(0, 2) + ':' + hora.slice(3) + '.';
        };

        const pintarHoras = () => {
            listaHoras.innerHTML = '';
            if (!fechaElegida) {
                horasCita.hidden = true;
                campoHora.value = '';
                actualizarResumen();
                return;
            }
            horasCita.hidden = false;
            const ahora = new Date();
            horas.forEach((hora) => {
                const boton = document.createElement('button');
                boton.type = 'button';
                boton.className = 'cita-hora';
                boton.textContent = hora.slice(0, 2) + ':' + hora.slice(3);
                const momento = new Date(fechaElegida + 'T' + hora);
                if (momento <= ahora) boton.disabled = true;
                if (campoHora.value === hora) boton.classList.add('elegida');
                boton.addEventListener('click', () => {
                    campoHora.value = hora;
                    pintarHoras();
                    actualizarResumen();
                });
                listaHoras.appendChild(boton);
            });
            actualizarResumen();
        };

        const pintarMes = () => {
            tituloMes.textContent = meses[vista.getMonth()] + ' ' + vista.getFullYear();
            diasCita.innerHTML = '';
            const inicio = new Date(vista.getFullYear(), vista.getMonth(), 1);
            const desplazamiento = (inicio.getDay() + 6) % 7;
            const total = new Date(vista.getFullYear(), vista.getMonth() + 1, 0).getDate();

            for (let i = 0; i < desplazamiento; i += 1) {
                const vacio = document.createElement('span');
                vacio.className = 'cita-vacio';
                diasCita.appendChild(vacio);
            }

            for (let dia = 1; dia <= total; dia += 1) {
                const fecha = new Date(vista.getFullYear(), vista.getMonth(), dia);
                const boton = document.createElement('button');
                boton.type = 'button';
                boton.className = 'cita-dia';
                boton.textContent = String(dia);
                const finDeSemana = fecha.getDay() === 0 || fecha.getDay() === 6;
                const fuera = fecha < hoy || fecha > limite || finDeSemana;
                boton.disabled = fuera;
                if (iso(fecha) === fechaElegida) boton.classList.add('elegido');
                boton.addEventListener('click', () => {
                    fechaElegida = iso(fecha);
                    campoFecha.value = fechaElegida;
                    campoHora.value = '';
                    pintarMes();
                    pintarHoras();
                });
                diasCita.appendChild(boton);
            }
        };

        document.getElementById('cita-mes-anterior').addEventListener('click', () => {
            vista = new Date(vista.getFullYear(), vista.getMonth() - 1, 1);
            pintarMes();
        });
        document.getElementById('cita-mes-siguiente').addEventListener('click', () => {
            vista = new Date(vista.getFullYear(), vista.getMonth() + 1, 1);
            pintarMes();
        });

        const avisoCita = document.getElementById('cita-resultado');
        if (avisoCita && new URLSearchParams(location.search).get('enviada') === '1') {
            avisoCita.hidden = false;
            avisoCita.textContent = 'Recibimos la solicitud. La cita fue enviada para su revisión.';
            avisoCita.classList.add('ok');
            history.replaceState(null, '', location.pathname);
        }

        const campoCorreo = formCita.elements.email;
        const campoTelefono = formCita.elements.telefono;
        const correoValido = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*\.[a-zA-Z]{2,}$/;

        const revisarCorreo = () => {
            const valor = campoCorreo.value.trim();
            campoCorreo.value = valor;
            if (!valor) {
                campoCorreo.setCustomValidity('Escribe tu correo electrónico.');
                return false;
            }
            if (valor.indexOf('@') === -1 || !correoValido.test(valor)) {
                campoCorreo.setCustomValidity('Escribe un correo válido, con @ y un dominio. Ejemplo: nombre@correo.com');
                return false;
            }
            campoCorreo.setCustomValidity('');
            return true;
        };

        const revisarTelefono = () => {
            let digitos = campoTelefono.value.replace(/\D/g, '');
            if (digitos.indexOf('506') === 0 && digitos.length === 11) digitos = digitos.slice(3);
            campoTelefono.value = digitos;
            if (!/^[0-9]{8}$/.test(digitos)) {
                campoTelefono.setCustomValidity('El teléfono debe tener exactamente 8 dígitos.');
                return false;
            }
            campoTelefono.setCustomValidity('');
            return true;
        };

        campoCorreo.addEventListener('input', () => {
            if (campoCorreo.value.trim() === '') campoCorreo.setCustomValidity('');
            else revisarCorreo();
        });
        campoCorreo.addEventListener('blur', () => {
            if (campoCorreo.value.trim() !== '') revisarCorreo();
        });
        campoTelefono.addEventListener('input', () => {
            let digitos = campoTelefono.value.replace(/\D/g, '');
            if (digitos.indexOf('506') === 0 && digitos.length === 11) digitos = digitos.slice(3);
            if (campoTelefono.value !== digitos) campoTelefono.value = digitos;
            if (digitos.length === 0) campoTelefono.setCustomValidity('');
            else if (!/^[0-9]{8}$/.test(digitos)) campoTelefono.setCustomValidity('El teléfono debe tener exactamente 8 dígitos.');
            else campoTelefono.setCustomValidity('');
        });

        formCita.addEventListener('submit', (evento) => {
            const correoOk = revisarCorreo();
            const telefonoOk = revisarTelefono();
            if (!campoFecha.value || !campoHora.value) {
                evento.preventDefault();
                resumenCita.textContent = 'Elige el día y la hora de la cita antes de enviarla.';
                return;
            }
            if (!correoOk || !telefonoOk) {
                evento.preventDefault();
                if (!correoOk) campoCorreo.reportValidity();
                else campoTelefono.reportValidity();
                return;
            }
            const trampa = formCita.elements._honey;
            if (trampa && trampa.value.trim() !== '') {
                evento.preventDefault();
                return;
            }
            document.getElementById('cita-asunto').value = 'Solicitud de cita legal: ' + etiquetaFecha(campoFecha.value) + ' ' + campoHora.value;
            document.getElementById('cita-replyto').value = campoCorreo.value;
        });

        pintarMes();
        actualizarResumen();
    }

    // --- 7. ZOOM PARA EFEMÉRIDES (LIGHTBOX) ---
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

(function () {
    if (document.getElementById('sitrabot')) return;

    var estilo = document.createElement('style');
    estilo.textContent = [
        '#sitrabot{position:fixed;right:20px;bottom:20px;z-index:4000;font-family:"Public Sans",sans-serif}',
        '#sitrabot *{box-sizing:border-box}',
        '.sitrabot-abrir{width:56px;height:56px;border:0;border-radius:50%;padding:0;cursor:pointer;background:#8e1a20;color:#f6f0ec;box-shadow:0 8px 18px rgba(110,18,24,.28);display:flex;align-items:center;justify-content:center}',
        '.sitrabot-abrir svg{width:26px;height:26px;display:block}',
        '.sitrabot-abrir:hover{background:#6e1218}',
        '.sitrabot-panel{position:fixed;right:20px;bottom:20px;width:min(380px,calc(100vw - 32px));height:min(520px,calc(100vh - 108px));max-height:calc(100vh - 108px);background:#fff;color:#2b211f;border-radius:18px;box-shadow:0 16px 40px rgba(28,22,20,.28);display:flex;flex-direction:column;overflow:hidden}',
        '.sitrabot-panel[hidden]{display:none}',
        '.sitrabot-cabeza{position:relative;flex:0 0 auto;display:flex;align-items:center;gap:10px;min-height:72px;padding:14px 58px 14px 16px;background:#8e1a20;color:#f6f0ec}',
        '.sitrabot-marca{width:42px;height:42px;border-radius:50%;background:#f6f0ec;color:#8e1a20;display:flex;align-items:center;justify-content:center;flex:0 0 auto}',
        '.sitrabot-marca svg{width:22px;height:22px;display:block}',
        '.sitrabot-cabeza strong{display:block;font-size:15px;letter-spacing:.04em}',
        '.sitrabot-cabeza span{display:block;font-size:12px;opacity:.92}',
        '.sitrabot-cerrar{position:absolute;top:16px;right:14px;width:36px;height:36px;border:0;border-radius:50%;background:#fff;color:#6e1218;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0}',
        '.sitrabot-cerrar svg{width:16px;height:16px;display:block}',
        '.sitrabot-mensajes{position:relative;flex:1 1 auto;min-height:0;overflow-x:hidden;overflow-y:auto;padding:16px;display:flex;flex-direction:column;justify-content:flex-start;align-items:stretch;gap:10px;background:#f6f0ec;scrollbar-color:#c81d25 #f3ebe6}',
        '.sitrabot-burbuja{flex:0 0 auto;max-width:86%;padding:10px 12px;border-radius:14px;line-height:1.45;font-size:14.5px;white-space:pre-wrap}',
        '.sitrabot-bot{align-self:flex-start;background:#fff;color:#2b211f;border:1px solid #e7ddd6}',
        '.sitrabot-user{align-self:flex-end;background:#8e1a20;color:#f6f0ec}',
        '.sitrabot-bot a{color:#8e1a20;font-weight:700}',
        '.sitrabot-form{flex:0 0 auto;display:flex;align-items:center;gap:8px;padding:12px;border-top:1px solid #e7ddd6;background:#fff}',
        '.sitrabot-form input{flex:1;min-width:0;border:1px solid #e0d2cb;border-radius:999px;padding:11px 14px;font:inherit;color:#2b211f;background:#fff}',
        '.sitrabot-form input:focus{outline:2px solid #c81d25;border-color:#c81d25}',
        '.sitrabot-form button{flex:0 0 auto;width:42px;height:42px;border:0;border-radius:50%;background:#8e1a20;color:#f6f0ec;cursor:pointer;font-size:18px}',
        '.sitrabot-form button:hover{background:#6e1218}',
        '.sitrabot-espera{opacity:.7}',
        '@media (max-width:768px){#sitrabot{right:12px;bottom:12px}.sitrabot-panel{right:12px;bottom:12px;width:calc(100vw - 24px);height:min(520px,calc(100vh - 96px));max-height:calc(100vh - 96px)}}'
    ].join('');
    document.head.appendChild(estilo);

    var raiz = /\/(hojamier|convenios)\//.test(location.pathname) ? '../' : '';
    var clave = 'sitrabot-mensajes';
    var marca = '<span class="sitrabot-marca" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 6.5A2.5 2.5 0 0 1 7.5 4h9A2.5 2.5 0 0 1 19 6.5v7A2.5 2.5 0 0 1 16.5 16H10l-3.2 2.6c-.5.4-1.3 0-1.3-.7V16H7.5A2.5 2.5 0 0 1 5 13.5v-7z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg></span>';
    var historial = [];
    try { historial = JSON.parse(sessionStorage.getItem(clave) || '[]'); } catch (e) { historial = []; }

    var caja = document.createElement('div');
    caja.id = 'sitrabot';
    caja.innerHTML = '<section class="sitrabot-panel" hidden><header class="sitrabot-cabeza">' + marca + '<div><strong>SITRABOT</strong><span>Asistente virtual de SITRAINA</span></div><button type="button" class="sitrabot-cerrar" aria-label="Cerrar chat"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg></button></header><div class="sitrabot-mensajes" role="log" aria-live="polite"></div><form class="sitrabot-form"><input type="text" aria-label="Tu pregunta o duda laboral" placeholder="Tu pregunta o duda laboral..." autocomplete="off"><button type="submit" aria-label="Enviar mensaje">↑</button></form></section><button type="button" class="sitrabot-abrir" aria-label="Abrir Sitrabot" aria-expanded="false"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 6.5A2.5 2.5 0 0 1 7.5 4h9A2.5 2.5 0 0 1 19 6.5v7A2.5 2.5 0 0 1 16.5 16H10l-3.2 2.6c-.5.4-1.3 0-1.3-.7V16H7.5A2.5 2.5 0 0 1 5 13.5v-7z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg></button>';
    document.body.appendChild(caja);

    var panel = caja.querySelector('.sitrabot-panel');
    var abrir = caja.querySelector('.sitrabot-abrir');
    var cerrar = caja.querySelector('.sitrabot-cerrar');
    var mensajes = caja.querySelector('.sitrabot-mensajes');
    var form = caja.querySelector('.sitrabot-form');
    var campo = form.querySelector('input');

    function pagina(ruta) { return raiz + ruta; }

    function sinAcentos(texto) {
        return texto.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    }

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

    function guardar() {
        sessionStorage.setItem(clave, JSON.stringify(historial));
    }

    function bot(partes) {
        if (typeof partes === 'string') partes = [{ tipo: 'texto', valor: partes }];
        return { rol: 'bot', partes: partes };
    }

    function txt(valor) { return { tipo: 'texto', valor: valor }; }
    function enl(valor, ruta) { return { tipo: 'enlace', valor: valor, ruta: ruta }; }

    function bienvenida() {
        return bot('Hola, soy Sitrabot, el asistente virtual de SITRAINA. Puedo orientarte sobre el sindicato, la afiliación y su cuota, la asesoría legal, los convenios, los documentos y el contacto. ¿Qué necesitas?');
    }

    function responder(texto) {
        var q = sinAcentos(texto);
        if (/^(hola|buenas|buenos dias|buen dia|hey|saludos|gracias|adios|ok)[!. ]*$/.test(q)) return bienvenida();
        if (/que puedes|en que ayudas|que sabes|opciones del chat/.test(q) || /^(ayuda|ayudame|menu)[!. ]*$/.test(q)) return bienvenida();

        if (/cuota|1 ?%|porcentaje|cuanto cuesta|cuanto se paga|cuanto pagan|cuanto descuent|descuento del salario|deduc/.test(q)) {
            return bot('La boleta autoriza a Recursos Humanos del INA a deducir el 1% mensual del salario a favor de SITRAINA. La Secretaría de Finanzas administra esas cuotas.');
        }
        if (/gaudi|firma digital|certificado digital/.test(q)) {
            return bot('Al enviar la afiliación se genera un PDF. Hay que descargarlo y firmarlo en Gaudi con el certificado digital. Sin esa firma, la afiliación no es válida legalmente.');
        }
        if (/desafil|darme de baja|salirme|renunciar al sindicato|ya no quiero estar/.test(q)) {
            return bot([
                txt('Esta página no tiene un formulario para desafiliarse. Escribe a sitraina@ina.ac.cr o a la Secretaría de Afiliación, Miguel Vargas Arias, en mvargasarias@ina.ac.cr. La boleta de ingreso está en '),
                enl('Afiliación', 'afiliacion.html'),
                txt('.')
            ]);
        }
        if (/quien puede|quienes pueden|requisito|no trabajo|no soy del ina|no soy funcionario|estudiante|puedo afiliarme si/.test(q)) {
            return bot('La afiliación es para personas trabajadoras del INA: instructores, personal administrativo, técnicos y funcionarios. La boleta pide nombre, cédula, correos, fecha de nacimiento, tipo de nombramiento, unidad, centro, puesto y teléfonos.');
        }
        if (/que gano|para que afil|por que afil|ventaja|beneficio de afil/.test(q)) {
            return bot([
                txt('Afiliarse es sumarse a la defensa de los derechos laborales del personal del INA. Quien está afiliado recibe apoyo jurídico en temas laborales y puede usar los convenios. La boleta está en '),
                enl('Afiliación', 'afiliacion.html'),
                txt(' y los convenios en '),
                enl('Convenios', 'convenios/convenios.html'),
                txt('.')
            ]);
        }
        if (/secretaria de afiliacion|miguel vargas/.test(q)) {
            return bot('La Secretaría de Afiliación la ocupa Miguel Vargas Arias, mvargasarias@ina.ac.cr. Procesa las solicitudes nuevas, valida la documentación y mantiene al día la base de datos.');
        }
        if (/afili|boleta|inscrib|unirme|hacerme miembro|como me uno/.test(q)) {
            return bot([
                txt('Completa la boleta en '),
                enl('Afiliación', 'afiliacion.html'),
                txt('. Pide datos personales, ubicación laboral y teléfonos, y autoriza el 1% mensual del salario. Después hay que firmar el PDF en Gaudi.')
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
            return bot('SITRAINA ofrece apoyo jurídico gratuito a sus personas afiliadas en temas laborales. La cita se pide con día y hora de lunes a viernes.');
        }
        if (/cita|asesor|abogad|juridic|consulta legal|defensa legal/.test(q)) {
            return bot([
                txt('La cita se pide en '),
                enl('Asesoría', 'asesoria-legal.html'),
                txt(' o directo en '),
                enl('solicitar cita', 'solicitar-cita.html'),
                txt('. Elige un día hábil y una hora entre 7:00 a. m. y 2:00 p. m. La solicitud queda registrada para la asesoría legal.')
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
            return bot('La oficina está en Avenida 59, Calle 106, Barrio Finca La Caja, Uruca, San José. Código postal 10107.');
        }
        if (/correo|email|e-mail|contact|formulario/.test(q)) {
            return bot([
                txt('El correo es sitraina@ina.ac.cr. También puedes llamar al +506 2220-2480 o escribir por WhatsApp al +506 8448-1450. El formulario está en '),
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
                txt('La Secretaría de Conflictos, Eduardo Ortega Rodríguez, eortegarodriguez@ina.ac.cr, atiende reclamos individuales o colectivos y vela por la convención colectiva. También puedes pedir cita en '),
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
            return bot('La Fiscal es Maribel Garcia Fonseca, mgarciafonseca@ina.ac.cr. Vigila que la Junta Directiva y las personas afiliadas cumplan los estatutos y la normativa.');
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
            return bot('El botón de sol o luna, en la barra roja, cambia el tono claro u oscuro del sitio. La barra y el pie se mantienen en rojo.');
        }

        return bot([
            txt('No tengo esa respuesta exacta. Puedes escribir a sitraina@ina.ac.cr, llamar al +506 2220-2480 o usar '),
            enl('Contacto', 'contacto.html'),
            txt('. También puedo orientarte sobre afiliación, cuota, asesoría legal, convenios, documentos y la Junta Directiva.')
        ]);
    }

    function mostrarBienvenida() {
        if (historial.length) return;
        var saludo = bienvenida();
        historial.push(saludo);
        pintar(saludo);
        guardar();
    }

    function abrirChat() {
        panel.hidden = false;
        abrir.hidden = true;
        abrir.setAttribute('aria-expanded', 'true');
        mostrarBienvenida();
        mensajes.scrollTop = 0;
        campo.focus();
    }

    function cerrarChat() {
        panel.hidden = true;
        abrir.hidden = false;
        abrir.setAttribute('aria-expanded', 'false');
        abrir.focus();
    }

    historial.forEach(pintar);
    abrir.addEventListener('click', abrirChat);
    cerrar.addEventListener('click', cerrarChat);
    document.addEventListener('keydown', function (evento) {
        if (evento.key === 'Escape' && !panel.hidden) cerrarChat();
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

