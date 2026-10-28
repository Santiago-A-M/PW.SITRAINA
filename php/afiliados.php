<?php
/* Recibe la cita o la afiliación, las revisa y reenvía el correo por FormSubmit. */
/*
 * CORREO DESTINO (citas + afiliaciones en vivo):
 * Cambia la URL de FormSubmit en reenviarCorreo() más abajo.
 * Ejemplo: https://formsubmit.co/tu-correo@dominio.com
 * Activa ese correo una vez en https://formsubmit.co
 * Mantén la misma URL en afiliacion.html y solicitar-cita.html.
 */
mysqli_report(MYSQLI_REPORT_OFF);

/* Escapa un texto antes de mostrarlo en HTML. */
function h($texto) {
    return htmlspecialchars((string) $texto, ENT_QUOTES, 'UTF-8');
}

/* Muestra una página corta de aviso y detiene el proceso. */
function pagina($titulo, $mensaje, $volver) {
    echo '<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">';
    echo '<meta name="viewport" content="width=device-width, initial-scale=1.0">';
    echo '<title>' . h($titulo) . '</title>';
    echo '<link rel="stylesheet" href="../css/estilo.css?v=2.37">';
    echo '</head><body><main class="contenedor" style="padding:120px 20px 60px">';
    echo '<h1>' . h($titulo) . '</h1><p>' . h($mensaje) . '</p>';
    echo '<p><a class="btn" href="' . h($volver) . '">Volver</a></p>';
    echo '</main></body></html>';
    exit;
}

/* Página a la que se vuelve cuando la cita o la afiliación se envió. */
function destino($accion) {
    if ($accion === 'verificar') {
        return '../index.html?enviada=1#cita';
    }
    return '../index.html?enviada=1#afiliacion';
}

/* Página del formulario al que se regresa si hay un error. */
function volver($accion) {
    if ($accion === 'verificar') {
        return '../index.html#cita';
    }
    return '../index.html#afiliacion';
}

/* Lee un texto de la boleta. Vacío queda null. Si supera el máximo, devuelve false. */
function campo($clave, $maximo) {
    $valor = trim((string) ($_POST[$clave] ?? ''));
    if ($valor === '') {
        return null;
    }
    $largo = function_exists('mb_strlen') ? mb_strlen($valor, 'UTF-8') : strlen($valor);
    if ($largo > $maximo) {
        return false;
    }
    return $valor;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    pagina('Afiliados', 'Esta dirección solo recibe el formulario.', '../index.html#afiliacion');
}

$accion = $_POST['accion'] ?? '';

/* Valida cédula + nombre completo + correo contra Info_Afiliados.Cuenta (solo lectura). */
if ($accion === 'consultar') {
    header('Content-Type: application/json; charset=UTF-8');
    header('Cache-Control: no-store');
    $cedulaConsulta = preg_replace('/\D/', '', (string) ($_POST['cedula'] ?? ''));
    $nombreConsulta = trim((string) ($_POST['nombre_completo'] ?? $_POST['nombre'] ?? ''));
    $correoConsulta = strtolower(trim((string) ($_POST['correo'] ?? '')));
    $responder = function ($ok, $mensaje) {
        echo json_encode(array('ok' => $ok, 'mensaje' => $mensaje), JSON_UNESCAPED_UNICODE);
        exit;
    };
    if (!preg_match('/^[0-9]{9}$/', $cedulaConsulta)) {
        $responder(false, 'La cédula debe tener 9 dígitos.');
    }
    if ($nombreConsulta === '' || (function_exists('mb_strlen') ? mb_strlen($nombreConsulta, 'UTF-8') : strlen($nombreConsulta)) > 120) {
        $responder(false, 'Escribe el nombre completo como figura en el registro.');
    }
    if (!preg_match('/^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9\-]+(?:\.[a-zA-Z0-9\-]+)*\.[a-zA-Z]{2,}$/', $correoConsulta)) {
        $responder(false, 'Escribe un correo válido.');
    }
    $configConsulta = __DIR__ . '/config_afiliados.php';
    if (!is_file($configConsulta)) {
        $responder(false, 'No se pudo comprobar la cuenta de afiliado.');
    }
    try {
        $datosConsulta = require $configConsulta;
        $baseConsulta = new mysqli($datosConsulta['host'], $datosConsulta['usuario'], $datosConsulta['clave'], $datosConsulta['nombre']);
    } catch (Throwable $e) {
        $responder(false, 'No se pudo comprobar la cuenta de afiliado.');
    }
    if ($baseConsulta->connect_errno) {
        $responder(false, 'No se pudo comprobar la cuenta de afiliado.');
    }
    $baseConsulta->set_charset('utf8mb4');
    $busqueda = $baseConsulta->prepare(
        'SELECT id FROM Cuenta WHERE cedula = ? AND nombre_completo = ? AND correo = ? LIMIT 1'
    );
    if (!$busqueda) {
        $baseConsulta->close();
        $responder(false, 'No se pudo comprobar la cuenta de afiliado.');
    }
    $busqueda->bind_param('sss', $cedulaConsulta, $nombreConsulta, $correoConsulta);
    $busqueda->execute();
    $busqueda->store_result();
    $registrada = $busqueda->num_rows === 1;
    $busqueda->close();
    $baseConsulta->close();
    if (!$registrada) {
        $responder(false, 'Cédula, nombre completo y correo no coinciden con un afiliado registrado. Deben cargarse manualmente en Info_Afiliados antes de pedir la cita.');
    }
    $responder(true, '');
}
$cedula = preg_replace('/\D/', '', (string) ($_POST['cedula'] ?? ''));
$correo = strtolower(trim((string) ($_POST['correo'] ?? '')));
if ($correo === '') {
    $correo = strtolower(trim((string) ($_POST['correo_personal'] ?? '')));
}
if ($correo === '') {
    $correo = strtolower(trim((string) ($_POST['correo_ina'] ?? '')));
}
if ($correo === '') {
    $correo = strtolower(trim((string) ($_POST['email'] ?? '')));
}

