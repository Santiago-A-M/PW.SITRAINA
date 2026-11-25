/* Solicitud de cita: popup por pasos sobre el calendario y el cupo actuales. */
(function () {
    var raiz = document.getElementById('reserva-cita');
    var vista = document.getElementById('vista-cita');
    var popup = document.getElementById('reserva-popup');
    var pista = document.getElementById('reserva-pista');
    if (!raiz || !vista || !popup || !pista) return;

    var pasos = [
        { titulo: 'Información personal', texto: 'La cita queda a nombre de tu cuenta de afiliado. Este dato no se cambia aquí.' },
        { titulo: 'Información de contacto', texto: 'Vamos a usar este correo para confirmarte la cita.' },
        { titulo: 'Motivo de la asesoría', texto: 'Contanos brevemente de qué se trata la consulta.' },
        { titulo: 'Fecha de la cita', texto: 'Los martes y jueves de los próximos 15 días se actualizan solos. Si el sindicato abrió o cerró un día a mano, ese cambio también se ve aquí.' },
        { titulo: 'Hora de inicio', texto: 'La cita dura una hora. La hora de finalización se calcula sola.' },
        { titulo: 'Cómo preferís la cita', texto: 'Elegí si querés atenderte en persona o en línea.' },
        { titulo: 'Vista previa', texto: 'Revisá la solicitud. Si algo no está bien, podés volver a editarlo.' }
    ];

    var datos = null;
    var eleccion = { fecha: '', hora: '', modalidad: '', motivo: '' };
    var enviando = false;
    var enviada = false;
    var cargando = false;
    var paso = 0;
    var direccion = 'adelante';
    var mesVisible = '';
    var cargadoEn = 0;
    var animarDias = true;
    var animarPaso = false;
    var timerRefresco = null;
    var timerDia = null;
    var timerVigia = null;
    var hoyVisto = '';
    var resumenHecho = null;

    function escapar(texto) {
        return String(texto == null ? '' : texto)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function horaTexto(hora) {
        var partes = String(hora || '').split(':');
        var h = parseInt(partes[0], 10);
        if (isNaN(h)) return hora;
        var sufijo = h >= 12 ? 'p. m.' : 'a. m.';
        var doce = h % 12;
        if (doce === 0) doce = 12;
        return doce + ':' + (partes[1] || '00') + ' ' + sufijo;
    }

    function tramoTexto(hora) {
        var inicio = horaTexto(hora && hora.hora ? hora.hora : hora);
        var fin = hora && hora.fin ? horaTexto(hora.fin) : '';
        return fin ? inicio + ' – ' + fin : inicio;
    }

    function diaDe(fecha) {
        if (!datos) return null;
        for (var i = 0; i < datos.dias.length; i++) {
            if (datos.dias[i].fecha === fecha) return datos.dias[i];
        }
        return null;
    }

    function diaTieneLibre(dia) {
        return !!(dia && !dia.ocupada && !dia.pasado && dia.habil && (dia.horas || []).some(function (hora) { return hora.libre; }));
    }

    function notaDia(dia, iso) {
        var esHoy = !!(datos && datos.hoy && iso === datos.hoy);
        if (dia && dia.ocupada) return esHoy ? 'Hoy, ocupada' : 'Ocupada';
        if (!dia) return mesDe(iso) === mesVisible ? (esHoy ? 'Hoy' : 'Deshabilitada') : '';
        if (diaTieneLibre(dia)) return esHoy ? 'Hoy, disponible' : 'Disponible';
        if (dia.pasado || dia.fuera) return esHoy ? 'Hoy' : 'Deshabilitada';
        return esHoy ? 'Hoy' : 'Deshabilitada';
    }

    function mesDe(iso) {
        return String(iso || '').slice(0, 7);
    }

    function nombreMes(ym) {
        var partes = String(ym || '').split('-');
        var nombres = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
        var numero = parseInt(partes[1], 10);
        if (!numero || numero < 1 || numero > 12) return ym;
        return nombres[numero - 1] + ' ' + partes[0];
    }

    function sumarMes(ym, delta) {
        var partes = String(ym || '').split('-');
        var anio = parseInt(partes[0], 10);
        var mes = parseInt(partes[1], 10);
        if (!anio || !mes) return ym;
        var fecha = new Date(Date.UTC(anio, mes - 1 + delta, 1));
        var nuevoMes = fecha.getUTCMonth() + 1;
        return fecha.getUTCFullYear() + '-' + (nuevoMes < 10 ? '0' : '') + nuevoMes;
    }

    function isoUTC(fecha) {
        var mes = fecha.getUTCMonth() + 1;
        var dia = fecha.getUTCDate();
        return fecha.getUTCFullYear() + '-' + (mes < 10 ? '0' : '') + mes + '-' + (dia < 10 ? '0' : '') + dia;
    }

    function celdasDelMes(ym) {
        var partes = String(ym || '').split('-');
        var anio = parseInt(partes[0], 10);
        var mes = parseInt(partes[1], 10);
        if (!anio || !mes) return [];
        var primero = new Date(Date.UTC(anio, mes - 1, 1));
        var huecos = (primero.getUTCDay() + 6) % 7;
        var cantidad = new Date(Date.UTC(anio, mes, 0)).getUTCDate();
        var celdas = [];
        var i;
        for (i = 0; i < huecos; i++) {
            celdas.push(isoUTC(new Date(Date.UTC(anio, mes - 1, 1 - (huecos - i)))));
        }
        for (i = 1; i <= cantidad; i++) {
            celdas.push(ym + '-' + (i < 10 ? '0' : '') + i);
        }
        while (celdas.length % 7 !== 0) {
            var previa = celdas[celdas.length - 1].split('-');
            var siguiente = new Date(Date.UTC(parseInt(previa[0], 10), parseInt(previa[1], 10) - 1, parseInt(previa[2], 10) + 1));
            celdas.push(isoUTC(siguiente));
        }
        return celdas;
    }

    function asegurarMes() {
        if (!datos) return;
        var inicio = datos.mes_inicio || mesDe(datos.hoy);
        var fin = datos.mes_fin || mesDe(datos.limite);
        if (!mesVisible || mesVisible < inicio || mesVisible > fin) mesVisible = mesDe(datos.hoy);
    }

    function claseDia(iso) {
        var dia = diaDe(iso);
        var clases = '';
        if (mesDe(iso) !== mesVisible) {
            clases = 'reserva-otro';
        } else if (dia && dia.ocupada) {
            clases = 'reserva-ocupada';
        } else if (dia && eleccion.fecha === iso && diaTieneLibre(dia)) {
            clases = 'reserva-disponible reserva-activo';
        } else if (dia && dia.pasado) {
            clases = 'reserva-pasado';
        } else if (diaTieneLibre(dia)) {
            clases = 'reserva-disponible';
        } else if (dia && dia.fuera) {
            clases = 'reserva-fuera';
        } else {
            clases = 'reserva-no';
        }
        if (datos && datos.hoy && iso === datos.hoy && mesDe(iso) === mesVisible) {
            clases += ' reserva-hoy';
        }
        return clases;
    }

    function etiquetaDe(iso) {
        var dia = diaDe(iso);
        return dia ? dia.etiqueta : iso;
    }

    function aviso(titulo, texto, error) {
        if (!window.SitrainaAvisos) return;
        if (error) window.SitrainaAvisos.error(titulo, texto);
        else window.SitrainaAvisos.exito(titulo, texto);
    }

    function popupAbierto() {
        return !popup.hidden;
    }

    function leerMotivo() {
        var campo = document.getElementById('reserva-motivo');
        if (campo) eleccion.motivo = campo.value;
        return String(eleccion.motivo || '').replace(/^\s+|\s+$/g, '');
    }

    function horaSeleccionada() {
        var dia = diaDe(eleccion.fecha);
        var hallada = null;
        ((dia && dia.horas) || []).forEach(function (hora) {
            if (hora.hora === eleccion.hora) hallada = hora;
        });
        return hallada;
    }

    function horaElegidaLibre() {
        var hora = horaSeleccionada();
        return !!(hora && hora.libre && diaTieneLibre(diaDe(eleccion.fecha)));
    }

    function modalidadTexto() {
        return eleccion.modalidad === 'virtual' ? 'En línea' : (eleccion.modalidad === 'presencial' ? 'En persona' : '');
    }

    function fijarValidacion(texto) {
        var nodo = document.getElementById('reserva-validacion');
        if (!nodo) return;
        if (!texto) {
            nodo.hidden = true;
            nodo.textContent = '';
            return;
        }
        nodo.hidden = false;
        nodo.textContent = texto;
    }

    function estadoPublico(texto) {
        var nodo = document.getElementById('reserva-estado');
        var boton = document.getElementById('reserva-abrir');
        if (nodo) {
            nodo.hidden = !texto;
            nodo.textContent = texto || '';
        }
        if (boton) boton.disabled = false;
    }

    function datoFijo(etiqueta, valor) {
        return '<p class="reserva-dato-fijo"><span>' + escapar(etiqueta) + '</span><strong>' + escapar(valor || '—') + '</strong></p>';
    }

    function htmlCalendario() {
        if (!datos) return '<p class="reserva-estado">Un momento, estamos preparando los horarios.</p>';
        asegurarMes();
        var inicio = datos.mes_inicio || mesDe(datos.hoy);
        var fin = datos.mes_fin || mesDe(datos.limite);
        var html = '<p class="reserva-rango">Del ' + escapar(etiquetaDe(datos.hoy)) + ' al ' + escapar(etiquetaDe(datos.limite)) + '. Un día en verde fuera de ese período es una excepción que dejó el sindicato.</p>';
        html += '<div class="reserva-nav">';
        html += '<button type="button" class="reserva-mes-btn" data-mes="-1" aria-label="Mes anterior"' + (mesVisible <= inicio ? ' disabled' : '') + '>‹</button>';
        html += '<p class="reserva-mes-titulo">' + escapar(nombreMes(mesVisible)) + '</p>';
        html += '<button type="button" class="reserva-mes-btn" data-mes="1" aria-label="Mes siguiente"' + (mesVisible >= fin ? ' disabled' : '') + '>›</button>';
        html += '</div>';
        html += '<div class="reserva-semana" aria-hidden="true"><span>Lun</span><span>Mar</span><span>Mié</span><span>Jue</span><span>Vie</span><span>Sáb</span><span>Dom</span></div>';
        html += '<div class="reserva-dias' + (animarDias ? ' reserva-dias-entra' : '') + '" role="group" aria-label="Días de ' + escapar(nombreMes(mesVisible)) + '">';
        animarDias = false;
        celdasDelMes(mesVisible).forEach(function (iso) {
            var dia = diaDe(iso);
            var libre = diaTieneLibre(dia);
            var numero = parseInt(iso.slice(8), 10);
            var nota = notaDia(dia, iso);
            html += '<button type="button" class="reserva-dia ' + claseDia(iso) + '" data-fecha="' + escapar(iso) + '"' + (libre ? '' : ' disabled') + ' aria-label="' + escapar(numero + (nota ? ', ' + nota : '')) + '">';
            html += '<strong>' + escapar(numero) + '</strong></button>';
        });
        html += '</div>';
        html += '<ul class="reserva-leyenda">';
        html += '<li><i class="reserva-muestra reserva-disponible"></i> Disponible</li>';
        html += '<li><i class="reserva-muestra reserva-ocupada"></i> Ocupada</li>';
        html += '<li><i class="reserva-muestra reserva-no"></i> Deshabilitada</li>';
        html += '<li><i class="reserva-muestra reserva-activo"></i> Seleccionada</li>';
        html += '<li><i class="reserva-muestra reserva-hoy"></i> Hoy</li>';
        html += '</ul>';
        return html;
    }

    function htmlHoras() {
        var dia = diaDe(eleccion.fecha);
        if (!diaTieneLibre(dia)) return '<p class="reserva-estado">Elegí primero un día disponible.</p>';
        var html = '<p class="reserva-rango">' + escapar(dia.etiqueta || eleccion.fecha) + '</p>';
        html += '<div class="reserva-horas" role="group" aria-label="Hora de inicio">';
        (dia.horas || []).forEach(function (hora) {
            var activo = eleccion.hora === hora.hora;
            var nota = hora.libre ? '' : (hora.pasada ? 'Pasada' : 'Reservada');
            html += '<button type="button" class="reserva-hora' + (activo ? ' reserva-activo' : '') + '" data-hora="' + escapar(hora.hora) + '"' + (hora.libre ? '' : ' disabled') + '>';
            html += escapar(horaTexto(hora.hora));
            if (hora.fin) html += '<small>Termina ' + escapar(horaTexto(hora.fin)) + '</small>';
            if (nota) html += '<small>' + escapar(nota) + '</small>';
            html += '</button>';
        });
        html += '</div>';
        var elegida = horaSeleccionada();
        if (elegida && elegida.fin) {
            html += '<p class="reserva-rango">Inicio ' + escapar(horaTexto(elegida.hora)) + '. Finalización ' + escapar(horaTexto(elegida.fin)) + '.</p>';
        }
        return html;
    }

    function htmlResumen(bloque) {
        var hora = (bloque && bloque.hora) || horaSeleccionada();
        var fecha = bloque ? bloque.fecha : (etiquetaDe(eleccion.fecha) || eleccion.fecha);
        var motivo = bloque ? bloque.motivo : leerMotivo();
        var modo = bloque ? bloque.modo : modalidadTexto();
        var nombre = bloque ? bloque.nombre : (datos && datos.nombre);
        var correo = bloque ? bloque.correo : (datos && datos.correo);
        var html = '<article class="reserva-resumen-tarjeta">';
        html += '<p class="reserva-resumen-kicker">Solicitud de asesoría legal</p>';
        html += datoFijo('Nombre', nombre);
        html += datoFijo('Correo', correo);
        html += datoFijo('Motivo', motivo);
        html += datoFijo('Fecha', fecha);
        html += datoFijo('Hora de inicio', hora ? horaTexto(hora.hora || hora) : '');
        html += datoFijo('Hora de finalización', hora && hora.fin ? horaTexto(hora.fin) : '');
        html += datoFijo('Cómo será', modo);
        html += '</article>';
        return html;
    }

    function htmlPaso(indice) {
        if (enviada && resumenHecho) {
            return '<div class="reserva-exito-caja"><p class="reserva-exito-titulo">La cita quedó registrada</p><p class="reserva-exito-texto">' + escapar(resumenHecho.mensaje || 'La solicitud ya se envió.') + '</p>' + htmlResumen(resumenHecho) + '</div>';
        }
        if (indice === 0) return datoFijo('Nombre', datos && datos.nombre);
        if (indice === 1) return datoFijo('Correo', datos && datos.correo);
        if (indice === 2) {
            return '<label class="reserva-motivo-label" for="reserva-motivo">Motivo</label>' +
                '<textarea id="reserva-motivo" class="reserva-motivo" maxlength="800" rows="5" placeholder="Contanos el motivo de la consulta">' + escapar(eleccion.motivo) + '</textarea>' +
                '<p class="reserva-ayuda">Hasta 800 caracteres.</p>';
        }
        if (indice === 3) return htmlCalendario();
        if (indice === 4) return htmlHoras();
        if (indice === 5) {
            return '<div class="reserva-modalidades" role="group" aria-label="Cómo preferís la cita">' +
                '<button type="button" class="reserva-modo' + (eleccion.modalidad === 'presencial' ? ' reserva-activo' : '') + '" data-modalidad="presencial">En persona</button>' +
                '<button type="button" class="reserva-modo' + (eleccion.modalidad === 'virtual' ? ' reserva-activo' : '') + '" data-modalidad="virtual">En línea</button>' +
                '</div>';
        }
        return htmlResumen(null);
    }

    function asegurarPaneles() {
        if (pista.childElementCount) return;
        pasos.forEach(function (_, indice) {
            var seccion = document.createElement('section');
            seccion.className = 'reserva-paso-panel';
            seccion.setAttribute('data-paso', String(indice));
            seccion.hidden = true;
            pista.appendChild(seccion);
        });
    }

    function validarPaso(indice) {
        if (!datos) return 'Un momento, todavía se están cargando los horarios.';
        if (indice === 0) {
            if (!datos.nombre) return 'Tu cuenta no tiene un nombre para reservar la cita.';
            return '';
        }
        if (indice === 1) {
            if (!datos.correo) return 'Tu cuenta no tiene un correo para confirmar la cita.';
            return '';
        }
        if (indice === 2) {
            var motivo = leerMotivo();
            if (!motivo) return 'Contanos el motivo de la consulta.';
            if (motivo.length > 800) return 'El motivo quedó muy largo. Acortalo un poco.';
            eleccion.motivo = motivo;
            return '';
        }
        if (indice === 3) {
            if (!diaTieneLibre(diaDe(eleccion.fecha))) return 'Elegí un martes o un jueves disponible dentro de los 15 días.';
            return '';
        }
        if (indice === 4) {
            if (!horaElegidaLibre()) return 'Elegí una hora de inicio que siga libre.';
            return '';
        }
        if (indice === 5) {
            if (eleccion.modalidad !== 'presencial' && eleccion.modalidad !== 'virtual') return 'Elegí si preferís la cita en persona o en línea.';
            return '';
        }
        return '';
    }

    function pintar(conAnimacion) {
        if (!popupAbierto()) return;
        asegurarPaneles();
        var titulo = document.getElementById('reserva-popup-titulo');
        var indicacion = document.getElementById('reserva-indicacion');
        var numero = document.getElementById('reserva-paso-num');
        var progreso = document.getElementById('reserva-progreso');
        var acciones = document.getElementById('reserva-acciones');
        var caja = popup.querySelector('.reserva-popup-caja');
        if (caja) {
            caja.classList.toggle('reserva-caja-exito', enviada);
            caja.classList.toggle('reserva-caja-calendario', !enviada && paso === 3);
        }
        if (enviada) {
            if (numero) numero.textContent = 'Listo';
            if (titulo) titulo.textContent = 'Cita reservada';
            if (indicacion) indicacion.textContent = 'Esta solicitud ya se envió. No hace falta volver a confirmarla.';
            if (progreso) progreso.innerHTML = '';
            fijarValidacion('');
        } else {
            var actual = pasos[paso] || pasos[0];
            if (numero) numero.textContent = 'Paso ' + (paso + 1) + ' de ' + pasos.length;
            if (titulo) titulo.textContent = actual.titulo;
            if (indicacion) indicacion.textContent = actual.texto;
            if (progreso) {
                var marcas = '';
                pasos.forEach(function (item, indice) {
                    var clase = indice < paso ? ' listo' : (indice === paso ? ' actual' : '');
                    marcas += '<li class="reserva-progreso-item' + clase + '"' + (indice === paso ? ' aria-current="step"' : '') + '><span>' + (indice + 1) + '</span><b>' + escapar(item.titulo) + '</b></li>';
                });
                progreso.innerHTML = marcas;
            }
        }
        for (var i = 0; i < pista.children.length; i++) {
            var seccion = pista.children[i];
            var visible = enviada ? i === 6 : i === paso;
            if (!visible) {
                seccion.hidden = true;
                seccion.classList.remove('reserva-entra');
                continue;
            }
            var conservarMotivo = i === 2 && !enviada && seccion.querySelector('#reserva-motivo') && !conAnimacion;
            if (!conservarMotivo) seccion.innerHTML = htmlPaso(i);
            seccion.hidden = false;
            if (conAnimacion || animarPaso) {
                seccion.classList.remove('reserva-entra');
                void seccion.offsetWidth;
                seccion.classList.toggle('reserva-desde-atras', direccion === 'atras');
                seccion.classList.add('reserva-entra');
            }
        }
        animarPaso = false;
        if (acciones) {
            if (enviada) {
                acciones.innerHTML = '<button type="button" class="btn" id="reserva-cerrar-listo">Cerrar</button>';
            } else if (paso === pasos.length - 1) {
                acciones.innerHTML = '<button type="button" class="reserva-btn-sec" id="reserva-atras">Atrás</button>' +
                    '<button type="button" class="reserva-btn-sec" id="reserva-editar">Editar información</button>' +
                    '<button type="button" class="btn" id="reserva-confirmar"' + (enviando ? ' disabled' : '') + '>Confirmar solicitud</button>';
            } else {
                acciones.innerHTML = '<button type="button" class="reserva-btn-sec" id="reserva-atras"' + (paso === 0 ? ' hidden' : '') + '>Atrás</button>' +
                    '<button type="button" class="btn" id="reserva-siguiente">Continuar</button>';
            }
        }
        var riel = document.getElementById('reserva-riel');
        if (riel && (conAnimacion || animarPaso)) riel.scrollTop = 0;
    }

    function irAPaso(indice, texto, animar) {
        direccion = indice < paso ? 'atras' : 'adelante';
        paso = indice;
        if (paso < 0) paso = 0;
        if (paso > pasos.length - 1) paso = pasos.length - 1;
        fijarValidacion(texto || '');
        animarPaso = animar !== false;
        pintar(animar !== false);
    }

    function firmaDe(json) {
        if (!json || !Array.isArray(json.dias)) return '';
        var partes = [json.hoy || '', json.limite || ''];
        json.dias.forEach(function (dia) {
            var horas = (dia.horas || []).map(function (hora) {
                return hora.hora + '-' + (hora.fin || '') + (hora.libre ? '1' : '0');
            }).join(',');
            partes.push([dia.fecha, dia.estado || '', dia.ocupada ? '1' : '0', dia.pasado ? '1' : '0', dia.fuera ? '1' : '0', dia.habil ? '1' : '0', horas].join(':'));
        });
        return partes.join('|');
    }

    function eleccionSigueLibre() {
        if (!eleccion.fecha) return true;
        var dia = diaDe(eleccion.fecha);
        if (!diaTieneLibre(dia)) return false;
        if (!eleccion.hora) return true;
        return (dia.horas || []).some(function (hora) {
            return hora.hora === eleccion.hora && hora.libre;
        });
    }

    function fechaEnCostaRica(fecha) {
        try {
            var partes = new Intl.DateTimeFormat('en-CA', {
                timeZone: 'America/Costa_Rica',
                year: 'numeric',
                month: '2-digit',
                day: '2-digit'
            }).formatToParts(fecha || new Date());
            var mapa = {};
            partes.forEach(function (parte) { mapa[parte.type] = parte.value; });
            if (!mapa.year || !mapa.month || !mapa.day) return '';
            var mes = mapa.month.length === 1 ? '0' + mapa.month : mapa.month;
            var dia = mapa.day.length === 1 ? '0' + mapa.day : mapa.day;
            return mapa.year + '-' + mes + '-' + dia;
        } catch (error) {
            return '';
        }
    }

    function msHastaMedianocheCostaRica() {
        try {
            var partes = new Intl.DateTimeFormat('en-US', {
                timeZone: 'America/Costa_Rica',
                hourCycle: 'h23',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            }).formatToParts(new Date());
            var mapa = {};
            partes.forEach(function (parte) { mapa[parte.type] = parte.value; });
            var hora = parseInt(mapa.hour, 10);
            if (isNaN(hora) || hora === 24) hora = 0;
            var minuto = parseInt(mapa.minute, 10) || 0;
            var segundo = parseInt(mapa.second, 10) || 0;
            var falta = ((23 - hora) * 3600 + (59 - minuto) * 60 + (60 - segundo)) * 1000 + 2000;
            if (falta < 5000 || falta > 86400000) return 60000;
            return falta;
        } catch (error) {
            return 60000;
        }
    }

    function detenerRefresco() {
        if (timerRefresco) {
            window.clearInterval(timerRefresco);
            timerRefresco = null;
        }
        if (timerDia) {
            window.clearTimeout(timerDia);
            timerDia = null;
        }
    }

    function diaYaCambio() {
        var hoy = fechaEnCostaRica();
        if (!hoy) return false;
        if (!hoyVisto) {
            hoyVisto = hoy;
            return false;
        }
        if (hoy === hoyVisto) return false;
        hoyVisto = hoy;
        return true;
    }

    function vigilarDia() {
        if (timerVigia) return;
        hoyVisto = fechaEnCostaRica() || (datos && datos.hoy) || '';
        timerVigia = window.setInterval(function () {
            if (!diaYaCambio()) return;
            if (vista.hidden || document.hidden || enviando) return;
            cargar({ silencioso: true, nuevoDia: true });
        }, 30000);
    }

    function programarRefresco() {
        detenerRefresco();
        if (vista.hidden || document.hidden) return;
        timerRefresco = window.setInterval(function () {
            if (document.hidden || vista.hidden || enviando) return;
            cargar({ silencioso: true });
        }, 90000);
        timerDia = window.setTimeout(function () {
            if (!vista.hidden && !document.hidden && !enviando) cargar({ silencioso: true, nuevoDia: true });
            programarRefresco();
        }, msHastaMedianocheCostaRica());
    }

    function aplicarEleccionTrasCambio(cambioDeDia) {
        if (!cambioDeDia && eleccionSigueLibre()) return '';
        var mensaje = '';
        if (eleccion.fecha && !diaTieneLibre(diaDe(eleccion.fecha))) {
            eleccion.fecha = '';
            eleccion.hora = '';
            if (paso > 3) paso = 3;
            mensaje = cambioDeDia
                ? 'Cambió el día. Elegí de nuevo un martes o un jueves dentro de los 15 días.'
                : 'Ese día ya no está disponible. Elegí otro.';
        } else if (eleccion.hora && !horaElegidaLibre()) {
            eleccion.hora = '';
            if (paso > 4) paso = 4;
            mensaje = 'Esa hora ya no está libre. Elegí otro inicio.';
        }
        if (cambioDeDia) {
            aviso('El calendario se actualizó', 'Cambió el día en Costa Rica. Los 15 días y los martes y jueves disponibles ya quedaron al día.', false);
        } else if (mensaje) {
            aviso('El horario cambió', mensaje, true);
        }
        return mensaje;
    }

    function cargar(opciones) {
        opciones = opciones || {};
        var silencioso = !!opciones.silencioso;
        var nuevoDia = !!opciones.nuevoDia;
        var luego = typeof opciones.luego === 'function' ? opciones.luego : null;
        if (vista.hidden) return;
        if (cargando) return;
        if (silencioso) leerMotivo();
        else if (!enviada) {
            eleccion = { fecha: '', hora: '', modalidad: '', motivo: '' };
            mesVisible = '';
            paso = 0;
            estadoPublico('Un momento, estamos preparando los horarios.');
        }
        cargando = true;
        fetch('php/citas_publicas.php?t=' + Date.now(), {
            credentials: 'same-origin',
            cache: 'no-store',
            headers: { 'Accept': 'application/json', 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' }
        })
            .then(function (r) { return r.json().then(function (json) { return { estado: r.status, json: json }; }); })
            .then(function (paquete) {
                cargando = false;
                var json = paquete.json;
                if (!json || !json.ok || !Array.isArray(json.dias)) {
                    if (silencioso && datos) {
                        if (luego) luego();
                        return;
                    }
                    estadoPublico((json && json.mensaje) || 'No se pudieron leer los horarios.');
                    return;
                }
                cargadoEn = Date.now();
                if (enviada && silencioso) {
                    datos = json;
                    if (json.hoy) hoyVisto = json.hoy;
                    estadoPublico('');
                    if (luego) luego();
                    return;
                }
                if (silencioso && datos && firmaDe(datos) === firmaDe(json)) {
                    datos.token = json.token || datos.token;
                    datos.nombre = json.nombre || datos.nombre;
                    datos.correo = json.correo || datos.correo;
                    datos.puede_reservar = json.puede_reservar;
                    datos.sesion = json.sesion;
                    datos.afiliado = json.afiliado;
                    datos.motivo = json.motivo || '';
                    datos.mensaje = json.mensaje || '';
                    datos.hoy = json.hoy;
                    datos.limite = json.limite;
                    datos.mes_inicio = json.mes_inicio || datos.mes_inicio;
                    datos.mes_fin = json.mes_fin || datos.mes_fin;
                    estadoPublico('');
                    if (luego) luego();
                    else if (popupAbierto()) pintar(false);
                    return;
                }
                var previa = eleccion;
                var hoyPrevio = datos && datos.hoy;
                var cambioDeDia = !!(hoyPrevio && json.hoy && hoyPrevio !== json.hoy) || nuevoDia;
                datos = json;
                if (json.hoy) hoyVisto = json.hoy;
                estadoPublico('');
                if (!silencioso) mesVisible = '';
                asegurarMes();
                var mensajeCambio = '';
                if (silencioso) {
                    eleccion = previa;
                    mensajeCambio = aplicarEleccionTrasCambio(cambioDeDia);
                }
                if (mensajeCambio) fijarValidacion(mensajeCambio);
                if (luego) luego();
                else if (popupAbierto()) pintar(!!mensajeCambio);
            })
            .catch(function () {
                cargando = false;
                if (silencioso && datos) {
                    if (luego) luego();
                    return;
                }
                estadoPublico('No se pudieron leer los horarios.');
            });
    }

    function pedirCuenta() {
        if (!datos || datos.puede_reservar) return false;
        if (!datos.sesion) {
            if (window.SitrainaAvisos) window.SitrainaAvisos.sesion();
            else aviso('Iniciá sesión', 'Entrá con tu cuenta de afiliado para reservar la cita.', true);
            return true;
        }
        var motivo = datos.motivo || '';
        var mensaje = datos.mensaje || '';
        if (motivo === 'menor_anio') {
            aviso(
                'Comunicate con Secretaría',
                mensaje || 'Todavía no cumplís un año de afiliación. Para gestionar una cita de asesoría, comunicate con Secretaría.',
                true
            );
            return true;
        }
        if (motivo === 'sin_cedula') {
            aviso(
                'Falta la cédula',
                mensaje || 'Tu cuenta no tiene cédula. Completá la cédula en tu cuenta para poder pedir cita.',
                true
            );
            return true;
        }
        aviso(
            'Solo para afiliados',
            mensaje || 'La asesoría legal se brinda únicamente a las personas afiliadas a SITRAINA.',
            true
        );
        return true;
    }

    function abrirPopup() {
        if (!datos) {
            if (!cargando) cargar();
            estadoPublico('Un momento, estamos preparando los horarios.');
            return;
        }
        if (pedirCuenta()) return;
        if (enviada) {
            enviada = false;
            resumenHecho = null;
            eleccion = { fecha: '', hora: '', modalidad: '', motivo: '' };
            paso = 0;
        }
        direccion = 'adelante';
        popup.hidden = false;
        document.body.classList.add('reserva-abierta');
        fijarValidacion('');
        pintar(true);
        var cerrar = document.getElementById('reserva-popup-cerrar');
        if (cerrar && cerrar.focus) cerrar.focus();
    }

    function cerrarPopup(forzar) {
        if (enviando && !forzar) return;
        popup.hidden = true;
        document.body.classList.remove('reserva-abierta');
        if (enviada) {
            enviada = false;
            resumenHecho = null;
            eleccion = { fecha: '', hora: '', modalidad: '', motivo: '' };
            paso = 0;
            cargar();
        }
    }

    function continuar() {
        if (enviando || enviada) return;
        var error = validarPaso(paso);
        if (error) {
            fijarValidacion(error);
            if (paso === 2) {
                var campo = document.getElementById('reserva-motivo');
                if (campo) campo.focus();
            }
            return;
        }
        fijarValidacion('');
        irAPaso(paso + 1, '', true);
    }

    function enviar() {
        if (enviando || enviada || !datos) return;
        if (pedirCuenta()) return;
        var error = '';
        for (var i = 0; i <= 5; i++) {
            error = validarPaso(i);
            if (error) {
                irAPaso(i, error, true);
                return;
            }
        }
        var hora = horaSeleccionada();
        enviando = true;
        pintar(false);
        if (window.SitrainaAvisos) window.SitrainaAvisos.procesando('Reservando', 'Estamos guardando la cita.');
        var cuerpo = new FormData();
        cuerpo.append('token', datos.token || '');
        cuerpo.append('fecha', eleccion.fecha);
        cuerpo.append('hora', eleccion.hora);
        cuerpo.append('modalidad', eleccion.modalidad);
        cuerpo.append('motivo', leerMotivo());
        fetch('php/citas_publicas.php', { method: 'POST', body: cuerpo, credentials: 'same-origin' })
            .then(function (r) { return r.json().then(function (json) { return { estado: r.status, json: json }; }); })
            .then(function (paquete) {
                enviando = false;
                var json = paquete.json || {};
                if (json.ok) {
                    enviada = true;
                    resumenHecho = {
                        nombre: datos.nombre,
                        correo: datos.correo,
                        motivo: eleccion.motivo,
                        fecha: etiquetaDe(eleccion.fecha) || eleccion.fecha,
                        hora: hora,
                        modo: modalidadTexto(),
                        mensaje: json.mensaje || 'La cita quedó registrada.'
                    };
                    aviso('Cita reservada', resumenHecho.mensaje, false);
                    pintar(true);
                    cargar({ silencioso: true });
                    return;
                }
                var mensaje = json.mensaje || 'No se pudo guardar la cita.';
                aviso('No se reservó', mensaje, true);
                if (paquete.estado === 409) {
                    cargar({
                        silencioso: true,
                        luego: function () {
                            if (!diaTieneLibre(diaDe(eleccion.fecha))) {
                                eleccion.fecha = '';
                                eleccion.hora = '';
                                irAPaso(3, mensaje, true);
                            } else {
                                eleccion.hora = '';
                                irAPaso(4, mensaje, true);
                            }
                        }
                    });
                    return;
                }
                fijarValidacion(mensaje);
                pintar(false);
            })
            .catch(function () {
                enviando = false;
                aviso('No se reservó', 'No se pudo guardar la cita. Volvé a intentarlo.', true);
                fijarValidacion('No se pudo guardar la cita. Volvé a intentarlo.');
                pintar(false);
            });
    }

    function cambiarMes(delta) {
        if (!datos || cargando || enviando || enviada) return;
        asegurarMes();
        var inicio = datos.mes_inicio || mesDe(datos.hoy);
        var fin = datos.mes_fin || mesDe(datos.limite);
        var siguiente = sumarMes(mesVisible, delta);
        if (siguiente < inicio || siguiente > fin) return;
        mesVisible = siguiente;
        animarDias = true;
        if (Date.now() - cargadoEn > 15000) {
            cargar({ silencioso: true, luego: function () { pintar(false); } });
            return;
        }
        pintar(false);
    }

    popup.addEventListener('click', function (evento) {
        if (evento.target && evento.target.getAttribute('data-cerrar-reserva') === '1') {
            cerrarPopup(false);
            return;
        }
        if (evento.target.id === 'reserva-popup-cerrar' || evento.target.id === 'reserva-cerrar-listo') {
            cerrarPopup(false);
            return;
        }
        var cambioMes = evento.target.closest('[data-mes]');
        if (cambioMes && !cambioMes.disabled) {
            cambiarMes(parseInt(cambioMes.getAttribute('data-mes'), 10) || 0);
            return;
        }
        var dia = evento.target.closest('[data-fecha]');
        if (dia && !dia.disabled) {
            eleccion.fecha = dia.getAttribute('data-fecha') || '';
            eleccion.hora = '';
            fijarValidacion('');
            pintar(false);
            return;
        }
        var hora = evento.target.closest('[data-hora]');
        if (hora && !hora.disabled) {
            eleccion.hora = hora.getAttribute('data-hora') || '';
            fijarValidacion('');
            pintar(false);
            return;
        }
        var modo = evento.target.closest('[data-modalidad]');
        if (modo) {
            eleccion.modalidad = modo.getAttribute('data-modalidad') || '';
            fijarValidacion('');
            pintar(false);
            return;
        }
        if (evento.target.id === 'reserva-siguiente') continuar();
        if (evento.target.id === 'reserva-atras') irAPaso(paso - 1, '', true);
        if (evento.target.id === 'reserva-editar') irAPaso(0, '', true);
        if (evento.target.id === 'reserva-confirmar') enviar();
    });

    popup.addEventListener('input', function (evento) {
        if (evento.target && evento.target.id === 'reserva-motivo') eleccion.motivo = evento.target.value;
    });

    raiz.addEventListener('click', function (evento) {
        if (evento.target && evento.target.closest && evento.target.closest('#reserva-abrir')) abrirPopup();
    });

    document.addEventListener('keydown', function (evento) {
        if (evento.key === 'Escape' && popupAbierto()) cerrarPopup(false);
    });

    document.addEventListener('sitraina-vista', function (evento) {
        if (evento && evento.detail === 'cita') {
            cargar();
            programarRefresco();
            return;
        }
        cerrarPopup(true);
        detenerRefresco();
    });
    document.addEventListener('visibilitychange', function () {
        if (document.hidden || vista.hidden) {
            detenerRefresco();
            return;
        }
        if (diaYaCambio() || (datos && datos.hoy && datos.hoy !== fechaEnCostaRica())) {
            cargar({ silencioso: true, nuevoDia: true });
        } else {
            cargar({ silencioso: true });
        }
        programarRefresco();
    });
    vigilarDia();
    window.sitrainaRefrescarCita = cargar;
    if (!vista.hidden) {
        cargar();
        programarRefresco();
    }
})();
