/* Comportamiento de las páginas públicas: menú, tono, documentos, Junta, efemérides y cita. */
document.addEventListener('DOMContentLoaded', () => {
    
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

    // --- 2. TONO CLARO / OSCURO ---
    const toggleDark = document.getElementById("toggle-oscuro");
    localStorage.removeItem("modoDaltonismo");

    /* Activa o quita el tono oscuro en toda la página. */
    const aplicarOscuro = (activo) => {
        document.documentElement.classList.toggle("dark-mode", activo);
        document.body.classList.toggle("dark-mode", activo);
    };

    if (localStorage.getItem("modoOscuro") === "true") {
        aplicarOscuro(true);
    }

    if (toggleDark) {
        /* Cambia la etiqueta del botón de sol o luna según el tono actual. */
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
        /* En Documentos, abre la sección del enlace (#legales, #informes o #actas). */
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
        const horasBase = ['07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00'];
        let reglas = { fechas: {}, meses: {}, horas: {} };
        let citas = {};
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);
        const limite = new Date(hoy.getFullYear(), hoy.getMonth() + 3, hoy.getDate());
        let vista = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
        let fechaElegida = '';

        /* Convierte una fecha del calendario en texto AAAA-MM-DD. */
        const iso = (fecha) => {
            const mes = String(fecha.getMonth() + 1).padStart(2, '0');
            const dia = String(fecha.getDate()).padStart(2, '0');
            return fecha.getFullYear() + '-' + mes + '-' + dia;
        };

        /* Escribe la fecha como "16 de octubre de 2026". */
        const etiquetaFecha = (valor) => {
            const partes = valor.split('-');
            return Number(partes[2]) + ' de ' + meses[Number(partes[1]) - 1] + ' de ' + partes[0];
        };

        /* Pasa una hora de 24 horas a "9:30 a. m." o "2:05 p. m.". */
        const etiquetaHora = (hora) => {
            const partes = hora.split(':');
            let h = Number(partes[0]);
            const periodo = h >= 12 ? 'p. m.' : 'a. m.';
            h = h % 12;
            if (h === 0) h = 12;
            return h + ':' + partes[1] + ' ' + periodo;
        };

        /* Actualiza el texto que resume el día y la hora elegidos. */
        const actualizarResumen = () => {
            if (!fechaElegida || !campoHora.value) {
                resumenCita.textContent = 'Elige un día y una hora disponibles.';
                return;
            }
            resumenCita.textContent = 'Cita: ' + etiquetaFecha(fechaElegida) + ', a las ' + etiquetaHora(campoHora.value);
        };

        /* Horas que se pueden ofrecer: las del administrador, o de 7:00 a. m. a 2:00 p. m. */
        const horasOfrecidas = () => {
            const abiertas = Object.keys(reglas.horas).filter((hora) => reglas.horas[hora] === 'abierta').sort();
            if (abiertas.length) return abiertas;
            return horasBase.filter((hora) => reglas.horas[hora] !== 'bloqueada');
        };

        /* Quita las horas que ya tienen una cita reservada ese día. */
        const horasDelDia = () => {
            const tomadas = citas[fechaElegida] || [];
            return horasOfrecidas().filter((hora) => tomadas.indexOf(hora) === -1);
        };

        /* Indica si el día no se puede elegir: pasado, cerrado, ocupado o sin horas libres. */
        const diaBloqueado = (fecha) => {
            const clave = iso(fecha);
            const mes = clave.slice(0, 7);
            const reglaDia = reglas.fechas[clave];
            const reglaMes = reglas.meses[mes];
            const finDeSemana = fecha.getDay() === 0 || fecha.getDay() === 6;
            const hayMeses = Object.keys(reglas.meses).some((item) => reglas.meses[item] === 'abierta');
            if (fecha < hoy) return true;
            if (reglaDia === 'bloqueada' || reglaDia === 'ocupada') return true;
            if (reglaDia !== 'abierta') {
                if (reglaMes === 'bloqueada' || hayMeses) return true;
                if (fecha > limite || finDeSemana) return true;
            }
            const tomadas = citas[clave] || [];
            if (tomadas.length && horasOfrecidas().every((hora) => tomadas.indexOf(hora) !== -1)) return true;
            return false;
        };
        /* Elige la marca del día: X si está cerrado y reloj si está ocupado. */
        const marcaVisible = (fecha) => {
            const clave = iso(fecha);
            const regla = reglas.fechas[clave];
            if (regla === 'ocupada') return 'ocupada';
            const tomadas = citas[clave] || [];
            if (regla === 'abierta' && tomadas.length && horasOfrecidas().every((hora) => tomadas.indexOf(hora) !== -1)) return 'ocupada';
            if (regla === 'bloqueada') return 'cerrado';
            const hayMeses = Object.keys(reglas.meses).some((item) => reglas.meses[item] === 'abierta');
            if (hayMeses && regla !== 'abierta') return 'cerrado';
            return '';
        };

        /* Dibuja el reloj que aparece en un día ocupado. */
        const relojCita = () => {
            const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            svg.setAttribute('viewBox', '0 0 24 24');
            svg.setAttribute('class', 'cita-reloj');
            svg.setAttribute('aria-hidden', 'true');
            const circulo = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            circulo.setAttribute('cx', '12');
            circulo.setAttribute('cy', '12');
            circulo.setAttribute('r', '8');
            circulo.setAttribute('fill', 'none');
            circulo.setAttribute('stroke', 'currentColor');
            circulo.setAttribute('stroke-width', '2');
            const aguja = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            aguja.setAttribute('d', 'M12 8v5l3 2');
            aguja.setAttribute('fill', 'none');
            aguja.setAttribute('stroke', 'currentColor');
            aguja.setAttribute('stroke-width', '2');
            aguja.setAttribute('stroke-linecap', 'round');
            svg.appendChild(circulo);
            svg.appendChild(aguja);
            return svg;
        };

        /* Muestra los botones de hora del día que la persona eligió. */
        const pintarHoras = () => {
            listaHoras.innerHTML = '';
            if (!fechaElegida) {
                horasCita.hidden = true;
                campoHora.value = '';
                actualizarResumen();
                return;
            }
            horasCita.hidden = false;
            const ofrecidas = horasDelDia();
            if (!ofrecidas.length) {
                const vacio = document.createElement('p');
                vacio.textContent = 'No hay horas disponibles ese día.';
                listaHoras.appendChild(vacio);
                actualizarResumen();
                return;
            }
            const ahora = new Date();
            ofrecidas.forEach((hora) => {
                const boton = document.createElement('button');
                boton.type = 'button';
                boton.className = 'cita-hora';
                boton.textContent = etiquetaHora(hora);
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

        /* Dibuja los días del mes, en verde, con X o con reloj según la agenda. */
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
                const numero = document.createElement('span');
                numero.textContent = String(dia);
                boton.appendChild(numero);
                const marca = marcaVisible(fecha);
                if (marca === 'cerrado') {
                    boton.classList.add('cerrado');
                    const equis = document.createElement('span');
                    equis.className = 'cita-marca';
                    equis.setAttribute('aria-hidden', 'true');
                    equis.textContent = '×';
                    boton.appendChild(equis);
                } else if (marca === 'ocupada') {
                    boton.classList.add('ocupada');
                    boton.appendChild(relojCita());
                } else if (reglas.fechas[iso(fecha)] === 'abierta' && !diaBloqueado(fecha)) {
                    boton.classList.add('habil');
                }
                boton.disabled = diaBloqueado(fecha);
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

        /* Exige un correo con @ y un dominio antes de enviar la cita. */
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

        /* Deja el teléfono en 8 dígitos y quita el 506 si venía incluido. */
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
            /* Revisa correo, teléfono, día, hora y cédula. Si todo está bien, envía a php/afiliados.php. */
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
            evento.preventDefault();
            const cedulaCita = (formCita.elements.cedula.value || '').replace(/\D/g, '');
            if (!/^[0-9]{9}$/.test(cedulaCita)) {
                avisoCita.hidden = false;
                avisoCita.textContent = 'La cédula debe tener 9 dígitos.';
                avisoCita.classList.add('error');
                avisoCita.classList.remove('ok');
                return;
            }
            formCita.elements.cedula.value = cedulaCita;
            document.getElementById('cita-asunto').value = 'Solicitud de cita legal: ' + etiquetaFecha(campoFecha.value) + ', ' + etiquetaHora(campoHora.value);
            document.getElementById('cita-replyto').value = campoCorreo.value;
            let campoAccion = formCita.querySelector('input[name="accion"]');
            if (!campoAccion) {
                campoAccion = document.createElement('input');
                campoAccion.type = 'hidden';
                campoAccion.name = 'accion';
                formCita.appendChild(campoAccion);
            }
            campoAccion.value = 'verificar';
            formCita.action = 'php/afiliados.php';
            formCita.submit();
        });

        pintarMes();
        actualizarResumen();
        const rutaAgenda = window.location.pathname.replace(/[^/]*$/, '') + 'php/agenda.php';
        /* Convierte la respuesta del servidor en un objeto, aunque venga vacía. */
        const comoMapa = (valor) => (valor && typeof valor === 'object' && !Array.isArray(valor) ? valor : {});
        fetch(rutaAgenda, { cache: 'no-store', credentials: 'same-origin' })
            .then((respuesta) => respuesta.text())
            .then((texto) => {
                let datos = null;
                try { datos = JSON.parse(texto); } catch (error) { datos = null; }
                if (!datos) return;
                reglas = {
                    fechas: comoMapa(datos.fechas),
                    meses: comoMapa(datos.meses),
                    horas: comoMapa(datos.horas)
                };
                citas = comoMapa(datos.citas);
                const claves = Object.keys(reglas.fechas).filter((clave) => reglas.fechas[clave] === 'abierta').sort();
                let abierto = null;
                claves.forEach((clave) => {
                    if (abierto) return;
                    const fecha = new Date(clave + 'T00:00:00');
                    if (!diaBloqueado(fecha)) abierto = fecha;
                });
                if (abierto) {
                    const ultimo = new Date(vista.getFullYear(), vista.getMonth() + 1, 0).getDate();
                    let hayCupo = false;
                    for (let dia = 1; dia <= ultimo; dia += 1) {
                        if (!diaBloqueado(new Date(vista.getFullYear(), vista.getMonth(), dia))) hayCupo = true;
                    }
                    if (!hayCupo) vista = new Date(abierto.getFullYear(), abierto.getMonth(), 1);
                }
                pintarMes();
                pintarHoras();
            })
            .catch(() => {});
    }

    // --- 7. ZOOM PARA COMUNICADOS Y EFEMÉRIDES ---
    var imagenesZoom = document.querySelectorAll('.img-zoomable, .imagen-noticia img');
    if (imagenesZoom.length) {
        var lightbox = document.getElementById('lightbox');
        if (!lightbox) {
            lightbox = document.createElement('div');
            lightbox.id = 'lightbox';
            lightbox.className = 'lightbox';
            lightbox.innerHTML = '<button type="button" class="cerrar-lightbox" aria-label="Cerrar imagen">&times;</button><img class="lightbox-contenido" id="img-expandida" alt=""><div class="luz-controles"><button type="button" data-zoom="menos" aria-label="Alejar">&minus;</button><button type="button" data-zoom="normal" aria-label="Tamaño inicial">1×</button><button type="button" data-zoom="mas" aria-label="Acercar">+</button></div>';
            document.body.appendChild(lightbox);
        }
        if (!lightbox.querySelector('.luz-controles')) {
            var barra = document.createElement('div');
            barra.className = 'luz-controles';
            barra.innerHTML = '<button type="button" data-zoom="menos" aria-label="Alejar">&minus;</button><button type="button" data-zoom="normal" aria-label="Tamaño inicial">1×</button><button type="button" data-zoom="mas" aria-label="Acercar">+</button>';
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

        /* Coloca la imagen ampliada según el acercamiento y el arrastre. */
        var pintarZoom = function () {
            var extra = Math.max(imgExpandida.offsetWidth, imgExpandida.offsetHeight) * 0.35;
            var topeX = (imgExpandida.offsetWidth * Math.max(0, escala - 1)) / 2 + extra;
            var topeY = (imgExpandida.offsetHeight * Math.max(0, escala - 1)) / 2 + extra;
            posX = Math.max(-topeX, Math.min(topeX, posX));
            posY = Math.max(-topeY, Math.min(topeY, posY));
            imgExpandida.style.transform = 'translate(' + posX + 'px,' + posY + 'px) scale(' + escala + ')';
            imgExpandida.classList.toggle('luz-cerca', escala > 1);
        };

        /* Vuelve la imagen al tamaño con el que se abrió. */
        var reiniciarZoom = function () {
            escala = 1;
            posX = 0;
            posY = 0;
            imgExpandida.style.transform = '';
            imgExpandida.classList.remove('luz-cerca');
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

        imagenesZoom.forEach(function (img) {
            img.tabIndex = 0;
            img.setAttribute('role', 'button');
            if (!img.title) img.title = 'Ampliar imagen';
            var abrirEsta = function () { abrirZoom(img); };
            img.addEventListener('click', abrirEsta);
            img.addEventListener('keydown', function (evento) {
                if (evento.key !== 'Enter' && evento.key !== ' ') return;
                evento.preventDefault();
                abrirEsta();
            });
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
        /* Mueve la imagen siguiendo el cursor mientras el clic sigue presionado. */
        imgExpandida.addEventListener('pointerdown', function (evento) {
            if (evento.button !== 0) return;
            evento.preventDefault();
            arrastrando = true;
            movio = false;
            inicioX = evento.clientX;
            inicioY = evento.clientY;
            baseX = posX;
            baseY = posY;
            imgExpandida.classList.add('luz-arrastre');
            try { imgExpandida.setPointerCapture(evento.pointerId); } catch (error) {}
        });
        imgExpandida.addEventListener('pointermove', function (evento) {
            if (!arrastrando) return;
            var dx = evento.clientX - inicioX;
            var dy = evento.clientY - inicioY;
            if (Math.abs(dx) > 3 || Math.abs(dy) > 3) movio = true;
            posX = baseX + dx;
            posY = baseY + dy;
            pintarZoom();
        });
        var soltar = function () {
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
});

/* Sitrabot: arma el chat, guarda la conversación de esta visita y elige la respuesta. */
(function () {
    if (document.getElementById('sitrabot')) return;

    var estilo = document.createElement('style');
    estilo.textContent = [
        '#sitrabot{position:fixed;right:20px;bottom:20px;z-index:4000;font-family:"Public Sans",sans-serif}',
        '#sitrabot *{box-sizing:border-box}',
        '.sitrabot-abrir{position:relative;z-index:1;width:64px;height:64px;border:0;border-radius:50%;padding:0;cursor:pointer;background:#fff;color:#f6f0ec;box-shadow:0 8px 18px rgba(110,18,24,.28);display:flex;align-items:center;justify-content:center;overflow:hidden;transition:transform .4s cubic-bezier(0.22,1,0.36,1),box-shadow .4s cubic-bezier(0.22,1,0.36,1),opacity .32s cubic-bezier(0.22,1,0.36,1),visibility .32s}',
        '#sitrabot.sitrabot-abierto .sitrabot-abrir{opacity:0;visibility:hidden;pointer-events:none;transform:scale(.7)}',
        '.sitrabot-abrir img{width:100%;height:100%;object-fit:cover;object-position:center;display:block}',
        '.sitrabot-abrir:hover{transform:translateY(-2px);box-shadow:0 12px 22px rgba(110,18,24,.34)}',
        '.sitrabot-aviso{position:absolute;right:74px;bottom:16px;margin:0;padding:6px 12px;border-radius:999px;background:#6e1218;color:#fff;font-size:13px;font-weight:700;line-height:1.2;white-space:nowrap;pointer-events:none;opacity:0;visibility:hidden;transform:translateX(8px);transition:opacity .4s cubic-bezier(0.22,1,0.36,1),transform .4s cubic-bezier(0.22,1,0.36,1),visibility .4s cubic-bezier(0.22,1,0.36,1)}',
        '.sitrabot-abrir:hover+.sitrabot-aviso,.sitrabot-abrir:focus-visible+.sitrabot-aviso{opacity:1;visibility:visible;transform:none}',
        '.sitrabot-panel{position:fixed;z-index:2;right:20px;bottom:20px;width:min(380px,calc(100vw - 32px));height:min(520px,calc(100vh - 108px));max-height:calc(100vh - 108px);background:#fff;color:#2b211f;border-radius:18px;box-shadow:0 16px 40px rgba(28,22,20,.28);display:flex;flex-direction:column;overflow:hidden;opacity:0;visibility:hidden;pointer-events:none;transform:translateY(18px) scale(.96);transform-origin:right bottom;transition:opacity .42s cubic-bezier(0.22,1,0.36,1),transform .42s cubic-bezier(0.22,1,0.36,1),visibility .42s,background-color .35s cubic-bezier(0.22,1,0.36,1),color .35s cubic-bezier(0.22,1,0.36,1),box-shadow .42s cubic-bezier(0.22,1,0.36,1)}',
        '#sitrabot.sitrabot-abierto .sitrabot-panel{opacity:1;visibility:visible;pointer-events:auto;transform:none}',
        '.sitrabot-cabeza{position:relative;flex:0 0 auto;display:flex;align-items:center;gap:10px;min-height:72px;padding:14px 58px 14px 16px;background:#8e1a20;color:#f6f0ec}',
        '.sitrabot-marca{width:46px;height:46px;border-radius:50%;background:#fff;display:flex;align-items:center;justify-content:center;flex:0 0 auto;overflow:hidden}',
        '.sitrabot-marca img{width:100%;height:100%;object-fit:cover;object-position:center;display:block}',
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
        '.sitrabot-form input{flex:1;min-width:0;border:1px solid #e0d2cb;border-radius:999px;padding:11px 14px;font:inherit;color:#2b211f;background:#fff}',
        '.sitrabot-form input:focus{outline:2px solid #c81d25;border-color:#c81d25}',
        '.sitrabot-form button{flex:0 0 auto;width:46px;height:46px;border:0;border-radius:50%;background:#c81d25;color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0;box-shadow:0 4px 10px rgba(110,18,24,.22);transition:background-color .35s cubic-bezier(0.22,1,0.36,1),transform .35s cubic-bezier(0.22,1,0.36,1)}',
        '.sitrabot-form button svg{width:22px;height:22px;display:block}',
        '.sitrabot-form button:hover{background:#8e1a20;transform:translateY(-1px)}',
        '.sitrabot-espera{opacity:.7}',
        '.sitrabot-mensajes,.sitrabot-bot,.sitrabot-form,.sitrabot-form input{transition:background-color .35s cubic-bezier(0.22,1,0.36,1),color .35s cubic-bezier(0.22,1,0.36,1),border-color .35s cubic-bezier(0.22,1,0.36,1)}',
        'body.dark-mode .sitrabot-abrir{box-shadow:0 8px 18px rgba(0,0,0,.45)}',
        'body.dark-mode .sitrabot-abrir:hover{box-shadow:0 12px 22px rgba(0,0,0,.55)}',
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
        '@media (max-width:768px){#sitrabot{right:12px;bottom:12px}.sitrabot-panel{right:12px;bottom:12px;width:calc(100vw - 24px);height:min(520px,calc(100vh - 96px));max-height:calc(100vh - 96px)}}',
        '@media (prefers-reduced-motion:reduce){.sitrabot-abrir,.sitrabot-aviso,.sitrabot-panel,.sitrabot-mensajes,.sitrabot-bot,.sitrabot-form,.sitrabot-form input,.sitrabot-form button,.sitrabot-cerrar{transition:none}}'
    ].join('');
    document.head.appendChild(estilo);

    var raiz = /\/(hojamier|convenios)\//.test(location.pathname) ? '../' : '';
    var clave = 'sitrabot-mensajes';
    var avatar = '<img src="' + raiz + 'img/logo.png" alt="">';
    var marca = '<span class="sitrabot-marca" aria-hidden="true">' + avatar + '</span>';
    var historial = [];
    try { historial = JSON.parse(sessionStorage.getItem(clave) || '[]'); } catch (e) { historial = []; }

    var caja = document.createElement('div');
    caja.id = 'sitrabot';
    caja.innerHTML = '<section class="sitrabot-panel" aria-hidden="true"><header class="sitrabot-cabeza">' + marca + '<div><strong>SITRABOT</strong><span>Asistente virtual de SITRAINA</span></div><button type="button" class="sitrabot-cerrar" aria-label="Cerrar chat"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg></button></header><div class="sitrabot-mensajes" role="log" aria-live="polite"></div><form class="sitrabot-form"><input type="text" aria-label="Tu pregunta o duda laboral" placeholder="Tu pregunta o duda laboral..." autocomplete="off"><button type="submit" aria-label="Enviar mensaje"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h13M12 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg></button></form></section><button type="button" class="sitrabot-abrir" aria-label="Bot del SITRAINA" aria-expanded="false">' + avatar + '</button><span class="sitrabot-aviso" aria-hidden="true">Bot del SITRAINA</span>';
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
        return bot('Hola, soy Sitrabot, el asistente virtual de SITRAINA. Puedo orientarte sobre el sindicato, la afiliación y su cuota, la asesoría legal, los convenios, los documentos y el contacto. ¿Qué necesitas?');
    }

    /* Elige la respuesta. La primera regla que coincide gana, por eso las preguntas concretas van primero. */
    function responder(texto) {
        var q = sinAcentos(texto);
        if (/^(hola|holi|buenas( tardes| noches)?|buenos dias|buen dia|hey|saludos|gracias|muchas gracias|adios|chao|bye|ok|que tal|pura vida)[!. ]*$/.test(q)) return bienvenida();
        if (/que puedes|en que ayudas|que sabes|opciones del chat/.test(q) || /^(ayuda|ayudame|menu)[!. ]*$/.test(q)) return bienvenida();
        if (/que mas puedes|que mas sabes|otros temas|que otras preguntas|mas temas/.test(q)) {
            return bot('También puedo orientarte sobre la cuota del 1%, Gaudi, la desafiliación, las secretarías y sus correos, las vocalías, los abogados, el horario de citas, cada convenio, las efemérides, las leyes, los comunicados, las redes y cómo usar el tono claro u oscuro.');
        }
        if (/quien eres|que eres|eres (un )?bot|eres humano|eres una persona|eres abogado|eres abogada/.test(q)) {
            return bot('Soy Sitrabot, el asistente de esta página. Oriento con la información publicada de SITRAINA. No soy una persona abogada ni sustituyo la asesoría legal.');
        }
        if (/guardas (el|la|los|las)? ?(chat|conversacion|mensajes)|privacidad del chat|quien ve (mis )?mensajes/.test(q)) {
            return bot('Las preguntas de este chat se guardan solo en esta sesión del navegador, en este dispositivo. Para un caso personal, escribe a sitraina@ina.ac.cr o pide cita con la asesoría.');
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
            return bot('La Secretaría de Conflictos, Eduardo Ortega Rodríguez, eortegarodriguez@ina.ac.cr, atiende reclamos de las personas afiliadas. También puedes pedir apoyo jurídico en Asesoría. Esta página no lleva un formulario solo para ese caso.');
        }
        if (/huelga|paro laboral|irnos a paro/.test(q)) {
            return bot('El sitio presenta el diálogo, la negociación colectiva y la Secretaría de Conflictos como vías del sindicato. Para un caso concreto, pide cita con la asesoría legal.');
        }
        if (/sabado|domingo|feriado|dia festivo/.test(q)) {
            return bot('La oficina atiende de lunes a viernes, de 7:00 a. m. a 3:00 p. m. El calendario de citas ofrece días hábiles, de 7:00 a. m. a 2:00 p. m. Un sábado, un domingo o un día pasado no se puede elegir, salvo que ese día aparezca abierto en el calendario.');
        }
        if (/horario de la cita|horario de citas|hora de la asesoria|a que hora son las citas|hasta que hora pido cita/.test(q)) {
            return bot('Las citas se piden en días hábiles, entre 7:00 a. m. y 2:00 p. m., en los días que el calendario muestre abiertos. La oficina atiende hasta las 3:00 p. m.');
        }
        if (/cancelar (la |una )?cita|cambiar (la |una )?cita|reprogramar|mover la cita/.test(q)) {
            return bot('Esta página no tiene un formulario para cancelar o cambiar una cita. Escribe a sitraina@ina.ac.cr o llama al +506 2220-2480.');
        }
        if (/puedo pedir cita si no|cita sin estar afiliad|no estoy afiliad|no soy afiliad/.test(q)) {
            return bot([
                txt('La asesoría legal y los convenios son para personas afiliadas. Si todavía no lo estás, la boleta está en '),
                enl('Afiliación', 'afiliacion.html'),
                txt('. Al pedir cita, la página pregunta si ya formas parte del sindicato.')
            ]);
        }
        if (/9 digitos|cedula de la cita|dimex|que cedula/.test(q)) {
            return bot('Para continuar con la cita, la página pide una cédula de 9 dígitos. En la boleta de afiliación el campo es el número de cédula.');
        }
        if (/que datos (pide|lleva|necesita) (la |una )?cita|que debo poner en la cita|que llena la cita/.test(q)) {
            return bot('La solicitud pide nombre completo, cédula, correo con @ y dominio, teléfono de 8 dígitos, sede o centro de trabajo y el motivo de la consulta. También hay que elegir un día y una hora.');
        }
        if (/cita presencial|cita virtual|es virtual|es presencial|videollamada|por zoom|por teams/.test(q)) {
            return bot('La solicitud registra el día y la hora. La página no indica si la cita es presencial o virtual. Para confirmarlo, escribe a sitraina@ina.ac.cr o llama al +506 2220-2480.');
        }
        if (/descargar (el |la )?pdf|pdf de afiliacion|bajar la boleta/.test(q)) {
            return bot('Al enviar la afiliación, la boleta se manda por correo en un PDF y en la misma página puedes descargarlo. Ese PDF se firma en Gaudi con el certificado digital.');
        }
        if (/ya estoy afiliad|como se si estoy|consultar si estoy afiliad|estado de mi afiliacion/.test(q)) {
            return bot('Esta página no consulta si ya estás afiliado. Escribe a la Secretaría de Afiliación, Miguel Vargas Arias, mvargasarias@ina.ac.cr.');
        }
        if (/codigo de afiliacion|codigo de afiliado|donde saco el codigo/.test(q)) {
            return bot('Asembis pide un código de afiliación. Los demás convenios piden identificarse como persona afiliada. Si no tienes el código, escríbele a Miguel Vargas Arias, mvargasarias@ina.ac.cr.');
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
            return bot('Eduardo Ortega Rodríguez ocupa la Secretaría de Conflictos, eortegarodriguez@ina.ac.cr. Previene conflictos, atiende reclamos individuales o colectivos y vela por el cumplimiento de la convención colectiva.');
        }
        if (/walia|baltodano/.test(q)) {
            return bot('Walia Baltodano Fernández tiene un informe de labores en Documentos, tipo Informes de labores.');
        }
        if (/como (abro|veo|reproduzco) (el |la |un )?video|video de la hoja/.test(q)) {
            return bot('En la Hoja del Miércoles se abre la edición con un clic. El video se reproduce en ese panel. No hace falta pasar el cursor por encima.');
        }

        /* A partir de aquí siguen las respuestas de afiliación, asesoría, contacto, documentos y Junta. */
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