if (!preg_match('/^[0-9]{9}$/', $cedula)) {
    pagina('Cédula', 'La cédula debe tener 9 dígitos.', volver($accion));
}
if (!preg_match('/^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9\-]+(?:\.[a-zA-Z0-9\-]+)*\.[a-zA-Z]{2,}$/', $correo)) {
    pagina('Correo', 'Escribe un correo válido.', volver($accion));
}

if ($accion === 'verificar') {
    $nombreCita = trim((string) ($_POST['nombre'] ?? ''));
    $sedeCita = trim((string) ($_POST['sede'] ?? ''));
    $motivoCita = trim((string) ($_POST['motivo'] ?? ''));
    $telefonoCita = preg_replace('/\D/', '', (string) ($_POST['telefono'] ?? ''));
    if (strpos($telefonoCita, '506') === 0 && strlen($telefonoCita) === 11) {
        $telefonoCita = substr($telefonoCita, 3);
    }
    $largoNombre = function_exists('mb_strlen') ? mb_strlen($nombreCita, 'UTF-8') : strlen($nombreCita);
    $largoSede = function_exists('mb_strlen') ? mb_strlen($sedeCita, 'UTF-8') : strlen($sedeCita);
    $largoMotivo = function_exists('mb_strlen') ? mb_strlen($motivoCita, 'UTF-8') : strlen($motivoCita);
    if ($nombreCita === '' || $largoNombre > 120) {
        pagina('Cita', 'Escribe el nombre completo.', volver($accion));
    }
    if (!preg_match('/^[0-9]{8}$/', $telefonoCita)) {
        pagina('Cita', 'El teléfono debe tener 8 dígitos.', volver($accion));
    }
    if ($sedeCita === '' || $largoSede > 120) {
        pagina('Cita', 'Escribe la sede o el centro de trabajo.', volver($accion));
    }
    if ($motivoCita === '' || $largoMotivo > 800) {
        pagina('Cita', 'Escribe el motivo de la consulta.', volver($accion));
    }
}

$configArchivo = __DIR__ . '/config.php';
if (!is_file($configArchivo)) {
    pagina('Base de datos', 'Falta php/config.php en el servidor.', volver($accion));
}

try {
    $config = require $configArchivo;
    $mysqli = new mysqli($config['host'], $config['usuario'], $config['clave'], $config['nombre']);
} catch (Throwable $e) {
    pagina('Base de datos', 'No se pudo conectar. Revisa el host, el nombre, el usuario y la clave en config.php.', volver($accion));
}
if ($mysqli->connect_errno) {
    pagina('Base de datos', 'No se pudo conectar. Intentá de nuevo más tarde.', volver($accion));
}
$mysqli->set_charset('utf8mb4');

