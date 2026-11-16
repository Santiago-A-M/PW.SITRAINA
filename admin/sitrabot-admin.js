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
    caja.innerHTML = '<section class="sitrabot-panel" aria-hidden="true"><header class="sitrabot-cabeza">' + marca + '<div><strong>SITRABOT Admin</strong><span>Ayuda para estas secciones</span></div><button type="button" class="sitrabot-cerrar" aria-label="Cerrar chat"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg></button></header><div class="sitrabot-mensajes" role="log" aria-live="polite"></div><form class="sitrabot-form"><input type="text" aria-label="Tu pregunta" placeholder="Preguntá cómo usar estas secciones..." autocomplete="off"><button type="submit" aria-label="Enviar mensaje"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h13M12 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg></button></form></section><button type="button" class="sitrabot-abrir" aria-label="Sitrabot Admin" aria-expanded="false">' + logoImg + '</button><span class="sitrabot-aviso" aria-hidden="true">Sitrabot Admin</span>';
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
        return bot('Hola, soy Sitrabot. Puedo explicarte con palabras sencillas cómo responder, agregar o quitar personas afiliadas, ver lo más reciente, los avisos, corregir una respuesta y los días de las citas. ¿Qué necesitás?');
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
            return bot('Soy Sitrabot, el asistente de estas secciones. Explico cómo usarlas. No cambio datos ni envío respuestas por vos.');
        }
        if (/guardas|privacidad|quien ve/.test(q)) {
            return bot('Las preguntas de este chat se quedan solo en esta visita, en este dispositivo. No se envían a ningún otro lado.');
        }

        /* Bases de datos y config */
        if (/dos bases|2 bases|tres bases|3 bases|afiliaciones y admin|por que dos|cuantas bases|que guarda el sitio|donde se guardan/.test(q)) {
            return bot('El sitio guarda por separado a las personas afiliadas, las consultas que llegan, las respuestas que enviás y las cuentas. Para el trabajo de todos los días no hace falta conocer esos nombres: usá el menú.');
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
            return bot('Para que un cambio se vea en el sitio, hay que subir los archivos nuevos a donde está publicado. Después entrá y probá la sección que cambió.');
        }

        /* Panel y opciones */
        if (/anadir afiliado|agregar afiliado|eliminar afiliado|borrar afiliado|nuevo afiliado|registrar afiliado|afiliados|lista de afiliados|cedulas registradas/.test(q)) {
            return bot('En Afiliados tocá Añadir afiliado. Se abre una ventana para la cédula de 9 dígitos, el nombre completo y el correo. Esos tres datos tienen que ser los mismos que la persona va a escribir al pedir cita. Para quitar a alguien, abrí su tarjeta y tocá Quitar para siempre. Las solicitudes que envía la gente están en Afiliaciones, no en esta lista.');
        }
        if (/consultas recientes|citas recientes|ultimas consultas|mas recientes|inicio del panel/.test(q)) {
            return bot('En Inicio, Consultas recientes muestra las últimas que llegaron, de contacto, afiliación y citas, de la más nueva a la más antigua. Cada una indica quién la escribió, el día y la hora. Al abrirla vas a la sección donde se responde.');
        }
        if (/advertencia|alerta|aviso de consulta|llego una consulta|consultas pendientes/.test(q)) {
            return bot('El botón de advertencia, arriba de Sitrabot, avisa cuando hay consultas sin responder. Solo dice de qué tipo es y cuándo llegó: no muestra el mensaje, el correo ni la cédula. Al tocar una, se abre esa consulta.');
        }
        if (/editar (la |una )?respuesta|mensaje editado|etiqueta editado|dice editado|volver a enviar|corregir (la |una )?respuesta/.test(q)) {
            return bot('Si ya enviaste una respuesta, al abrir de nuevo esa consulta aparece Editar, junto a Quitar para siempre. Corregís el texto y lo enviás otra vez. La persona lo ve en Mis mensajes con la etiqueta Editado. La primera vez que llega no lleva esa etiqueta.');
        }
        if (/como respondo|responder (una |la )?consulta|enviar (una |la )?respuesta|aceptar o rechazar|respuesta neutral/.test(q)) {
            return bot('Abrí la consulta en Contacto, Afiliaciones o Citas con Asesoría. Elegí aceptar, rechazar o una respuesta sin decisión, escribí el mensaje con respeto y envialo. Si la persona había entrado con ese mismo correo, la respuesta le llega a Mis mensajes.');
        }
        if (/bloquear proxim|bloqueo de 15|proximos 15|siguientes 15/.test(q)) {
            return bot('Los 15 días de martes y jueves cambian solos. Agregar fecha y hora es para una excepción: cerrar un día en el que el abogado no va, abrir un día que no sea martes o jueves, o alargar el horario de un día. La hora que ponés es hasta cuándo atiende ese día.');
        }
        if (/15 dias|quince dias|reprogramar|cancelar (la |una )?cita/.test(q)) {
            return bot('Si la persona cancela una cita confirmada, tiene 15 días desde ese momento para volver a pedirla en Opciones, dentro de Citas. La nueva queda para el mismo día en que la pide, si ese día está disponible. Pasado ese plazo, la cita queda cancelada y ya no se recupera. Para cerrar un día en el que el abogado no va, en Citas con Asesoría usá Agregar fecha y hora y elegí No disponible.');
        }
        if (/agregar fecha|asistente|pasos|como (agrego|abro) (una )?fecha|wizard/.test(q)) {
            return bot('En Citas con Asesoría tocá Agregar fecha y hora. Elegí el mes y después Disponible o No disponible. Podés marcar varios días, incluso un martes o un jueves de los 15 días. Si queda disponible, la hora es hasta cuándo atiende ese día. Los 15 días automáticos siguen cambiando solos.');
        }
        if (/habil|ocupada|no habil|bloqueada|tipo de fecha/.test(q)) {
            return bot('Día disponible: se pueden asignar citas en las horas libres de ese día. No disponible: no se ofrece. Cada hora se ocupa solo cuando aceptás una solicitud en esa hora. Las demás horas del mismo día siguen libres. Si no la aceptás, no se ocupa nada. Una solicitud en espera tampoco ocupa una hora.');
        }
        if (/navbar|menu admin|afiliaciones|citas con asesoria|ver solicitudes|bandeja|contacto admin|afilacion admin/.test(q)) {
            return bot('El menú tiene Inicio, Afiliaciones, Afiliados, Citas con Asesoría y Contacto. En Inicio está la papelera: ahí se ven las consultas rechazadas y se pueden borrar para siempre. En Citas con Asesoría se responde cada solicitud y se marcan los días y las horas.');
        }
        if (/ver fechas|fechas guardadas|comentarios|de quien|para que|notas|citas reservadas/.test(q)) {
            return bot('En Citas con Asesoría, la lista muestra las citas que pidieron las personas: el nombre, el día y la hora. Abrí una para responder.');
        }
        if (/papelera|borrar (de la base|para siempre)|eliminar consulta|eliminar de la base/.test(q)) {
            return bot('La papelera está en Inicio y guarda las solicitudes que no se aceptaron. Podés marcar una o varias y quitarlas para siempre. En una consulta abierta, Quitar para siempre también la quita. Esa acción no se deshace.');
        }
        if (/base respuestas|config_respuestas|sql\/respuestas/.test(q)) {
            return bot('Las respuestas que enviás quedan guardadas con la consulta. La persona las ve en Mis mensajes si usó el mismo correo con el que entró. No hace falta preparar nada más para responder.');
        }
        if (/cita publica|solicitar cita|pagina de citas|como reserva el usuario|como pide cita/.test(q)) {
            return bot('La persona elige el día y la hora en la página, entre los días disponibles de los próximos 15 días. Si llega una solicitud sin fecha, la ves en Citas con Asesoría. Al abrirla ves la información y elegís el mes, el día y la hora. Esa hora queda ocupada y el día sigue disponible para las demás. Un día que no se ofrece no se puede usar. Si no la aceptás, no se ocupa ninguna hora.');
        }
        if (/cuenta admin|login|entrar|usuario y clave|password|contrasena/.test(q)) {
            return bot('Para entrar se usan la cuenta y la cédula de administración. No se pide una contraseña. No compartas correos ni cédulas por este chat.');
        }
        if (/cerrar sesion|salir|opciones/.test(q)) {
            return bot('Arriba a la derecha está Opciones. Ahí abrís Ayuda o Cerrar sesión.');
        }

        /* Diseño */
        if (/fondo|degradado|mismo (fondo|color) (del )?index|gradiente/.test(q)) {
            return bot('El fondo es el mismo de la página pública: pasa del azul al crema y al naranja. En modo oscuro ese fondo también se oscurece.');
        }
        if (/modo oscuro|modo claro|tono|sol|luna|tema|dalton/.test(q)) {
            return bot('El botón de sol o luna, arriba a la derecha, cambia entre claro y oscuro. El mismo tono se recuerda en este navegador. En el sitio público, el engranaje también puede activar el modo para daltonismo, que usa azul en lugar de rojo.');
        }
        if (/popup|equis|cerrar (el )?popup|diseno (del )?panel|botones|boton de atras|flecha/.test(q)) {
            return bot('Las ventanas se cierran con la equis de la esquina. La flecha de volver, junto al nombre, lleva a Inicio y cambia de color con el modo claro u oscuro.');
        }
        if (/sitrabot (de )?usuarios|bot (del )?index|diferencia/.test(q)) {
            return bot('El Sitrabot de la página pública orienta a las personas: afiliación, citas, cuenta y Mis mensajes. Este explica cómo usar estas secciones.');
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
