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
        3: 'Elegí los días',
        4: 'Elegí la hora',
        5: 'Revisá y guardá'
    };
    var ayudas = {
        1: 'Primero el mes en el que querés trabajar.',
        2: 'Elegí si el día está disponible, si no se ofrece, o si querés reservar los 15 días que siguen. Una hora se ocupa solo cuando se acepta una cita.',
        3: 'Tocá uno o varios días, aunque no sean seguidos.',
        4: 'Escribí la hora y los minutos, y elegí a. m. o p. m. Esa hora vale para todos los días disponibles.',
        5: 'Revisá las fechas. Si están bien, guardalas.'
    };
    var textosEstado = {
        abierta: 'Disponible para citas',
        ocupada: 'Ya tiene una cita',
        bloqueada: 'No se ofrece'
    };
    var reglas = [];
    var citas = [];
    var cola = Promise.resolve();
    var revision = 0;
    var paso = 1;
    var diaSeleccionado = '';
    var diasSeleccionados = [];
    var modoBloqueo = false;
    var bloqueoCorriendo = false;
    var estadoFinal = 'abierta';
    var horaAyuda = document.getElementById('hora-ayuda');

    var totalNotasConocidas = null;

    function renderAlertas(totalAvisos) {
        if (typeof totalAvisos === 'number') totalNotasConocidas = totalAvisos;
        if (!alertaLista) return;
        alertaLista.innerHTML = '';
        if (!alertas.length && !consultasAvisos.length) {
            var vacio = document.createElement('p');
            vacio.className = 'admin-alerta-vacio';
            vacio.id = 'admin-alerta-vacio';
            vacio.textContent = 'No hay avisos por ahora.';
            alertaLista.appendChild(vacio);
            alertaVacio = vacio;
        } else {
            alertaVacio = null;
        }
        for (var c = 0; c < consultasAvisos.length; c++) {
            var aviso = consultasAvisos[c];
            var tipoAviso = aviso.tipo || 'cita';
            var boton = document.createElement('button');
            boton.type = 'button';
            boton.className = 'admin-alerta-item admin-alerta-consulta admin-alerta-' + tipoAviso + (aviso.leido ? ' admin-alerta-leida' : '');
            boton.setAttribute('data-alerta-tipo', aviso.tipo || '');
            boton.setAttribute('data-alerta-id', String(aviso.id || ''));
            boton.setAttribute('data-alerta-marca', aviso.marca || '');
            boton.setAttribute('aria-label', aviso.texto || 'Abrir aviso');

            var cabeza = document.createElement('span');
            cabeza.className = 'admin-alerta-cabeza';
            var etiqueta = document.createElement('span');
            etiqueta.className = 'admin-alerta-tipo';
            etiqueta.textContent = tipoAviso === 'afilacion' ? 'Afiliación' : (tipoAviso === 'contacto' ? 'Contacto' : 'Cita');
            var estado = document.createElement('span');
            estado.className = 'admin-alerta-estado';
            estado.textContent = aviso.leido ? 'Leída' : 'Nueva';
            cabeza.appendChild(etiqueta);
            cabeza.appendChild(estado);

            var cuerpo = document.createElement('span');
            cuerpo.className = 'admin-alerta-texto';
            cuerpo.textContent = aviso.detalle || aviso.texto || '';

            boton.appendChild(cabeza);
            boton.appendChild(cuerpo);
            if (aviso.cuando) {
                var cuando = document.createElement('span');
                cuando.className = 'admin-alerta-cuando';
                cuando.textContent = aviso.cuando;
                boton.appendChild(cuando);
            }
            alertaLista.appendChild(boton);
        }
        for (var i = 0; i < alertas.length; i++) {
            var p = document.createElement('p');
            p.className = 'admin-alerta-item' + (alertas[i].esError ? '' : ' admin-alerta-item-ok');
            p.textContent = alertas[i].texto;
            alertaLista.appendChild(p);
        }
        var nAvisos = typeof totalNotasConocidas === 'number'
            ? totalNotasConocidas
            : consultasAvisos.filter(function (aviso) { return !aviso.leido; }).length;
        var n = nAvisos + alertas.length;
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

    window.adminSincronizarConsultas = function (lista, llegaronNuevas, totalAvisos) {
        consultasAvisos = Array.isArray(lista) ? lista.slice(0, 30) : [];
        renderAlertas(totalAvisos);
        if (!llegaronNuevas || !alertaCaja || !consultasAvisos.some(function (aviso) { return !aviso.leido; })) return;
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
            var tipoAviso = boton.getAttribute('data-alerta-tipo');
            var idAviso = boton.getAttribute('data-alerta-id');
            var marcaAviso = boton.getAttribute('data-alerta-marca');
            if (window.adminMarcarNotificacion) window.adminMarcarNotificacion(tipoAviso, idAviso, marcaAviso);
            window.adminAbrirConsulta(tipoAviso, idAviso);
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

    function ambitoDeAgenda(texto) {
        if (/cita|comentario|correo|Respuesta enviada/i.test(texto || '')) return 'cita';
        return 'horario';
    }

    function mostrarAviso(texto) {
        if (!texto) return;
        if (window.SitrainaAvisos && window.SitrainaAvisos.contextual) {
            window.SitrainaAvisos.contextual('error', texto, ambitoDeAgenda(texto));
        } else if (window.SitrainaAvisos) window.SitrainaAvisos.error('No se pudo completar', texto);
        else pintarAlerta(texto, true, 0);
    }

    function mostrarGuardado(texto) {
        if (!texto) return;
        if (window.SitrainaAvisos && window.SitrainaAvisos.contextual) {
            window.SitrainaAvisos.contextual('exito', texto, ambitoDeAgenda(texto));
        } else if (window.SitrainaAvisos) window.SitrainaAvisos.exito('Listo', texto);
        else pintarAlerta(texto, false, 2400);
    }

    function mostrarErrorGuardado(texto) {
        if (!texto) return;
        if (window.SitrainaAvisos && window.SitrainaAvisos.contextual) {
            window.SitrainaAvisos.contextual('error', texto, ambitoDeAgenda(texto));
        } else if (window.SitrainaAvisos) window.SitrainaAvisos.error('No se pudo completar', texto);
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
        return citas.filter(function (cita) {
            return cita.fecha === valor && cita.hora && !String(cita.cancelado_en || '').trim();
        })
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
        var elegido = diasSeleccionados.indexOf(iso) !== -1;
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
            if (modoBloqueo && !bloqueoCorriendo) {
                diaElegido.textContent = 'Tocá el día que queda disponible. Los 15 siguientes se bloquean solos.';
            } else if (diasSeleccionados.length) {
                diaElegido.textContent = diasSeleccionados.length + (diasSeleccionados.length === 1 ? ' fecha: ' : ' fechas: ') + diasSeleccionados.map(etiquetaFecha).join(', ');
            } else if (!modoBloqueo) {
                diaElegido.textContent = 'Todavía no elegiste un día. Podés marcar varios, aunque no sean seguidos.';
            }
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
                    { etiqueta: 'Dato', valor: fila.valor },
                    { etiqueta: 'Estado', valor: etiquetaEstado(fila.estado || 'abierta') }
                ],
                acciones: [
                    {
                        texto: 'Ver el detalle',
                        clase: 'btn-item',
                        aria: 'Ver el detalle de ' + titulo,
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
                            pedirConfirmacion('Quitar para siempre', '¿Eliminar «' + titulo + '»? Esta acción no se puede deshacer.').then(function (aceptado) {
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
        pintarListaCasillas(listaHora, horas, 'Todavía no hay horas. Se usan de 7:00 a. m. a 2:00 p. m.', {
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
        if (estado === 'abierta') return 'Disponible';
        if (estado === 'bloqueada') return 'No se ofrece';
        if (estado === 'ocupada') return 'Con cita';
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
        if (opciones.nombre) {
            var nombre = document.createElement('span');
            nombre.className = 'fecha-casilla-nombre';
            nombre.textContent = opciones.nombre;
            boton.appendChild(nombre);
        }
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

    function grupoDetalle(titulo) {
        var seccion = document.createElement('section');
        seccion.className = 'fecha-grupo';
        var encabezado = document.createElement('h3');
        encabezado.className = 'fecha-grupo-titulo';
        encabezado.textContent = titulo;
        var cuerpo = document.createElement('div');
        cuerpo.className = 'fecha-datos';
        seccion.appendChild(encabezado);
        seccion.appendChild(cuerpo);
        return { seccion: seccion, cuerpo: cuerpo };
    }

    function finDeHora(valor) {
        var partes = String(valor || '').split(':');
        if (partes.length < 2) return '';
        var hora = Number(partes[0]);
        var minuto = partes[1];
        if (isNaN(hora)) return '';
        hora += 1;
        if (hora > 23) return '';
        return etiquetaHora(String(hora).padStart(2, '0') + ':' + minuto);
    }

    function textoModalidad(valor) {
        if (valor === 'virtual') return 'En línea';
        if (valor === 'presencial') return 'En persona';
        return '';
    }

    function horasAbiertas() {
        return reglas.filter(function (fila) { return fila.tipo === 'hora' && fila.estado === 'abierta' && /^\d{2}:\d{2}$/.test(String(fila.valor || '')); })
            .sort(function (a, b) { return a.valor < b.valor ? -1 : 1; });
    }

    function citasDeFecha(iso) {
        return citas.filter(function (cita) {
            return cita.fecha === iso && cita.hora && !String(cita.cancelado_en || '').trim();
        })
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
            agregarDato(contenedor, 'Excepción', 'El abogado no atiende este día, aunque entre en los 15 días.');
            return;
        }
        var cierreManual = '';
        reglas.forEach(function (filaHora) {
            if (filaHora.tipo === 'hora' && filaHora.estado === 'abierta' && String(filaHora.valor || '').indexOf(iso + ' ') === 0) {
                cierreManual = String(filaHora.valor).slice(11, 16);
            }
        });
        if (cierreManual) {
            agregarDato(contenedor, 'Atiende hasta', etiquetaHora(cierreManual));
            var notaManual = document.createElement('p');
            notaManual.className = 'fecha-dato-nota';
            notaManual.textContent = 'Esta excepción queda guardada aunque pasen los 15 días. Las citas son de una hora, desde las 8:00 a. m.';
            contenedor.appendChild(notaManual);
            return;
        }
        if (estado !== 'abierta') {
            agregarDato(contenedor, 'Hora', 'No hay una excepción guardada para esta fecha.');
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
            ? 'Estas horas quedan para los días que se ofrecen.'
            : 'Esta hora queda para los días que se ofrecen.';
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
        var grupos = document.createElement('div');
        grupos.className = 'fecha-grupos';
        if (datos.tipo === 'fecha') {
            var diaGrupo = grupoDetalle('Día');
            agregarDato(diaGrupo.cuerpo, 'Día de la semana', capitalizar(datos.partes.semana));
            agregarDato(diaGrupo.cuerpo, 'Estado', etiquetaEstado(datos.fila.estado));
            grupos.appendChild(diaGrupo.seccion);
            var horarioGrupo = grupoDetalle('Horario');
            pintarHorasDetalle(horarioGrupo.cuerpo, datos.fila.valor, datos.fila.estado);
            grupos.appendChild(horarioGrupo.seccion);
        } else {
            var cita = datos.cita;
            var usuario = grupoDetalle('Información del usuario');
            agregarDato(usuario.cuerpo, 'Nombre', cita.persona || '');
            agregarDato(usuario.cuerpo, 'Correo electrónico', cita.correo || '');
            agregarDato(usuario.cuerpo, 'Cédula', cita.cedula || '');
            if (usuario.cuerpo.childElementCount) grupos.appendChild(usuario.seccion);
            var deLaCita = grupoDetalle('Información de la cita');
            agregarDato(deLaCita.cuerpo, 'Fecha', etiquetaFecha(cita.fecha));
            agregarDato(deLaCita.cuerpo, 'Día de la semana', capitalizar(datos.partes.semana));
            agregarDato(deLaCita.cuerpo, 'Hora de inicio', etiquetaHora(cita.hora));
            agregarDato(deLaCita.cuerpo, 'Hora de finalización', finDeHora(cita.hora));
            agregarDato(deLaCita.cuerpo, 'Modalidad', textoModalidad(cita.modalidad));
            agregarDato(deLaCita.cuerpo, 'Estado', String(cita.cancelado_en || '').trim() ? 'Cancelada' : 'Activa');
            grupos.appendChild(deLaCita.seccion);
            var solicitud = grupoDetalle('Información de la solicitud');
            agregarDato(solicitud.cuerpo, 'Motivo', cita.motivo || '');
            agregarDato(solicitud.cuerpo, 'Notas', cita.notas || '');
            agregarDato(solicitud.cuerpo, 'Recibida', cita.creado_en || '');
            if (solicitud.cuerpo.childElementCount) grupos.appendChild(solicitud.seccion);
        }
        cuerpo.appendChild(grupos);

        var acciones = document.createElement('div');
        acciones.className = 'fecha-detalle-acciones';
        if (datos.tipo === 'fecha') {
            var fila = datos.fila;
            var tituloTexto = etiquetaFecha(fila.valor);
            if (fila.estado === 'ocupada') {
                var avisoOcupada = document.createElement('p');
                avisoOcupada.className = 'asistente-nota';
                avisoOcupada.textContent = 'Este día está ocupado porque se aceptó una cita. No se cambia desde aquí.';
                acciones.appendChild(avisoOcupada);
            } else {
                if (fila.estado !== 'abierta') {
                    acciones.appendChild(crearBotonAccion('Marcar disponible', 'btn-item', 'Marcar disponible: ' + tituloTexto, function () {
                        guardar('guardar', 'fecha', fila.valor, 'abierta', 'Listo, quedó actualizado.');
                    }));
                }
                if (fila.estado !== 'bloqueada') {
                    acciones.appendChild(crearBotonAccion('Marcar no disponible', 'btn-item', 'Marcar no disponible: ' + tituloTexto, function () {
                        guardar('guardar', 'fecha', fila.valor, 'bloqueada', 'Listo, quedó actualizado.');
                    }));
                }
                acciones.appendChild(crearBotonAccion('Quitar', 'btn-item btn-item-peligro', 'Quitar el día ' + tituloTexto, function () {
                    pedirConfirmacion('Quitar para siempre', '¿Querés quitar el día «' + tituloTexto + '»? No se puede deshacer.').then(function (aceptado) {
                        if (!aceptado) return;
                        guardar('quitar', 'fecha', fila.valor, '', 'Listo, se quitó.');
                    });
                }));
            }
        } else {
            var cita = datos.cita;
            var tituloCita = etiquetaFecha(cita.fecha) + ' · ' + etiquetaHora(cita.hora);
            acciones.appendChild(crearBotonAccion('Comentar', 'btn-item', 'Añadir comentarios a la cita del ' + tituloCita, function () {
                volverFechas();
                cargarCitaEnFormulario(cita);
            }));
            acciones.appendChild(crearBotonAccion('Quitar', 'btn-item btn-item-peligro', 'Quitar la cita del ' + tituloCita, function () {
                pedirConfirmacion('Quitar para siempre', '¿Querés quitar la cita del ' + tituloCita + '? No se puede deshacer.').then(function (aceptado) {
                    if (!aceptado) return;
                    eliminarCita(cita);
                });
            }));
        }
        acciones.appendChild(crearBotonAccion('Cerrar', 'btn-item', 'Cerrar', function () {
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
            var cerrar = document.getElementById('cerrar-guardadas');
            if (cerrar && cerrar.focus) cerrar.focus();
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
        if (!listaCitas) return;
        var panelLista = document.getElementById('fechas-panel-lista');
        var scrollPrevio = panelLista ? panelLista.scrollTop : scrollLista;
        var claveAbierta = detalleClave;

        var mesesGuardados = reglas.filter(function (f) { return f.tipo === 'mes'; })
            .sort(function (a, b) { return a.valor < b.valor ? -1 : 1; });
        var dias = reglas.filter(function (f) { return f.tipo === 'fecha'; })
            .sort(function (a, b) { return a.valor < b.valor ? -1 : 1; });
        var horas = reglas.filter(function (f) { return f.tipo === 'hora' && /^\d{2}:\d{2}$/.test(String(f.valor || '')); })
            .sort(function (a, b) { return a.valor < b.valor ? -1 : 1; });
        var totalDisp = mesesGuardados.length + dias.length + horas.length;

        if (cuentaDisponibilidad) cuentaDisponibilidad.textContent = '(' + totalDisp + ')';
        var citasVisibles = citas.filter(function (cita) {
            return /^\d{4}-\d{2}-\d{2}$/.test(String(cita.fecha || ''));
        });
        if (cuentaCitas) cuentaCitas.textContent = '(' + citasVisibles.length + ')';
        if (tabDisponibilidad) {
            tabDisponibilidad.setAttribute('aria-label', 'Días disponibles, ' + totalDisp);
        }
        if (tabCitas) {
            tabCitas.setAttribute('aria-label', 'Citas guardadas, ' + citasVisibles.length);
        }

        if (listaDisponibilidad) {
        listaDisponibilidad.innerHTML = '';
        if (!dias.length) {
            var vacioDisp = document.createElement('p');
            vacioDisp.className = 'vacio-bloque';
            vacioDisp.textContent = 'Todavía no hay días guardados.';
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
                        : 'Estas horas valen para los días que se ofrecen. Podés cambiarlas o quitarlas.'
                );
                filas.forEach(function (fila) {
                    var tituloTexto = fila.tipo === 'mes' ? nombreMes(fila.valor) : etiquetaHora(fila.valor);
                    var acciones = [];
                    if (fila.tipo === 'hora') {
                        var otro = fila.estado === 'abierta' ? 'bloqueada' : 'abierta';
                        var textoOtro = otro === 'abierta' ? 'Marcar disponible' : 'Marcar no disponible';
                        acciones.push({
                            texto: textoOtro,
                            clase: 'btn-item',
                            aria: textoOtro + ': ' + tituloTexto,
                            alClick: function () {
                                guardar('guardar', 'hora', fila.valor, otro, 'Listo, quedó actualizado.');
                            }
                        });
                    }
                    acciones.push({
                        texto: 'Eliminar',
                        clase: 'btn-item btn-item-peligro',
                        aria: 'Eliminar ' + etiquetaTipo(fila.tipo).toLowerCase() + ' ' + tituloTexto,
                        alClick: function () {
                            var aviso = '¿Querés quitar ' + (fila.tipo === 'mes' ? 'el mes' : 'la hora') + ' «' + tituloTexto + '»? No se puede deshacer.';
                            pedirConfirmacion('Quitar para siempre', aviso).then(function (aceptado) {
                                if (!aceptado) return;
                                if (fila.tipo === 'mes') quitarMes(fila.valor);
                                else guardar('quitar', 'hora', fila.valor, '', 'Listo, se quitó.');
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
        }

        var citasOrden = citasVisibles.slice().sort(function (a, b) {
            if (a.fecha !== b.fecha) return a.fecha < b.fecha ? -1 : 1;
            return a.hora < b.hora ? -1 : 1;
        });
        listaCitas.innerHTML = '';
        if (!citasOrden.length) {
            var vacioCita = document.createElement('p');
            vacioCita.className = 'vacio-bloque';
            vacioCita.textContent = 'Todavía no hay citas con fecha.';
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
                    nombre: cita.persona || 'Sin nombre',
                    aria: 'Cita de ' + (cita.persona || 'sin nombre') + ' del ' + partesCita.dia + ' de ' + partesCita.mesNombre + ' de ' + partesCita.anio +
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

    function mostrarPestanaGuardadas() {
        var tituloGuardadas = document.getElementById('guardadas-titulo');
        var ayudaGuardadas = document.getElementById('guardadas-ayuda');
        if (tituloGuardadas) tituloGuardadas.textContent = 'Citas guardadas';
        if (ayudaGuardadas) {
            ayudaGuardadas.textContent = 'Cada tarjeta es una cita que ya tiene fecha. Abrila para verla y actualizar sus datos.';
        }
        if (panelCitas) panelCitas.hidden = false;
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
        mostrarPestanaGuardadas('citas');
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
        if (estado === 'quince') estadoFinal = 'quince';
        else estadoFinal = estado === 'bloqueada' ? 'bloqueada' : 'abierta';
        modoBloqueo = estadoFinal === 'quince';
        var botones = document.querySelectorAll('.tipo-fecha-modos .pincel');
        for (var i = 0; i < botones.length; i += 1) {
            botones[i].setAttribute('aria-pressed', botones[i].getAttribute('data-estado') === estadoFinal ? 'true' : 'false');
        }
        var notaTipo = document.getElementById('tipo-fecha-ayuda');
        if (notaTipo) {
            if (estadoFinal === 'quince') {
                notaTipo.textContent = 'En el siguiente paso elegís un día. Ese día queda disponible y los 15 siguientes no se ofrecen.';
            } else if (estadoFinal === 'bloqueada') {
                notaTipo.textContent = 'El abogado no va esos días. También podés marcar un martes o un jueves de los 15 días. Los 15 días automáticos no se borran: solo se cierra el día que elijas.';
            } else {
                notaTipo.textContent = 'El abogado sí atiende esos días. Podés elegir un día que no sea martes o jueves, o corregir uno de los 15 días. Después indicás hasta qué hora atiende.';
            }
        }
        if (horaAyuda) {
            if (estadoFinal === 'bloqueada') {
                horaAyuda.textContent = 'No hace falta hora: esos días no se ofrecen.';
            } else {
                horaAyuda.textContent = 'Esta hora es el cierre de ese día. No mueve los 15 días, que cambian solos cada día.';
            }
        }
    }

    function totalPasos() {
        if (estadoFinal === 'quince') return 3;
        return estadoFinal === 'bloqueada' ? 4 : 5;
    }

    function etiquetaPasoActual(numero) {
        if (estadoFinal === 'quince') return numero;
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
        if (vistaFecha) {
            if (diasSeleccionados.length) vistaFecha.textContent = diasSeleccionados.map(etiquetaFecha).join(', ');
            else vistaFecha.textContent = 'Sin fecha';
        }
        if (vistaHora) {
            if (estadoFinal === 'bloqueada') vistaHora.textContent = 'Sin hora, porque ese día no se ofrece';
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
        if (botonAtras) botonAtras.hidden = numero === 1 || bloqueoCorriendo;
        if (botonSiguiente) botonSiguiente.hidden = numero === 5 || (modoBloqueo && numero === 3);
        if (botonGuardar) botonGuardar.hidden = numero !== 5;
        if (modoBloqueo && numero === 3) {
            if (asistenteTitulo) asistenteTitulo.textContent = 'Elegí el día disponible';
            if (asistenteAyuda) asistenteAyuda.textContent = 'Ese día queda disponible. Los 15 que le siguen no se ofrecen.';
        }
        if (numero === 2) marcarTipoFecha(estadoFinal);
        if (numero === 3) pintarDias();
        if (numero === 5) actualizarVistaPrevia();
        pintarAvisoModo();
    }

    function pintarAvisoModo() {
        var aviso = document.getElementById('bloqueo-modo');
        var nota = document.getElementById('bloqueo-quince-nota');
        var anterior = document.getElementById('mes-anterior');
        var siguiente = document.getElementById('mes-siguiente');
        if (aviso) aviso.hidden = !(modoBloqueo && paso === 3);
        if (anterior) anterior.hidden = !modoBloqueo;
        if (siguiente) siguiente.hidden = !modoBloqueo;
        if (anterior) anterior.disabled = bloqueoCorriendo;
        if (siguiente) siguiente.disabled = bloqueoCorriendo;
        if (botonAtras && modoBloqueo && paso === 3) botonAtras.hidden = bloqueoCorriendo;
        if (asistente) asistente.classList.toggle('asistente-modo-bloqueo', modoBloqueo);
        if (nota && modoBloqueo && !bloqueoCorriendo) {
            nota.textContent = 'Elegí un día. Ese día queda disponible y los 15 siguientes no se ofrecen. Si volvés atrás, no se guarda nada.';
        }
    }

    function abrirAsistente(entrarEnBloqueo) {
        if (bloqueoCorriendo) return;
        if (guardadas && !guardadas.hidden) cerrarGuardadas();
        diaSeleccionado = '';
        diasSeleccionados = [];
        modoBloqueo = false;
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
        if (bloqueoCorriendo) return;
        modoBloqueo = false;
        pintarAvisoModo();
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
            if (estadoFinal !== 'abierta' && estadoFinal !== 'bloqueada') {
                mostrarErrorGuardado('Elegí si ese día queda disponible o si el abogado no va.');
                return false;
            }
            return true;
        }
        if (numero === 3) {
            if (!diasSeleccionados.length) {
                mostrarErrorGuardado('Elegí al menos un día.');
                return false;
            }
            return true;
        }
        if (numero === 4) {
            if (estadoFinal === 'bloqueada') return true;
            var hora = horaActual();
            if (!hora || hora < '09:00') {
                mostrarErrorGuardado('El cierre tiene que ser a las 9:00 a. m. o después, para que quepa una cita de una hora.');
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
                return datos;
            });
    }

    function fijarEstadoLocal(iso, estado) {
        var i;
        for (i = 0; i < reglas.length; i += 1) {
            if (reglas[i].tipo === 'fecha' && reglas[i].valor === iso) {
                reglas[i].estado = estado;
                return;
            }
        }
        reglas.push({ tipo: 'fecha', valor: iso, estado: estado });
    }

    function moverMes(delta) {
        if (bloqueoCorriendo || !/^\d{4}-\d{2}$/.test(campoMes.value)) return;
        var partes = campoMes.value.split('-');
        var fecha = new Date(Date.UTC(Number(partes[0]), Number(partes[1]) - 1 + delta, 1));
        campoMes.value = fecha.getUTCFullYear() + '-' + String(fecha.getUTCMonth() + 1).padStart(2, '0');
        pintarDias();
    }

    function mostrarMesDe(iso) {
        var mes = iso.slice(0, 7);
        if (campoMes.value === mes) return;
        campoMes.value = mes;
        pintarDias();
    }

    function animarBloqueo(detalle, mensaje) {
        var nota = document.getElementById('bloqueo-quince-nota');
        var reducido = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        var espera = reducido ? 0 : 260;
        var indice = 0;
        var ocupadas = [];

        function pintarCelda(item) {
            mostrarMesDe(item.fecha);
            var boton = diasMes.querySelector('[data-fecha="' + item.fecha + '"]');
            if (!boton) return;
            var disponible = item.estado === 'abierta';
            if (item.resultado === 'omitida_ocupada') {
                ocupadas.push(item.fecha);
                boton.classList.add('dia-quince-conflicto');
                if (disponible) boton.classList.add('dia-quince-inicio');
                return;
            }
            fijarEstadoLocal(item.fecha, disponible ? 'abierta' : 'bloqueada');
            window.requestAnimationFrame(function () {
                var celda = diasMes.querySelector('[data-fecha="' + item.fecha + '"]');
                if (!celda) return;
                aplicarMarca(celda, Number(item.fecha.slice(8)), item.fecha, item.fecha.slice(0, 7));
                celda.classList.remove('dia-quince-relleno', 'dia-quince-disponible', 'dia-quince-inicio', 'dia-quince-conflicto');
                void celda.offsetWidth;
                if (disponible) celda.classList.add('dia-quince-disponible', 'dia-quince-inicio');
                else celda.classList.add('dia-quince-relleno');
            });
        }

        function siguiente() {
            if (indice >= detalle.length) {
                if (nota) {
                    nota.textContent = mensaje || 'La fecha elegida queda disponible y las siguientes no se ofrecen.';
                    if (ocupadas.length) {
                        nota.textContent += ' Siguen ocupadas: ' + ocupadas.map(etiquetaFecha).join(', ') + '.';
                    }
                }
                window.setTimeout(function () {
                    cargar().then(function () {
                        bloqueoCorriendo = false;
                        modoBloqueo = false;
                        pintarAvisoModo();
                        mostrarGuardado(nota ? nota.textContent : 'Fechas guardadas.');
                        cerrarAsistente();
                    });
                }, reducido ? 0 : 820);
                return;
            }
            var item = detalle[indice];
            indice += 1;
            if (nota) {
                if (item.estado === 'abierta') {
                    nota.textContent = item.resultado === 'omitida_ocupada'
                        ? 'Esa fecha sigue ocupada por una cita aceptada…'
                        : 'La fecha elegida queda disponible…';
                }
                else nota.textContent = 'Bloqueando ' + (indice - 1) + ' de 15…';
            }
            pintarCelda(item);
            window.setTimeout(siguiente, espera);
        }

        siguiente();
    }

    function iniciarBloqueo(fecha) {
        if (bloqueoCorriendo || !modoBloqueo) return;
        bloqueoCorriendo = true;
        diaSeleccionado = fecha;
        pintarAvisoModo();
        var nota = document.getElementById('bloqueo-quince-nota');
        if (nota) nota.textContent = 'Guardando: el día elegido queda disponible y se bloquean los 15 siguientes…';
        var marcado = diasMes.querySelector('[data-fecha="' + fecha + '"]');
        if (marcado) marcado.classList.add('dia-quince-inicio');
        var datos = new FormData();
        datos.append('token', token.value);
        datos.append('accion', 'bloquear_quince');
        datos.append('tipo', 'fecha');
        datos.append('valor', fecha);
        datos.append('estado', 'bloqueada');
        fetch('agenda.php', { method: 'POST', body: datos, credentials: 'same-origin' })
            .then(function (respuesta) {
                return respuesta.json().catch(function () { return null; });
            })
            .then(function (datosRespuesta) {
                var detalle = datosRespuesta && datosRespuesta.detalle;
                if (!datosRespuesta || !datosRespuesta.ok || !detalle || !detalle.length) {
                    throw new Error((datosRespuesta && datosRespuesta.mensaje) || 'No se pudo bloquear ese período.');
                }
                animarBloqueo(detalle, datosRespuesta.mensaje);
            })
            .catch(function (error) {
                bloqueoCorriendo = false;
                pintarAvisoModo();
                pintarDias();
                mostrarErrorGuardado(error.message || 'No se pudo bloquear ese período.');
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
        if (hora) {
            diasSeleccionados.forEach(function (fecha) {
                items.push({ tipo: 'hora', valor: fecha + ' ' + hora, estado: 'abierta' });
            });
        }

        encolar(function () {
            var cadena = Promise.resolve();
            items.forEach(function (item) {
                cadena = cadena.then(function () {
                    return enviar('guardar', item.tipo, item.valor, item.estado);
                });
            });
            cadena = cadena.then(function () {
                var datos = new FormData();
                datos.append('token', token.value);
                datos.append('accion', 'guardar_lote');
                datos.append('tipo', 'fecha');
                datos.append('estado', estadoFinal);
                datos.append('fechas', diasSeleccionados.join(','));
                datos.append('valor', diasSeleccionados[0] || '');
                return fetch('agenda.php', { method: 'POST', body: datos, credentials: 'same-origin' })
                    .then(function (respuesta) {
                        return respuesta.json().catch(function () { return null; });
                    })
                    .then(function (datosRespuesta) {
                        if (!datosRespuesta || !datosRespuesta.ok) {
                            throw new Error((datosRespuesta && datosRespuesta.mensaje) || 'No se pudo guardar.');
                        }
                        return datosRespuesta;
                    });
            });
            return cadena
                .then(function (datosGuardados) {
                    mostrarAviso('');
                    var mensaje = (datosGuardados && datosGuardados.mensaje) || 'Fechas guardadas.';
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
            if (paso === 2 && estadoFinal === 'quince') {
                diasSeleccionados = [];
                diaSeleccionado = '';
            }
            mostrarPaso(siguientePaso(paso));
        });
    }
    if (botonGuardar) botonGuardar.addEventListener('click', guardarAsistente);

    campoMes.addEventListener('change', function () {
        if (paso === 3) pintarDias();
    });

    diasMes.addEventListener('click', function (evento) {
        var boton = evento.target.closest ? evento.target.closest('.dia-mes') : null;
        if (!boton || !diasMes.contains(boton)) return;
        var iso = boton.getAttribute('data-fecha') || '';
        if (!iso) return;
        if (modoBloqueo) {
            if (bloqueoCorriendo) return;
            if (estadoDia(iso) === 'ocupada') {
                mostrarErrorGuardado('Ese día está ocupado por una cita aceptada. Elegí otro: la fecha de inicio tiene que poder quedar disponible.');
                return;
            }
            iniciarBloqueo(iso);
            return;
        }
        if (estadoDia(iso) === 'ocupada') {
            mostrarErrorGuardado('Ese día está ocupado por una cita aceptada y no se puede cambiar.');
            return;
        }
        var posicion = diasSeleccionados.indexOf(iso);
        if (posicion === -1) diasSeleccionados.push(iso);
        else diasSeleccionados.splice(posicion, 1);
        diaSeleccionado = iso;
        pintarDias();
        mostrarGuardado('');
    });

    var botonMesAnterior = document.getElementById('mes-anterior');
    var botonMesSiguiente = document.getElementById('mes-siguiente');
    if (botonMesAnterior) botonMesAnterior.addEventListener('click', function () { moverMes(-1); });
    if (botonMesSiguiente) botonMesSiguiente.addEventListener('click', function () { moverMes(1); });

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
    document.addEventListener('sitraina-agenda-actualizar', function () {
        cargar();
    });
    cargar();
})();
