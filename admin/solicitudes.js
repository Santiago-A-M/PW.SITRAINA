/* Navbar admin + bandejas de Afiliaciones, Citas con Asesoría y Contacto. */
(function () {
    var tokenCampo = document.getElementById('agenda-token');
    var menu = document.getElementById('admin-menu');
    var btnMenu = document.getElementById('admin-btn-menu');
    if (!tokenCampo) return;

    var vistas = {
        agenda: document.getElementById('vista-agenda'),
        afilacion: document.getElementById('vista-afilacion'),
        afiliados: document.getElementById('vista-afiliados'),
        cita: document.getElementById('vista-cita'),
        contacto: document.getElementById('vista-contacto'),
        documentacion: document.getElementById('vista-documentacion'),
        hoja: document.getElementById('vista-documentacion')
    };
    var vistasLista = { afilacion: 1, cita: 1, contacto: 1 };

    var listas = {
        afilacion: document.getElementById('lista-sol-afilacion'),
        cita: document.getElementById('lista-sol-cita'),
        contacto: document.getElementById('lista-sol-contacto')
    };
    var listaAfiliados = document.getElementById('lista-afiliados');

    var datos = { contacto: [], cita: [], afilacion: [], afiliados: [] };
    var filtrosBusqueda = { agenda: '', afilacion: '', afiliados: '', cita: '', contacto: '' };
    var vistaActiva = 'agenda';
    var enviando = false;
    var cargado = false;
    var inicioCitas = document.getElementById('inicio-citas-recientes');
    var listaPapelera = document.getElementById('lista-papelera');
    var popupPapelera = document.getElementById('papelera');
    var btnAbrirPapelera = document.getElementById('abrir-papelera');
    var btnCerrarPapelera = document.getElementById('cerrar-papelera');
    var btnBorrarPapelera = document.getElementById('borrar-papelera');
    var cuentaPapelera = document.getElementById('papelera-cuenta');
    var cuentaSeleccion = document.getElementById('papelera-seleccion-cuenta');
    var checkTodas = document.getElementById('papelera-todas');
    var notaPapeleraInicio = document.getElementById('inicio-papelera-nota');
    var logoAdmin = document.getElementById('admin-logo');
    var borrandoPapelera = false;
    var inicioPend = {
        afilacion: document.getElementById('inicio-pend-afilacion'),
        cita: document.getElementById('inicio-pend-cita'),
        contacto: document.getElementById('inicio-pend-contacto')
    };

    function token() {
        return tokenCampo.value || '';
    }

    /* La reserva pública guarda la cita como aceptada a nombre de reserva-afiliado.
       Para el panel sigue pendiente hasta que un administrador la responda. */
    function filaPendiente(tipo, fila) {
        if (!fila) return false;
        if (tipo === 'cita' && String(fila.cancelado_en || '').trim() !== '') return false;
        var estado = String(fila.estado || 'pendiente').trim().toLowerCase();
        if (estado === '' || estado === 'pendiente') return true;
        if (tipo === 'cita' && estado === 'aceptada' && String(fila.admin_usuario || '').trim() === 'reserva-afiliado') {
            return true;
        }
        return false;
    }

    function contarPendientes(tipo) {
        return (datos[tipo] || []).filter(function (fila) {
            return filaPendiente(tipo, fila);
        }).length;
    }

    function etiquetaTipo(tipo) {
        if (tipo === 'cita') return 'Cita';
        if (tipo === 'afilacion') return 'Afiliacion';
        return 'Contacto';
    }

    function actualizarEtiquetaPendiente(boton, cantidad, etiqueta) {
        if (!boton) return;
        var n = Number(cantidad) || 0;
        boton.setAttribute(
            'aria-label',
            n === 1
                ? ('Ir a ' + etiqueta + ': 1 pendiente')
                : ('Ir a ' + etiqueta + ': ' + n + ' pendientes')
        );
    }

    /* Actualiza el estado en memoria y refresca Inicio + la lista del tipo. */
    function aplicarEstadoLocal(tipo, id, estado, extras) {
        var lista = datos[tipo];
        if (!lista) return;
        var idNum = parseInt(id, 10);
        if (!(idNum > 0)) return;
        for (var i = 0; i < lista.length; i += 1) {
            if (parseInt(lista[i].id, 10) !== idNum) continue;
            lista[i].estado = estado || 'pendiente';
            if (extras) {
                if (extras.respuesta != null) lista[i].respuesta = extras.respuesta;
                if (extras.respondido_en != null) lista[i].respondido_en = extras.respondido_en;
                if (extras.admin_usuario != null) lista[i].admin_usuario = extras.admin_usuario;
                if (extras.editado != null) lista[i].editado = extras.editado;
            }
            break;
        }
        pintarInicio();
        if (vistasLista[tipo]) pintarLista(tipo);
    }

    function quitarConsultaLocal(tipo, id) {
        var lista = datos[tipo];
        if (!lista) return;
        var idNum = parseInt(id, 10);
        if (!(idNum > 0)) return;
        datos[tipo] = lista.filter(function (fila) {
            return parseInt(fila.id, 10) !== idNum;
        });
        pintarInicio();
        if (vistasLista[tipo]) pintarLista(tipo);
    }

    function quitarVariasLocal(items) {
        (items || []).forEach(function (item) {
            if (!item || !item.tipo) return;
            var lista = datos[item.tipo];
            if (!lista) return;
            var idNum = parseInt(item.id, 10);
            datos[item.tipo] = lista.filter(function (fila) {
                return parseInt(fila.id, 10) !== idNum;
            });
        });
        pintarInicio();
        Object.keys(vistasLista).forEach(function (tipo) {
            pintarLista(tipo);
        });
    }

    function pintarInicio() {
        var nAfil = contarPendientes('afilacion');
        var nCita = contarPendientes('cita');
        var nContacto = contarPendientes('contacto');
        if (inicioPend.afilacion) inicioPend.afilacion.textContent = String(nAfil);
        if (inicioPend.cita) inicioPend.cita.textContent = String(nCita);
        if (inicioPend.contacto) inicioPend.contacto.textContent = String(nContacto);
        actualizarEtiquetaPendiente(
            inicioPend.afilacion && inicioPend.afilacion.closest('.inicio-stat'),
            nAfil,
            'Afiliaciones'
        );
        actualizarEtiquetaPendiente(
            inicioPend.cita && inicioPend.cita.closest('.inicio-stat'),
            nCita,
            'Citas'
        );
        actualizarEtiquetaPendiente(
            inicioPend.contacto && inicioPend.contacto.closest('.inicio-stat'),
            nContacto,
            'Contactos'
        );

        if (inicioCitas) {
            var consultaInicio = filtrosBusqueda.agenda || '';
            var recientes = [];
            ['contacto', 'cita', 'afilacion'].forEach(function (tipo) {
                (datos[tipo] || []).forEach(function (fila) {
                    if (!coincideBusqueda(textoBusquedaFila(tipo, fila), consultaInicio)) return;
                    recientes.push({ tipo: tipo, fila: fila });
                });
            });
            recientes.sort(function (a, b) {
                var ca = claveReciente(a.fila);
                var cb = claveReciente(b.fila);
                if (!ca && !cb) return (parseInt(b.fila.id, 10) || 0) - (parseInt(a.fila.id, 10) || 0);
                if (!ca) return 1;
                if (!cb) return -1;
                if (ca !== cb) return cb.localeCompare(ca);
                return (parseInt(b.fila.id, 10) || 0) - (parseInt(a.fila.id, 10) || 0);
            });
            if (!normalizarBusqueda(consultaInicio)) recientes = recientes.slice(0, 5);
            else recientes = recientes.slice(0, 20);
            if (!recientes.length) {
                inicioCitas.innerHTML = '<p class="vacio-bloque">' + (normalizarBusqueda(consultaInicio)
                    ? 'No hay consultas que coincidan con esa búsqueda.'
                    : 'Todavía no hay consultas registradas.') + '</p>';
            } else {
                var htmlC = '<ul class="inicio-cards">';
                recientes.forEach(function (item) {
                    htmlC += htmlConsultaReciente(item.tipo, item.fila);
                });
                htmlC += '</ul>';
                inicioCitas.innerHTML = htmlC;
            }
        }

        pintarPapelera();
    }

    function listarRechazados() {
        var rechazados = [];
        ['contacto', 'cita', 'afilacion'].forEach(function (tipo) {
            (datos[tipo] || []).forEach(function (fila) {
                if ((fila.estado || '') === 'rechazada') {
                    rechazados.push({ tipo: tipo, fila: fila });
                }
            });
        });
        rechazados.sort(function (a, b) {
            return String(b.fila.respondido_en || b.fila.creado_en || '').localeCompare(
                String(a.fila.respondido_en || a.fila.creado_en || '')
            );
        });
        return rechazados;
    }

    function actualizarSeleccionPapelera() {
        if (!listaPapelera) return;
        var checks = listaPapelera.querySelectorAll('.papelera-check');
        var elegidos = 0;
        checks.forEach(function (c) {
            var casilla = c.closest('.papelera-casilla');
            if (c.checked) {
                elegidos++;
                if (casilla) casilla.classList.add('papelera-seleccionada');
            } else if (casilla) {
                casilla.classList.remove('papelera-seleccionada');
            }
        });
        if (cuentaSeleccion) {
            cuentaSeleccion.textContent = elegidos === 1
                ? '1 seleccionada'
                : (elegidos + ' seleccionadas');
        }
        if (cuentaPapelera) {
            if (elegidos > 0) {
                cuentaPapelera.hidden = false;
                cuentaPapelera.textContent = String(elegidos);
            } else {
                cuentaPapelera.hidden = true;
                cuentaPapelera.textContent = '0';
            }
        }
        if (btnBorrarPapelera) {
            btnBorrarPapelera.disabled = elegidos < 1 || borrandoPapelera;
            btnBorrarPapelera.classList.toggle('papelera-flotante-inactiva', elegidos < 1);
        }
        if (checkTodas) {
            checkTodas.checked = checks.length > 0 && elegidos === checks.length;
            checkTodas.indeterminate = elegidos > 0 && elegidos < checks.length;
        }
    }

    function pintarPapelera() {
        var rechazados = listarRechazados();
        if (notaPapeleraInicio) {
            notaPapeleraInicio.textContent = rechazados.length === 1
                ? '1 rechazada'
                : (rechazados.length + ' rechazadas');
        }
        if (checkTodas) {
            checkTodas.checked = false;
            checkTodas.indeterminate = false;
            checkTodas.disabled = !rechazados.length;
        }
        if (!listaPapelera) return;
        if (!rechazados.length) {
            listaPapelera.innerHTML = '<p class="vacio-bloque">No hay solicitudes rechazadas.</p>';
            actualizarSeleccionPapelera();
            return;
        }
        var html = '<ul class="papelera-rejilla">';
        rechazados.forEach(function (item) {
            var fila = item.fila;
            var tipo = item.tipo;
            var id = String(fila.id);
            var nombre = fila.nombre || fila.persona || 'Sin nombre';
            html += '<li class="papelera-casilla" data-sol-tipo="' + escapar(tipo) + '" data-sol-id="' + escapar(id) + '">';
            html += '<label class="papelera-check-wrap">';
            html += '<input type="checkbox" class="papelera-check" value="' + escapar(tipo + ':' + id) + '">';
            html += '<span class="papelera-check-texto">Seleccionar</span>';
            html += '</label>';
            html += '<button type="button" class="papelera-tapa" aria-expanded="false">';
            html += '<span class="papelera-tipo">' + escapar(etiquetaTipo(tipo)) + '</span>';
            html += '<strong class="papelera-nombre">' + escapar(nombre) + '</strong>';
            if (fila.correo) html += '<span class="papelera-dato">' + escapar(fila.correo) + '</span>';
            if (tipo === 'cita') {
                var cuando = [fila.fecha, fila.hora].filter(Boolean).join(' · ');
                if (cuando) html += '<span class="papelera-dato">' + escapar(cuando) + '</span>';
                if (fila.motivo) html += '<span class="papelera-dato papelera-resumen">' + escapar(fila.motivo) + '</span>';
            }
            if (tipo === 'contacto' && fila.asunto) {
                html += '<span class="papelera-dato papelera-resumen">' + escapar(fila.asunto) + '</span>';
            }
            if (tipo === 'afilacion' && fila.cedula) {
                html += '<span class="papelera-dato">Cedula ' + escapar(fila.cedula) + '</span>';
            }
            if (fila.respondido_en) {
                html += '<span class="papelera-fecha">Rechazado: ' + escapar(fila.respondido_en) + '</span>';
            }
            html += '<span class="papelera-chevron" aria-hidden="true">Ver detalle</span>';
            html += '</button>';
            html += '<div class="papelera-detalle" hidden>';
            metaFila(tipo, fila).forEach(function (m) {
                html += '<p class="item-meta-fila"><span class="item-meta-etiqueta">' + escapar(m.et) + '</span>';
                html += '<span class="item-meta-valor">' + escapar(m.val) + '</span></p>';
            });
            html += '</div></li>';
        });
        html += '</ul>';
        listaPapelera.innerHTML = html;
        actualizarSeleccionPapelera();
    }

    function abrirPapelera() {
        if (!popupPapelera) return;
        pintarPapelera();
        popupPapelera.hidden = false;
        if (btnBorrarPapelera) btnBorrarPapelera.hidden = false;
        requestAnimationFrame(function () {
            popupPapelera.classList.add('asistente-visible');
        });
        document.body.style.overflow = 'hidden';
        if (btnCerrarPapelera) btnCerrarPapelera.focus();
    }

    function cerrarPapelera() {
        if (!popupPapelera || popupPapelera.hidden) return;
        popupPapelera.classList.remove('asistente-visible');
        document.body.style.overflow = '';
        if (btnBorrarPapelera) btnBorrarPapelera.hidden = true;
        window.setTimeout(function () {
            popupPapelera.hidden = true;
        }, 280);
        if (btnAbrirPapelera) btnAbrirPapelera.focus();
    }

    function borrarSeleccionPapelera() {
        if (borrandoPapelera || !listaPapelera) return;
        var items = [];
        listaPapelera.querySelectorAll('.papelera-check:checked').forEach(function (c) {
            var casilla = c.closest('.papelera-casilla');
            if (!casilla) return;
            var tipo = casilla.getAttribute('data-sol-tipo');
            var id = parseInt(casilla.getAttribute('data-sol-id'), 10);
            if (tipo && id > 0) items.push({ tipo: tipo, id: id });
        });
        if (!items.length) {
            mostrarAviso('Seleccioná al menos una consulta para borrar.', true);
            return;
        }
        var mensaje = items.length === 1
            ? '¿Querés quitar esta solicitud para siempre? No se puede deshacer.'
            : ('¿Querés quitar estas ' + items.length + ' solicitudes para siempre? No se puede deshacer.');
        pedirConfirmacion('Quitar para siempre', mensaje).then(function (aceptado) {
        if (!aceptado) return;
        borrandoPapelera = true;
        actualizarSeleccionPapelera();
        mostrarAviso('Borrando…');
        var cuerpo = new FormData();
        cuerpo.append('token', token());
        cuerpo.append('accion', 'eliminar_papelera');
        cuerpo.append('items', JSON.stringify(items));
        fetch('solicitudes.php', { method: 'POST', body: cuerpo, credentials: 'same-origin' })
            .then(function (r) { return r.json().catch(function () { return null; }); })
            .then(function (json) {
                borrandoPapelera = false;
                if (!json || !json.ok) {
                    throw new Error((json && json.mensaje) || 'No se pudo borrar.');
                }
                mostrarAviso(json.mensaje || 'Consultas borradas.');
                quitarVariasLocal(items);
                cargado = false;
                return cargar(true);
            })
            .then(function () {
                if (popupPapelera && !popupPapelera.hidden) pintarPapelera();
            })
            .catch(function (err) {
                borrandoPapelera = false;
                actualizarSeleccionPapelera();
                mostrarAviso(err.message || 'No se pudo borrar.', true);
            });
        });
    }

    function ambitoSolicitud() {
        var papelera = document.getElementById('papelera');
        if (papelera && !papelera.hidden) return 'papelera';
        if (vistaActiva === 'cita') return 'cita';
        if (vistaActiva === 'afiliados' || vistaActiva === 'afilacion') return 'afiliado';
        if (vistaActiva === 'contacto') return 'contacto';
        return 'solicitud';
    }

    function mostrarAviso(texto, esError) {
        if (!texto) return;
        if (window.SitrainaAvisos && window.SitrainaAvisos.contextual) {
            var tipo = esError ? 'error' : (/…$/.test(texto) ? 'proceso' : 'exito');
            window.SitrainaAvisos.contextual(tipo, texto, ambitoSolicitud());
            return;
        }
        if (window.SitrainaAvisos) {
            if (esError) window.SitrainaAvisos.error('No se pudo completar', texto);
            else if (/…$/.test(texto)) window.SitrainaAvisos.procesando(texto, 'Esperá un momento. No repitas la acción.');
            else window.SitrainaAvisos.exito('Listo', texto);
            return;
        }
        if (typeof window.adminMostrarAlerta === 'function') {
            window.adminMostrarAlerta(texto, !!esError, esError ? 0 : 2800);
        }
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

    function etiquetaTipo(tipo) {
        if (tipo === 'contacto') return 'Contacto';
        if (tipo === 'cita') return 'Cita';
        return 'Afiliación';
    }

    function etiquetaEstado(estado) {
        if (estado === 'aceptada') return 'Aceptada';
        if (estado === 'rechazada') return 'Rechazada';
        if (estado === 'neutral') return 'Respondida';
        return 'Pendiente';
    }

    function textoEstadoFila(fila) {
        if (fila && fila.cancelado_en) {
            return parseInt(fila.plazo_vigente, 10) === 1 ? 'Cancelada' : 'Plazo vencido';
        }
        return etiquetaEstado((fila && fila.estado) || 'pendiente');
    }

    function claseEstado(estado) {
        if (estado === 'aceptada') return 'sol-estado-aceptada';
        if (estado === 'rechazada') return 'sol-estado-rechazada';
        if (estado === 'neutral') return 'sol-estado-neutral';
        return 'sol-estado-pendiente';
    }

    function escapar(texto) {
        return String(texto == null ? '' : texto)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function normalizarBusqueda(texto) {
        return String(texto == null ? '' : texto)
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/\s+/g, ' ')
            .trim();
    }

    function coincideBusqueda(haystack, consulta) {
        var q = normalizarBusqueda(consulta);
        if (!q) return true;
        return normalizarBusqueda(haystack).indexOf(q) !== -1;
    }

    function textoBusquedaFila(tipo, fila) {
        var partes = [];
        if (!fila) return '';
        if (tipo === 'cita') {
            partes.push(fila.persona, fila.correo, fila.cedula, fila.fecha, fila.hora, fila.motivo, fila.notas, fila.creado_en, fila.estado, fila.modalidad);
            if (fila.fecha) partes.push(textoFechaHora([fila.fecha, fila.hora].filter(Boolean).join(' ')));
        } else if (tipo === 'afiliados') {
            partes.push(fila.nombre_completo, fila.correo, fila.cedula);
        } else {
            partes.push(fila.nombre, fila.correo, fila.cedula, fila.asunto, fila.creado_en, fila.estado);
            if (fila.creado_en) partes.push(textoFechaHora(fila.creado_en));
        }
        partes.push(textoEstadoFila(fila));
        return partes.filter(Boolean).join(' ');
    }

    function filasFiltradas(tipo) {
        var filas = datos[tipo] || [];
        var consulta = filtrosBusqueda[tipo] || '';
        if (!normalizarBusqueda(consulta)) return filas.slice();
        return filas.filter(function (fila) {
            return coincideBusqueda(textoBusquedaFila(tipo, fila), consulta);
        });
    }

    function tituloFila(tipo, fila) {
        if (tipo === 'contacto') {
            return (fila.nombre || 'Sin nombre') + (fila.asunto ? ' · ' + fila.asunto : '');
        }
        if (tipo === 'cita') {
            var cuando = [fila.fecha, fila.hora].filter(Boolean).join(' ');
            return (fila.persona || 'Sin nombre') + (cuando ? ' · ' + cuando : '');
        }
        return (fila.nombre || 'Sin nombre') + (fila.cedula ? ' · ' + fila.cedula : '');
    }

    function diaSemanaIso(iso) {
        var partes = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (!partes) return '';
        var fecha = new Date(Date.UTC(Number(partes[1]), Number(partes[2]) - 1, Number(partes[3])));
        var nombres = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
        return nombres[fecha.getUTCDay()] || '';
    }

    function finLegible(hora) {
        var partes = String(hora || '').split(':');
        var numero = parseInt(partes[0], 10);
        if (!partes[1] || isNaN(numero)) return '';
        numero += 1;
        if (numero > 23) return '';
        return horaLegible((numero < 10 ? '0' : '') + numero + ':' + partes[1]);
    }

    function textoModalidadCita(valor) {
        if (valor === 'virtual') return 'En línea';
        if (valor === 'presencial') return 'En persona';
        return '';
    }

    function filaGrupo(etiqueta, valor) {
        if (!valor) return '';
        return '<p class="item-meta-fila"><span class="item-meta-etiqueta">' + escapar(etiqueta) + '</span><span class="item-meta-valor">' + escapar(valor) + '</span></p>';
    }

    function htmlGruposCita(fila, estado) {
        var modalidad = textoModalidadCita(fila.modalidad);
        var html = '<div class="sol-grupos">';
        html += '<section class="sol-grupo"><h3>Información del usuario</h3>';
        html += filaGrupo('Nombre', fila.persona || '—');
        html += filaGrupo('Correo electrónico', fila.correo || '—');
        html += filaGrupo('Cédula', fila.cedula || '');
        html += '</section>';
        html += '<section class="sol-grupo"><h3>Información de la cita</h3>';
        html += '<p class="sol-badge ' + claseEstado(fila.cancelado_en ? 'rechazada' : estado) + '">' + escapar(textoEstadoFila(fila)) + '</p>';
        html += filaGrupo('Fecha', fila.fecha ? textoFechaHora(fila.fecha) : '');
        html += filaGrupo('Día de la semana', diaSemanaIso(fila.fecha));
        html += filaGrupo('Hora de inicio', fila.hora ? horaLegible(fila.hora) : '');
        html += filaGrupo('Hora de finalización', finLegible(fila.hora));
        html += filaGrupo('Modalidad', modalidad);
        if (fila.cancelado_en) html += filaGrupo('Cancelada', textoFechaHora(fila.cancelado_en));
        if (fila.plazo_limite) {
            html += filaGrupo(
                'Reprogramar hasta',
                textoFechaHora(fila.plazo_limite) + (parseInt(fila.plazo_vigente, 10) === 1 ? ' (360 horas desde la cancelación)' : ' (plazo vencido)')
            );
        }
        html += '</section>';
        html += '<section class="sol-grupo"><h3>Información de la solicitud</h3>';
        html += filaGrupo('Motivo', fila.motivo || '');
        html += filaGrupo('Notas', fila.notas || '');
        html += filaGrupo('Recibida', fila.creado_en ? textoFechaHora(fila.creado_en) : '');
        html += filaGrupo('Respuesta guardada', fila.respuesta || '');
        html += filaGrupo('Respondió', fila.admin_usuario || '');
        html += filaGrupo('Respondido', fila.respondido_en ? textoFechaHora(fila.respondido_en) : '');
        html += '</section></div>';
        return html;
    }

    function metaFila(tipo, fila) {
        var partes = [];
        if (fila.correo) partes.push({ et: 'Correo', val: fila.correo });
        if (tipo === 'contacto') {
            if (fila.asunto) partes.push({ et: 'Asunto', val: fila.asunto });
            if (fila.mensaje) partes.push({ et: 'Mensaje', val: fila.mensaje });
        }
        if (tipo === 'cita') {
            if (fila.fecha) partes.push({ et: fila.cancelado_en ? 'Día que tenía' : 'Fecha', val: fila.fecha });
            if (fila.hora) partes.push({ et: 'Hora', val: fila.hora });
            if (fila.cancelado_en) {
                partes.push({ et: 'Cancelada', val: textoFechaHora(fila.cancelado_en) });
                if (fila.plazo_limite) {
                    partes.push({
                        et: 'Reprogramar hasta',
                        val: textoFechaHora(fila.plazo_limite) + (parseInt(fila.plazo_vigente, 10) === 1
                            ? ' (360 horas desde la cancelación)'
                            : ' (plazo vencido)')
                    });
                }
            }
            if (fila.motivo) partes.push({ et: 'Motivo', val: fila.motivo });
        }
        if (tipo === 'afilacion') {
            if (fila.cedula) partes.push({ et: 'Cédula', val: fila.cedula });
        }
        if (fila.creado_en) partes.push({ et: 'Recibido', val: fila.creado_en });
        if (fila.respuesta) partes.push({ et: 'Respuesta guardada', val: fila.respuesta });
        if (fila.admin_usuario) partes.push({ et: 'Respondió', val: fila.admin_usuario });
        if (fila.respondido_en) partes.push({ et: 'Respondido', val: fila.respondido_en });
        return partes;
    }

    var cuposActuales = { fechas: {}, horas: [], ocupados: {} };

    function horaLegible(hora) {
        var partes = String(hora || '').split(':');
        var numero = parseInt(partes[0], 10);
        if (!partes[1] || isNaN(numero)) return String(hora || '');
        var sufijo = numero >= 12 ? 'p. m.' : 'a. m.';
        var doce = numero % 12;
        if (doce === 0) doce = 12;
        return doce + ':' + partes[1] + ' ' + sufijo;
    }

    function cupoOcupado(fecha, hora, propia) {
        var dia = String(fecha || '').slice(0, 10);
        if (propia && dia === propia) return false;
        if (cuposActuales.ocupados[dia]) return true;
        return !!cuposActuales.ocupados[dia + ' ' + hora];
    }

    function horasLibres(fecha) {
        return cuposActuales.horas.filter(function (hora) { return !cupoOcupado(fecha, hora); }).length;
    }

    function isoDia(anio, mes, dia) {
        return anio + '-' + String(mes).padStart(2, '0') + '-' + String(dia).padStart(2, '0');
    }

    function hoyIso() {
        var hoy = new Date();
        return isoDia(hoy.getFullYear(), hoy.getMonth() + 1, hoy.getDate());
    }

    function iniciarCupos(caja) {
        var estado = caja.querySelector('.sol-cupos-estado');
        var mes = caja.querySelector('.sol-cita-mes');
        if (mes && !mes.value) {
            var ahora = new Date();
            mes.value = ahora.getFullYear() + '-' + String(ahora.getMonth() + 1).padStart(2, '0');
        }
        if (estado) estado.textContent = 'Un momento, estamos preparando el mes.';
        Promise.all([
            fetch('agenda.php', { credentials: 'same-origin', cache: 'no-store' }).then(function (r) { return r.json().catch(function () { return null; }); }),
            fetch('solicitudes.php?tipo=cupos', { credentials: 'same-origin', cache: 'no-store' }).then(function (r) { return r.json().catch(function () { return null; }); })
        ]).then(function (respuestas) {
            if (!caja.isConnected) return;
            var agenda = respuestas[0] || {};
            var cupos = respuestas[1] || {};
            cuposActuales = { fechas: {}, horas: [], ocupados: {} };
            (agenda.reglas || []).forEach(function (fila) {
                if (fila.tipo === 'fecha') cuposActuales.fechas[fila.valor] = fila.estado || '';
                if (fila.tipo === 'hora' && fila.estado === 'abierta') cuposActuales.horas.push(fila.valor);
            });
            cuposActuales.horas.sort();
            if (cupos.ok && cupos.cupos) {
                (cupos.cupos.ocupados || []).forEach(function (clave) {
                    var texto = String(clave || '');
                    cuposActuales.ocupados[texto] = true;
                    var dia = texto.slice(0, 10);
                    if (/^\d{4}-\d{2}-\d{2}$/.test(dia)) cuposActuales.ocupados[dia] = true;
                });
            }
            pintarMesCita(caja);
        }).catch(function () {
            if (estado && caja.isConnected) estado.textContent = 'No se pudo cargar el calendario.';
        });
    }

    function pintarMesCita(caja) {
        var mesCampo = caja.querySelector('.sol-cita-mes');
        var dias = caja.querySelector('.sol-cita-dias');
        var estado = caja.querySelector('.sol-cupos-estado');
        if (!mesCampo || !dias || !/^\d{4}-\d{2}$/.test(mesCampo.value)) return;
        var partes = mesCampo.value.split('-');
        var anio = Number(partes[0]);
        var mes = Number(partes[1]);
        var inicio = new Date(anio, mes - 1, 1);
        var desplazamiento = (inicio.getDay() + 6) % 7;
        var total = new Date(anio, mes, 0).getDate();
        var hoy = hoyIso();
        var elegida = caja.getAttribute('data-fecha') || '';
        var html = '';
        var i;
        for (i = 0; i < desplazamiento; i += 1) html += '<span></span>';
        for (var dia = 1; dia <= total; dia += 1) {
            var iso = isoDia(anio, mes, dia);
            var marca = cuposActuales.fechas[iso] || '';
            var cerrado = marca === 'bloqueada' || marca === 'ocupada' || iso < hoy;
            var clase = 'sol-cita-dia';
            if (marca === 'bloqueada') clase += ' sol-cita-no-habil';
            if (marca === 'ocupada') clase += ' sol-cita-ocupada';
            if (iso === elegida) clase += ' sol-cita-activo';
            html += '<button type="button" class="' + clase + '" data-cita-dia="' + iso + '"' + (cerrado ? ' disabled' : '') + ' aria-pressed="' + (iso === elegida ? 'true' : 'false') + '">';
            html += String(dia);
            html += '</button>';
        }
        dias.innerHTML = html;
        if (estado) {
            estado.textContent = elegida
                ? 'Día ' + textoFechaHora(elegida) + '. Elegí la hora.'
                : 'Elegí el día. Los que no están disponibles no se pueden usar.';
        }
        pintarHorasCupo(caja, elegida);
    }

    function pintarHorasCupo(caja, fecha) {
        var horas = caja.querySelector('.sol-cupos-horas');
        var reloj = caja.querySelector('.sol-cita-reloj');
        if (reloj) reloj.hidden = !fecha;
        if (!horas) return;
        if (!fecha) {
            horas.hidden = true;
            horas.innerHTML = '';
            return;
        }
        horas.hidden = !cuposActuales.horas.length;
        var actual = caja.getAttribute('data-hora') || '';
        var propia = caja.getAttribute('data-cupo-propio') || '';
        var html = '';
        cuposActuales.horas.forEach(function (hora) {
            var tomado = cupoOcupado(fecha, hora, propia);
            var activo = !tomado && hora === actual;
            html += '<button type="button" class="sol-cupo' + (tomado ? ' sol-cupo-ocupado' : '') + (activo ? ' sol-cupo-activo' : '') + '" data-cupo-hora="' + escapar(hora) + '"' + (tomado ? ' disabled' : '') + ' aria-pressed="' + (activo ? 'true' : 'false') + '">';
            html += escapar(horaLegible(hora));
            if (tomado) html += ' · Ocupado';
            html += '</button>';
        });
        horas.innerHTML = html;
    }

    function horaDesdeReloj(caja) {
        var campoHora = caja.querySelector('.sol-cita-h12');
        var campoMin = caja.querySelector('.sol-cita-min');
        var pm = caja.querySelector('.sol-cita-periodo[data-periodo="pm"]');
        if (!campoHora || !campoMin) return '';
        var hora = parseInt(campoHora.value, 10);
        var minuto = parseInt(campoMin.value, 10);
        if (!(hora >= 1 && hora <= 12) || !(minuto >= 0 && minuto <= 59)) return '';
        var esPm = pm && pm.getAttribute('aria-pressed') === 'true';
        if (hora === 12) hora = 0;
        if (esPm) hora += 12;
        return String(hora).padStart(2, '0') + ':' + String(minuto).padStart(2, '0');
    }

    function ponerReloj(caja, hora) {
        var partes = String(hora || '').split(':');
        var numero = parseInt(partes[0], 10);
        var campoHora = caja.querySelector('.sol-cita-h12');
        var campoMin = caja.querySelector('.sol-cita-min');
        if (!campoHora || !campoMin || isNaN(numero)) return;
        var esPm = numero >= 12;
        var doce = numero % 12;
        if (doce === 0) doce = 12;
        campoHora.value = String(doce);
        campoMin.value = partes[1] || '00';
        caja.querySelectorAll('.sol-cita-periodo').forEach(function (boton) {
            var activo = boton.getAttribute('data-periodo') === (esPm ? 'pm' : 'am');
            boton.setAttribute('aria-pressed', activo ? 'true' : 'false');
        });
    }

    function textoElegidoCita(caja) {
        var elegido = caja.querySelector('.sol-cupo-elegido');
        if (!elegido) return;
        var fecha = caja.getAttribute('data-fecha') || '';
        var hora = caja.getAttribute('data-hora') || '';
        if (!fecha) {
            elegido.textContent = 'Todavía no elegiste el día.';
            return;
        }
        if (!hora) {
            elegido.textContent = 'Día: ' + textoFechaHora(fecha) + '. Falta la hora.';
            return;
        }
        elegido.textContent = 'Se hará el ' + textoFechaHora(fecha) + ' · ' + horaLegible(hora);
    }

    function aplicarReloj(caja) {
        if (!caja) return;
        var fecha = caja.getAttribute('data-fecha') || '';
        var hora = horaDesdeReloj(caja);
        if (!fecha || !hora) {
            caja.removeAttribute('data-hora');
            pintarHorasCupo(caja, fecha);
            textoElegidoCita(caja);
            return;
        }
        if (cupoOcupado(fecha, hora, caja.getAttribute('data-cupo-propio') || '')) {
            caja.removeAttribute('data-hora');
            pintarHorasCupo(caja, fecha);
            var elegido = caja.querySelector('.sol-cupo-elegido');
            if (elegido) elegido.textContent = 'Esa hora ya está ocupada en ese día.';
            return;
        }
        caja.setAttribute('data-hora', hora);
        pintarHorasCupo(caja, fecha);
        textoElegidoCita(caja);
    }

    function elegirDiaCita(boton) {
        var caja = boton.closest('.sol-cupos');
        if (!caja || boton.disabled) return;
        var fecha = boton.getAttribute('data-cita-dia') || '';
        caja.setAttribute('data-fecha', fecha);
        caja.removeAttribute('data-hora');
        pintarMesCita(caja);
        aplicarReloj(caja);
    }

    function elegirCupo(boton) {
        var caja = boton.closest('.sol-cupos');
        if (!caja) return;
        var hora = boton.getAttribute('data-cupo-hora');
        if (!hora) return;
        ponerReloj(caja, hora);
        caja.setAttribute('data-hora', hora);
        pintarHorasCupo(caja, caja.getAttribute('data-fecha') || '');
        textoElegidoCita(caja);
    }

    function htmlResponder(estadoActual, texto, oculto, pedirFecha) {
        var elegido = estadoActual === 'aceptada' || estadoActual === 'rechazada' || estadoActual === 'neutral'
            ? estadoActual
            : 'neutral';
        var html = '<div class="sol-responder"' + (oculto ? ' hidden' : '') + '>';
        html += '<p class="sol-decision-label">Decisión</p>';
        html += '<div class="sol-decisiones" role="group" aria-label="Decisión">';
        html += '<button type="button" class="sol-chip" data-estado="aceptada" aria-pressed="' + (elegido === 'aceptada' ? 'true' : 'false') + '">Aceptar</button>';
        html += '<button type="button" class="sol-chip" data-estado="rechazada" aria-pressed="' + (elegido === 'rechazada' ? 'true' : 'false') + '">Rechazar</button>';
        html += '<button type="button" class="sol-chip" data-estado="neutral" aria-pressed="' + (elegido === 'neutral' ? 'true' : 'false') + '">Sin decisión</button>';
        html += '</div>';
        if (pedirFecha) {
            html += '<div class="sol-cupos">';
            html += '<p class="sol-decision-label">Cuándo se hará</p>';
            html += '<p class="asistente-nota">Elegí el mes, el día y la hora. Si el día no está disponible, no se ofrece. Si no la aceptás, esa hora queda libre.</p>';
            html += '<label class="asistente-label" for="sol-cita-mes">Mes';
            html += '<input id="sol-cita-mes" class="sol-cita-mes" type="month">';
            html += '</label>';
            html += '<div class="sol-cita-semana" aria-hidden="true"><span>L</span><span>M</span><span>M</span><span>J</span><span>V</span><span>S</span><span>D</span></div>';
            html += '<div class="sol-cita-dias" role="group" aria-label="Días del mes"></div>';
            html += '<p class="sol-cupos-estado">Un momento, estamos preparando el mes.</p>';
            html += '<div class="sol-cupos-horas" role="group" aria-label="Horas guardadas" hidden></div>';
            html += '<div class="sol-cita-reloj" hidden>';
            html += '<label>Hora <input class="sol-cita-h12" inputmode="numeric" maxlength="2" value="7" autocomplete="off"></label>';
            html += '<label>Minutos <input class="sol-cita-min" inputmode="numeric" maxlength="2" value="00" autocomplete="off"></label>';
            html += '<div class="sol-cita-periodo-grupo" role="group" aria-label="a. m. o p. m.">';
            html += '<button type="button" class="sol-cita-periodo" data-periodo="am" aria-pressed="true">a. m.</button>';
            html += '<button type="button" class="sol-cita-periodo" data-periodo="pm" aria-pressed="false">p. m.</button>';
            html += '</div></div>';
            html += '<p class="sol-cupo-elegido">Todavía no elegiste el día.</p>';
            html += '</div>';
        }
        html += '<label class="asistente-label" for="sol-ficha-mensaje">Mensaje de la respuesta';
        html += '<textarea id="sol-ficha-mensaje" class="sol-mensaje" rows="5" maxlength="4000" placeholder="Escribí con claridad qué se acepta, qué se rechaza o la información que necesitás dar.">' + escapar(texto || '') + '</textarea>';
        html += '</label>';
        html += '<button type="button" class="btn-atajo sol-enviar">Vista previa y guardar</button>';
        html += '</div>';
        return html;
    }

    function claveReciente(fila) {
        var creado = String(fila.creado_en || '').trim().replace('T', ' ');
        if (creado) return creado;
        return (String(fila.fecha || '') + ' ' + String(fila.hora || '')).trim();
    }

    function textoFechaHora(valor) {
        var limpio = String(valor || '').trim().replace('T', ' ');
        var partes = limpio.match(/^(\d{4})-(\d{2})-(\d{2})(?: (\d{2}):(\d{2}))?/);
        if (!partes) return limpio;
        var meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
        var mes = meses[parseInt(partes[2], 10) - 1] || '';
        var texto = parseInt(partes[3], 10) + ' ' + mes + ' ' + partes[1];
        if (!partes[4]) return texto;
        var hora = parseInt(partes[4], 10);
        var sufijo = hora >= 12 ? 'p. m.' : 'a. m.';
        var doce = hora % 12;
        if (doce === 0) doce = 12;
        return texto + ' · ' + doce + ':' + partes[5] + ' ' + sufijo;
    }

    function htmlConsultaReciente(tipo, fila) {
        var nombre = tipo === 'cita' ? (fila.persona || 'Sin nombre') : (fila.nombre || 'Sin nombre');
        var cuando = textoFechaHora(claveReciente(fila));
        var seccion = tipo === 'cita' ? 'Citas' : (tipo === 'afilacion' ? 'Afiliaciones' : 'Contacto');
        var html = '<li class="inicio-card inicio-card-cita inicio-card-enlace" data-admin-nav="' + escapar(tipo) + '" role="button" tabindex="0"';
        html += ' aria-label="' + escapar(nombre + (cuando ? ', ' + cuando : '') + '. Abrir en ' + seccion) + '">';
        html += '<div class="inicio-card-cuerpo">';
        html += '<strong>' + escapar(nombre) + '</strong>';
        if (cuando) html += '<p class="inicio-card-meta">' + escapar(cuando) + '</p>';
        html += '</div></li>';
        return html;
    }

    function pintarLista(tipo) {
        var caja = listas[tipo];
        if (!caja) return;
        var todas = datos[tipo] || [];
        var filas = filasFiltradas(tipo);
        var hayFiltro = !!normalizarBusqueda(filtrosBusqueda[tipo] || '');
        if (!todas.length) {
            caja.innerHTML = '<p class="vacio-bloque">' + (tipo === 'cita'
                ? 'Todavía no hay citas.'
                : 'No hay solicitudes de este tipo todavía.') + '</p>';
            return;
        }
        if (!filas.length) {
            caja.innerHTML = '<p class="vacio-bloque">' + (hayFiltro
                ? 'No hay resultados para esa búsqueda.'
                : (tipo === 'cita' ? 'Todavía no hay citas.' : 'No hay solicitudes de este tipo todavía.')) + '</p>';
            return;
        }
        var html = '<ul class="rejilla-casillas sol-rejilla">';
        filas.forEach(function (fila) {
            var id = String(fila.id);
            var estado = fila.estado || 'pendiente';
            var tieneCuenta = parseInt(fila.cuenta_web, 10) === 1;
            var nombre = tipo === 'cita' ? (fila.persona || 'Sin nombre') : (fila.nombre || 'Sin nombre');
            var cuando = tipo === 'cita'
                ? (fila.fecha ? textoFechaHora([fila.fecha, fila.hora].filter(Boolean).join(' ')) : '')
                : textoFechaHora(fila.creado_en || '');
            var estadoTexto = textoEstadoFila(fila);
            html += '<li class="sol-item sol-fila" data-sol-id="' + escapar(id) + '" data-sol-tipo="' + escapar(tipo) + '" data-sol-cuenta="' + (tieneCuenta ? '1' : '0') + '">';
            html += '<button type="button" class="sol-tarjeta" aria-label="' + escapar(nombre + (cuando ? ', ' + cuando : '') + '. ' + estadoTexto) + '">';
            html += '<span class="sol-fila-texto">';
            html += '<span class="casilla-titulo">' + escapar(nombre) + '</span>';
            if (cuando) html += '<span class="sol-tapa-fecha">' + escapar(cuando) + '</span>';
            html += '</span>';
            html += '<span class="sol-badge ' + claseEstado(estado) + '">' + escapar(estadoTexto) + '</span>';
            html += '</button></li>';
        });
        html += '</ul>';
        caja.innerHTML = html;
    }

    function eliminarConsulta(item) {
        var tipo = item.getAttribute('data-sol-tipo');
        var id = parseInt(item.getAttribute('data-sol-id'), 10);
        if (!tipo || !(id > 0)) return;
        pedirConfirmacion('Quitar para siempre', '¿Querés quitar esta solicitud para siempre? No se puede deshacer.').then(function (aceptado) {
        if (!aceptado) return;
        mostrarAviso('Eliminando…');
        var cuerpo = new FormData();
        cuerpo.append('token', token());
        cuerpo.append('accion', 'eliminar_consulta');
        cuerpo.append('tipo', tipo);
        cuerpo.append('id', String(id));
        fetch('solicitudes.php', { method: 'POST', body: cuerpo, credentials: 'same-origin' })
            .then(function (r) { return r.json().catch(function () { return null; }); })
            .then(function (json) {
                if (!json || !json.ok) {
                    throw new Error((json && json.mensaje) || 'No se pudo eliminar.');
                }
                mostrarAviso(json.mensaje || 'Consulta eliminada.');
                quitarConsultaLocal(tipo, id);
                cerrarFicha();
                cargado = false;
                return cargar(true);
            })
            .catch(function (err) {
                mostrarAviso(err.message || 'No se pudo eliminar.', true);
            });
        });
    }

    var popupAfiliado = document.getElementById('popup-afiliado');
    var formAfiliado = document.getElementById('form-afiliado');
    var guardandoAfiliado = false;

    function abrirPopupAfiliado() {
        if (!popupAfiliado) return;
        popupAfiliado.hidden = false;
        document.body.classList.add('asistente-abierto');
        requestAnimationFrame(function () {
            popupAfiliado.classList.add('asistente-visible');
        });
        var cedula = document.getElementById('afiliado-cedula');
        if (cedula) cedula.focus();
    }

    function cerrarPopupAfiliado() {
        if (!popupAfiliado || popupAfiliado.hidden) return;
        popupAfiliado.classList.remove('asistente-visible');
        document.body.classList.remove('asistente-abierto');
        window.setTimeout(function () {
            popupAfiliado.hidden = true;
        }, 280);
    }

    function eliminarAfiliado(id) {
        var idNum = parseInt(id, 10);
        if (!(idNum > 0) || guardandoAfiliado) return;
        pedirConfirmacion('Quitar a esta persona', '¿Querés quitar a esta persona? Ya no podrá pedir cita con esos datos.').then(function (aceptado) {
            if (!aceptado) return;
            guardandoAfiliado = true;
            var cuerpo = new FormData();
            cuerpo.append('token', token());
            cuerpo.append('accion', 'eliminar_afiliado');
            cuerpo.append('id', String(idNum));
            fetch('solicitudes.php', { method: 'POST', body: cuerpo, credentials: 'same-origin' })
                .then(function (r) { return r.json().catch(function () { return null; }); })
                .then(function (json) {
                    guardandoAfiliado = false;
                    if (!json || !json.ok) {
                        throw new Error((json && json.mensaje) || 'No se pudo eliminar.');
                    }
                    mostrarAviso(json.mensaje || 'Afiliado eliminado.');
                    datos.afiliados = (datos.afiliados || []).filter(function (fila) {
                        return parseInt(fila.id, 10) !== idNum;
                    });
                    pintarAfiliados();
                    cerrarFicha();
                })
                .catch(function (err) {
                    guardandoAfiliado = false;
                    mostrarAviso(err.message || 'No se pudo eliminar.', true);
                });
        });
    }

    function pintarAfiliados() {
        if (!listaAfiliados) return;
        var todas = datos.afiliados || [];
        var filas = filasFiltradas('afiliados');
        var hayFiltro = !!normalizarBusqueda(filtrosBusqueda.afiliados || '');
        if (!todas.length) {
            listaAfiliados.innerHTML = '<p class="vacio-bloque">Todavía no hay afiliados. Usá Añadir afiliado para registrar cédula, nombre y correo.</p>';
            return;
        }
        if (!filas.length) {
            listaAfiliados.innerHTML = '<p class="vacio-bloque">' + (hayFiltro
                ? 'No hay afiliados que coincidan con esa búsqueda.'
                : 'Todavía no hay afiliados. Usá Añadir afiliado para registrar cédula, nombre y correo.') + '</p>';
            return;
        }
        var icono = '<span class="afiliado-icono" aria-hidden="true"><svg viewBox="0 0 24 24" focusable="false"><circle cx="12" cy="8" r="3.5" fill="currentColor"/><path fill="currentColor" d="M5 19.4c.5-3.5 3.2-5.3 7-5.3s6.5 1.8 7 5.3c.1.4-.2.8-.6.8H5.6c-.4 0-.7-.4-.6-.8z"/></svg></span>';
        var html = '<ul class="rejilla-casillas sol-rejilla">';
        filas.forEach(function (fila) {
            var id = String(fila.id);
            var nombre = fila.nombre_completo || 'Sin nombre';
            html += '<li class="sol-item afiliado-casilla" data-sol-id="' + escapar(id) + '" data-sol-tipo="afiliados">';
            html += '<button type="button" class="sol-tarjeta" aria-label="' + escapar(nombre) + '">';
            html += icono;
            html += '<span class="afiliado-nombre">' + escapar(nombre) + '</span>';
            html += '</button></li>';
        });
        html += '</ul>';
        listaAfiliados.innerHTML = html;
    }

    function cargar(silencioso, sinAviso) {
        if (!silencioso) {
            Object.keys(listas).forEach(function (clave) {
                if (listas[clave]) listas[clave].innerHTML = '<p class="vacio-bloque">Un momento, por favor.</p>';
            });
            if (listaAfiliados) listaAfiliados.innerHTML = '<p class="vacio-bloque">Un momento, por favor.</p>';
        }
        return fetch('solicitudes.php?tipo=todas', { cache: 'no-store', credentials: 'same-origin' })
            .then(function (r) { return r.json().catch(function () { return null; }); })
            .then(function (json) {
                if (!json || !json.ok || !json.datos) {
                    throw new Error((json && json.mensaje) || 'No se pudieron cargar las solicitudes.');
                }
                datos.contacto = json.datos.contacto || [];
                datos.cita = json.datos.cita || [];
                datos.afilacion = json.datos.afilacion || [];
                datos.afiliados = json.datos.afiliados || [];
                pintarLista('contacto');
                pintarLista('cita');
                pintarLista('afilacion');
                pintarAfiliados();
                pintarInicio();
                if (popupPapelera && !popupPapelera.hidden) pintarPapelera();
                sincronizarAdvertencias();
                cargado = true;
            })
            .catch(function (err) {
                if (!silencioso) {
                    Object.keys(listas).forEach(function (clave) {
                        if (listas[clave]) listas[clave].innerHTML = '<p class="vacio-bloque">No se pudo cargar.</p>';
                    });
                    if (listaAfiliados) listaAfiliados.innerHTML = '<p class="vacio-bloque">No se pudo cargar.</p>';
                    if (inicioCitas) inicioCitas.innerHTML = '<p class="vacio-bloque">No se pudo cargar.</p>';
                    if (notaPapeleraInicio) notaPapeleraInicio.textContent = 'No se pudo cargar';
                }
                /* Si ya habia datos locales (p. ej. tras responder), se mantienen los pendientes. */
                pintarInicio();
                if (!sinAviso) mostrarAviso(err.message || 'No se pudieron cargar las solicitudes.', true);
            });
    }

    var avisosConocidos = null;

    function claveAviso(tipo, fila) {
        return tipo + ':' + String(fila.id);
    }

    function textoAviso(tipo, fila) {
        var nombre = tipo === 'cita' ? 'Consulta de cita' : (tipo === 'afilacion' ? 'Consulta de afiliación' : 'Consulta de contacto');
        var cuando = textoFechaHora(claveReciente(fila));
        return cuando ? (nombre + ' · ' + cuando) : nombre;
    }

    function sincronizarAdvertencias() {
        /* La campana se llena desde notificaciones.php. */
    }

    var firmaAvisos = '';
    var avisosListos = false;
    var notasVistas = null;

    function formatearCuandoNota(cuando) {
        var m = String(cuando || '').match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/);
        if (!m) return String(cuando || '');
        return m[3] + '/' + m[2] + '/' + m[1] + ' · ' + m[4] + ':' + m[5];
    }

    function textoNota(aviso) {
        var cuando = formatearCuandoNota(aviso.cuando);
        return (aviso.titulo || aviso.texto || 'Aviso') + (cuando ? ' · ' + cuando : '');
    }

    function pintarNotas(json, avisar) {
        if (!window.adminSincronizarConsultas) return;
        var lista = (json.avisos || []).map(function (aviso) {
            return {
                tipo: aviso.tipo,
                id: aviso.origen_id,
                marca: aviso.marca,
                leido: aviso.leido === 1 || aviso.leido === true,
                titulo: aviso.titulo || '',
                detalle: aviso.texto || '',
                cuando: aviso.cuando || '',
                texto: textoNota(aviso)
            };
        });
        window.adminSincronizarConsultas(lista, avisar, json.no_leidas);
    }

    function marcarNota(tipo, id, marca, todas) {
        if (!tokenCampo) return;
        var cuerpo = new FormData();
        cuerpo.append('token', tokenCampo.value || '');
        cuerpo.append('accion', todas ? 'leidas' : 'leida');
        if (!todas) {
            cuerpo.append('tipo', tipo || '');
            cuerpo.append('id', id || '');
            cuerpo.append('marca', marca || '');
        }
        fetch('notificaciones.php', { method: 'POST', body: cuerpo, credentials: 'same-origin', cache: 'no-store' })
            .then(function (r) { return r.json().catch(function () { return null; }); })
            .then(function (json) {
                if (!json || !json.ok) return;
                firmaAvisos = json.firma || firmaAvisos;
                pintarNotas(json, false);
            })
            .catch(function () {});
    }

    window.adminMarcarNotificacion = function (tipo, id, marca) {
        marcarNota(tipo, id, marca, false);
    };

    function mostrarNotaEsquina(texto, tipo) {
        if (!texto) return;
        var caja = document.getElementById('admin-notas-flotantes');
        if (!caja) {
            caja = document.createElement('div');
            caja.id = 'admin-notas-flotantes';
            caja.className = 'sit-notas';
            caja.setAttribute('aria-live', 'polite');
            document.body.appendChild(caja);
        }
        var nota = document.createElement('p');
        nota.className = 'sit-nota sit-nota-' + (tipo || 'cita');
        nota.textContent = texto;
        caja.appendChild(nota);
        window.setTimeout(function () {
            nota.classList.add('sit-nota-sale');
            window.setTimeout(function () {
                if (nota.parentNode) nota.parentNode.removeChild(nota);
            }, 280);
        }, 5600);
    }

    function consultarNotas() {
        if (document.hidden) return;
        fetch('notificaciones.php', { credentials: 'same-origin', cache: 'no-store' })
            .then(function (r) { return r.json().catch(function () { return null; }); })
            .then(function (json) {
                if (!json || !json.ok) return;
                var cambio = avisosListos && json.firma && json.firma !== firmaAvisos;
                var primeras = !avisosListos;
                firmaAvisos = json.firma || '';
                avisosListos = true;
                if (!primeras && (cambio || !cargado)) cargar(true, true);
                var nuevas = [];
                if (!primeras) {
                    (json.avisos || []).forEach(function (aviso) {
                        if (aviso.leido) return;
                        var clave = aviso.tipo + ':' + aviso.origen_id + ':' + aviso.marca;
                        if (!notasVistas || notasVistas.indexOf(clave) === -1) nuevas.push(aviso);
                    });
                }
                notasVistas = (json.avisos || []).map(function (aviso) {
                    return aviso.tipo + ':' + aviso.origen_id + ':' + aviso.marca;
                });
                pintarNotas(json, nuevas.length > 0);
                nuevas.slice(0, 3).forEach(function (aviso) {
                    mostrarNotaEsquina(textoNota(aviso), aviso.tipo);
                });
            })
            .catch(function () {});
    }

    window.adminAbrirConsulta = function (tipo, id) {
        if (!vistas[tipo]) return;
        var misma = vistaActiva === tipo;
        mostrarVista(tipo);
        window.setTimeout(function () {
            abrirFicha(tipo, id);
        }, misma ? 0 : 860);
    };

    function cerrarMenuMovil() {
        if (!menu || !btnMenu) return;
        menu.classList.remove('activo');
        btnMenu.classList.remove('abierto');
        btnMenu.setAttribute('aria-expanded', 'false');
        btnMenu.setAttribute('aria-label', 'Abrir menú');
    }

    var cambiandoVista = false;
    var timerVista = null;

    function preferirMenosMovimiento() {
        try {
            return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        } catch (e) {
            return false;
        }
    }

    function aplicarChromeVista(nombre) {
        if (menu) {
            menu.querySelectorAll('[data-admin-nav]').forEach(function (enlace) {
                enlace.classList.toggle('active', enlace.getAttribute('data-admin-nav') === nombre);
            });
        }
        document.querySelectorAll('.admin-logo[data-admin-nav]').forEach(function (enlace) {
            enlace.classList.toggle('active', enlace.getAttribute('data-admin-nav') === nombre);
        });
        if (location.hash.replace('#', '') !== nombre) {
            try { history.replaceState(null, '', '#' + nombre); } catch (e) {}
        }
        var enSeccion = nombre !== 'agenda';
        document.body.classList.toggle('admin-con-atras', enSeccion);
        if (logoAdmin) {
            logoAdmin.setAttribute('aria-label', enSeccion ? 'Volver a Inicio' : 'SITRAINA Administración');
            logoAdmin.setAttribute('title', enSeccion ? 'Volver a Inicio' : 'SITRAINA Administración');
        }
        cerrarMenuMovil();
        if (!cargado) {
            cargar();
        } else if (nombre === 'agenda') {
            pintarInicio();
            /* Al volver a Inicio, revalida pendientes contra el servidor sin vaciar la UI. */
            cargar(true);
        } else if (nombre === 'afiliados') {
            pintarAfiliados();
        } else if (nombre === 'documentacion' || nombre === 'hoja') {
            /* La carga del catálogo ocurre al abrir el explorador. */
        } else if (vistasLista[nombre]) {
            pintarLista(nombre);
        }
    }

    function limpiarClasesVista(el) {
        if (!el) return;
        el.classList.remove('admin-vista-saliendo', 'admin-vista-entrando', 'admin-vista-visible');
    }

    function mostrarVista(nombre) {
        cerrarFicha();
        if (document.body.classList.contains('panel-abogado')) nombre = 'cita';
        if (nombre === 'hoja') nombre = 'documentacion';
        if (!vistas[nombre]) nombre = 'agenda';
        if (cambiandoVista) return;
        if (nombre === vistaActiva) {
            aplicarChromeVista(nombre);
            window.scrollTo({ top: 0, behavior: preferirMenosMovimiento() ? 'auto' : 'smooth' });
            return;
        }

        var anterior = vistas[vistaActiva];
        var siguiente = vistas[nombre];
        if (!siguiente) return;
        var sinMotion = preferirMenosMovimiento();

        if (timerVista) {
            window.clearTimeout(timerVista);
            timerVista = null;
        }

        Object.keys(vistas).forEach(function (clave) {
            if (!vistas[clave] || clave === vistaActiva || clave === nombre) return;
            vistas[clave].hidden = true;
            limpiarClasesVista(vistas[clave]);
        });

        var mostrarSiguiente = function () {
            vistaActiva = nombre;
            if (anterior) {
                anterior.hidden = true;
                limpiarClasesVista(anterior);
            }

            limpiarClasesVista(siguiente);
            if (sinMotion) {
                siguiente.hidden = false;
                siguiente.classList.add('admin-vista-visible');
                cambiandoVista = false;
                aplicarChromeVista(nombre);
                window.scrollTo({ top: 0, behavior: 'auto' });
                return;
            }

            /* Estado inicial fuera de pantalla, luego dispara la entrada. */
            siguiente.classList.add('admin-vista-entrando');
            siguiente.hidden = false;
            void siguiente.offsetWidth;
            requestAnimationFrame(function () {
                requestAnimationFrame(function () {
                    siguiente.classList.remove('admin-vista-entrando');
                    siguiente.classList.add('admin-vista-visible');
                });
            });
            aplicarChromeVista(nombre);
            window.scrollTo({ top: 0, behavior: 'smooth' });
            timerVista = window.setTimeout(function () {
                cambiandoVista = false;
                timerVista = null;
            }, 500);
        };

        cambiandoVista = true;
        if (!anterior || anterior.hidden || sinMotion) {
            mostrarSiguiente();
            return;
        }

        /* Sale Inicio (u otra vista) con animación, después entra la sección. */
        anterior.classList.remove('admin-vista-entrando', 'admin-vista-visible');
        anterior.classList.add('admin-vista-saliendo');
        timerVista = window.setTimeout(mostrarSiguiente, 320);
    }

    function irDesdeStat(destino, boton) {
        if (!destino || !vistas[destino] || cambiandoVista) return;
        if (boton) {
            boton.classList.add('inicio-stat-pulse');
            window.setTimeout(function () {
                boton.classList.remove('inicio-stat-pulse');
            }, 260);
            /* Un instante de feedback en la casilla, luego la transición de página. */
            window.setTimeout(function () {
                mostrarVista(destino);
            }, 90);
            return;
        }
        mostrarVista(destino);
    }

    var btnAbrirAfiliado = document.getElementById('abrir-afiliado');
    var btnCerrarAfiliado = document.getElementById('cerrar-afiliado');
    if (btnAbrirAfiliado) btnAbrirAfiliado.addEventListener('click', abrirPopupAfiliado);
    if (btnCerrarAfiliado) btnCerrarAfiliado.addEventListener('click', cerrarPopupAfiliado);
    if (popupAfiliado) {
        popupAfiliado.addEventListener('click', function (evento) {
            if (evento.target && evento.target.getAttribute('data-cerrar-afiliado') === '1') cerrarPopupAfiliado();
        });
    }
    if (formAfiliado) {
        formAfiliado.addEventListener('submit', function (evento) {
            evento.preventDefault();
            if (guardandoAfiliado) return;
            var cedula = ((document.getElementById('afiliado-cedula') || {}).value || '').replace(/\D/g, '');
            var nombre = ((document.getElementById('afiliado-nombre') || {}).value || '').trim();
            var correo = ((document.getElementById('afiliado-correo') || {}).value || '').trim();
            if (!/^[0-9]{9}$/.test(cedula)) {
                mostrarAviso('La cédula debe tener 9 dígitos.', true);
                return;
            }
            if (!nombre) {
                mostrarAviso('Escribí el nombre completo.', true);
                return;
            }
            guardandoAfiliado = true;
            var cuerpo = new FormData();
            cuerpo.append('token', token());
            cuerpo.append('accion', 'agregar_afiliado');
            cuerpo.append('cedula', cedula);
            cuerpo.append('nombre_completo', nombre);
            cuerpo.append('correo', correo);
            fetch('solicitudes.php', { method: 'POST', body: cuerpo, credentials: 'same-origin' })
                .then(function (r) { return r.json().catch(function () { return null; }); })
                .then(function (json) {
                    guardandoAfiliado = false;
                    if (!json || !json.ok) {
                        throw new Error((json && json.mensaje) || 'No se pudo guardar.');
                    }
                    mostrarAviso(json.mensaje || 'Afiliado registrado.');
                    formAfiliado.reset();
                    cerrarPopupAfiliado();
                    cargado = false;
                    return cargar(true);
                })
                .catch(function (err) {
                    guardandoAfiliado = false;
                    mostrarAviso(err.message || 'No se pudo guardar.', true);
                });
        });
    }
    document.addEventListener('keydown', function (evento) {
        if (evento.key === 'Escape' && popupAfiliado && !popupAfiliado.hidden) cerrarPopupAfiliado();
    });

    if (listaAfiliados) {
        listaAfiliados.addEventListener('click', function (evento) {
            var tarjeta = evento.target.closest('.sol-tarjeta');
            if (!tarjeta) return;
            var item = tarjeta.closest('.sol-item');
            if (!item) return;
            abrirFicha(item.getAttribute('data-sol-tipo'), item.getAttribute('data-sol-id'));
        });
    }

    if (btnAbrirPapelera) {
        btnAbrirPapelera.addEventListener('click', function () {
            abrirPapelera();
        });
    }
    if (btnCerrarPapelera) {
        btnCerrarPapelera.addEventListener('click', function () {
            cerrarPapelera();
        });
    }
    if (btnBorrarPapelera) {
        btnBorrarPapelera.addEventListener('click', function () {
            borrarSeleccionPapelera();
        });
    }
    if (checkTodas) {
        checkTodas.addEventListener('change', function () {
            if (!listaPapelera) return;
            var marcar = !!checkTodas.checked;
            listaPapelera.querySelectorAll('.papelera-check').forEach(function (c) {
                c.checked = marcar;
            });
            actualizarSeleccionPapelera();
        });
    }
    if (popupPapelera) {
        popupPapelera.addEventListener('click', function (evento) {
            if (evento.target.closest('[data-cerrar-papelera]')) {
                cerrarPapelera();
                return;
            }
            if (evento.target.closest('.papelera-check-wrap')) {
                window.setTimeout(actualizarSeleccionPapelera, 0);
                return;
            }
            var tapa = evento.target.closest('.papelera-tapa');
            if (tapa) {
                var casilla = tapa.closest('.papelera-casilla');
                var detalle = casilla && casilla.querySelector('.papelera-detalle');
                if (!detalle) return;
                var abierta = tapa.getAttribute('aria-expanded') === 'true';
                tapa.setAttribute('aria-expanded', abierta ? 'false' : 'true');
                detalle.hidden = abierta;
                casilla.classList.toggle('papelera-abierta', !abierta);
            }
        });
        popupPapelera.addEventListener('change', function (evento) {
            if (evento.target.classList.contains('papelera-check')) {
                actualizarSeleccionPapelera();
            }
        });
    }
    document.addEventListener('keydown', function (evento) {
        if (evento.key === 'Escape' && popupPapelera && !popupPapelera.hidden) {
            cerrarPapelera();
        }
    });

    function cerrarFicha() {
        var caja = document.getElementById('sol-ficha');
        if (caja) caja.hidden = true;
    }

    function abrirFicha(tipo, id) {
        var lista = tipo === 'afiliados' ? (datos.afiliados || []) : (datos[tipo] || []);
        var fila = null;
        lista.forEach(function (item) {
            if (String(item.id) === String(id)) fila = item;
        });
        var caja = document.getElementById('sol-ficha');
        var titulo = document.getElementById('sol-ficha-titulo');
        var tipoNodo = document.getElementById('sol-ficha-tipo');
        var meta = document.getElementById('sol-ficha-meta');
        var acciones = document.getElementById('sol-ficha-acciones');
        if (!fila || !caja || !meta || !acciones) return;
        var estado = fila.estado || 'pendiente';
        var ya = tipo !== 'afiliados' && estado !== 'pendiente';
        var tieneCuenta = parseInt(fila.cuenta_web, 10) === 1;
        caja.setAttribute('data-sol-tipo', tipo);
        caja.setAttribute('data-sol-id', String(id));
        caja.setAttribute('data-sol-cuenta', tieneCuenta ? '1' : '0');
        caja.setAttribute('data-sol-editar', '0');
        caja.classList.toggle('sol-ficha-cita', tipo === 'cita');
        if (tipoNodo) tipoNodo.textContent = tipo === 'afiliados' ? 'Afiliado' : etiquetaTipo(tipo);
        if (titulo) {
            titulo.textContent = tipo === 'afiliados'
                ? ((fila.nombre_completo || 'Sin nombre') + (fila.cedula ? ' · ' + fila.cedula : ''))
                : tituloFila(tipo, fila);
        }
        var partes = tipo === 'afiliados'
            ? [
                { et: 'Nombre', val: fila.nombre_completo || '—' },
                { et: 'Cédula', val: fila.cedula || '—' },
                { et: 'Correo', val: fila.correo || '—' }
            ]
            : metaFila(tipo, fila);
        if (tipo === 'afiliados' && fila.creado_en) partes.push({ et: 'Registrado', val: fila.creado_en });
        var html = '';
        if (tipo === 'cita') {
            html = htmlGruposCita(fila, estado);
        } else {
            if (tipo !== 'afiliados') {
                html += '<p class="sol-badge ' + claseEstado(estado) + '">' + escapar(textoEstadoFila(fila)) + '</p>';
            }
            partes.forEach(function (m) {
                html += '<p class="item-meta-fila"><span class="item-meta-etiqueta">' + escapar(m.et) + '</span>';
                html += '<span class="item-meta-valor">' + escapar(m.val) + '</span></p>';
            });
        }
        meta.innerHTML = html;
        var acc = '';
        if (tipo === 'afiliados') {
            acc += '<button type="button" class="btn-atajo btn-atajo-secundario sol-eliminar-afiliado">Quitar para siempre</button>';
        } else {
            if (!tieneCuenta) {
                acc += '<p class="sol-sin-cuenta">No se envió con la cuenta iniciada: la respuesta queda en el panel, no en Mis mensajes.</p>';
            }
            var pedirHorario = tipo === 'cita' && estado !== 'aceptada';
            if (ya) {
                acc += htmlResponder(estado, fila.respuesta || '', true, pedirHorario);
                acc += '<div class="sol-acciones-pie">';
                acc += '<button type="button" class="btn-atajo sol-editar">Editar</button>';
                acc += '<button type="button" class="btn-atajo btn-atajo-secundario sol-eliminar">Quitar para siempre</button>';
                acc += '</div>';
            } else {
                acc += htmlResponder('neutral', '', false, tipo === 'cita');
                acc += '<button type="button" class="btn-atajo btn-atajo-secundario sol-eliminar">Quitar para siempre</button>';
            }
        }
        acciones.innerHTML = acc;
        var cuposCaja = acciones.querySelector('.sol-cupos');
        if (cuposCaja && tipo === 'cita' && fila.fecha && !String(fila.cancelado_en || '').trim() && (fila.estado || '') !== 'rechazada') {
            cuposCaja.setAttribute('data-cupo-propio', String(fila.fecha).slice(0, 10));
        }
        if (cuposCaja) iniciarCupos(cuposCaja);
        caja.hidden = false;
        var foco = caja.querySelector('.sol-ficha-cerrar');
        if (foco) foco.focus();
    }

    function estadoElegido(bloque) {
        var activo = bloque.querySelector('.sol-chip[aria-pressed="true"]');
        return activo ? activo.getAttribute('data-estado') : 'neutral';
    }

    var previewPendiente = null;

    function cerrarPreview() {
        var caja = document.getElementById('sol-preview');
        if (caja) caja.hidden = true;
        previewPendiente = null;
    }

    function abrirPreview(item) {
        var tipo = item.getAttribute('data-sol-tipo');
        var id = item.getAttribute('data-sol-id');
        var bloque = item.querySelector('.sol-responder');
        var textarea = item.querySelector('.sol-mensaje');
        if (!bloque || !textarea) return;
        var estado = estadoElegido(bloque);
        var mensaje = (textarea.value || '').trim();
        if (!mensaje) {
            mostrarAviso('Escribí el mensaje de respuesta.', true);
            textarea.focus();
            return;
        }
        var fechaAsignada = '';
        var horaAsignada = '';
        var cupos = item.querySelector('.sol-cupos');
        if (estado === 'aceptada' && cupos) {
            fechaAsignada = cupos.getAttribute('data-fecha') || '';
            horaAsignada = cupos.getAttribute('data-hora') || '';
            if (!/^\d{4}-\d{2}-\d{2}$/.test(fechaAsignada) || !/^\d{2}:\d{2}$/.test(horaAsignada)) {
                mostrarAviso('Elegí un día disponible y una hora libre.', true);
                return;
            }
        }
        previewPendiente = { item: item, tipo: tipo, id: id, estado: estado, mensaje: mensaje, fecha: fechaAsignada, hora: horaAsignada };
        var caja = document.getElementById('sol-preview');
        var estadoNodo = document.getElementById('sol-preview-estado');
        var cuentaNodo = document.getElementById('sol-preview-cuenta');
        var cuerpoNodo = document.getElementById('sol-preview-cuerpo');
        if (estadoNodo) estadoNodo.textContent = etiquetaEstado(estado);
        if (cuentaNodo) {
            cuentaNodo.textContent = item.getAttribute('data-sol-cuenta') === '1'
                ? 'Llega a Mis mensajes porque la persona ya había iniciado sesión con esa cuenta.'
                : 'No se envió con la cuenta iniciada: solo queda en el panel.';
            if (item.getAttribute('data-sol-editar') === '1') {
                cuentaNodo.textContent += ' Al guardar, el mensaje lleva la etiqueta Editado.';
            }
        }
        if (cuerpoNodo) {
            var extraCita = '';
            if (estado === 'aceptada' && fechaAsignada && horaAsignada && mensaje.toLowerCase().indexOf('cita confirmada para el') === -1) {
                extraCita = '\n\nCita confirmada para el ' + textoFechaHora(fechaAsignada + ' ' + horaAsignada) + '.';
            }
            cuerpoNodo.textContent = mensaje + extraCita;
        }
        if (caja) caja.hidden = false;
    }

    function enviar(item, estado, mensaje) {
        if (enviando) return;
        var tipo = item.getAttribute('data-sol-tipo');
        var id = item.getAttribute('data-sol-id');
        enviando = true;
        mostrarAviso('Guardando…');
        var cuerpo = new FormData();
        cuerpo.append('token', token());
        cuerpo.append('tipo', tipo);
        cuerpo.append('id', id);
        cuerpo.append('estado', estado);
        cuerpo.append('respuesta', mensaje);
        if (item.getAttribute('data-sol-editar') === '1') {
            cuerpo.append('editar', '1');
        }
        if (estado === 'aceptada' && previewPendiente && previewPendiente.fecha && previewPendiente.hora) {
            cuerpo.append('fecha_asignada', previewPendiente.fecha);
            cuerpo.append('hora_asignada', previewPendiente.hora);
        }
        fetch('solicitudes.php', { method: 'POST', body: cuerpo, credentials: 'same-origin' })
            .then(function (r) { return r.json().catch(function () { return null; }); })
            .then(function (json) {
                enviando = false;
                if (!json || !json.ok) {
                    throw new Error((json && json.mensaje) || 'No se pudo enviar.');
                }
                mostrarAviso(json.mensaje || 'Respuesta guardada.');
                if (tipo === 'cita' && (json.estado || estado) === 'aceptada') {
                    document.dispatchEvent(new CustomEvent('sitraina-agenda-actualizar'));
                }
                cerrarPreview();
                cerrarFicha();
                aplicarEstadoLocal(tipo, id, json.estado || estado, {
                    respuesta: mensaje,
                    respondido_en: new Date().toISOString(),
                    editado: item.getAttribute('data-sol-editar') === '1' ? 1 : 0
                });
                cargado = false;
                return cargar(true);
            })
            .catch(function (err) {
                enviando = false;
                mostrarAviso(err.message || 'No se pudo enviar.', true);
            });
    }

    document.addEventListener('click', function (evento) {
        var nav = evento.target.closest('[data-admin-nav]');
        if (nav) {
            evento.preventDefault();
            var destino = nav.getAttribute('data-admin-nav');
            if (nav.classList.contains('inicio-stat')) {
                irDesdeStat(destino, nav);
            } else {
                mostrarVista(destino);
            }
            return;
        }
        if (btnMenu && (evento.target === btnMenu || btnMenu.contains(evento.target))) {
            var abierto = menu && menu.classList.toggle('activo');
            btnMenu.classList.toggle('abierto', !!abierto);
            btnMenu.setAttribute('aria-expanded', abierto ? 'true' : 'false');
            btnMenu.setAttribute('aria-label', abierto ? 'Cerrar menú' : 'Abrir menú');
            return;
        }
        if (menu && menu.classList.contains('activo') && !evento.target.closest('.admin-header')) {
            cerrarMenuMovil();
        }
    });

    Object.keys(listas).forEach(function (clave) {
        var caja = listas[clave];
        if (!caja) return;
        caja.addEventListener('click', function (evento) {
            var tarjeta = evento.target.closest('.sol-tarjeta');
            if (!tarjeta) return;
            var item = tarjeta.closest('.sol-item');
            if (!item) return;
            abrirFicha(item.getAttribute('data-sol-tipo'), item.getAttribute('data-sol-id'));
        });
    });

    var fichaCaja = document.getElementById('sol-ficha');
    if (fichaCaja) {
        fichaCaja.addEventListener('click', function (evento) {
            if (evento.target === fichaCaja || evento.target.closest('.sol-ficha-cerrar')) {
                cerrarFicha();
                return;
            }
            var diaCita = evento.target.closest('.sol-cita-dia');
            if (diaCita && !diaCita.disabled) {
                elegirDiaCita(diaCita);
                return;
            }
            var periodo = evento.target.closest('.sol-cita-periodo');
            if (periodo) {
                var grupoPeriodo = periodo.parentNode;
                if (grupoPeriodo) {
                    grupoPeriodo.querySelectorAll('.sol-cita-periodo').forEach(function (boton) {
                        boton.setAttribute('aria-pressed', boton === periodo ? 'true' : 'false');
                    });
                }
                aplicarReloj(periodo.closest('.sol-cupos'));
                return;
            }
            var cupo = evento.target.closest('.sol-cupo');
            if (cupo && !cupo.disabled) {
                elegirCupo(cupo);
                return;
            }
            var chip = evento.target.closest('.sol-chip');
            if (chip) {
                var grupo = chip.closest('.sol-decisiones');
                if (!grupo) return;
                grupo.querySelectorAll('.sol-chip').forEach(function (c) {
                    c.setAttribute('aria-pressed', c === chip ? 'true' : 'false');
                });
                return;
            }
            if (evento.target.closest('.sol-editar')) {
                var formulario = fichaCaja.querySelector('.sol-responder');
                var botonEditar = fichaCaja.querySelector('.sol-editar');
                fichaCaja.setAttribute('data-sol-editar', '1');
                if (formulario) formulario.hidden = false;
                if (botonEditar) botonEditar.hidden = true;
                var area = fichaCaja.querySelector('.sol-mensaje');
                if (area) area.focus();
                return;
            }
            if (evento.target.closest('.sol-enviar')) {
                abrirPreview(fichaCaja);
                return;
            }
            if (evento.target.closest('.sol-eliminar-afiliado')) {
                eliminarAfiliado(fichaCaja.getAttribute('data-sol-id'));
                return;
            }
            if (evento.target.closest('.sol-eliminar')) {
                eliminarConsulta(fichaCaja);
            }
        });
        fichaCaja.addEventListener('input', function (evento) {
            var caja = evento.target.closest('.sol-cupos');
            if (!caja) return;
            if (evento.target.classList.contains('sol-cita-mes')) {
                caja.removeAttribute('data-fecha');
                caja.removeAttribute('data-hora');
                pintarMesCita(caja);
                return;
            }
            if (evento.target.classList.contains('sol-cita-h12') || evento.target.classList.contains('sol-cita-min')) {
                aplicarReloj(caja);
            }
        });
    }

    var previewCaja = document.getElementById('sol-preview');
    if (previewCaja) {
        previewCaja.addEventListener('click', function (evento) {
            if (evento.target === previewCaja || evento.target.closest('.sol-preview-cancelar')) {
                cerrarPreview();
                return;
            }
            if (evento.target.closest('.sol-preview-confirmar') && previewPendiente) {
                enviar(previewPendiente.item, previewPendiente.estado, previewPendiente.mensaje);
            }
        });
        document.addEventListener('keydown', function (evento) {
            if (evento.key === 'Escape' && previewCaja && !previewCaja.hidden) {
                cerrarPreview();
                return;
            }
            if (evento.key === 'Escape') cerrarFicha();
        });
    }

    if (inicioCitas) {
        inicioCitas.addEventListener('click', function (evento) {
            var card = evento.target.closest('[data-admin-nav]');
            if (card) mostrarVista(card.getAttribute('data-admin-nav'));
        });
        inicioCitas.addEventListener('keydown', function (evento) {
            if (evento.key !== 'Enter' && evento.key !== ' ') return;
            var card = evento.target.closest('[data-admin-nav]');
            if (!card) return;
            evento.preventDefault();
            mostrarVista(card.getAttribute('data-admin-nav'));
        });
    }

    var botonNotasTodas = document.getElementById('admin-alerta-todas');
    if (botonNotasTodas) {
        botonNotasTodas.addEventListener('click', function () {
            marcarNota('', '', '', true);
        });
    }

    function enlazarBuscador(idCampo, clave, alBuscar) {
        var campo = document.getElementById(idCampo);
        if (!campo) return;
        var aplicar = function () {
            filtrosBusqueda[clave] = campo.value || '';
            alBuscar();
        };
        campo.addEventListener('input', aplicar);
        campo.addEventListener('search', aplicar);
    }

    enlazarBuscador('buscar-agenda', 'agenda', function () { pintarInicio(); });
    enlazarBuscador('buscar-afilacion', 'afilacion', function () { pintarLista('afilacion'); });
    enlazarBuscador('buscar-afiliados', 'afiliados', function () { pintarAfiliados(); });
    enlazarBuscador('buscar-cita', 'cita', function () { pintarLista('cita'); });
    enlazarBuscador('buscar-contacto', 'contacto', function () { pintarLista('contacto'); });

    window.setInterval(consultarNotas, 20000);
    document.addEventListener('visibilitychange', function () {
        if (!document.hidden) consultarNotas();
    });
    consultarNotas();

    function vistaDesdeHash() {
        var hash = (location.hash || '#agenda').replace('#', '');
        if (hash === 'horario') hash = 'cita';
        if (hash === 'hoja') hash = 'documentacion';
        return vistas[hash] ? hash : 'agenda';
    }

    window.addEventListener('hashchange', function () {
        mostrarVista(vistaDesdeHash());
    });

    mostrarVista(vistaDesdeHash());
})();
