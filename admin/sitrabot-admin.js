/* Sitrabot Admin: misma lógica estática que el bot público, orientado al panel. */
(function () {
    if (document.getElementById('sitrabot-admin')) return;

    var logoUrl = (function () {
        var origen = location.origin || '';
        var nodo = document.currentScript;
        if (!nodo || !nodo.src) {
            var lista = document.querySelectorAll('script[src*="sitrabot-admin.js"]');
            nodo = lista[lista.length - 1];
        }
        if (nodo && nodo.src) {
            var base = nodo.src.replace(/admin\/sitrabot-admin\.js(?:\?[^#]*)?(?:#.*)?$/i, '');
            if (base && base !== nodo.src) return base + 'img/logo-bot.png';
        }
        return origen + '/img/logo-bot.png';
    })();

    var clave = 'sitrabot-admin-mensajes';
    var logoImg = '<img src="' + String(logoUrl).replace(/"/g, '&quot;') + '" alt="" width="64" height="64" decoding="async">';
    var marca = '<span class="sitrabot-marca" role="img" aria-label="SITRABOT Admin">' + logoImg + '</span>';
    var historial = [];
    try { historial = JSON.parse(sessionStorage.getItem(clave) || '[]'); } catch (e) { historial = []; }

    try {
        var precarga = new Image();
        precarga.src = logoUrl;
    } catch (eLogo) {}

    var caja = document.createElement('div');
    caja.id = 'sitrabot-admin';
    caja.innerHTML = '<section class="sitrabot-panel" aria-hidden="true"><header class="sitrabot-cabeza">' + marca + '<div><strong>SITRABOT Admin</strong><span>Ayuda del panel de administración</span></div><button type="button" class="sitrabot-cerrar" aria-label="Cerrar chat"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg></button></header><div class="sitrabot-mensajes" role="log" aria-live="polite"></div><form class="sitrabot-form"><input type="text" aria-label="Tu pregunta sobre el panel" placeholder="Preguntá sobre el panel, la base o el diseño..." autocomplete="off"><button type="submit" aria-label="Enviar mensaje"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h13M12 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg></button></form></section><button type="button" class="sitrabot-abrir" aria-label="Sitrabot Admin" aria-expanded="false">' + logoImg + '</button><span class="sitrabot-aviso" aria-hidden="true">Sitrabot Admin</span>';
    document.body.appendChild(caja);

    var panel = caja.querySelector('.sitrabot-panel');
    var abrir = caja.querySelector('.sitrabot-abrir');
    var cerrar = caja.querySelector('.sitrabot-cerrar');
    var mensajes = caja.querySelector('.sitrabot-mensajes');
    var form = caja.querySelector('.sitrabot-form');
    var campo = form.querySelector('input');

    function sinAcentos(texto) {
        return texto.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    }

    function pintar(entrada) {
        var burbuja = document.createElement('div');
        burbuja.className = 'sitrabot-burbuja ' + (entrada.rol === 'user' ? 'sitrabot-user' : 'sitrabot-bot');
        if (entrada.rol === 'user') {
            burbuja.textContent = entrada.texto;
        } else {
            (entrada.partes || []).forEach(function (parte) {
                burbuja.appendChild(document.createTextNode(parte.valor || ''));
            });
        }
        var esPrimero = mensajes.children.length === 0;
        mensajes.appendChild(burbuja);
        mensajes.scrollTop = esPrimero ? 0 : Math.max(0, burbuja.offsetTop - 8);
        return burbuja;
    }

    function guardar() {
        try { sessionStorage.setItem(clave, JSON.stringify(historial)); } catch (e) {}
    }

    function bot(texto) {
        return { rol: 'bot', partes: [{ tipo: 'texto', valor: texto }] };
    }

    function bienvenida() {
        return bot('Hola, soy Sitrabot Admin. Puedo ayudarte con este panel: base de datos, config.php, fechas hábiles u ocupadas, citas guardadas, diseño, tono claro/oscuro y cómo publicar en InfinityFree. ¿Qué necesitás?');
    }

    function popupAbierto() {
        var asistente = document.getElementById('asistente');
        var guardadas = document.getElementById('guardadas');
        return (asistente && !asistente.hidden) || (guardadas && !guardadas.hidden);
    }

    function responder(texto) {
        var q = sinAcentos(texto);

        if (/^(hola|holi|buenas( tardes| noches)?|buenos dias|buen dia|hey|saludos|gracias|muchas gracias|adios|chao|bye|ok|que tal|pura vida)[!. ]*$/.test(q)) return bienvenida();
        if (/que puedes|en que ayudas|que sabes|opciones del chat|temas/.test(q) || /^(ayuda|ayudame|menu)[!. ]*$/.test(q)) return bienvenida();
        if (/quien eres|que eres|eres (un )?bot/.test(q)) {
            return bot('Soy Sitrabot Admin, el asistente de este panel. Respondo con información fija sobre administración, bases de datos y diseño del sitio. No modifico la base ni el código por vos.');
        }
        if (/guardas|privacidad|quien ve/.test(q)) {
            return bot('Las preguntas de este chat se guardan solo en esta sesión del navegador, en este dispositivo. No se envían a la base de datos.');
        }

        /* Bases de datos y config */
        if (/dos bases|2 bases|tres bases|3 bases|afiliaciones y admin|por que dos|cuantas bases|respuestas/.test(q)) {
            return bot('1) Info_Afiliados → Cuenta (manual). 2) Info_Consultas → Consulta_Contacto, Consulta_Afiliacion, Consulta_Asesoria. 3) Info_Cuentas_Admins → Admin_Info y Agenda. 4) Info_Respuestas → Respuesta_Contacto, Respuesta_Afiliacion, Respuesta_Asesoria. SQL en sql/01 a 04.');
        }
        if (/config\.php|config ejemplo|donde (va|esta) (el )?config|como conecto|conexion mysql|host|usuario mysql|clave mysql/.test(q)) {
            return bot('Configs en el servidor: php/config_afiliados.php (Info_Afiliados), php/config.php (Info_Consultas), admin/config.php (Info_Cuentas_Admins), admin/config_respuestas.php (Info_Respuestas). Host, usuario y clave van solo en esos archivos; no los compartas ni los pegues en el chat.');
        }
        if (/sql\/admin|admin\.sql|que tablas|tablas de admin|cuentas|tabla agenda|tabla citas|alter table|columnas persona|motivo|notas/.test(q)) {
            return bot('En cada base nueva ejecutá: sql/01_Info_Afiliados.sql, 02_Info_Consultas.sql, 03_Info_Cuentas_Admins.sql y 04_Info_Respuestas.sql.');
        }
        if (/no (se )?guarda|no conecta|error (de )?guardar|falta (la )?conexion|no se pudo guardar|falta config/.test(q)) {
            return bot('Si no guarda, revisá: 1) entrar por el login de Administración, 2) admin/config.php en el servidor con la base admin, 3) tablas de sql/admin.sql creadas. En Cursor (vista local) no corre PHP ni MySQL, por eso ahí falla el guardado.');
        }
        if (/cursor|desde aqui|local|preview|localhost|php local/.test(q)) {
            return bot('En Cursor o una vista previa estática no se ejecuta PHP ni MySQL. El diseño sí se ve; guardar fechas o citas funciona en InfinityFree con config.php y las tablas listas.');
        }
        if (/infinityfree|subir|publicar|ftp|filezilla|que archivos (subo|subir)/.test(q)) {
            return bot('Subí a InfinityFree el sitio completo, incluidos admin/ (panel, agenda.php, configs) y php/ (configs de consultas y afiliados).');
        }

        /* Panel y opciones */
        if (/agregar fecha|asistente|pasos|como (agrego|abro) (una )?fecha|wizard/.test(q)) {
            return bot('En la sección Horario del menú tocá «Agregar fecha y hora». Solo define disponibilidad para citas con asesoría: mes → tipo (hábil, ocupada o no hábil) → día → hora (si aplica) → guardar. Va a la tabla agenda.');
        }
        if (/habil|ocupada|no habil|bloqueada|tipo de fecha/.test(q)) {
            return bot('Hábil: el día queda disponible para citas. Ocupada: ya la tiene alguien (también puede crear una cita en la base). No hábil: el día no se ofrece; en ese caso se salta el paso de la hora.');
        }
        if (/afiliados|tabla cuenta|lista de afiliados|cedulas registradas|info_afiliados/.test(q)) {
            return bot('En Afiliados ves Info_Afiliados.Cuenta (cedula, nombre completo, correo). Solo lectura: las altas se hacen a mano en phpMyAdmin. Eso valida la puerta de Solicitar cita. Las boletas nuevas estan en Afiliaciones (Consulta_Afiliacion).');
        }
        if (/navbar|menu admin|afiliaciones|citas con asesoria|ver solicitudes|bandeja|aceptar|rechazar|neutral|contacto admin|afilacion admin|respuestas/.test(q)) {
            return bot('El menu tiene Inicio, Afiliaciones, Afiliados, Citas con Asesoria, Horario y Contacto. En Inicio abris la papelera; ahi seleccionas rechazadas y el boton de borrar de la esquina las elimina de la base. Horario solo define dias y horas para citas con asesoria.');
        }
        if (/ver fechas|fechas guardadas|editar cita|eliminar cita|comentarios|de quien|para que|notas|citas reservadas|responder|enviar respuesta|correo de la cita|formsubmit/.test(q)) {
            return bot('En «Ver fechas guardadas» → Citas reservadas revisás turnos y comentarios. Para aceptar, rechazar o contestar de forma neutral usá «Ver solicitudes».');
        }
        if (/base respuestas|config_respuestas|sql\/respuestas/.test(q)) {
            return bot('Creá las 4 bases Info_*, ejecutá sql/01 a 04, y subí php/config.php, php/config_afiliados.php, admin/config.php y admin/config_respuestas.php.');
        }
        if (/cita publica|solicitar cita|pagina de citas|como reserva el usuario/.test(q)) {
            return bot('El público pide cita en solicitar-cita. Las horas abiertas salen de agenda; las ya tomadas están en citas. Si el usuario pone nombre y motivo, se pueden guardar en citas al reservar.');
        }
        if (/cuenta admin|login|entrar|usuario y clave|cifrar|generar hash|password/.test(q)) {
            return bot('Las cuentas de acceso están en Info_Cuentas_Admins.Admin_Info (cuenta, cedula si aplica, clave_hash). El hash se genera con admin/generar.php. No compartas correos, cédulas ni claves por este chat.');
        }
        if (/cerrar sesion|salir|opciones/.test(q)) {
            return bot('Arriba a la derecha está «Opciones». Ahí abrís Ayuda (la guía del panel) o Cerrar sesión, que llama a salir.php y termina la sesión de administración.');
        }

        /* Diseño */
        if (/fondo|degradado|mismo (fondo|color) (del )?index|gradiente/.test(q)) {
            return bot('El panel usa el mismo degradado del index (azul → crema → naranja) y cambia con el modo oscuro al degradado oscuro del sitio público.');
        }
        if (/modo oscuro|modo claro|tono|sol|luna|tema/.test(q)) {
            return bot('El botón de sol/luna arriba a la derecha cambia el tono. Usa la misma preferencia modoOscuro del sitio, guardada en este navegador.');
        }
        if (/popup|equis|cerrar (el )?popup|diseno (del )?panel|botones/.test(q)) {
            return bot('Los asistentes son popups grandes animados. La equis de cerrar es un círculo compacto. Si ves una franja a la izquierda de las cajas, es el acento rojo del diseño (en oscuro se mantiene rojo).');
        }
        if (/sitrabot (de )?usuarios|bot (del )?index|diferencia/.test(q)) {
            return bot('El Sitrabot del index orienta a afiliados (afiliación, asesoría, convenios). Este Sitrabot Admin orienta a quien administra: bases, panel, fechas y publicación.');
        }
        if (/ide|visual studio|vscode|editor|codigo/.test(q)) {
            return bot('Podés editar el proyecto en Cursor o VS Code. Los cambios de diseño se ven en local; para que el guardado y el login funcionen hay que probarlos en InfinityFree con PHP y MySQL.');
        }

        if (/que mas|otros temas|mas ayuda/.test(q)) {
            return bot('También puedo hablar de las tres bases, los config.php, sql/admin.sql y sql/respuestas.sql, Horario, citas guardadas, modo oscuro, Cursor vs InfinityFree y cómo subir archivos.');
        }

        return bot('No tengo esa respuesta exacta. Probá preguntar por: base de datos, config.php, agregar fecha, fechas guardadas, modo oscuro, Cursor o InfinityFree. O escribí «ayuda» para ver los temas.');
    }

    function mostrarBienvenida() {
        if (historial.length) return;
        var saludo = bienvenida();
        historial.push(saludo);
        pintar(saludo);
        guardar();
    }

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
        if (evento.key !== 'Escape') return;
        if (popupAbierto()) return;
        if (caja.classList.contains('sitrabot-abierto')) cerrarChat();
    });
    document.addEventListener('pointerdown', function (evento) {
        if (!caja.classList.contains('sitrabot-abierto') || caja.contains(evento.target)) return;
        if (popupAbierto()) return;
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
