/* Panel del administrador: asistente por pasos para mes, día, hora y vista previa. */
(function () {
    var token = document.getElementById('agenda-token');
    var alertaCaja = document.getElementById('admin-alerta');
    var alertaAbrir = document.getElementById('admin-alerta-abrir');
    var alertaPopup = document.getElementById('admin-alerta-popup');
    var alertaFondo = document.getElementById('admin-alerta-fondo');
    var alertaLista = document.getElementById('admin-alerta-lista');
    var alertaVacio = document.getElementById('admin-alerta-vacio');
    var alertaCuenta = document.getElementById('admin-alerta-cuenta');
    var alertaCerrar = document.getElementById('admin-alerta-cerrar');
    var alertas = [];
    var consultasAvisos = [];
    var alertaId = 0;
    var timerAlerta = null;
    var timerPulso = null;
    var campoMes = document.getElementById('mes');
    var listaHora = document.getElementById('lista-hora');
    var listaMesResumen = document.getElementById('lista-mes-resumen');
    var listaDiasResumen = document.getElementById('lista-dias-resumen');
    var diasMes = document.getElementById('dias-mes');
    var mesActivo = document.getElementById('mes-activo');
    var diaElegido = document.getElementById('dia-elegido');
    var campoHora = document.getElementById('hora-12');
    var campoMinuto = document.getElementById('minuto');
    var botonAm = document.getElementById('periodo-am');
    var botonPm = document.getElementById('periodo-pm');
    var asistente = document.getElementById('asistente');
    var asistentePasos = document.getElementById('asistente-pasos');
    var asistenteTitulo = document.getElementById('asistente-titulo');
    var asistenteAyuda = document.getElementById('asistente-ayuda');
    var botonAbrir = document.getElementById('abrir-asistente');
    var botonCerrar = document.getElementById('cerrar-asistente');
    var botonAtras = document.getElementById('asistente-atras');
    var botonSiguiente = document.getElementById('asistente-siguiente');
    var botonGuardar = document.getElementById('asistente-guardar');
    var vistaFecha = document.getElementById('vista-previa-fecha');
    var vistaHora = document.getElementById('vista-previa-hora');
    var vistaEstado = document.getElementById('vista-previa-estado');
    var vistaTarjeta = document.getElementById('vista-previa-tarjeta');
    var guardadas = document.getElementById('guardadas');
    var botonAbrirGuardadas = document.getElementById('abrir-guardadas');
    var botonCerrarGuardadas = document.getElementById('cerrar-guardadas');
    var tabDisponibilidad = document.getElementById('tab-disponibilidad');
    var tabCitas = document.getElementById('tab-citas');
    var panelDisponibilidad = document.getElementById('panel-disponibilidad');
    var panelCitas = document.getElementById('panel-citas');
    var listaDisponibilidad = document.getElementById('lista-disponibilidad');
    var listaCitas = document.getElementById('lista-citas');
    var citaFormulario = document.getElementById('cita-formulario');
    var citaId = document.getElementById('cita-id');
    var citaFecha = document.getElementById('cita-fecha');
    var citaHora = document.getElementById('cita-hora');
    var citaResumen = document.getElementById('cita-resumen');
    var citaCorreoLinea = document.getElementById('cita-correo-linea');
    var citaCorreoTexto = document.getElementById('cita-correo-texto');
    var citaPersona = document.getElementById('cita-persona');
    var citaMotivo = document.getElementById('cita-motivo');
    var citaNotas = document.getElementById('cita-notas');
    var citaRespuesta = document.getElementById('cita-respuesta');
    var citaFormTitulo = document.getElementById('cita-form-titulo');
    var botonCitaGuardar = document.getElementById('cita-guardar');
    var botonCitaEnviar = document.getElementById('cita-enviar-respuesta');
    var botonCitaLimpiar = document.getElementById('cita-limpiar');
    var citaCorreoActual = '';
    var detalleClave = '';
    var scrollLista = 0;
    var diasSemana = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
    var cuentaDisponibilidad = document.getElementById('cuenta-disponibilidad');
    var cuentaCitas = document.getElementById('cuenta-citas');
    var meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'setiembre', 'octubre', 'noviembre', 'diciembre'];
    var titulos = {
        1: 'Elegí el mes',
        2: 'Tipo de fecha',
        3: 'Elegí el día',
        4: 'Elegí la hora',
        5: 'Revisá y guardá'
    };
    var ayudas = {
        1: 'Primero el mes en el que querés trabajar.',
        2: 'Antes del día, elegí si será hábil, ocupada por alguien o no hábil.',
        3: 'Tocá un día del calendario.',
        4: 'Escribí la hora y los minutos, y elegí a. m. o p. m.',
        5: 'Así quedaría esa fecha. Si está bien, guardala.'
    };
    var textosEstado = {
        abierta: 'Hábil / disponible para citas',
        ocupada: 'Ocupada por alguien',
        bloqueada: 'No hábil'
    };
    var reglas = [];
    var citas = [];
    var cola = Promise.resolve();
    var revision = 0;
    var paso = 1;
    var diaSeleccionado = '';
    var estadoFinal = 'abierta';
    var horaAyuda = document.getElementById('hora-ayuda');

    function renderAlertas() {
        if (!alertaLista) return;
        alertaLista.innerHTML = '';
        if (!alertas.length && !consultasAvisos.length) {
            var vacio = document.createElement('p');
            vacio.className = 'admin-alerta-vacio';
            vacio.id = 'admin-alerta-vacio';
            vacio.textContent = 'No hay consultas pendientes por ahora.';
            alertaLista.appendChild(vacio);
            alertaVacio = vacio;
        } else {
            alertaVacio = null;
        }
        for (var c = 0; c < consultasAvisos.length; c++) {
            var aviso = consultasAvisos[c];
            var boton = document.createElement('button');
            boton.type = 'button';
            boton.className = 'admin-alerta-item admin-alerta-consulta';
            boton.setAttribute('data-alerta-tipo', aviso.tipo);
            boton.setAttribute('data-alerta-id', String(aviso.id));
            boton.textContent = aviso.texto;
            alertaLista.appendChild(boton);
        }
        for (var i = 0; i < alertas.length; i++) {
            var p = document.createElement('p');
            p.className = 'admin-alerta-item' + (alertas[i].esError ? '' : ' admin-alerta-item-ok');
            p.textContent = alertas[i].texto;
            alertaLista.appendChild(p);
        }
        var n = consultasAvisos.length + alertas.length;
        if (alertaCaja) alertaCaja.classList.toggle('admin-alerta-con-avisos', n > 0);
        if (alertaCuenta) {
            alertaCuenta.hidden = n < 1;
            alertaCuenta.textContent = n > 9 ? '9+' : String(n);
        }
    }

    function setAlertaAbierta(abierto) {
        if (!alertaPopup || !alertaAbrir) return;
        alertaPopup.hidden = !abierto;
        alertaAbrir.setAttribute('aria-expanded', abierto ? 'true' : 'false');
        if (abierto && alertaCerrar) alertaCerrar.focus();
    }

    function quitarAlerta(id) {
        alertas = alertas.filter(function (item) { return item.id !== id; });
        renderAlertas();
    }

    function pintarAlerta(texto, esError, autoCerrarMs) {
        if (!texto) return;
        var id = ++alertaId;
        alertas.unshift({ id: id, texto: String(texto), esError: !!esError });
        if (alertas.length > 12) alertas.length = 12;
        renderAlertas();
        if (autoCerrarMs > 0) {
            clearTimeout(timerAlerta);
            timerAlerta = setTimeout(function () {
                quitarAlerta(id);
            }, autoCerrarMs);
        }
    }

    window.adminMostrarAlerta = pintarAlerta;

    window.adminSincronizarConsultas = function (lista, llegaronNuevas) {
        consultasAvisos = Array.isArray(lista) ? lista.slice(0, 12) : [];
        renderAlertas();
        if (!llegaronNuevas || !alertaCaja || !consultasAvisos.length) return;
        alertaCaja.classList.remove('admin-alerta-llegada');
        void alertaCaja.offsetWidth;
        alertaCaja.classList.add('admin-alerta-llegada');
        clearTimeout(timerPulso);
        timerPulso = setTimeout(function () {
            alertaCaja.classList.remove('admin-alerta-llegada');
        }, 2200);
    };

    if (alertaLista) {
        alertaLista.addEventListener('click', function (evento) {
            var boton = evento.target.closest('[data-alerta-tipo]');
            if (!boton || !window.adminAbrirConsulta) return;
            setAlertaAbierta(false);
            window.adminAbrirConsulta(
                boton.getAttribute('data-alerta-tipo'),
                boton.getAttribute('data-alerta-id')
            );
        });
    }

    if (alertaAbrir) {
        alertaAbrir.addEventListener('click', function () {
            setAlertaAbierta(alertaPopup ? alertaPopup.hidden : true);
        });
    }
    if (alertaCerrar) {
        alertaCerrar.addEventListener('click', function () {
            setAlertaAbierta(false);
        });
    }
    if (alertaFondo) {
        alertaFondo.addEventListener('click', function () {
            setAlertaAbierta(false);
        });
    }
    document.addEventListener('keydown', function (evento) {
        if (evento.key === 'Escape' && alertaPopup && !alertaPopup.hidden) {
            setAlertaAbierta(false);
        }
    });
    renderAlertas();

    function mostrarAviso(texto) {
        if (!texto) return;
        if (window.SitrainaAvisos) window.SitrainaAvisos.error('No se pudo completar', texto);
        else pintarAlerta(texto, true, 0);
    }

    function mostrarGuardado(texto) {
        if (!texto) return;
        if (window.SitrainaAvisos) window.SitrainaAvisos.exito('Listo', texto);
        else pintarAlerta(texto, false, 2400);
    }

    function mostrarErrorGuardado(texto) {
        if (!texto) return;
        if (window.SitrainaAvisos) window.SitrainaAvisos.error('No se pudo completar', texto);
        else pintarAlerta(texto, true, 0);
    }

    function pedirConfirmacion(titulo, texto) {
        if (window.SitrainaAvisos) {
            return window.SitrainaAvisos.confirmar({
                titulo: titulo,
                texto: texto,
                confirmar: 'Eliminar',
                cancelar: 'Cancelar'
            });
        }
        return Promise.resolve(window.confirm(texto));
    }

    if (!token || !campoMes || !diasMes || !asistente) return;

    var hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    campoMes.value = hoy.getFullYear() + '-' + String(hoy.getMonth() + 1).padStart(2, '0');

    function encolar(trabajo) {
        var corre = cola.then(trabajo, trabajo);
        cola = corre.then(function () { return null; }, function () { return null; });
        return corre;
    }

    function nombreMes(valor) {
        var partes = String(valor || '').split('-');
        if (partes.length < 2) return '';
        return meses[Number(partes[1]) - 1] + ' ' + partes[0];
    }

    function etiquetaFecha(iso) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return '';
        var partes = iso.split('-');
        return Number(partes[2]) + ' de ' + nombreMes(partes[0] + '-' + partes[1]);
    }

    function etiquetaHora(valor) {
        var partes = String(valor || '').split(':');
        if (partes.length < 2) return '';
        var hora = Number(partes[0]);
        var periodo = hora >= 12 ? 'p. m.' : 'a. m.';
        hora = hora % 12;
        if (hora === 0) hora = 12;
        return hora + ':' + partes[1] + ' ' + periodo;
    }

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

    function limitarCampo(campo, maximo) {
        if (!campo) return;
        var digitos = campo.value.replace(/\D/g, '').slice(0, 2);
        if (digitos !== '' && Number(digitos) > maximo) digitos = String(maximo);
        campo.value = digitos;
    }

    function normalizarHora() {
        limitarCampo(campoHora, 12);
        if (campoHora && campoHora.value !== '' && Number(campoHora.value) < 1) campoHora.value = '1';
        if (campoMinuto && campoMinuto.value === '') campoMinuto.value = '00';
        if (campoMinuto && campoMinuto.value.length === 1) campoMinuto.value = '0' + campoMinuto.value;
    }

    function periodoActual() {
        return botonPm.getAttribute('aria-pressed') === 'true' ? 'pm' : 'am';
    }

    function marcarPeriodo(periodo) {
        botonAm.setAttribute('aria-pressed', periodo === 'am' ? 'true' : 'false');
        botonPm.setAttribute('aria-pressed', periodo === 'pm' ? 'true' : 'false');
    }

    function mesAgregado(valor) {
        return Array.isArray(reglas) && reglas.some(function (fila) {
            return fila.tipo === 'mes' && fila.valor === valor && fila.estado === 'abierta';
        });
    }

    function estadoDia(iso) {
        var marca = '';
        if (!Array.isArray(reglas)) return marca;
        reglas.forEach(function (fila) {
            if (fila.tipo === 'fecha' && fila.valor === iso) marca = fila.estado;
        });
        return marca;
    }

    function citasDelDia(valor) {
        if (!Array.isArray(citas)) return [];
        return citas.filter(function (cita) { return cita.fecha === valor; })
            .map(function (cita) { return cita.hora; })
            .sort();
    }

    function horaActual() {
        normalizarHora();
        limitarCampo(campoMinuto, 59);
        if (!campoHora || !campoHora.value) return '';
        return a24(campoHora.value, campoMinuto.value, periodoActual());
    }

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

    function aplicarMarca(boton, dia, iso, valor) {
        var marca = estadoDia(iso);
        var horasCita = citasDelDia(iso);
        var elegido = iso === diaSeleccionado;
        boton.classList.remove('habil', 'ocupada', 'cerrado', 'dia-seleccionado');
        if (elegido) boton.classList.add('dia-seleccionado');
        if (marca === 'abierta') boton.classList.add('habil');
        else if (marca === 'bloqueada') boton.classList.add('cerrado');
        else if (marca === 'ocupada') boton.classList.add('ocupada');

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
        if (horasCita.length || marca === 'ocupada') {
            if (!reloj) boton.appendChild(iconoReloj());
            if (marca === 'ocupada' && !horasCita.length) boton.classList.add('ocupada');
        } else if (reloj) {
            reloj.remove();
        }

        var texto = elegido ? ', seleccionado' : '';
        if (marca === 'abierta') texto += ', disponible';
        else if (marca === 'bloqueada') texto += ', no disponible';
        if (horasCita.length) texto += ', con cita a las ' + horasCita.map(etiquetaHora).join(', ');
        boton.setAttribute('aria-pressed', elegido ? 'true' : 'false');
        boton.setAttribute('aria-label', dia + ' de ' + nombreMes(valor) + texto);
    }

    function pintarDias() {
        var valor = campoMes.value;
        if (!/^\d{4}-\d{2}$/.test(valor)) {
            diasMes.innerHTML = '';
            if (mesActivo) mesActivo.textContent = '';
            return;
        }
        var partes = valor.split('-');
        var anio = Number(partes[0]);
        var mes = Number(partes[1]) - 1;
        if (mesActivo) mesActivo.textContent = nombreMes(valor);
        var inicio = new Date(anio, mes, 1);
        var desplazamiento = (inicio.getDay() + 6) % 7;
        var total = new Date(anio, mes + 1, 0).getDate();
        diasMes.innerHTML = '';
        var i;
        for (i = 0; i < desplazamiento; i += 1) {
            diasMes.appendChild(document.createElement('span'));
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
        if (diaElegido) {
            diaElegido.textContent = diaSeleccionado
                ? 'Día elegido: ' + etiquetaFecha(diaSeleccionado)
                : 'Todavía no elegiste un día.';
        }
    }

    function pintarListaCasillas(nodo, filas, vacioTexto, opciones) {
        if (!nodo) return;
        nodo.innerHTML = '';
        if (!filas.length) {
            var vacio = document.createElement('li');
            vacio.className = 'vacio-bloque';
            vacio.textContent = vacioTexto;
            nodo.appendChild(vacio);
            return;
        }
        filas.forEach(function (fila) {
            var titulo = opciones.formatear(fila);
            var clave = (fila.tipo || opciones.tipo || '') + ':' + fila.valor;
            nodo.appendChild(crearCasilla({
                clave: clave,
                tipoTexto: opciones.tipoTexto,
                titulo: titulo,
                estado: fila.estado || 'abierta',
                claseEstado: claseEstado(fila.estado || 'abierta'),
                filasMeta: [
                    { etiqueta: 'Tipo', valor: opciones.tipoTexto },
                    { etiqueta: 'Valor', valor: fila.valor },
                    { etiqueta: 'Estado', valor: etiquetaEstado(fila.estado || 'abierta') }
                ],
                acciones: [
                    {
                        texto: 'Ver en base',
                        clase: 'btn-item',
                        aria: 'Ver ' + titulo + ' en fechas guardadas',
                        alClick: function () {
                            abrirGuardadas();
                            mostrarPestanaGuardadas(opciones.pestana === 'citas' ? 'citas' : 'disponibilidad');
                            window.setTimeout(function () {
                                abrirCasillaPorClave(clave);
                            }, 80);
                        }
                    },
                    {
                        texto: 'Eliminar',
                        clase: 'btn-item btn-item-peligro',
                        aria: 'Eliminar ' + titulo,
                        alClick: function () {
                            pedirConfirmacion('Eliminar de la base', '¿Eliminar «' + titulo + '»? Esta acción no se puede deshacer.').then(function (aceptado) {
                                if (!aceptado) return;
                                opciones.alQuitar(fila);
                            });
                        }
                    }
                ]
            }));
        });
    }

    function pintarResumen() {
        var mesesAbiertos = reglas.filter(function (fila) {
            return fila.tipo === 'mes' && fila.estado === 'abierta';
        }).sort(function (a, b) { return a.valor < b.valor ? -1 : 1; });
        pintarListaCasillas(listaMesResumen, mesesAbiertos, 'Sin meses todavía.', {
            tipo: 'mes',
            tipoTexto: 'Mes',
            formatear: function (fila) { return nombreMes(fila.valor); },
            alQuitar: function (fila) { quitarMes(fila.valor); }
        });

        var diasAbiertos = reglas.filter(function (fila) {
            return fila.tipo === 'fecha' && fila.estado === 'abierta';
        }).sort(function (a, b) { return a.valor < b.valor ? -1 : 1; });
        pintarListaCasillas(listaDiasResumen, diasAbiertos, 'Sin días todavía.', {
            tipo: 'fecha',
            tipoTexto: 'Día',
            formatear: function (fila) { return etiquetaFecha(fila.valor); },
            alQuitar: function (fila) {
                guardar('quitar', 'fecha', fila.valor, '', 'Día quitado.');
            }
        });

        var horas = reglas.filter(function (fila) {
            return fila.tipo === 'hora' && fila.estado === 'abierta';
        }).sort(function (a, b) { return a.valor < b.valor ? -1 : 1; });
        pintarListaCasillas(listaHora, horas, 'Sin horas. Se usan de 7:00 a. m. a 2:00 p. m.', {
            tipo: 'hora',
            tipoTexto: 'Hora',
            formatear: function (fila) { return etiquetaHora(fila.valor); },
            alQuitar: function (fila) {
                guardar('quitar', 'hora', fila.valor, '', 'Hora quitada.');
            }
        });

        pintarGuardadas();
    }

    function etiquetaEstado(estado) {
        if (estado === 'abierta') return 'Hábil';
        if (estado === 'bloqueada') return 'No hábil';
        if (estado === 'ocupada') return 'Ocupada';
        return estado || 'Sin estado';
    }

    function claseEstado(estado) {
        if (estado === 'abierta') return 'estado-habil';
        if (estado === 'bloqueada') return 'estado-bloqueada';
        if (estado === 'ocupada') return 'estado-ocupada';
        return 'estado-neutro';
    }

    function etiquetaTipo(tipo) {
        if (tipo === 'mes') return 'Mes';
        if (tipo === 'fecha') return 'Día';
        if (tipo === 'hora') return 'Hora';
        return 'Registro';
    }

    function crearBotonAccion(texto, clase, ariaLabel, alClick) {
        var boton = document.createElement('button');
        boton.type = 'button';
        boton.className = clase || '';
        boton.textContent = texto;
        if (ariaLabel) boton.setAttribute('aria-label', ariaLabel);
        boton.addEventListener('click', alClick);
        return boton;
    }

    function crearBadgeEstado(estado) {
        var badge = document.createElement('span');
        badge.className = 'estado-badge ' + claseEstado(estado);
        var punto = document.createElement('span');
        punto.className = 'estado-punto';
        punto.setAttribute('aria-hidden', 'true');
        badge.appendChild(punto);
        badge.appendChild(document.createTextNode(' ' + etiquetaEstado(estado)));
        return badge;
    }

    function crearFilaMeta(etiqueta, valor, vacio) {
        var fila = document.createElement('div');
        fila.className = 'item-meta-fila' + (vacio ? ' item-meta-vacio' : '');
        var dt = document.createElement('span');
        dt.className = 'item-meta-etiqueta';
        dt.textContent = etiqueta;
        var dd = document.createElement('span');
        dd.className = 'item-meta-valor';
        dd.textContent = valor;
        fila.appendChild(dt);
        fila.appendChild(dd);
        return fila;
    }

    function crearGrupoGuardadas(titulo, descripcion) {
        var grupo = document.createElement('section');
        grupo.className = 'grupo-guardadas';
        var cabeza = document.createElement('header');
        cabeza.className = 'grupo-guardadas-cabeza';
        var h = document.createElement('h3');
        h.className = 'grupo-guardadas-titulo';
        h.textContent = titulo;
        var p = document.createElement('p');
        p.className = 'grupo-guardadas-ayuda';
        p.textContent = descripcion;
        cabeza.appendChild(h);
        cabeza.appendChild(p);
        var lista = document.createElement('ul');
        lista.className = 'rejilla-casillas';
        grupo.appendChild(cabeza);
        grupo.appendChild(lista);
        return { grupo: grupo, lista: lista };
    }

    function cerrarOtrasCasillas(excepto) {
        var abiertas = document.querySelectorAll('.casilla.casilla-abierta');
        for (var i = 0; i < abiertas.length; i += 1) {
            if (excepto && abiertas[i] === excepto) continue;
            cerrarCasilla(abiertas[i]);
        }
    }

    function cerrarCasilla(casilla) {
        if (!casilla) return;
        casilla.classList.remove('casilla-abierta');
        var tapa = casilla.querySelector('.casilla-tapa');
        var detalle = casilla.querySelector('.casilla-detalle');
        if (tapa) tapa.setAttribute('aria-expanded', 'false');
        if (detalle) detalle.hidden = true;
    }

    function abrirCasilla(casilla) {
        if (!casilla) return;
        cerrarOtrasCasillas(casilla);
        casilla.classList.add('casilla-abierta');
        var tapa = casilla.querySelector('.casilla-tapa');
        var detalle = casilla.querySelector('.casilla-detalle');
        if (tapa) tapa.setAttribute('aria-expanded', 'true');
        if (detalle) {
            detalle.hidden = false;
            casilla.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }

    function abrirCasillaPorClave(clave) {
        if (!clave || !guardadas) return;
        if (clave.indexOf('fecha:') === 0 || clave.indexOf('cita:') === 0) {
            abrirDetalleFecha(clave);
            return;
        }
        var extra = document.getElementById('fechas-extra');
        if (extra) extra.open = true;
        var casilla = guardadas.querySelector('.casilla[data-clave="' + clave.replace(/"/g, '') + '"]');
        if (casilla) abrirCasilla(casilla);
    }

    function capitalizar(texto) {
        var valor = String(texto || '');
        if (!valor) return '';
        return valor.charAt(0).toUpperCase() + valor.slice(1);
    }

    function partesFecha(iso) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
        var partes = iso.split('-');
        var anio = Number(partes[0]);
        var mes = Number(partes[1]);
        var dia = Number(partes[2]);
        if (mes < 1 || mes > 12 || dia < 1 || dia > 31) return null;
        var marca = new Date(Date.UTC(anio, mes - 1, dia));
        if (marca.getUTCFullYear() !== anio || marca.getUTCMonth() !== mes - 1 || marca.getUTCDate() !== dia) return null;
        return {
            anio: anio,
            mes: mes,
            dia: dia,
            mesNombre: meses[mes - 1] || '',
            semana: diasSemana[marca.getUTCDay()] || ''
        };
    }

    function crearFechaCasilla(opciones, indice) {
        var item = document.createElement('li');
        var boton = document.createElement('button');
        boton.type = 'button';
        boton.className = 'fecha-casilla';
        boton.setAttribute('data-clave', opciones.clave);
        boton.setAttribute('aria-label', opciones.aria);
        boton.style.animationDelay = (Math.min(indice, 14) * 35) + 'ms';
        var dia = document.createElement('span');
        dia.className = 'fecha-casilla-dia';
        dia.textContent = String(opciones.dia);
        var mes = document.createElement('span');
        mes.className = 'fecha-casilla-mes';
        mes.textContent = opciones.mes || '';
        boton.appendChild(dia);
        boton.appendChild(mes);
        boton.addEventListener('click', function () {
            abrirDetalleFecha(opciones.clave);
        });
        item.appendChild(boton);
        return item;
    }

    function agregarDato(contenedor, etiqueta, valor) {
        if (!valor) return;
        var fila = document.createElement('div');
        fila.className = 'fecha-dato';
        var dt = document.createElement('span');
        dt.className = 'fecha-dato-etiqueta';
        dt.textContent = etiqueta;
        var dd = document.createElement('span');
        dd.className = 'fecha-dato-valor';
        dd.textContent = valor;
        fila.appendChild(dt);
        fila.appendChild(dd);
        contenedor.appendChild(fila);
    }

    function horasAbiertas() {
        return reglas.filter(function (fila) { return fila.tipo === 'hora' && fila.estado === 'abierta'; })
            .sort(function (a, b) { return a.valor < b.valor ? -1 : 1; });
    }

    function citasDeFecha(iso) {
        return citas.filter(function (cita) { return cita.fecha === iso && cita.hora; })
            .sort(function (a, b) { return a.hora < b.hora ? -1 : 1; });
    }

    function crearCasilla(opciones) {
        var casilla = document.createElement('li');
        casilla.className = 'casilla casilla-' + (opciones.claseEstado || 'estado-neutro');
        if (opciones.clave) casilla.setAttribute('data-clave', opciones.clave);

        var tapa = document.createElement('button');
        tapa.type = 'button';
        tapa.className = 'casilla-tapa';
        tapa.setAttribute('aria-expanded', 'false');
        tapa.setAttribute('aria-label', 'Abrir ' + (opciones.titulo || 'registro'));

        var tipoTag = document.createElement('span');
        tipoTag.className = 'tipo-tag';
        tipoTag.textContent = opciones.tipoTexto || '';

        var titulo = document.createElement('span');
        titulo.className = 'casilla-titulo';
        titulo.textContent = opciones.titulo || '';

        var chevron = document.createElement('span');
        chevron.className = 'casilla-chevron';
        chevron.setAttribute('aria-hidden', 'true');
        chevron.textContent = '▾';

        tapa.appendChild(tipoTag);
        tapa.appendChild(titulo);
        if (opciones.estado) tapa.appendChild(crearBadgeEstado(opciones.estado));
        tapa.appendChild(chevron);

        var detalle = document.createElement('div');
        detalle.className = 'casilla-detalle';
        detalle.hidden = true;

        var meta = document.createElement('div');
        meta.className = 'item-meta';
        (opciones.filasMeta || []).forEach(function (fila) {
            meta.appendChild(crearFilaMeta(fila.etiqueta, fila.valor, !!fila.vacio));
        });

        var acciones = document.createElement('div');
        acciones.className = 'item-guardada-acciones casilla-acciones';
        acciones.setAttribute('role', 'group');
        acciones.setAttribute('aria-label', 'Acciones para ' + (opciones.titulo || 'registro'));
        (opciones.acciones || []).forEach(function (accion) {
            acciones.appendChild(crearBotonAccion(
                accion.texto,
                accion.clase,
                accion.aria,
                function (evento) {
                    if (evento) evento.stopPropagation();
                    accion.alClick();
                }
            ));
        });

        detalle.appendChild(meta);
        detalle.appendChild(acciones);

        tapa.addEventListener('click', function () {
            if (casilla.classList.contains('casilla-abierta')) cerrarCasilla(casilla);
            else abrirCasilla(casilla);
        });

        casilla.appendChild(tapa);
        casilla.appendChild(detalle);
        return casilla;
    }

    function pintarSello(contenedor, partes) {
        var sello = document.createElement('div');
        sello.className = 'fecha-detalle-sello';
        var dia = document.createElement('span');
        dia.className = 'fecha-detalle-dia';
        dia.textContent = String(partes.dia);
        var mes = document.createElement('span');
        mes.className = 'fecha-detalle-mes';
        mes.textContent = partes.mesNombre || '';
        var anio = document.createElement('span');
        anio.className = 'fecha-detalle-anio';
        anio.textContent = String(partes.anio);
        sello.appendChild(dia);
        sello.appendChild(mes);
        sello.appendChild(anio);
        contenedor.appendChild(sello);
    }

    function pintarHorasDetalle(contenedor, iso, estado) {
        var reservadas = citasDeFecha(iso);
        if (reservadas.length) {
            reservadas.forEach(function (cita) {
                agregarDato(contenedor, reservadas.length > 1 ? 'Hora de cita' : 'Hora', etiquetaHora(cita.hora));
            });
            return;
        }
        if (estado === 'bloqueada') {
            agregarDato(contenedor, 'Hora', 'Sin hora. El día está marcado como no hábil.');
            return;
        }
        if (estado !== 'abierta') {
            agregarDato(contenedor, 'Hora', 'No hay una hora guardada para esta fecha.');
            return;
        }
        var abiertas = horasAbiertas();
        if (!abiertas.length) {
            agregarDato(contenedor, 'Hora', 'No hay una hora guardada para esta fecha.');
            return;
        }
        abiertas.forEach(function (fila) {
            agregarDato(contenedor, abiertas.length > 1 ? 'Horas del horario' : 'Hora', etiquetaHora(fila.valor));
        });
        var nota = document.createElement('p');
        nota.className = 'fecha-dato-nota';
        nota.textContent = abiertas.length > 1
            ? 'Estas horas están guardadas en el horario y aplican a los días hábiles.'
            : 'Esta hora está guardada en el horario y aplica a los días hábiles.';
        contenedor.appendChild(nota);
    }

    function buscarDetalle(clave) {
        if (clave.indexOf('fecha:') === 0) {
            var valor = clave.slice(6);
            var fila = null;
            reglas.forEach(function (item) {
                if (item.tipo === 'fecha' && item.valor === valor) fila = item;
            });
            if (!fila) return null;
            var partes = partesFecha(fila.valor);
            if (!partes) return null;
            return { tipo: 'fecha', fila: fila, partes: partes };
        }
        if (clave.indexOf('cita:') === 0) {
            var id = clave.slice(5);
            var cita = null;
            citas.forEach(function (item) {
                if (String(item.id || (item.fecha + '-' + item.hora)) === id) cita = item;
            });
            if (!cita) return null;
            var partesCita = partesFecha(cita.fecha);
            if (!partesCita) return null;
            return { tipo: 'cita', cita: cita, partes: partesCita };
        }
        return null;
    }

    function pintarDetalle(datos) {
        var cuerpo = document.getElementById('fechas-detalle-cuerpo');
        var titulo = document.getElementById('fechas-detalle-titulo');
        if (!cuerpo) return;
        cuerpo.innerHTML = '';
        if (titulo) titulo.textContent = 'Información';
        pintarSello(cuerpo, datos.partes);
        var datosFila = document.createElement('div');
        datosFila.className = 'fecha-datos';
        agregarDato(datosFila, 'Día', capitalizar(datos.partes.semana));
        if (datos.tipo === 'fecha') {
            agregarDato(datosFila, 'Estado', etiquetaEstado(datos.fila.estado));
            pintarHorasDetalle(datosFila, datos.fila.valor, datos.fila.estado);
        } else {
            agregarDato(datosFila, 'Hora', etiquetaHora(datos.cita.hora) || '');
            if (datos.cita.correo) agregarDato(datosFila, 'Correo', datos.cita.correo);
            if (datos.cita.persona) agregarDato(datosFila, 'De quién', datos.cita.persona);
            if (datos.cita.motivo) agregarDato(datosFila, 'Para qué', datos.cita.motivo);
            if (datos.cita.notas) agregarDato(datosFila, 'Notas', datos.cita.notas);
        }
        cuerpo.appendChild(datosFila);

        var acciones = document.createElement('div');
        acciones.className = 'fecha-detalle-acciones';
        if (datos.tipo === 'fecha') {
            var fila = datos.fila;
            var tituloTexto = etiquetaFecha(fila.valor);
            if (fila.estado !== 'abierta') {
                acciones.appendChild(crearBotonAccion('Marcar hábil', 'btn-item', 'Marcar hábil: ' + tituloTexto, function () {
                    guardar('guardar', 'fecha', fila.valor, 'abierta', 'Estado actualizado.');
                }));
            }
            if (fila.estado !== 'bloqueada') {
                acciones.appendChild(crearBotonAccion('Marcar no hábil', 'btn-item', 'Marcar no hábil: ' + tituloTexto, function () {
                    guardar('guardar', 'fecha', fila.valor, 'bloqueada', 'Estado actualizado.');
                }));
            }
            if (fila.estado !== 'ocupada') {
                acciones.appendChild(crearBotonAccion('Marcar ocupada', 'btn-item btn-item-ocupada', 'Marcar ocupada: ' + tituloTexto, function () {
                    guardar('guardar', 'fecha', fila.valor, 'ocupada', 'Marcada como ocupada.');
                }));
            }
            acciones.appendChild(crearBotonAccion('Eliminar', 'btn-item btn-item-peligro', 'Eliminar día ' + tituloTexto, function () {
                pedirConfirmacion('Eliminar de la base', '¿Eliminar el día «' + tituloTexto + '» de la base? Esta acción no se puede deshacer.').then(function (aceptado) {
                    if (!aceptado) return;
                    guardar('quitar', 'fecha', fila.valor, '', 'Eliminado.');
                });
            }));
        } else {
            var cita = datos.cita;
            var tituloCita = etiquetaFecha(cita.fecha) + ' · ' + etiquetaHora(cita.hora);
            acciones.appendChild(crearBotonAccion('Comentar', 'btn-item', 'Añadir comentarios a la cita del ' + tituloCita, function () {
                volverFechas();
                cargarCitaEnFormulario(cita);
            }));
            acciones.appendChild(crearBotonAccion('Eliminar', 'btn-item btn-item-peligro', 'Eliminar cita del ' + tituloCita, function () {
                pedirConfirmacion('Eliminar de la base', '¿Eliminar la cita del ' + tituloCita + '? Esta acción no se puede deshacer.').then(function (aceptado) {
                    if (!aceptado) return;
                    eliminarCita(cita);
                });
            }));
        }
        acciones.appendChild(crearBotonAccion('Cerrar', 'btn-item', 'Cerrar fechas guardadas', function () {
            cerrarGuardadas();
        }));
        cuerpo.appendChild(acciones);
    }

    function marcarPaneles() {
        var lista = document.getElementById('fechas-panel-lista');
        var detalle = document.getElementById('fechas-panel-detalle');
        var viendo = !!(guardadas && guardadas.classList.contains('fechas-viendo-detalle'));
        if (lista) lista.inert = viendo;
        if (detalle) detalle.inert = !viendo;
    }

    function abrirDetalleFecha(clave, refresco) {
        if (!guardadas || !clave) return false;
        var datos = buscarDetalle(clave);
        if (!datos) return false;
        pintarDetalle(datos);
        detalleClave = clave;
        var ventana = guardadas.querySelector('.asistente-ventana');
        if (ventana) ventana.setAttribute('aria-labelledby', 'fechas-detalle-titulo');
        if (!refresco) {
            var panel = document.getElementById('fechas-panel-lista');
            if (panel) scrollLista = panel.scrollTop;
            guardadas.classList.add('fechas-viendo-detalle');
            marcarPaneles();
            var detalle = document.getElementById('fechas-panel-detalle');
            if (detalle) detalle.scrollTop = 0;
            var volver = document.getElementById('fechas-volver');
            if (volver && volver.focus) volver.focus();
        }
        return true;
    }

    function volverFechas() {
        if (!guardadas) return;
        guardadas.classList.remove('fechas-viendo-detalle');
        marcarPaneles();
        var ventana = guardadas.querySelector('.asistente-ventana');
        if (ventana) ventana.setAttribute('aria-labelledby', 'guardadas-titulo');
        var panel = document.getElementById('fechas-panel-lista');
        if (panel) panel.scrollTop = scrollLista;
        var boton = detalleClave
            ? guardadas.querySelector('.fecha-casilla[data-clave="' + detalleClave.replace(/"/g, '') + '"]')
            : null;
        detalleClave = '';
        if (boton && boton.focus) boton.focus();
    }

    function pintarGuardadas() {
        if (!listaDisponibilidad || !listaCitas) return;
        var panelLista = document.getElementById('fechas-panel-lista');
        var scrollPrevio = panelLista ? panelLista.scrollTop : scrollLista;
        var claveAbierta = detalleClave;

        var mesesGuardados = reglas.filter(function (f) { return f.tipo === 'mes'; })
            .sort(function (a, b) { return a.valor < b.valor ? -1 : 1; });
        var dias = reglas.filter(function (f) { return f.tipo === 'fecha'; })
            .sort(function (a, b) { return a.valor < b.valor ? -1 : 1; });
        var horas = reglas.filter(function (f) { return f.tipo === 'hora'; })
            .sort(function (a, b) { return a.valor < b.valor ? -1 : 1; });
        var totalDisp = mesesGuardados.length + dias.length + horas.length;

        if (cuentaDisponibilidad) cuentaDisponibilidad.textContent = '(' + totalDisp + ')';
        if (cuentaCitas) cuentaCitas.textContent = '(' + citas.length + ')';
        if (tabDisponibilidad) {
            tabDisponibilidad.setAttribute('aria-label', 'Disponibilidad, ' + totalDisp + ' registros');
        }
        if (tabCitas) {
            tabCitas.setAttribute('aria-label', 'Citas reservadas, ' + citas.length + ' registros');
        }

        listaDisponibilidad.innerHTML = '';
        if (!dias.length) {
            var vacioDisp = document.createElement('p');
            vacioDisp.className = 'vacio-bloque';
            vacioDisp.textContent = 'Todavía no hay días guardados en la base.';
            listaDisponibilidad.appendChild(vacioDisp);
        } else {
            var rejilla = document.createElement('ul');
            rejilla.className = 'fechas-rejilla';
            dias.forEach(function (fila, indice) {
                var partes = partesFecha(fila.valor);
                if (!partes) return;
                rejilla.appendChild(crearFechaCasilla({
                    clave: 'fecha:' + fila.valor,
                    dia: partes.dia,
                    mes: partes.mesNombre,
                    aria: partes.dia + ' de ' + partes.mesNombre + ' de ' + partes.anio + ', ' + etiquetaEstado(fila.estado) + '. Ver información.'
                }, indice));
            });
            listaDisponibilidad.appendChild(rejilla);
        }

        if (mesesGuardados.length || horas.length) {
            var extra = document.createElement('details');
            extra.className = 'fechas-extra';
            extra.id = 'fechas-extra';
            var resumen = document.createElement('summary');
            resumen.textContent = 'Meses y horas del horario';
            extra.appendChild(resumen);
            function pintarExtra(filas, tipo) {
                var bloque = crearGrupoGuardadas(
                    tipo === 'mes' ? 'Meses abiertos' : 'Horas guardadas',
                    tipo === 'mes'
                        ? 'Estos meses siguen guardados. Podés eliminarlos desde aquí.'
                        : 'Estas horas aplican a los días hábiles. Podés cambiarlas o eliminarlas.'
                );
                filas.forEach(function (fila) {
                    var tituloTexto = fila.tipo === 'mes' ? nombreMes(fila.valor) : etiquetaHora(fila.valor);
                    var acciones = [];
                    if (fila.tipo === 'hora') {
                        var otro = fila.estado === 'abierta' ? 'bloqueada' : 'abierta';
                        var textoOtro = otro === 'abierta' ? 'Marcar hábil' : 'Marcar no hábil';
                        acciones.push({
                            texto: textoOtro,
                            clase: 'btn-item',
                            aria: textoOtro + ': ' + tituloTexto,
                            alClick: function () {
                                guardar('guardar', 'hora', fila.valor, otro, 'Estado actualizado.');
                            }
                        });
                    }
                    acciones.push({
                        texto: 'Eliminar',
                        clase: 'btn-item btn-item-peligro',
                        aria: 'Eliminar ' + etiquetaTipo(fila.tipo).toLowerCase() + ' ' + tituloTexto,
                        alClick: function () {
                            var aviso = '¿Eliminar ' + etiquetaTipo(fila.tipo).toLowerCase() + ' «' + tituloTexto + '» de la base? Esta acción no se puede deshacer.';
                            pedirConfirmacion('Eliminar de la base', aviso).then(function (aceptado) {
                                if (!aceptado) return;
                                if (fila.tipo === 'mes') quitarMes(fila.valor);
                                else guardar('quitar', 'hora', fila.valor, '', 'Eliminado.');
                            });
                        }
                    });
                    bloque.lista.appendChild(crearCasilla({
                        clave: fila.tipo + ':' + fila.valor,
                        tipoTexto: etiquetaTipo(fila.tipo),
                        titulo: tituloTexto,
                        estado: fila.estado,
                        claseEstado: claseEstado(fila.estado),
                        filasMeta: [
                            { etiqueta: 'Tipo', valor: etiquetaTipo(fila.tipo) },
                            { etiqueta: 'Código', valor: fila.valor },
                            { etiqueta: 'Estado', valor: etiquetaEstado(fila.estado) }
                        ],
                        acciones: acciones
                    }));
                });
                extra.appendChild(bloque.grupo);
            }
            if (mesesGuardados.length) pintarExtra(mesesGuardados, 'mes');
            if (horas.length) pintarExtra(horas, 'hora');
            listaDisponibilidad.appendChild(extra);
        }

        var citasOrden = citas.slice().sort(function (a, b) {
            if (a.fecha !== b.fecha) return a.fecha < b.fecha ? -1 : 1;
            return a.hora < b.hora ? -1 : 1;
        });
        listaCitas.innerHTML = '';
        if (!citasOrden.length) {
            var vacioCita = document.createElement('p');
            vacioCita.className = 'vacio-bloque';
            vacioCita.textContent = 'Todavía no hay citas reservadas en la base.';
        } else {
            var rejillaCitas = document.createElement('ul');
            rejillaCitas.className = 'fechas-rejilla';
            var indiceCita = 0;
            citasOrden.forEach(function (cita) {
                var partesCita = partesFecha(cita.fecha);
                if (!partesCita) return;
                var claveCita = 'cita:' + String(cita.id || (cita.fecha + '-' + cita.hora));
                rejillaCitas.appendChild(crearFechaCasilla({
                    clave: claveCita,
                    dia: partesCita.dia,
                    mes: partesCita.mesNombre,
                    aria: 'Cita del ' + partesCita.dia + ' de ' + partesCita.mesNombre + ' de ' + partesCita.anio +
                        (cita.hora ? ', ' + etiquetaHora(cita.hora) : '') + '. Ver información.'
                }, indiceCita));
                indiceCita += 1;
            });
            listaCitas.appendChild(rejillaCitas);
        }
        if (!citasOrden.length) listaCitas.appendChild(vacioCita);

        if (claveAbierta && guardadas && guardadas.classList.contains('fechas-viendo-detalle')) {
            if (!abrirDetalleFecha(claveAbierta, true)) volverFechas();
            else if (panelLista) panelLista.scrollTop = scrollLista;
        } else if (panelLista) {
            panelLista.scrollTop = scrollPrevio;
        }
    }

    function mostrarPestanaGuardadas(cual) {
        var esCitas = cual === 'citas';
        if (tabDisponibilidad) {
            tabDisponibilidad.setAttribute('aria-selected', esCitas ? 'false' : 'true');
            tabDisponibilidad.tabIndex = esCitas ? -1 : 0;
        }
        if (tabCitas) {
            tabCitas.setAttribute('aria-selected', esCitas ? 'true' : 'false');
            tabCitas.tabIndex = esCitas ? 0 : -1;
        }
        if (panelDisponibilidad) panelDisponibilidad.hidden = esCitas;
        if (panelCitas) panelCitas.hidden = !esCitas;
    }

    function limpiarFormularioCita() {
        if (citaId) citaId.value = '';
        if (citaFecha) citaFecha.value = '';
        if (citaHora) citaHora.value = '';
        if (citaPersona) citaPersona.value = '';
        if (citaMotivo) citaMotivo.value = '';
        if (citaNotas) citaNotas.value = '';
        if (citaRespuesta) citaRespuesta.value = '';
        if (citaResumen) citaResumen.textContent = '';
        citaCorreoActual = '';
        if (citaCorreoTexto) citaCorreoTexto.textContent = '';
        if (citaCorreoLinea) citaCorreoLinea.hidden = true;
        if (botonCitaEnviar) botonCitaEnviar.disabled = true;
        if (citaFormTitulo) citaFormTitulo.textContent = 'Comentarios de la cita';
        if (citaFormulario) citaFormulario.hidden = true;
    }

    function cargarCitaEnFormulario(cita) {
        if (!cita || !cita.id) {
            mostrarErrorGuardado('Esa cita no se puede comentar.');
            return;
        }
        mostrarPestanaGuardadas('citas');
        if (citaId) citaId.value = String(cita.id);
        if (citaFecha) citaFecha.value = cita.fecha || '';
        if (citaHora) citaHora.value = cita.hora || '';
        if (citaPersona) citaPersona.value = cita.persona || '';
        if (citaMotivo) citaMotivo.value = cita.motivo || '';
        if (citaNotas) citaNotas.value = cita.notas || '';
        if (citaRespuesta) citaRespuesta.value = '';
        citaCorreoActual = String(cita.correo || '').trim();
        if (citaCorreoTexto) {
            citaCorreoTexto.textContent = citaCorreoActual || 'Sin correo (solo citas nuevas lo guardan)';
        }
        if (citaCorreoLinea) citaCorreoLinea.hidden = false;
        if (botonCitaEnviar) botonCitaEnviar.disabled = !citaCorreoActual;
        if (citaResumen) {
            citaResumen.textContent = 'Cita del ' + (etiquetaFecha(cita.fecha) || cita.fecha) +
                ' a las ' + (etiquetaHora(cita.hora) || cita.hora) +
                '. Guardá comentarios internos o enviá una respuesta al correo de la persona.';
        }
        if (citaFormTitulo) citaFormTitulo.textContent = 'Comentarios y respuesta';
        if (citaFormulario) {
            citaFormulario.hidden = false;
            citaFormulario.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
        if (citaCorreoActual && citaRespuesta && citaRespuesta.focus) citaRespuesta.focus();
        else if (citaPersona && citaPersona.focus) citaPersona.focus();
    }

    function abrirGuardadas() {
        if (!guardadas) return;
        if (!asistente.hidden) cerrarAsistente();
        limpiarFormularioCita();
        detalleClave = '';
        scrollLista = 0;
        guardadas.classList.remove('fechas-viendo-detalle');
        marcarPaneles();
        var ventana = guardadas.querySelector('.asistente-ventana');
        if (ventana) ventana.setAttribute('aria-labelledby', 'guardadas-titulo');
        mostrarPestanaGuardadas('disponibilidad');
        pintarGuardadas();
        guardadas.hidden = false;
        document.body.classList.add('asistente-abierto');
        requestAnimationFrame(function () {
            guardadas.classList.add('asistente-visible');
        });
    }

    function cerrarGuardadas() {
        if (!guardadas) return;
        guardadas.classList.remove('asistente-visible');
        document.body.classList.remove('asistente-abierto');
        window.setTimeout(function () {
            guardadas.hidden = true;
            guardadas.classList.remove('fechas-viendo-detalle');
            detalleClave = '';
            limpiarFormularioCita();
        }, 280);
    }

    function enviarCita(accion, campos) {
        var datos = new FormData();
        datos.append('token', token.value);
        datos.append('accion', accion);
        datos.append('tipo', 'cita');
        datos.append('valor', campos.id || '');
        if (campos.id) datos.append('id', campos.id);
        if (campos.fecha) datos.append('fecha', campos.fecha);
        if (campos.hora) datos.append('hora', campos.hora);
        if (typeof campos.persona === 'string') datos.append('persona', campos.persona);
        if (typeof campos.motivo === 'string') datos.append('motivo', campos.motivo);
        if (typeof campos.notas === 'string') datos.append('notas', campos.notas);
        return fetch('agenda.php', { method: 'POST', body: datos, credentials: 'same-origin' })
            .then(function (respuesta) {
                return respuesta.json().catch(function () { return null; });
            })
            .then(function (datosRespuesta) {
                if (!datosRespuesta || !datosRespuesta.ok) {
                    throw new Error((datosRespuesta && datosRespuesta.mensaje) || 'No se pudo guardar la cita.');
                }
            });
    }

    function guardarFormularioCita() {
        var id = citaId ? String(citaId.value || '').trim() : '';
        var fecha = citaFecha ? citaFecha.value : '';
        var hora = citaHora ? citaHora.value : '';
        if (!id) {
            mostrarErrorGuardado('Elegí una cita de la lista y tocá «Comentar».');
            return;
        }
        if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha) || !hora) {
            mostrarErrorGuardado('No se pudo identificar la fecha y hora de esa cita.');
            return;
        }
        if (hora.length >= 5) hora = hora.slice(0, 5);
        encolar(function () {
            return enviarCita('guardar', {
                id: id,
                fecha: fecha,
                hora: hora,
                persona: citaPersona ? citaPersona.value : '',
                motivo: citaMotivo ? citaMotivo.value : '',
                notas: citaNotas ? citaNotas.value : ''
            })
                .then(function () {
                    mostrarGuardado('Comentarios guardados.');
                    limpiarFormularioCita();
                    return cargar();
                })
                .catch(function (error) {
                    mostrarErrorGuardado(error.message || 'No se pudieron guardar los comentarios.');
                });
        });
    }

    function eliminarCita(cita) {
        if (!cita || !cita.id) {
            mostrarErrorGuardado('No se pudo identificar la cita.');
            return;
        }
        encolar(function () {
            return enviarCita('quitar', { id: String(cita.id) })
                .then(function () {
                    mostrarGuardado('Cita eliminada.');
                    if (citaId && String(citaId.value) === String(cita.id)) limpiarFormularioCita();
                    return cargar();
                })
                .catch(function (error) {
                    mostrarErrorGuardado(error.message || 'No se pudo eliminar la cita.');
                });
        });
    }

    function enviarRespuestaCita() {
        var id = citaId ? String(citaId.value || '').trim() : '';
        var mensaje = citaRespuesta ? citaRespuesta.value.trim() : '';
        if (!id) {
            mostrarErrorGuardado('Elegí una cita y tocá «Comentar».');
            return;
        }
        if (!citaCorreoActual) {
            mostrarErrorGuardado('Esa cita no tiene correo guardado.');
            return;
        }
        if (!mensaje) {
            mostrarErrorGuardado('Escribí el mensaje de respuesta.');
            return;
        }
        encolar(function () {
            var datos = new FormData();
            datos.append('token', token.value);
            datos.append('accion', 'responder');
            datos.append('tipo', 'cita');
            datos.append('valor', id);
            datos.append('id', id);
            datos.append('mensaje', mensaje);
            return fetch('agenda.php', { method: 'POST', body: datos, credentials: 'same-origin' })
                .then(function (respuesta) {
                    return respuesta.json().catch(function () { return null; });
                })
                .then(function (datosRespuesta) {
                    if (!datosRespuesta || !datosRespuesta.ok) {
                        throw new Error((datosRespuesta && datosRespuesta.mensaje) || 'No se pudo enviar la respuesta.');
                    }
                    mostrarGuardado(datosRespuesta.mensaje || ('Respuesta enviada a ' + citaCorreoActual + '.'));
                    if (citaRespuesta) citaRespuesta.value = '';
                })
                .catch(function (error) {
                    mostrarErrorGuardado(error.message || 'No se pudo enviar la respuesta.');
                });
        });
    }

    function marcarTipoFecha(estado) {
        estadoFinal = estado === 'ocupada' || estado === 'bloqueada' ? estado : 'abierta';
        var botones = document.querySelectorAll('.tipo-fecha-modos .pincel');
        for (var i = 0; i < botones.length; i += 1) {
            botones[i].setAttribute('aria-pressed', botones[i].getAttribute('data-estado') === estadoFinal ? 'true' : 'false');
        }
        if (horaAyuda) {
            if (estadoFinal === 'ocupada') {
                horaAyuda.textContent = 'Indicá a qué hora está ocupada esa fecha.';
            } else if (estadoFinal === 'bloqueada') {
                horaAyuda.textContent = 'No hace falta hora: el día queda no hábil.';
            } else {
                horaAyuda.textContent = 'Esta hora queda disponible para los días hábiles (igual en la página pública).';
            }
        }
    }

    function totalPasos() {
        return estadoFinal === 'bloqueada' ? 4 : 5;
    }

    function etiquetaPasoActual(numero) {
        if (estadoFinal === 'bloqueada') {
            if (numero <= 3) return numero;
            return 4;
        }
        return numero;
    }

    function siguientePaso(actual) {
        if (actual === 3 && estadoFinal === 'bloqueada') return 5;
        return actual + 1;
    }

    function anteriorPaso(actual) {
        if (actual === 5 && estadoFinal === 'bloqueada') return 3;
        return actual - 1;
    }

    function actualizarVistaPrevia() {
        var hora = horaActual();
        if (vistaFecha) vistaFecha.textContent = etiquetaFecha(diaSeleccionado) || 'Sin fecha';
        if (vistaHora) {
            if (estadoFinal === 'bloqueada') vistaHora.textContent = 'Sin hora (día no hábil)';
            else vistaHora.textContent = hora ? etiquetaHora(hora) : 'Sin hora';
        }
        if (vistaEstado) vistaEstado.textContent = textosEstado[estadoFinal] || textosEstado.abierta;
        if (vistaTarjeta) {
            vistaTarjeta.classList.toggle('disponible', estadoFinal === 'abierta');
            vistaTarjeta.classList.toggle('ocupada', estadoFinal === 'ocupada');
            vistaTarjeta.classList.toggle('cerrada', estadoFinal === 'bloqueada');
        }
    }

    function mostrarPaso(numero) {
        paso = numero;
        var secciones = document.querySelectorAll('#asistente .asistente-paso');
        for (var i = 0; i < secciones.length; i += 1) {
            var seccion = secciones[i];
            var activo = Number(seccion.getAttribute('data-paso')) === numero;
            seccion.hidden = !activo;
            seccion.classList.toggle('asistente-paso-activo', activo);
        }
        if (asistentePasos) {
            asistentePasos.textContent = 'Paso ' + etiquetaPasoActual(numero) + ' de ' + totalPasos();
        }
        if (asistenteTitulo) asistenteTitulo.textContent = titulos[numero];
        if (asistenteAyuda) asistenteAyuda.textContent = ayudas[numero];
        if (botonAtras) botonAtras.hidden = numero === 1;
        if (botonSiguiente) botonSiguiente.hidden = numero === 5;
        if (botonGuardar) botonGuardar.hidden = numero !== 5;
        if (numero === 2) marcarTipoFecha(estadoFinal);
        if (numero === 3) pintarDias();
        if (numero === 5) actualizarVistaPrevia();
    }

    function abrirAsistente() {
        if (guardadas && !guardadas.hidden) cerrarGuardadas();
        diaSeleccionado = '';
        estadoFinal = 'abierta';
        marcarTipoFecha('abierta');
        if (!campoMes.value) {
            campoMes.value = hoy.getFullYear() + '-' + String(hoy.getMonth() + 1).padStart(2, '0');
        }
        asistente.hidden = false;
        document.body.classList.add('asistente-abierto');
        requestAnimationFrame(function () {
            asistente.classList.add('asistente-visible');
        });
        mostrarPaso(1);
        if (campoMes.focus) campoMes.focus();
    }

    function cerrarAsistente() {
        asistente.classList.remove('asistente-visible');
        document.body.classList.remove('asistente-abierto');
        window.setTimeout(function () {
            asistente.hidden = true;
            mostrarPaso(1);
        }, 280);
    }

    function validarPaso(numero) {
        if (numero === 1) {
            if (!/^\d{4}-\d{2}$/.test(campoMes.value)) {
                mostrarErrorGuardado('Elegí un mes válido.');
                return false;
            }
            return true;
        }
        if (numero === 2) {
            if (!estadoFinal || !textosEstado[estadoFinal]) {
                mostrarErrorGuardado('Elegí si la fecha será hábil, ocupada o no hábil.');
                return false;
            }
            return true;
        }
        if (numero === 3) {
            if (!diaSeleccionado || diaSeleccionado.slice(0, 7) !== campoMes.value) {
                mostrarErrorGuardado('Elegí un día del mes.');
                return false;
            }
            return true;
        }
        if (numero === 4) {
            if (estadoFinal === 'bloqueada') return true;
            var hora = horaActual();
            if (!hora) {
                mostrarErrorGuardado('Escribí una hora de 1 a 12.');
                return false;
            }
            return true;
        }
        return true;
    }

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
                if (datos.ok) {
                    reglas = Array.isArray(datos.reglas) ? datos.reglas : [];
                    citas = Array.isArray(datos.citas) ? datos.citas : [];
                    pintarResumen();
                    if (paso === 3) pintarDias();
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

    function enviar(accion, tipo, valor, estado) {
        var datos = new FormData();
        datos.append('token', token.value);
        datos.append('accion', accion);
        datos.append('tipo', tipo);
        datos.append('valor', valor);
        datos.append('estado', estado);
        return fetch('agenda.php', { method: 'POST', body: datos, credentials: 'same-origin' })
            .then(function (respuesta) {
                return respuesta.json().catch(function () { return null; });
            })
            .then(function (datos) {
                if (!datos || !datos.ok) {
                    throw new Error((datos && datos.mensaje) || 'No se pudo guardar. Entra de nuevo a Administración.');
                }
            });
    }

    function guardar(accion, tipo, valor, estado, mensajeOk) {
        encolar(function () {
            if (window.SitrainaAvisos) {
                window.SitrainaAvisos.procesando('Guardando', 'Estamos actualizando el horario. Esperá un momento.');
            }
            return enviar(accion, tipo, valor, estado)
                .then(function () {
                    mostrarAviso('');
                    mostrarGuardado(mensajeOk || 'Guardado.');
                    return cargar();
                })
                .catch(function (error) {
                    mostrarErrorGuardado(error.message || 'No se pudo guardar.');
                });
        });
    }

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
                    mostrarGuardado('Mes quitado.');
                    return cargar();
                })
                .catch(function (error) {
                    mostrarErrorGuardado(error.message || 'No se pudo quitar el mes.');
                    return cargar();
                });
        });
    }

    /* Guarda mes, día y (si aplica) hora del asistente. */
    function guardarAsistente() {
        if (!validarPaso(1) || !validarPaso(2) || !validarPaso(3)) return;
        if (estadoFinal !== 'bloqueada' && !validarPaso(4)) return;
        var mes = campoMes.value;
        var hora = estadoFinal === 'bloqueada' ? '' : horaActual();
        var items = [];
        if (!mesAgregado(mes)) items.push({ tipo: 'mes', valor: mes, estado: 'abierta' });
        items.push({ tipo: 'fecha', valor: diaSeleccionado, estado: estadoFinal });
        if (hora) {
            items.push({
                tipo: 'hora',
                valor: hora,
                estado: estadoFinal === 'ocupada' ? 'ocupada' : 'abierta'
            });
        }

        encolar(function () {
            var cadena = Promise.resolve();
            items.forEach(function (item) {
                cadena = cadena.then(function () {
                    return enviar('guardar', item.tipo, item.valor, item.estado);
                });
            });
            return cadena
                .then(function () {
                    mostrarAviso('');
                    var mensaje = 'Fecha guardada.';
                    if (estadoFinal === 'abierta') mensaje = 'Fecha hábil y hora guardadas.';
                    else if (estadoFinal === 'ocupada') mensaje = 'Fecha marcada como ocupada.';
                    else mensaje = 'Fecha marcada como no hábil.';
                    mostrarGuardado(mensaje);
                    cerrarAsistente();
                    return cargar();
                })
                .catch(function (error) {
                    mostrarErrorGuardado(error.message || 'No se pudo guardar.');
                    return cargar();
                });
        });
    }

    if (botonAbrir) botonAbrir.addEventListener('click', abrirAsistente);
    if (botonCerrar) botonCerrar.addEventListener('click', cerrarAsistente);
    asistente.addEventListener('click', function (evento) {
        if (evento.target && evento.target.getAttribute('data-cerrar') === '1') cerrarAsistente();
    });
    if (botonAbrirGuardadas) botonAbrirGuardadas.addEventListener('click', abrirGuardadas);
    if (botonCerrarGuardadas) botonCerrarGuardadas.addEventListener('click', cerrarGuardadas);
    var botonVolverFechas = document.getElementById('fechas-volver');
    if (botonVolverFechas) botonVolverFechas.addEventListener('click', volverFechas);
    if (guardadas) {
        guardadas.addEventListener('click', function (evento) {
            if (evento.target && evento.target.getAttribute('data-cerrar-guardadas') === '1') cerrarGuardadas();
        });
    }
    if (tabDisponibilidad) {
        tabDisponibilidad.addEventListener('click', function () { mostrarPestanaGuardadas('disponibilidad'); });
    }
    if (tabCitas) {
        tabCitas.addEventListener('click', function () { mostrarPestanaGuardadas('citas'); });
    }
    if (botonCitaGuardar) botonCitaGuardar.addEventListener('click', guardarFormularioCita);
    if (botonCitaEnviar) {
        botonCitaEnviar.disabled = true;
        botonCitaEnviar.addEventListener('click', enviarRespuestaCita);
    }
    if (botonCitaLimpiar) botonCitaLimpiar.addEventListener('click', limpiarFormularioCita);
    document.addEventListener('keydown', function (evento) {
        if (evento.key !== 'Escape') return;
        if (guardadas && !guardadas.hidden) {
            if (guardadas.classList.contains('fechas-viendo-detalle')) {
                volverFechas();
                return;
            }
            cerrarGuardadas();
            return;
        }
        if (!asistente.hidden) cerrarAsistente();
    });

    if (botonAtras) {
        botonAtras.addEventListener('click', function () {
            if (paso > 1) mostrarPaso(anteriorPaso(paso));
        });
    }
    if (botonSiguiente) {
        botonSiguiente.addEventListener('click', function () {
            if (!validarPaso(paso)) return;
            mostrarGuardado('');
            mostrarPaso(siguientePaso(paso));
        });
    }
    if (botonGuardar) botonGuardar.addEventListener('click', guardarAsistente);

    campoMes.addEventListener('change', function () {
        if (diaSeleccionado && diaSeleccionado.slice(0, 7) !== campoMes.value) {
            diaSeleccionado = '';
        }
        if (paso === 3) pintarDias();
    });

    diasMes.addEventListener('click', function (evento) {
        var boton = evento.target.closest ? evento.target.closest('.dia-mes') : null;
        if (!boton || !diasMes.contains(boton)) return;
        diaSeleccionado = boton.getAttribute('data-fecha') || '';
        pintarDias();
        mostrarGuardado('');
    });

    campoHora.addEventListener('input', function () { limitarCampo(campoHora, 12); });
    campoHora.addEventListener('blur', normalizarHora);
    campoMinuto.addEventListener('input', function () { limitarCampo(campoMinuto, 59); });
    campoHora.addEventListener('change', actualizarVistaPrevia);
    campoMinuto.addEventListener('change', actualizarVistaPrevia);
    botonAm.addEventListener('click', function () { marcarPeriodo('am'); actualizarVistaPrevia(); });
    botonPm.addEventListener('click', function () { marcarPeriodo('pm'); actualizarVistaPrevia(); });

    var modos = document.querySelectorAll('.tipo-fecha-modos .pincel');
    for (var m = 0; m < modos.length; m += 1) {
        modos[m].addEventListener('click', function (evento) {
            marcarTipoFecha(evento.currentTarget.getAttribute('data-estado') || 'abierta');
            mostrarGuardado('');
        });
    }

    var linkSalir = document.getElementById('cerrar-sesion') || document.querySelector('.admin-opciones-salir');
    if (linkSalir) {
        linkSalir.addEventListener('click', function (evento) {
            /* Sin PHP (file://, Live Preview, localhost estático) salir.php se descarga como archivo. */
            var host = (location.hostname || '').toLowerCase();
            var esLocal =
                location.protocol === 'file:' ||
                host === '' ||
                host === '127.0.0.1' ||
                host === 'localhost' ||
                /\.local$/.test(host);
            evento.preventDefault();
            if (esLocal) {
                location.href = 'index.html';
                return;
            }
            location.href = 'salir.php';
        });
    }

    pintarResumen();
    cargar();
})();