if ($accion === 'verificar') {
    $mysqli->close();
    require_once __DIR__ . '/disponibilidad.php';
    $nombreCita = trim((string) ($_POST['nombre'] ?? ''));
    $afiliadosDb = abrir_afiliados();
    if (!$afiliadosDb) {
        pagina('Afiliación', 'Falta php/config_afiliados.php o la base Info_Afiliados.', volver($accion));
    }
    $consulta = $afiliadosDb->prepare(
        'SELECT id FROM Cuenta WHERE cedula = ? AND nombre_completo = ? AND correo = ? LIMIT 1'
    );
    if (!$consulta) {
        $afiliadosDb->close();
        pagina('Afiliación', 'No se pudo consultar la cuenta de afiliado.', volver($accion));
    }
    $consulta->bind_param('sss', $cedula, $nombreCita, $correo);
    $consulta->execute();
    $consulta->store_result();
    $encontrado = $consulta->num_rows === 1;
    $consulta->close();
    $afiliadosDb->close();
    if (!$encontrado) {
        pagina('Solicitud no procedente', 'Cédula, nombre completo y correo no figuran como afiliado registrado.', volver($accion));
    }
    $fechaCita = (string) ($_POST['fecha'] ?? '');
    $horaCita = (string) ($_POST['hora'] ?? '');
    $adminDb = abrir_admin();
    $reglasCita = $adminDb ? leer_agenda($adminDb) : ['fechas' => [], 'meses' => [], 'horas' => []];
    if ($adminDb) {
        $adminDb->close();
    }
    if (!is_array($reglasCita)) {
        $reglasCita = ['fechas' => [], 'meses' => [], 'horas' => []];
    }
    if (!cita_permitida($fechaCita, $horaCita, $reglasCita)) {
        pagina('Cita', 'Esa fecha u hora no está disponible.', volver($accion));
    }
    $consultasDb = abrir_consultas();
    if (!$consultasDb) {
        pagina('Cita', 'No se pudo guardar la cita. Intentá de nuevo más tarde.', volver($accion));
    }
    $motivoCita = trim((string) ($_POST['motivo'] ?? ''));
    $reservada = reservar_cita($consultasDb, $fechaCita, $horaCita, $nombreCita, $motivoCita, '', $correo, $cedula);
    if ($reservada === false) {
        $consultasDb->close();
        pagina('Cita', 'Esa hora ya está agendada.', volver($accion));
    }
    if ($reservada === null) {
        $consultasDb->close();
        pagina('Cita', 'No se pudo guardar la cita. Intentá de nuevo más tarde.', volver($accion));
    }
    $consultasDb->close();
    /* La cita ya quedó en Consulta_Asesoria: no se deshace si falla FormSubmit (InfinityFree). */
    if (!reenviarCorreo()) {
        if ($reservada) {
            pagina(
                'Cita guardada',
                'La cita quedó registrada en el panel. El correo de confirmación no se pudo enviar ahora; revisá FormSubmit o escribinos a sitraina@ina.ac.cr.',
                destino($accion)
            );
        }
        pagina('Correo', 'No se pudo enviar el correo de la cita. Intentá de nuevo o escribinos a sitraina@ina.ac.cr.', volver($accion));
    }
    header('Location: ' . destino($accion));
    exit;
}

