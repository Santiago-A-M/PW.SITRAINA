(function () {
    var lista = document.getElementById('legal-lista');
    var actualizado = document.getElementById('legal-actualizado');
    var popup = document.getElementById('legal-popup');
    var popupTitulo = document.getElementById('legal-popup-titulo');
    var popupCuerpo = document.getElementById('legal-popup-cuerpo');
    var popupCerrar = document.getElementById('legal-popup-cerrar');
    var popupFondo = document.getElementById('legal-popup-fondo');
    var filtros = document.querySelectorAll('.legal-filtro');
    var cajaOpciones = document.getElementById('admin-opciones');
    var btnOpciones = document.getElementById('admin-opciones-btn');
    var menuOpciones = document.getElementById('admin-opciones-menu');

    function cerrarOpciones() {
        if (!cajaOpciones || !btnOpciones || !menuOpciones) return;
        cajaOpciones.classList.remove('abierto');
        btnOpciones.setAttribute('aria-expanded', 'false');
        menuOpciones.hidden = true;
    }

    if (btnOpciones && menuOpciones) {
        btnOpciones.addEventListener('click', function (ev) {
            ev.preventDefault();
            ev.stopPropagation();
            var abrir = menuOpciones.hidden;
            if (abrir) {
                cajaOpciones.classList.add('abierto');
                btnOpciones.setAttribute('aria-expanded', 'true');
                menuOpciones.hidden = false;
            } else {
                cerrarOpciones();
            }
        });
        document.addEventListener('click', function (ev) {
            if (!cajaOpciones.contains(ev.target)) cerrarOpciones();
        });
        document.addEventListener('keydown', function (ev) {
            if (ev.key === 'Escape') cerrarOpciones();
        });
    }

    if (!lista) return;

    var grupo = 'proxima';
    var datos = { proxima: [], anterior: [], cancelada: [], papelera: [] };
    var gruposClave = ['proxima', 'anterior', 'cancelada', 'papelera'];
    var firma = '';
    var abierto = 0;
    var seguirAbierta = false;
    var avisoAccion = '';
    var cargando = false;
    var avisado = false;

    var vacios = {
        proxima: 'No hay citas próximas.',
        anterior: 'No hay citas que ya hayan pasado.',
        cancelada: 'No hay citas canceladas.',
        papelera: 'La papelera está vacía.'
    };

    function escapar(texto) {
        return String(texto == null ? '' : texto)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function textoEstado(fila) {
        if (fila.grupo === 'papelera') return fila.rechazada && !fila.archivada ? 'Rechazada' : 'En papelera';
        if (fila.grupo === 'cancelada') return 'Cancelada';
        if (fila.grupo === 'anterior') return 'Ya pasó';
        return 'Próxima';
    }

    function elegirGrupo(clave) {
        grupo = clave || 'proxima';
        filtros.forEach(function (otro) {
            var activo = (otro.getAttribute('data-grupo') || '') === grupo;
            otro.classList.toggle('activo', activo);
            otro.setAttribute('aria-selected', activo ? 'true' : 'false');
        });
    }

    function horario(fila) {
        if (fila.hora_texto && fila.fin_texto) return fila.hora_texto + ' – ' + fila.fin_texto;
        return fila.hora_texto || '';
    }

    function filaDato(etiqueta, valor) {
        if (!valor) return '';
        return '<p class="legal-dato"><span>' + escapar(etiqueta) + '</span><strong>' + escapar(valor) + '</strong></p>';
    }

    function htmlTarjeta(fila) {
        var cuando = [fila.dia, fila.fecha_texto].filter(Boolean).join(' · ');
        var horas = horario(fila);
        return '<button type="button" class="legal-tarjeta" data-id="' + escapar(fila.id) + '">' +
            '<span class="legal-estado legal-estado-' + escapar(fila.grupo || 'proxima') + '">' + escapar(textoEstado(fila)) + '</span>' +
            '<strong class="legal-nombre">' + escapar(fila.persona || 'Sin nombre') + '</strong>' +
            (cuando ? '<span class="legal-linea">' + escapar(cuando) + '</span>' : '<span class="legal-linea">Sin fecha</span>') +
            (horas ? '<span class="legal-linea">' + escapar(horas) + '</span>' : '') +
            '</button>';
    }

    function buscar(id) {
        var grupos = gruposClave;
        for (var i = 0; i < grupos.length; i++) {
            var filas = datos[grupos[i]] || [];
            for (var j = 0; j < filas.length; j++) {
                if (Number(filas[j].id) === Number(id)) return filas[j];
            }
        }
        return null;
    }

    function htmlFicha(fila) {
        var personal = filaDato('Nombre completo', fila.persona) +
            filaDato('Correo electrónico', fila.correo) +
            filaDato('Cédula', fila.cedula);
        var asesoria = filaDato('Motivo', fila.motivo) +
            filaDato('Notas', fila.notas) +
            filaDato('Modalidad', fila.modalidad);
        var cita = filaDato('Estado', textoEstado(fila)) +
            filaDato('Fecha', fila.fecha_texto) +
            filaDato('Día', fila.dia) +
            filaDato('Hora de inicio', fila.hora_texto) +
            filaDato('Hora de finalización', fila.fin_texto) +
            filaDato('Cancelada', fila.cancelado_texto) +
            filaDato('Recibida', fila.creado_texto);
        var html = '';
        if (personal) html += '<section class="legal-grupo"><h3>Información personal</h3>' + personal + '</section>';
        if (asesoria) html += '<section class="legal-grupo"><h3>Información de la asesoría</h3>' + asesoria + '</section>';
        html += '<section class="legal-grupo"><h3>Información de la cita</h3>' + cita + '</section>';
        if (fila.grupo === 'papelera' && fila.archivada) {
            html += '<div class="legal-acciones"><button type="button" class="legal-accion" data-accion="restaurar" data-id="' + escapar(fila.id) + '">Devolver a las citas</button></div>';
        } else if (fila.grupo === 'papelera') {
            html += '<p class="legal-nota">Esta cita fue rechazada. Sigue guardada en la papelera y no se borró.</p>';
        } else if (fila.grupo !== 'papelera') {
            html += '<div class="legal-acciones"><button type="button" class="legal-accion legal-accion-papelera" data-accion="archivar" data-id="' + escapar(fila.id) + '">Mandar a la papelera</button></div>';
        }
        return html;
    }

    function pintar() {
        var filas = datos[grupo] || [];
        if (!filas.length) {
            lista.innerHTML = '<p class="legal-vacio">' + escapar(vacios[grupo] || 'No hay citas.') + '</p>';
            return;
        }
        var html = '';
        filas.forEach(function (fila) {
            html += htmlTarjeta(fila);
        });
        lista.innerHTML = html;
    }

    function pintarCuentas() {
        gruposClave.forEach(function (clave) {
            var nodo = document.getElementById('legal-cuenta-' + clave);
            if (nodo) nodo.textContent = String((datos[clave] || []).length);
        });
    }

    function abrir(id) {
        var fila = buscar(id);
        if (!fila || !popup) return;
        abierto = Number(fila.id);
        popupTitulo.textContent = fila.persona || 'Sin nombre';
        popupCuerpo.innerHTML = htmlFicha(fila);
        popup.hidden = false;
        document.body.classList.add('legal-popup-abierto');
        if (popupCerrar) popupCerrar.focus();
    }

    function cerrar() {
        if (!popup || popup.hidden) return;
        popup.hidden = true;
        abierto = 0;
        document.body.classList.remove('legal-popup-abierto');
    }

    function firmaDe(payload) {
        var trozos = [];
        gruposClave.forEach(function (clave) {
            (payload[clave] || []).forEach(function (fila) {
                trozos.push([
                    fila.id, fila.grupo, fila.estado, fila.fecha, fila.hora, fila.fin,
                    fila.cancelado_en, fila.archivado_en, fila.archivada, fila.rechazada,
                    fila.motivo, fila.notas, fila.modalidad, fila.persona, fila.correo
                ].join('|'));
            });
        });
        return trozos.join('\n');
    }

    function aplicar(json) {
        var grupos = json && json.grupos ? json.grupos : {};
        var siguiente = {
            proxima: grupos.proxima || [],
            anterior: grupos.anterior || [],
            cancelada: grupos.cancelada || [],
            papelera: grupos.papelera || []
        };
        var nueva = firmaDe(siguiente);
        if (nueva === firma) {
            if (actualizado && json.actualizado) {
                actualizado.textContent = 'Actualizado ' + json.actualizado;
            }
            return;
        }
        datos = siguiente;
        firma = nueva;
        pintarCuentas();
        pintar();
        if (actualizado) {
            actualizado.textContent = json.actualizado ? 'Actualizado ' + json.actualizado : '';
        }
        if (abierto) {
            var abierta = buscar(abierto);
            if (abierta) {
                if (seguirAbierta) {
                    elegirGrupo(abierta.grupo);
                    pintar();
                }
                abrir(abierto);
            } else {
                cerrar();
            }
        }
        seguirAbierta = false;
        if (avisoAccion && actualizado) {
            actualizado.textContent = avisoAccion;
            avisoAccion = '';
        } else if (avisado && actualizado) {
            actualizado.textContent = (actualizado.textContent ? actualizado.textContent + '. ' : '') + 'Hay cambios en las citas.';
        }
        avisado = true;
    }

    function fallo(mensaje) {
        if (firma) return;
        lista.innerHTML = '<p class="legal-vacio">' + escapar(mensaje || 'No pudimos leer las citas.') + '</p>' +
            '<p class="legal-reintento"><button type="button" id="legal-reintentar">Reintentar</button></p>';
    }

    function cargar() {
        if (cargando) return;
        cargando = true;
        fetch('citas.php', { credentials: 'same-origin', cache: 'no-store' })
            .then(function (respuesta) {
                return respuesta.json().then(function (json) {
                    return { ok: respuesta.ok, json: json };
                });
            })
            .then(function (resultado) {
                cargando = false;
                if (!resultado.ok || !resultado.json || !resultado.json.ok) {
                    fallo(resultado.json && resultado.json.mensaje);
                    return;
                }
                aplicar(resultado.json);
            })
            .catch(function () {
                cargando = false;
                fallo('No pudimos leer las citas. Intentá más tarde.');
            });
    }

    filtros.forEach(function (boton) {
        boton.addEventListener('click', function () {
            elegirGrupo(boton.getAttribute('data-grupo') || 'proxima');
            pintar();
        });
    });

    function mover(accion, id) {
        var token = document.body.getAttribute('data-token') || '';
        var cuerpo = 'token=' + encodeURIComponent(token) + '&accion=' + encodeURIComponent(accion) + '&id=' + encodeURIComponent(id);
        fetch('citas.php', {
            method: 'POST',
            credentials: 'same-origin',
            cache: 'no-store',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: cuerpo
        })
            .then(function (respuesta) {
                return respuesta.json().then(function (json) {
                    return { ok: respuesta.ok, json: json };
                });
            })
            .then(function (resultado) {
                if (!resultado.ok || !resultado.json || !resultado.json.ok) {
                    if (actualizado) actualizado.textContent = (resultado.json && resultado.json.mensaje) || 'No se pudo guardar el cambio.';
                    return;
                }
                if (resultado.json.grupo) elegirGrupo(resultado.json.grupo);
                avisoAccion = resultado.json.mensaje || '';
                seguirAbierta = true;
                firma = '';
                cargar();
            })
            .catch(function () {
                if (actualizado) actualizado.textContent = 'No se pudo guardar el cambio. Intentá más tarde.';
            });
    }

    lista.addEventListener('click', function (ev) {
        var boton = ev.target.closest('.legal-tarjeta');
        if (boton) {
            abrir(boton.getAttribute('data-id'));
            return;
        }
        if (ev.target.id === 'legal-reintentar') cargar();
    });

    if (popupCuerpo) {
        popupCuerpo.addEventListener('click', function (ev) {
            var boton = ev.target.closest('[data-accion]');
            if (!boton) return;
            mover(boton.getAttribute('data-accion'), boton.getAttribute('data-id'));
        });
    }

    if (popupCerrar) popupCerrar.addEventListener('click', cerrar);
    if (popupFondo) popupFondo.addEventListener('click', cerrar);
    document.addEventListener('keydown', function (ev) {
        if (ev.key === 'Escape') cerrar();
    });

    var notasBtn = document.getElementById('legal-notas-btn');
    var notasMenu = document.getElementById('legal-notas-menu');
    var notasLista = document.getElementById('legal-notas-lista');
    var notasCuenta = document.getElementById('legal-notas-cuenta');
    var notasTodas = document.getElementById('legal-notas-todas');
    var firmaNotas = '';
    var notasListas = false;
    var notasVistas = null;

    function textoNota(aviso) {
        var cuando = aviso.cuando ? ' · ' + aviso.cuando : '';
        return (aviso.titulo ? aviso.titulo + ': ' : '') + (aviso.texto || '') + cuando;
    }

    function mostrarNotaEsquina(texto, tipo) {
        if (!texto) return;
        var caja = document.getElementById('legal-notas-flotantes');
        if (!caja) {
            caja = document.createElement('div');
            caja.id = 'legal-notas-flotantes';
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

    function pintarNotas(json) {
        if (!notasLista) return;
        var avisos = json.avisos || [];
        var n = typeof json.no_leidas === 'number' ? json.no_leidas : 0;
        var html = '';
        avisos.forEach(function (aviso) {
            if (typeof json.no_leidas !== 'number' && !aviso.leido) n += 1;
            html += '<button type="button" class="legal-notas-item legal-notas-' + escapar(aviso.tipo || 'cita') + (aviso.leido ? ' legal-notas-leida' : '') + '" data-tipo="' + escapar(aviso.tipo) + '" data-id="' + escapar(aviso.origen_id) + '" data-marca="' + escapar(aviso.marca) + '">' + escapar(textoNota(aviso)) + '</button>';
        });
        notasLista.innerHTML = html || '<p class="legal-notas-vacio">No hay avisos por ahora.</p>';
        if (notasCuenta) {
            notasCuenta.hidden = n < 1;
            notasCuenta.textContent = n > 9 ? '9+' : String(n);
        }
    }

    function marcarNota(tipo, id, marca, todas) {
        var cuerpo = new FormData();
        cuerpo.append('token', document.body.getAttribute('data-token') || '');
        cuerpo.append('accion', todas ? 'leidas' : 'leida');
        if (!todas) {
            cuerpo.append('tipo', tipo || 'cita');
            cuerpo.append('id', id || '');
            cuerpo.append('marca', marca || '');
        }
        fetch('../notificaciones.php', { method: 'POST', body: cuerpo, credentials: 'same-origin', cache: 'no-store' })
            .then(function (r) { return r.json().catch(function () { return null; }); })
            .then(function (json) {
                if (!json || !json.ok) return;
                firmaNotas = json.firma || firmaNotas;
                pintarNotas(json);
            })
            .catch(function () {});
    }

    function consultarNotas() {
        if (document.hidden) return;
        fetch('../notificaciones.php', { credentials: 'same-origin', cache: 'no-store' })
            .then(function (r) { return r.json().catch(function () { return null; }); })
            .then(function (json) {
                if (!json || !json.ok) return;
                var cambio = notasListas && json.firma && json.firma !== firmaNotas;
                var primeras = !notasListas;
                firmaNotas = json.firma || '';
                notasListas = true;
                if (cambio) cargar();
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
                pintarNotas(json);
                nuevas.slice(0, 3).forEach(function (aviso) {
                    mostrarNotaEsquina(textoNota(aviso), aviso.tipo);
                });
            })
            .catch(function () {});
    }

    if (notasBtn && notasMenu) {
        notasBtn.addEventListener('click', function (ev) {
            ev.preventDefault();
            ev.stopPropagation();
            var abrirMenu = notasMenu.hidden;
            notasMenu.hidden = !abrirMenu;
            notasBtn.setAttribute('aria-expanded', abrirMenu ? 'true' : 'false');
        });
        document.addEventListener('click', function (ev) {
            var caja = document.getElementById('legal-notas');
            if (caja && !caja.contains(ev.target)) {
                notasMenu.hidden = true;
                notasBtn.setAttribute('aria-expanded', 'false');
            }
        });
    }
    if (notasLista) {
        notasLista.addEventListener('click', function (ev) {
            var boton = ev.target.closest('.legal-notas-item');
            if (!boton) return;
            var id = boton.getAttribute('data-id');
            marcarNota(boton.getAttribute('data-tipo'), id, boton.getAttribute('data-marca'), false);
            if (notasMenu) notasMenu.hidden = true;
            if (buscar(id)) abrir(id);
        });
    }
    if (notasTodas) notasTodas.addEventListener('click', function () { marcarNota('', '', '', true); });

    cargar();
    window.setInterval(consultarNotas, 20000);
    document.addEventListener('visibilitychange', function () {
        if (!document.hidden) consultarNotas();
    });
    consultarNotas();
})();
