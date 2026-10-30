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
        horario: document.getElementById('vista-horario'),
        contacto: document.getElementById('vista-contacto')
    };
    var vistasLista = { afilacion: 1, cita: 1, contacto: 1 };

    var listas = {
        afilacion: document.getElementById('lista-sol-afilacion'),
        cita: document.getElementById('lista-sol-cita'),
        contacto: document.getElementById('lista-sol-contacto')
    };
    var listaAfiliados = document.getElementById('lista-afiliados');

    var datos = { contacto: [], cita: [], afilacion: [], afiliados: [] };
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

    function contarPendientes(lista) {
        return (lista || []).filter(function (f) { return (f.estado || 'pendiente') === 'pendiente'; }).length;
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
        var nAfil = contarPendientes(datos.afilacion);
        var nCita = contarPendientes(datos.cita);
        var nContacto = contarPendientes(datos.contacto);
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
            var recientes = [];
            ['contacto', 'cita', 'afilacion'].forEach(function (tipo) {
                (datos[tipo] || []).forEach(function (fila) {
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
            recientes = recientes.slice(0, 5);
            if (!recientes.length) {
                inicioCitas.innerHTML = '<p class="vacio-bloque">Todavía no hay consultas registradas.</p>';
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
            ? '¿Borrar definitivamente esta consulta de la base de datos?'
            : ('¿Borrar definitivamente estas ' + items.length + ' consultas de la base de datos?');
        pedirConfirmacion('Eliminar de la base', mensaje).then(function (aceptado) {
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

    function mostrarAviso(texto, esError) {
        if (!texto) return;
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

    function metaFila(tipo, fila) {
        var partes = [];
        if (fila.correo) partes.push({ et: 'Correo', val: fila.correo });
        if (tipo === 'contacto') {
            if (fila.asunto) partes.push({ et: 'Asunto', val: fila.asunto });
            if (fila.mensaje) partes.push({ et: 'Mensaje', val: fila.mensaje });
        }
        if (tipo === 'cita') {
            if (fila.fecha) partes.push({ et: 'Fecha', val: fila.fecha });
            if (fila.hora) partes.push({ et: 'Hora', val: fila.hora });
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

    function htmlResponder(estadoActual, texto, oculto) {
        var elegido = estadoActual === 'aceptada' || estadoActual === 'rechazada' || estadoActual === 'neutral'
            ? estadoActual
            : 'neutral';
        var html = '<div class="sol-responder"' + (oculto ? ' hidden' : '') + '>';
        html += '<p class="sol-decision-label">Decisión</p>';
        html += '<div class="sol-decisiones" role="group" aria-label="Decisión">';
        html += '<button type="button" class="sol-chip" data-estado="aceptada" aria-pressed="' + (elegido === 'aceptada' ? 'true' : 'false') + '">Aceptar</button>';
        html += '<button type="button" class="sol-chip" data-estado="rechazada" aria-pressed="' + (elegido === 'rechazada' ? 'true' : 'false') + '">Rechazar</button>';
        html += '<button type="button" class="sol-chip" data-estado="neutral" aria-pressed="' + (elegido === 'neutral' ? 'true' : 'false') + '">Neutral</button>';
        html += '</div>';
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
        var detalle = '';
        if (tipo === 'contacto') detalle = fila.asunto || '';
        else if (tipo === 'cita') detalle = fila.motivo || '';
        else if (fila.cedula) detalle = 'Cédula ' + fila.cedula;
        var cuando = textoFechaHora(claveReciente(fila));
        var html = '<li class="inicio-card inicio-card-cita inicio-card-enlace" data-admin-nav="' + escapar(tipo) + '" role="button" tabindex="0">';
        html += '<div class="inicio-card-cuerpo">';
        html += '<div class="inicio-card-top">';
        html += '<strong>' + escapar(nombre) + '</strong>';
        html += '<span class="sol-badge ' + claseEstado(fila.estado || 'pendiente') + '">' + escapar(etiquetaEstado(fila.estado || 'pendiente')) + '</span>';
        html += '</div>';
        html += '<p class="inicio-card-meta">' + escapar(etiquetaTipo(tipo));
        if (cuando) html += ' · ' + escapar(cuando);
        html += '</p>';
        if (detalle) html += '<p class="inicio-card-meta">' + escapar(detalle) + '</p>';
        var seccion = tipo === 'cita' ? 'Citas' : (tipo === 'afilacion' ? 'Afiliaciones' : 'Contacto');
        html += '<p class="inicio-card-meta inicio-card-accion">Abrir en ' + escapar(seccion) + '</p>';
        html += '</div></li>';
        return html;
    }

    function partesCita(fila) {
        var meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
        var trozos = String(fila.fecha || '').split('-');
        var dia = '—';
        var mes = '';
        if (trozos.length === 3) {
            var nDia = parseInt(trozos[2], 10);
            var nMes = parseInt(trozos[1], 10);
            if (nDia > 0) dia = String(nDia);
            if (nMes >= 1 && nMes <= 12) mes = meses[nMes - 1];
        }
        return { dia: dia, mes: mes, hora: String(fila.hora || '').trim() };
    }

    function htmlSelloCita(fila) {
        var sello = partesCita(fila);
        var html = '<span class="cita-sello" aria-hidden="true">';
        html += '<span class="cita-sello-dia">' + escapar(sello.dia) + '</span>';
        if (sello.mes) html += '<span class="cita-sello-mes">' + escapar(sello.mes) + '</span>';
        if (sello.hora) html += '<span class="cita-sello-hora">' + escapar(sello.hora) + '</span>';
        html += '</span>';
        return html;
    }

    function pintarLista(tipo) {
        var caja = listas[tipo];
        if (!caja) return;
        var filas = datos[tipo] || [];
        if (!filas.length) {
            caja.innerHTML = '<p class="vacio-bloque">No hay solicitudes de este tipo todavía.</p>';
            return;
        }
        var html = '<ul class="rejilla-casillas sol-rejilla">';
        filas.forEach(function (fila) {
            var id = String(fila.id);
            var estado = fila.estado || 'pendiente';
            var tieneCuenta = parseInt(fila.cuenta_web, 10) === 1;
            html += '<li class="sol-item' + (tipo === 'cita' ? ' sol-item-cita' : '') + '" data-sol-id="' + escapar(id) + '" data-sol-tipo="' + escapar(tipo) + '" data-sol-cuenta="' + (tieneCuenta ? '1' : '0') + '">';
            html += '<button type="button" class="sol-tarjeta">';
            if (tipo === 'cita') html += htmlSelloCita(fila);
            html += '<span class="sol-tarjeta-cuerpo">';
            html += '<span class="sol-tapa-tipo">' + escapar(etiquetaTipo(tipo)) + '</span>';
            html += '<span class="casilla-titulo">' + escapar(tipo === 'cita' ? (fila.persona || 'Sin nombre') : tituloFila(tipo, fila)) + '</span>';
            if (tipo !== 'cita') html += '<span class="sol-tapa-fecha">' + escapar(fila.creado_en || '') + '</span>';
            html += '<span class="sol-badge ' + claseEstado(estado) + '">' + escapar(etiquetaEstado(estado)) + '</span>';
            html += '</span></button></li>';
        });
        html += '</ul>';
        caja.innerHTML = html;
    }

    function eliminarConsulta(item) {
        var tipo = item.getAttribute('data-sol-tipo');
        var id = parseInt(item.getAttribute('data-sol-id'), 10);
        if (!tipo || !(id > 0)) return;
        pedirConfirmacion('Eliminar de la base', '¿Eliminar esta consulta de la base de datos? Esta acción no se puede deshacer.').then(function (aceptado) {
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
        pedirConfirmacion('Eliminar afiliado', '¿Eliminar este afiliado de la base? Ya no podrá validar Solicitar cita con esos datos.').then(function (aceptado) {
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
        var filas = datos.afiliados || [];
        if (!filas.length) {
            listaAfiliados.innerHTML = '<p class="vacio-bloque">Todavía no hay afiliados. Usá Añadir afiliado para registrar cédula, nombre y correo.</p>';
            return;
        }
        var html = '<ul class="rejilla-casillas sol-rejilla">';
        filas.forEach(function (fila) {
            var id = String(fila.id);
            html += '<li class="sol-item" data-sol-id="' + escapar(id) + '" data-sol-tipo="afiliados">';
            html += '<button type="button" class="sol-tarjeta">';
            html += '<span class="sol-tapa-tipo">Afiliado</span>';
            html += '<span class="casilla-titulo">' + escapar((fila.nombre_completo || 'Sin nombre') + (fila.cedula ? ' · ' + fila.cedula : '')) + '</span>';
            html += '<span class="sol-badge sol-estado-aceptada">Cuenta</span>';
            html += '</button></li>';
        });
        html += '</ul>';
        listaAfiliados.innerHTML = html;
    }

    function cargar(silencioso, sinAviso) {
        if (!silencioso) {
            Object.keys(listas).forEach(function (clave) {
                if (listas[clave]) listas[clave].innerHTML = '<p class="vacio-bloque">Cargando…</p>';
            });
            if (listaAfiliados) listaAfiliados.innerHTML = '<p class="vacio-bloque">Cargando…</p>';
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
        var pendientes = [];
        ['contacto', 'cita', 'afilacion'].forEach(function (tipo) {
            (datos[tipo] || []).forEach(function (fila) {
                if ((fila.estado || 'pendiente') !== 'pendiente') return;
                pendientes.push({ tipo: tipo, fila: fila });
            });
        });
        pendientes.sort(function (a, b) {
            var ca = claveReciente(a.fila);
            var cb = claveReciente(b.fila);
            if (ca !== cb) return cb.localeCompare(ca);
            return (parseInt(b.fila.id, 10) || 0) - (parseInt(a.fila.id, 10) || 0);
        });
        var claves = pendientes.map(function (item) { return claveAviso(item.tipo, item.fila); });
        var llegaronNuevas = false;
        if (avisosConocidos) {
            llegaronNuevas = claves.some(function (clave) {
                return avisosConocidos.indexOf(clave) === -1;
            });
        }
        avisosConocidos = claves;
        if (!window.adminSincronizarConsultas) return;
        window.adminSincronizarConsultas(pendientes.slice(0, 12).map(function (item) {
            return {
                tipo: item.tipo,
                id: item.fila.id,
                texto: textoAviso(item.tipo, item.fila)
            };
        }), llegaronNuevas);
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
        if (tipo !== 'afiliados') {
            html += '<p class="sol-badge ' + claseEstado(estado) + '">' + escapar(etiquetaEstado(estado)) + '</p>';
        }
        partes.forEach(function (m) {
            html += '<p class="item-meta-fila"><span class="item-meta-etiqueta">' + escapar(m.et) + '</span>';
            html += '<span class="item-meta-valor">' + escapar(m.val) + '</span></p>';
        });
        meta.innerHTML = html;
        var acc = '';
        if (tipo === 'afiliados') {
            acc += '<button type="button" class="btn-atajo btn-atajo-secundario sol-eliminar-afiliado">Eliminar de la base</button>';
        } else {
            if (!tieneCuenta) {
                acc += '<p class="sol-sin-cuenta">No se envió con la cuenta iniciada: la respuesta queda en el panel, no en Mis mensajes.</p>';
            }
            if (ya) {
                acc += htmlResponder(estado, fila.respuesta || '', true);
                acc += '<div class="sol-acciones-pie">';
                acc += '<button type="button" class="btn-atajo sol-editar">Editar</button>';
                acc += '<button type="button" class="btn-atajo btn-atajo-secundario sol-eliminar">Eliminar de la base</button>';
                acc += '</div>';
            } else {
                acc += htmlResponder('neutral', '', false);
                acc += '<button type="button" class="btn-atajo btn-atajo-secundario sol-eliminar">Eliminar de la base</button>';
            }
        }
        acciones.innerHTML = acc;
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
        previewPendiente = { item: item, tipo: tipo, id: id, estado: estado, mensaje: mensaje };
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
        if (cuerpoNodo) cuerpoNodo.textContent = mensaje;
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
        fetch('solicitudes.php', { method: 'POST', body: cuerpo, credentials: 'same-origin' })
            .then(function (r) { return r.json().catch(function () { return null; }); })
            .then(function (json) {
                enviando = false;
                if (!json || !json.ok) {
                    throw new Error((json && json.mensaje) || 'No se pudo enviar.');
                }
                mostrarAviso(json.mensaje || 'Respuesta guardada.');
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

    window.setInterval(function () {
        if (document.hidden) return;
        cargar(true, true);
    }, 20000);

    window.addEventListener('hashchange', function () {
        var hash = (location.hash || '#agenda').replace('#', '');
        if (vistas[hash]) mostrarVista(hash);
    });

    var inicial = (location.hash || '#agenda').replace('#', '');
    mostrarVista(vistas[inicial] ? inicial : 'agenda');
})();
