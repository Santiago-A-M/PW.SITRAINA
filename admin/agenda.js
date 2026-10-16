/* Panel del administrador: pinta meses, días y horas, y los guarda en la agenda. */
(function () {
    var token = document.getElementById('agenda-token');
    var aviso = document.getElementById('agenda-aviso');
    var campoMes = document.getElementById('mes');
    var listaMes = document.getElementById('lista-mes');
    var listaHora = document.getElementById('lista-hora');
    var diasMes = document.getElementById('dias-mes');
    var mesActivo = document.getElementById('mes-activo');
    var campoHora = document.getElementById('hora-12');
    var campoMinuto = document.getElementById('minuto');
    var botonAm = document.getElementById('periodo-am');
    var botonPm = document.getElementById('periodo-pm');
    var meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'setiembre', 'octubre', 'noviembre', 'diciembre'];
    var reglas = [];
    var citas = [];
    var cola = Promise.resolve();
    var revision = 0;
    var pincel = 'abierta';
    if (!token || !campoMes || !diasMes) return;

    var hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    campoMes.value = hoy.getFullYear() + '-' + String(hoy.getMonth() + 1).padStart(2, '0');

    /* Muestra u oculta el aviso de error junto al calendario. */
    function mostrarAviso(texto) {
        if (!aviso) return;
        aviso.hidden = !texto;
        aviso.textContent = texto || '';
    }

    /* Pone cada guardado en fila para que un clic no borre al anterior. */
    function encolar(trabajo) {
        var corre = cola.then(trabajo, trabajo);
        cola = corre.then(function () { return null; }, function () { return null; });
        return corre;
    }

    /* Anota en memoria el mes, el día o la hora recién pintados. */
    function ponerRegla(tipo, valor, estado) {
        reglas = reglas.filter(function (fila) {
            return !(fila.tipo === tipo && fila.valor === valor);
        });
        reglas.push({ tipo: tipo, valor: valor, estado: estado });
    }

    /* Escribe AAAA-MM como "octubre de 2026". */
    function nombreMes(valor) {
        var partes = valor.split('-');
        return meses[Number(partes[1]) - 1] + ' ' + partes[0];
    }

    /* Muestra una hora guardada en 24 horas como "9:30 a. m.". */
    function etiquetaHora(valor) {
        var partes = String(valor || '').split(':');
        if (partes.length < 2) return '';
        var hora = Number(partes[0]);
        var periodo = hora >= 12 ? 'p. m.' : 'a. m.';
        hora = hora % 12;
        if (hora === 0) hora = 12;
        return hora + ':' + partes[1] + ' ' + periodo;
    }

    /* Convierte hora, minutos y a. m./p. m. al formato HH:MM de 24 horas. */
    function a24(hora12, minutoValor, periodo) {
        var hora = Number(hora12);
        var minuto = Number(String(minutoValor || '0').replace(/\D/g, ''));
        if (!hora || hora < 1) hora = 1;
        if (hora > 12) hora = 12;
        if (minuto > 59) minuto = 59;
        if (periodo === 'pm' && hora !== 12) hora += 12;
        if (periodo === 'am' && hora === 12) hora = 0;
        return String(hora).padStart(2, '0') + ':' + String(minuto).padStart(2, '0');
    }

    /* Deja solo dos dígitos y no deja pasar de 12 en la hora ni de 59 en los minutos. */
    function limitarCampo(campo, maximo) {
        if (!campo) return;
        var digitos = campo.value.replace(/\D/g, '').slice(0, 2);
        if (digitos !== '' && Number(digitos) > maximo) digitos = String(maximo);
        campo.value = digitos;
    }

    /* Al salir del campo, si la hora quedó en 0 la sube a 1. */
    function normalizarHora() {
        limitarCampo(campoHora, 12);
        if (campoHora && campoHora.value !== '' && Number(campoHora.value) < 1) campoHora.value = '1';
    }

    /* Devuelve am o pm según el botón que está presionado. */
    function periodoActual() {
        return botonPm.getAttribute('aria-pressed') === 'true' ? 'pm' : 'am';
    }

    /* Marca a. m. o p. m. como el período elegido. */
    function marcarPeriodo(periodo) {
        botonAm.setAttribute('aria-pressed', periodo === 'am' ? 'true' : 'false');
        botonPm.setAttribute('aria-pressed', periodo === 'pm' ? 'true' : 'false');
    }

    /* Dice si ese mes ya fue agregado a la agenda. */
    function mesAgregado(valor) {
        return Array.isArray(reglas) && reglas.some(function (fila) {
            return fila.tipo === 'mes' && fila.valor === valor && fila.estado === 'abierta';
        });
    }

    /* Devuelve abierta, bloqueada u ocupada para un día concreto. */
    function estadoDia(iso) {
        var marca = '';
        if (!Array.isArray(reglas)) return marca;
        reglas.forEach(function (fila) {
            if (fila.tipo === 'fecha' && fila.valor === iso) marca = fila.estado;
        });
        return marca;
    }

    /* Deja seleccionado el pincel de hábil, no disponible u ocupada. */
    function elegirPincel(estado) {
        pincel = estado;
        var botones = document.querySelectorAll('.pincel');
        for (var i = 0; i < botones.length; i += 1) {
            botones[i].setAttribute('aria-pressed', botones[i].getAttribute('data-pincel') === estado ? 'true' : 'false');
        }
    }

    /* Lista las horas de citas reales que ya existen ese día. */
    function citasDelDia(valor) {
        if (!Array.isArray(citas)) return [];
        return citas.filter(function (cita) { return cita.fecha === valor; })
            .map(function (cita) { return cita.hora; })
            .sort();
    }

    /* Dibuja el reloj de una casilla ocupada. */
    function iconoReloj() {
        var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('viewBox', '0 0 24 24');
        svg.setAttribute('class', 'icono-reloj');
        svg.setAttribute('aria-hidden', 'true');
        var circulo = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circulo.setAttribute('cx', '12');
        circulo.setAttribute('cy', '12');
        circulo.setAttribute('r', '8');
        circulo.setAttribute('fill', 'none');
        circulo.setAttribute('stroke', 'currentColor');
        circulo.setAttribute('stroke-width', '2');
        var aguja = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        aguja.setAttribute('d', 'M12 8v5l3 2');
        aguja.setAttribute('fill', 'none');
        aguja.setAttribute('stroke', 'currentColor');
        aguja.setAttribute('stroke-width', '2');
        aguja.setAttribute('stroke-linecap', 'round');
        svg.appendChild(circulo);
        svg.appendChild(aguja);
        return svg;
    }

    /* Muestra los meses agregados y el botón para quitar cada uno. */
    function pintarMeses() {
        var filas = reglas.filter(function (fila) {
            return fila.tipo === 'mes' && fila.estado === 'abierta';
        }).sort(function (a, b) { return a.valor < b.valor ? -1 : 1; });
        listaMes.innerHTML = '';
        if (!filas.length) {
            var vacio = document.createElement('p');
            vacio.className = 'vacio';
            vacio.textContent = 'Todavía no hay meses.';
            listaMes.appendChild(vacio);
            return;
        }
        filas.forEach(function (fila) {
            var chip = document.createElement('div');
            chip.className = 'chip' + (fila.valor === campoMes.value ? ' activo' : '');
            var ver = document.createElement('button');
            ver.type = 'button';
            ver.textContent = nombreMes(fila.valor);
            ver.addEventListener('click', function () {
                campoMes.value = fila.valor;
                pintar();
            });
            var quitar = document.createElement('button');
            quitar.type = 'button';
            quitar.className = 'chip-quitar';
            quitar.textContent = 'Quitar';
            quitar.addEventListener('click', function () {
                quitarMes(fila.valor);
            });
            chip.appendChild(ver);
            chip.appendChild(quitar);
            listaMes.appendChild(chip);
        });
    }

    /* Dibuja o actualiza los días del mes que se está viendo. */
    function pintarDias() {
        var valor = campoMes.value;
        if (!/^\d{4}-\d{2}$/.test(valor)) {
            diasMes.innerHTML = '';
            mesActivo.textContent = '';
            return;
        }
        var partes = valor.split('-');
        var anio = Number(partes[0]);
        var mes = Number(partes[1]) - 1;
        mesActivo.textContent = nombreMes(valor);
        var inicio = new Date(anio, mes, 1);
        var desplazamiento = (inicio.getDay() + 6) % 7;
        var total = new Date(anio, mes + 1, 0).getDate();
        var botones = diasMes.querySelectorAll('.dia-mes');
        var primero = botones[0];
        if (botones.length === total && primero && primero.getAttribute('data-fecha').indexOf(valor + '-') === 0) {
            for (var diaListo = 1; diaListo <= total; diaListo += 1) {
                var isoListo = valor + '-' + String(diaListo).padStart(2, '0');
                aplicarMarca(botones[diaListo - 1], diaListo, isoListo, valor);
            }
            return;
        }
        var i;
        diasMes.innerHTML = '';
        for (i = 0; i < desplazamiento; i += 1) {
            var hueco = document.createElement('span');
            diasMes.appendChild(hueco);
        }
        for (var dia = 1; dia <= total; dia += 1) {
            var iso = valor + '-' + String(dia).padStart(2, '0');
            var boton = document.createElement('button');
            boton.type = 'button';
            boton.className = 'dia-mes';
            boton.setAttribute('data-fecha', iso);
            var numero = document.createElement('span');
            numero.className = 'dia-num';
            numero.textContent = String(dia);
            boton.appendChild(numero);
            aplicarMarca(boton, dia, iso, valor);
            diasMes.appendChild(boton);
        }
    }

    /* Pinta un día solo si ya tiene marca: verde, X o gris con reloj. Sin marca queda en blanco con el número. */
    function aplicarMarca(boton, dia, iso, valor) {
        var marca = estadoDia(iso);
        var horasCita = citasDelDia(iso);
        boton.classList.remove('habil', 'ocupada', 'cerrado');
        var texto = '';
        if (marca === 'abierta') {
            boton.classList.add('habil');
            texto = ', hábil';
        } else if (marca === 'ocupada') {
            boton.classList.add('ocupada');
            texto = ', ocupada';
        } else if (marca === 'bloqueada') {
            boton.classList.add('cerrado');
            texto = ', no disponible';
        }
        var equis = boton.querySelector('.marca-x');
        if (boton.classList.contains('cerrado')) {
            if (!equis) {
                equis = document.createElement('span');
                equis.className = 'marca-x';
                equis.setAttribute('aria-hidden', 'true');
                equis.textContent = '×';
                boton.appendChild(equis);
            }
        } else if (equis) {
            equis.remove();
        }
        var reloj = boton.querySelector('.icono-reloj');
        if (marca === 'ocupada') {
            if (!reloj) boton.appendChild(iconoReloj());
        } else if (reloj) {
            reloj.remove();
        }
        if (horasCita.length) {
            texto += ', con cita a las ' + horasCita.map(etiquetaHora).join(', ');
        }
        boton.setAttribute('aria-pressed', marca === 'abierta' ? 'true' : 'false');
        boton.setAttribute('aria-label', dia + ' de ' + nombreMes(valor) + texto);
    }

    /* Lista las horas exactas que el administrador ya guardó. */
    function pintarHoras() {
        var filas = reglas.filter(function (fila) {
            return fila.tipo === 'hora' && fila.estado === 'abierta';
        }).sort(function (a, b) { return a.valor < b.valor ? -1 : 1; });
        listaHora.innerHTML = '';
        if (!filas.length) {
            var vacio = document.createElement('li');
            vacio.className = 'vacio';
            vacio.textContent = 'Sin horas agregadas. Se usan de 7:00 a. m. a 2:00 p. m.';
            listaHora.appendChild(vacio);
            return;
        }
        filas.forEach(function (fila) {
            var item = document.createElement('li');
            item.className = 'regla';
            var texto = document.createElement('span');
            texto.textContent = etiquetaHora(fila.valor);
            var quitar = document.createElement('button');
            quitar.type = 'button';
            quitar.textContent = 'Quitar';
            quitar.addEventListener('click', function () {
                guardar('quitar', 'hora', fila.valor, '');
            });
            item.appendChild(texto);
            item.appendChild(quitar);
            listaHora.appendChild(item);
        });
    }

    /* Vuelve a dibujar meses, días y horas con lo que hay en memoria. */
    function pintar() {
        pintarMeses();
        pintarDias();
        pintarHoras();
    }

    /* Pide al servidor la agenda y las citas, y las dibuja. */
    function cargar() {
        var visto = revision;
        var ruta = window.location.pathname;
        if (!/\.php$|\.html$/i.test(ruta) && ruta.slice(-1) !== '/') ruta += '/';
        ruta = ruta.replace(/[^/]*$/, '') + 'agenda.php';
        return fetch(ruta, { cache: 'no-store', credentials: 'same-origin' })
            .then(function (respuesta) {
                return respuesta.text().then(function (texto) {
                    var datos = null;
                    try { datos = JSON.parse(texto); } catch (error) { datos = null; }
                    return { estado: respuesta.status, datos: datos };
                });
            })
            .then(function (resultado) {
                if (visto !== revision) return;
                var datos = resultado.datos || {};
                var filas = Array.isArray(datos.reglas) ? datos.reglas : [];
                if (datos.ok) {
                    reglas = filas;
                    citas = Array.isArray(datos.citas) ? datos.citas : [];
                    pintar();
                    mostrarAviso('');
                    return;
                }
                if (datos.mensaje) {
                    mostrarAviso(datos.mensaje);
                    return;
                }
                if (resultado.estado === 403) {
                    mostrarAviso('Inicia sesión de nuevo.');
                    return;
                }
                mostrarAviso('No se pudo leer la agenda. Entra desde el ingreso de Administración.');
            })
            .catch(function () {
                if (visto !== revision) return;
                mostrarAviso('No se pudo leer la agenda. Entra desde el ingreso de Administración.');
            });
    }

    /* Envía un cambio al servidor: guardar o quitar un mes, un día o una hora. */
    function enviar(accion, tipo, valor, estado) {
        var datos = new FormData();
        datos.append('token', token.value);
        datos.append('accion', accion);
        datos.append('tipo', tipo);
        datos.append('valor', valor);
        datos.append('estado', estado);
        return fetch('agenda.php', { method: 'POST', body: datos })
            .then(function (respuesta) {
                return respuesta.json().catch(function () { return null; });
            })
            .then(function (datos) {
                if (!datos || !datos.ok) {
                    throw new Error((datos && datos.mensaje) || 'No se pudo guardar. Entra de nuevo a Administración.');
                }
            });
    }

    /* Guarda una regla y, al terminar, vuelve a cargar la agenda. */
    function guardar(accion, tipo, valor, estado) {
        encolar(function () {
            return enviar(accion, tipo, valor, estado)
                .then(function () {
                    mostrarAviso('');
                    return cargar();
                })
                .catch(function (error) {
                    mostrarAviso(error.message || 'No se pudo guardar.');
                });
        });
    }

    /* Quita un mes de la lista y lo borra en el servidor. */
    function quitarMes(valor) {
        var dias = reglas.filter(function (fila) {
            return fila.tipo === 'fecha' && fila.valor.slice(0, 7) === valor;
        });
        encolar(function () {
            var cadena = enviar('quitar', 'mes', valor, '');
            dias.forEach(function (fila) {
                cadena = cadena.then(function () {
                    return enviar('quitar', 'fecha', fila.valor, '');
                });
            });
            return cadena
                .then(function () {
                    mostrarAviso('');
                    return cargar();
                })
                .catch(function (error) {
                    mostrarAviso(error.message || 'No se pudo quitar el mes.');
                    return cargar();
                });
        });
    }

    /* Pinta el día con el pincel elegido y guarda ese cambio. */
    function aplicarPincel(iso) {
        if (!iso || estadoDia(iso) === pincel) return;
        revision += 1;
        var estado = pincel;
        var mes = iso.slice(0, 7);
        var crearMes = !mesAgregado(mes);
        ponerRegla('fecha', iso, estado);
        if (crearMes) ponerRegla('mes', mes, 'abierta');
        pintar();
        var horasCita = citasDelDia(iso);
        mostrarAviso(horasCita.length ? 'Ese día ya tiene cita a las ' + horasCita.map(etiquetaHora).join(', ') : '');
        encolar(function () {
            ponerRegla('fecha', iso, estado);
            if (crearMes) ponerRegla('mes', mes, 'abierta');
            pintar();
            var cadena = crearMes ? enviar('guardar', 'mes', mes, 'abierta') : Promise.resolve();
            return cadena
                .then(function () {
                    return enviar('guardar', 'fecha', iso, estado);
                })
                .catch(function (error) {
                    mostrarAviso(error.message || 'No se pudo guardar.');
                    return cargar();
                });
        });
    }

    document.getElementById('form-mes').addEventListener('submit', function (evento) {
        evento.preventDefault();
        if (!campoMes.value) return;
        guardar('guardar', 'mes', campoMes.value, 'abierta');
    });

    campoMes.addEventListener('change', function () {
        pintarDias();
        pintarMeses();
    });

    document.getElementById('form-hora').addEventListener('submit', function (evento) {
        evento.preventDefault();
        normalizarHora();
        limitarCampo(campoMinuto, 59);
        if (!campoHora.value) {
            mostrarAviso('Escribe una hora de 1 a 12.');
            return;
        }
        var valor = a24(campoHora.value, campoMinuto.value, periodoActual());
        guardar('guardar', 'hora', valor, 'abierta');
    });

    campoHora.addEventListener('input', function () { limitarCampo(campoHora, 12); });
    campoHora.addEventListener('blur', normalizarHora);
    campoMinuto.addEventListener('input', function () { limitarCampo(campoMinuto, 59); });

    botonAm.addEventListener('click', function () { marcarPeriodo('am'); });
    botonPm.addEventListener('click', function () { marcarPeriodo('pm'); });

    var pinceles = document.querySelectorAll('.pincel');
    for (var i = 0; i < pinceles.length; i += 1) {
        pinceles[i].addEventListener('click', function (evento) {
            elegirPincel(evento.currentTarget.getAttribute('data-pincel'));
        });
    }

    diasMes.addEventListener('click', function (evento) {
        var boton = evento.target.closest ? evento.target.closest('.dia-mes') : null;
        if (!boton || !diasMes.contains(boton)) return;
        aplicarPincel(boton.getAttribute('data-fecha'));
    });

    pintar();
    cargar();
})();
