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
        return bot('Hola, soy Sitrabot Admin. Puedo explicarte el panel con palabras sencillas: cómo responder consultas, agregar o quitar afiliados, ver las más recientes, las advertencias, editar una respuesta y el horario de citas. ¿Qué necesitás?');
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
            return bot('Soy Sitrabot Admin, el asistente de este panel. Explico cómo usar las secciones. No cambio datos ni envío respuestas por vos.');
        }
        if (/guardas|privacidad|quien ve/.test(q)) {
            return bot('Las preguntas de este chat se guardan solo en esta sesión del navegador, en este dispositivo. No se envían a la base de datos.');
        }

        /* Bases de datos y config */
        if (/dos bases|2 bases|tres bases|3 bases|afiliaciones y admin|por que dos|cuantas bases|que guarda el sitio|donde se guardan/.test(q)) {
            return bot('El sitio guarda por separado a las personas afiliadas, las consultas que llegan, las respuestas que enviás, las cuentas de administración y las cuentas de quienes ingresan en la página pública. Desde el panel no hace falta conocer esos nombres: usá el menú.');
        }
        if (/config\.php|config ejemplo|donde (va|esta) (el )?config|como conecto|conexion mysql|host|usuario mysql|clave mysql|que tablas|tablas de admin|alter table/.test(q)) {
            return bot('La conexión con la información ya está preparada en el sitio publicado. Para el trabajo de todos los días no hay que tocar archivos ni escribir comandos. No compartas usuarios ni claves por este chat.');
        }
        if (/no (se )?guarda|no conecta|error (de )?guardar|falta (la )?conexion|no se pudo guardar|falta config/.test(q)) {
            return bot('Si algo no se guarda, salí y volvé a entrar por el ingreso de Administración. Si sigue igual, el sitio publicado todavía no está conectado. En una vista de prueba en la computadora el guardado no funciona.');
        }
        if (/cursor|desde aqui|local|preview|localhost|php local/.test(q)) {
            return bot('En una vista de prueba se puede ver el diseño, pero guardar afiliados, citas o respuestas solo funciona en el sitio ya publicado.');
        }
        if (/infinityfree|subir|publicar|ftp|filezilla|que archivos (subo|subir)/.test(q)) {
            return bot('Para que un cambio se vea en el sitio, hay que subir los archivos nuevos a donde está publicado. Después entrá al panel y probá la sección que cambió.');
        }

        /* Panel y opciones */
        if (/anadir afiliado|agregar afiliado|eliminar afiliado|borrar afiliado|nuevo afiliado|registrar afiliado|afiliados|lista de afiliados|cedulas registradas/.test(q)) {
            return bot('En Afiliados tocá Añadir afiliado. Se abre una ventana para la cédula de 9 dígitos, el nombre completo y el correo. Esos tres datos tienen que ser exactamente los mismos que la persona va a escribir al pedir cita. Para quitar a alguien, abrí su casilla y tocá Eliminar de la base. Las solicitudes de afiliación que envía la gente están en Afiliaciones, no en esta lista.');
        }
        if (/consultas recientes|citas recientes|ultimas consultas|mas recientes|inicio del panel/.test(q)) {
            return bot('En Inicio, Consultas recientes muestra las últimas que llegaron, de contacto, afiliación y citas, de la más nueva a la más antigua. Cada una indica el tipo, la fecha y la hora. Al abrirla vas a la sección donde se responde.');
        }
        if (/advertencia|alerta|aviso de consulta|llego una consulta|consultas pendientes/.test(q)) {
            return bot('El botón de advertencia, arriba de Sitrabot, avisa cuando hay consultas sin responder. Solo dice de qué tipo es y cuándo llegó: no muestra el mensaje, el correo ni la cédula. Al tocar una, se abre esa consulta.');
        }
        if (/editar (la |una )?respuesta|mensaje editado|etiqueta editado|dice editado|volver a enviar|corregir (la |una )?respuesta/.test(q)) {
            return bot('Si ya enviaste una respuesta, al abrir de nuevo esa consulta aparece Editar, junto a Eliminar de la base. Corregís el texto y lo enviás otra vez. La persona lo ve en Mis mensajes con la etiqueta Editado. La primera vez que llega no lleva esa etiqueta.');
        }
        if (/como respondo|responder (una |la )?consulta|enviar (una |la )?respuesta|aceptar o rechazar|respuesta neutral/.test(q)) {
            return bot('Abrí la consulta en Contacto, Afiliaciones o Citas con Asesoría. Elegí aceptar, rechazar o una respuesta neutral, escribí el mensaje y envialo. Si la persona había entrado con el mismo correo del formulario, la respuesta le llega a Mis mensajes.');
        }
        if (/agregar fecha|asistente|pasos|como (agrego|abro) (una )?fecha|wizard/.test(q)) {
            return bot('En Horario tocá Agregar fecha y hora. Sirve solo para las citas con asesoría: primero el mes, después si el día está libre, ocupado o no se ofrece, luego el día y, si aplica, la hora. Al final se guarda.');
        }
        if (/habil|ocupada|no habil|bloqueada|tipo de fecha/.test(q)) {
            return bot('Día libre: se puede pedir cita. Ocupado: ya lo tiene alguien. No se ofrece: ese día no aparece para el público. Si el día no se ofrece, no hace falta elegir hora.');
        }
        if (/navbar|menu admin|afiliaciones|citas con asesoria|ver solicitudes|bandeja|contacto admin|afilacion admin/.test(q)) {
            return bot('El menú tiene Inicio, Afiliaciones, Afiliados, Citas con Asesoría, Horario y Contacto. En Inicio está la papelera: ahí se ven las consultas rechazadas y se pueden borrar para siempre. Horario solo define qué días y horas se pueden pedir para asesoría.');
        }
        if (/ver fechas|fechas guardadas|comentarios|de quien|para que|notas|citas reservadas/.test(q)) {
            return bot('En Horario, Ver fechas guardadas muestra cada día en una casilla: el número grande y el mes debajo. Al tocarla se abre el detalle. La hora vale para todos los días libres, no cambia de un día a otro. Para responder una cita usá Citas con Asesoría.');
        }
        if (/papelera|borrar (de la base|para siempre)|eliminar consulta|eliminar de la base/.test(q)) {
            return bot('La papelera está en Inicio y guarda las consultas rechazadas. Podés marcar una o varias y borrarlas para siempre. En una consulta abierta, Eliminar de la base también la quita. Esa acción no se deshace.');
        }
        if (/base respuestas|config_respuestas|sql\/respuestas/.test(q)) {
            return bot('Las respuestas que enviás quedan guardadas con la consulta. La persona las ve en Mis mensajes si usó el mismo correo con el que ingresó. No hace falta crear nada a mano para responder desde el panel.');
        }
        if (/cita publica|solicitar cita|pagina de citas|como reserva el usuario|como pide cita/.test(q)) {
            return bot('La persona pide la cita en la página pública, en un día y una hora que el horario tenga libres. Antes de continuar, su cédula, su nombre completo y su correo tienen que coincidir con un afiliado cargado en este panel. Después la ves en Citas con Asesoría.');
        }
        if (/cuenta admin|login|entrar|usuario y clave|password|contrasena/.test(q)) {
            return bot('Para entrar se usan la cuenta y la cédula de administración. No se pide una contraseña. No compartas correos ni cédulas por este chat.');
        }
        if (/cerrar sesion|salir|opciones/.test(q)) {
            return bot('Arriba a la derecha está Opciones. Ahí abrís Ayuda, la guía del panel, o Cerrar sesión.');
        }

        /* Diseño */
        if (/fondo|degradado|mismo (fondo|color) (del )?index|gradiente/.test(q)) {
            return bot('El fondo del panel es el mismo de la página pública: pasa del azul al crema y al naranja. En modo oscuro ese fondo también se oscurece.');
        }
        if (/modo oscuro|modo claro|tono|sol|luna|tema|dalton/.test(q)) {
            return bot('El botón de sol o luna, arriba a la derecha, cambia entre claro y oscuro. El mismo tono se recuerda en este navegador. En el sitio público, el engranaje también puede activar el modo para daltonismo, que usa azul en lugar de rojo.');
        }
        if (/popup|equis|cerrar (el )?popup|diseno (del )?panel|botones|boton de atras|flecha/.test(q)) {
            return bot('Las ventanas se cierran con la equis de la esquina. La flecha de volver, junto al nombre, lleva a Inicio y cambia de color con el modo claro u oscuro.');
        }
        if (/sitrabot (de )?usuarios|bot (del )?index|diferencia/.test(q)) {
            return bot('El Sitrabot de la página pública orienta a las personas: afiliación, citas, cuenta y Mis mensajes. Este Sitrabot Admin explica cómo usar el panel.');
        }
        if (/ide|visual studio|vscode|editor|codigo/.test(q)) {
            return bot('El diseño se puede revisar en la computadora, pero guardar afiliados, citas o respuestas solo funciona cuando el sitio ya está publicado.');
        }

        if (/que mas|otros temas|mas ayuda/.test(q)) {
            return bot('También puedo explicar cómo agregar o quitar afiliados, qué muestra Consultas recientes, para qué sirve el botón de advertencias, cómo editar una respuesta, el horario de citas y el tono claro u oscuro.');
        }

        return bot('No tengo esa respuesta exacta. Probá preguntar por afiliados, consultas recientes, advertencias, editar una respuesta, horario o modo oscuro. O escribí «ayuda».');
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