if ($accion === 'guardar') {
    /* Guarda la petición en Consulta_Afiliacion. No toca Info_Afiliados.Cuenta. */
    $nombre = campo('nombre', 120);
    $correoIna = campo('correo_ina', 120);
    $correoPersonal = campo('correo_personal', 120);
    $nombramiento = campo('nombramiento', 80);
    $unidad = campo('unidad', 120);
    $centro = campo('centro', 120);
    $puesto = campo('puesto', 120);
    $telefonoTrabajo = campo('telefono_trabajo', 20);
    $telefonoDomicilio = campo('telefono_domicilio', 20);
    $telefonoCelular = campo('telefono_celular', 20);
    $fechaNacimiento = trim((string) ($_POST['fecha_nacimiento'] ?? ''));
    if ($nombre === false || $correoIna === false || $correoPersonal === false || $nombramiento === false || $unidad === false || $centro === false || $puesto === false || $telefonoTrabajo === false || $telefonoDomicilio === false || $telefonoCelular === false) {
        $mysqli->close();
        pagina('Afiliación', 'Uno de los datos es demasiado largo.', volver($accion));
    }
    if ($nombre === null) {
        $mysqli->close();
        pagina('Afiliación', 'Escribe el nombre completo.', volver($accion));
    }
    if ($nombramiento === null || $unidad === null || $centro === null || $puesto === null) {
        $mysqli->close();
        pagina('Afiliación', 'Completa el nombramiento, la unidad, el centro y el puesto.', volver($accion));
    }
    if ($fechaNacimiento === '') {
        $mysqli->close();
        pagina('Afiliación', 'Escribe la fecha de nacimiento.', volver($accion));
    }
    $celular = preg_replace('/\D/', '', (string) $telefonoCelular);
    if (strpos($celular, '506') === 0 && strlen($celular) === 11) {
        $celular = substr($celular, 3);
    }
    if (!preg_match('/^[0-9]{8}$/', $celular)) {
        $mysqli->close();
        pagina('Afiliación', 'El celular debe tener 8 dígitos.', volver($accion));
    }
    $telefonoCelular = $celular;
    if (is_string($correoIna)) {
        $correoIna = strtolower($correoIna);
    }
    if (is_string($correoPersonal)) {
        $correoPersonal = strtolower($correoPersonal);
    }
    $patronCorreo = '/^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9\-]+(?:\.[a-zA-Z0-9\-]+)*\.[a-zA-Z]{2,}$/';
    if ((is_string($correoIna) && !preg_match($patronCorreo, $correoIna)) || (is_string($correoPersonal) && !preg_match($patronCorreo, $correoPersonal))) {
        $mysqli->close();
        pagina('Correo', 'Escribe un correo válido.', volver($accion));
    }
    if ($fechaNacimiento === '') {
        $fechaNacimiento = null;
    } else {
        $fechaOk = DateTime::createFromFormat('Y-m-d', $fechaNacimiento);
        $hoy = new DateTime('today');
        if (!$fechaOk || $fechaOk->format('Y-m-d') !== $fechaNacimiento || $fechaOk > $hoy || $fechaOk < new DateTime('1900-01-01')) {
            $mysqli->close();
            pagina('Afiliación', 'La fecha de nacimiento no es válida.', volver($accion));
        }
    }

    $consulta = $mysqli->prepare('SELECT id FROM Consulta_Afiliacion WHERE cedula = ? LIMIT 1');
    if (!$consulta) {
        $mysqli->close();
        pagina('Afiliación', 'No se pudo consultar la boleta.', volver($accion));
    }
    $consulta->bind_param('s', $cedula);
    $consulta->execute();
    $consulta->store_result();
    $yaEnviada = $consulta->num_rows === 1;
    $consulta->close();
    if ($yaEnviada) {
        $mysqli->close();
        pagina('Afiliación', 'Esa cédula ya envió una boleta. No puede enviarse otra vez.', volver($accion));
    }

    $cambio = $mysqli->prepare('INSERT INTO Consulta_Afiliacion (nombre, cedula, correo_ina, correo_personal, fecha_nacimiento, nombramiento, unidad, centro, puesto, telefono_trabajo, telefono_domicilio, telefono_celular) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
    if (!$cambio) {
        $mysqli->close();
        pagina('Afiliación', 'No se pudo guardar la afiliación.', volver($accion));
    }
    $cambio->bind_param(
        'ssssssssssss',
        $nombre,
        $cedula,
        $correoIna,
        $correoPersonal,
        $fechaNacimiento,
        $nombramiento,
        $unidad,
        $centro,
        $puesto,
        $telefonoTrabajo,
        $telefonoDomicilio,
        $telefonoCelular
    );
    $guardado = $cambio->execute();
    $error = $cambio->error;
    $codigo = $cambio->errno;
    $boletaId = $guardado ? (int) $mysqli->insert_id : 0;
    $cambio->close();
    $mysqli->close();
    if (!$guardado) {
        if ($codigo === 1062) {
            pagina('Afiliación', 'Esa cédula ya envió una boleta. No puede enviarse otra vez.', volver($accion));
        }
        pagina('Afiliación', 'No se pudo guardar la afiliación.', volver($accion));
    }
    if (!reenviarCorreo()) {
        pagina('Afiliación guardada', 'Los datos ya quedaron en la base. El correo con el PDF no se pudo enviar.', destino($accion));
    }
    header('Location: ' . destino($accion));
    exit;
}

$mysqli->close();
pagina('Afiliación', 'No se reconoció el formulario.', '../index.html#afiliacion');

/* Reenvía los datos del formulario al correo activado en FormSubmit. */
function reenviarCorreo() {
    if (!function_exists('curl_init')) {
        return false;
    }
    $campos = $_POST;
    unset($campos['accion']);
    if (!empty($_FILES['attachment']['tmp_name']) && is_uploaded_file($_FILES['attachment']['tmp_name'])) {
        $campos['attachment'] = new CURLFile(
            $_FILES['attachment']['tmp_name'],
            'application/pdf',
            $_FILES['attachment']['name'] ?: 'afiliacion.pdf'
        );
    }
    // >>> CORREO DESTINO: pon aquí el FormSubmit del email que debe recibir citas y afiliaciones.
    //     Actívalo en formsubmit.co. Debe ser el mismo que en afiliacion.html y solicitar-cita.html.
    $curl = curl_init('https://formsubmit.co/sitraina@ina.ac.cr');
    curl_setopt_array($curl, [
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => $campos,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_TIMEOUT => 30,
    ]);
    curl_exec($curl);
    $codigo = (int) curl_getinfo($curl, CURLINFO_HTTP_CODE);
    curl_close($curl);
    return $codigo >= 200 && $codigo < 400;
}
