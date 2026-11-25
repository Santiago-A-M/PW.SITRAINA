<?php
/* Registro, ingreso y cierre de sesión de Usuario_Web. */
ob_start();
require_once __DIR__ . '/conexion.php';
require_once __DIR__ . '/sesion_usuario.php';
ob_end_clean();

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Frame-Options: DENY');

function usuario_auth_responder($codigo, $datos) {
    http_response_code($codigo);
    echo json_encode($datos, JSON_UNESCAPED_UNICODE);
    exit;
}

function usuario_auth_normalizar_cedula($valor) {
    return preg_replace('/\D/', '', (string) $valor);
}

function usuario_auth_correo_opcional($valor) {
    $correo = strtolower(trim((string) $valor));
    if ($correo === '') {
        return '';
    }
    if (!filter_var($correo, FILTER_VALIDATE_EMAIL) || strlen($correo) > 120) {
        return false;
    }
    return $correo;
}

/* null si no existe, false si la consulta falló. */
function usuario_web_por_cedula($db, $cedula) {
    $consulta = $db->prepare('SELECT id, nombre, correo, cedula, activo FROM Usuario_Web WHERE cedula = ? LIMIT 1');
    if (!$consulta) {
        return false;
    }
    $consulta->bind_param('s', $cedula);
    if (!$consulta->execute()) {
        $consulta->close();
        return false;
    }
    $id = 0;
    $nombre = '';
    $correo = null;
    $cedulaDb = null;
    $activo = 0;
    $consulta->bind_result($id, $nombre, $correo, $cedulaDb, $activo);
    $hay = $consulta->fetch();
    $consulta->close();
    if (!$hay) {
        return null;
    }
    $cedulaLimpia = usuario_auth_normalizar_cedula($cedulaDb);
    $correoLimpio = strtolower(trim((string) $correo));
    return [
        'id' => (int) $id,
        'nombre' => (string) $nombre,
        'correo' => filter_var($correoLimpio, FILTER_VALIDATE_EMAIL) ? $correoLimpio : '',
        'cedula' => preg_match('/^[0-9]{9}$/', $cedulaLimpia) ? $cedulaLimpia : '',
        'activo' => (int) $activo,
    ];
}

/* Si la cédula ya está en Cuenta, abre la misma cuenta de ingreso. null si no es afiliado. */
function usuario_web_desde_afiliado($db, $cedula) {
    $afiliados = abrir_afiliados();
    if (!$afiliados) {
        return false;
    }
    $consulta = $afiliados->prepare('SELECT nombre_completo, correo FROM Cuenta WHERE cedula = ? LIMIT 1');
    if (!$consulta) {
        $afiliados->close();
        return false;
    }
    $consulta->bind_param('s', $cedula);
    if (!$consulta->execute()) {
        $consulta->close();
        $afiliados->close();
        return false;
    }
    $nombre = '';
    $correo = null;
    $consulta->bind_result($nombre, $correo);
    $hay = $consulta->fetch();
    $consulta->close();
    $afiliados->close();
    if (!$hay) {
        return null;
    }
    $nombre = trim((string) $nombre);
    if ($nombre === '') {
        $nombre = 'Cuenta';
    }
    $correoLimpio = strtolower(trim((string) $correo));
    if ($correoLimpio === '' || !filter_var($correoLimpio, FILTER_VALIDATE_EMAIL)) {
        $correoLimpio = '';
    }
    if ($correoLimpio !== '') {
        $alta = $db->prepare('INSERT INTO Usuario_Web (nombre, correo, cedula, activo) VALUES (?, ?, ?, 1)');
        if (!$alta) {
            return false;
        }
        $alta->bind_param('sss', $nombre, $correoLimpio, $cedula);
    } else {
        $alta = $db->prepare('INSERT INTO Usuario_Web (nombre, correo, cedula, activo) VALUES (?, NULL, ?, 1)');
        if (!$alta) {
            return false;
        }
        $alta->bind_param('ss', $nombre, $cedula);
    }
    $ok = $alta->execute();
    $codigo = (int) $alta->errno;
    $alta->close();
    if (!$ok && $codigo !== 1062) {
        return false;
    }
    $cuenta = usuario_web_por_cedula($db, $cedula);
    if ($cuenta === false || !$cuenta || !(int) $cuenta['activo']) {
        return $cuenta === false ? false : null;
    }
    return $cuenta;
}

function usuario_auth_estado() {
    $id = sitraina_usuario_id();
    $nombre = '';
    if ($id > 0) {
        $nombre = (string) ($_SESSION['usuario_nombre'] ?? '');
    }
    $marca = $id > 0 ? sitraina_marca_afiliacion() : 'sin_sesion';
    return [
        'ok' => true,
        'ingresado' => $id > 0,
        'usuario_id' => $id,
        'nombre' => $nombre,
        'token' => sitraina_usuario_token(),
        'afiliado' => $marca === 'si' || $marca === 'menor_anio',
        'puede_cita' => $marca === 'si',
        'afiliacion' => $marca,
    ];
}

sitraina_sesion_usuario();
$accion = strtolower(trim((string) ($_GET['accion'] ?? $_POST['accion'] ?? 'estado')));

if ($accion === 'estado') {
    usuario_auth_responder(200, usuario_auth_estado());
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    usuario_auth_responder(405, ['ok' => false, 'mensaje' => 'No se pudo completar. Volvé a intentarlo desde la página.']);
}

$token = (string) ($_POST['token'] ?? '');
if (!sitraina_usuario_token_ok($token)) {
    usuario_auth_responder(400, ['ok' => false, 'mensaje' => 'Volvé a intentarlo desde la página.']);
}

if ($accion === 'salir') {
    sitraina_usuario_soltar((int) ($_SESSION['usuario_id'] ?? 0), (string) ($_SESSION['usuario_sesion'] ?? ''));
    $_SESSION = [];
    if (ini_get('session.use_cookies')) {
        $p = session_get_cookie_params();
        setcookie(session_name(), '', time() - 42000, $p['path'], $p['domain'], $p['secure'], $p['httponly']);
    }
    session_destroy();
    sitraina_sesion_usuario();
    usuario_auth_responder(200, array_merge(usuario_auth_estado(), ['mensaje' => 'Cerraste la sesión. Hasta pronto.']));
}

$fallos = (int) ($_SESSION['usuario_fallos'] ?? 0);
if ($fallos >= 8 && ($accion === 'ingresar' || $accion === 'registrar')) {
    usuario_auth_responder(429, ['ok' => false, 'mensaje' => 'Demasiados intentos. Esperá un momento y volvé a probar.']);
}

$db = abrir_cuentas_web();
if (!$db) {
    $avisoCuentas = is_file(__DIR__ . '/config_usuarios.php')
        ? 'No pudimos abrir tu cuenta en este momento. Intentá de nuevo más tarde.'
        : 'No pudimos abrir tu cuenta en este momento. Intentá de nuevo más tarde.';
    usuario_auth_responder(500, ['ok' => false, 'mensaje' => $avisoCuentas]);
}

if ($accion === 'ingresar') {
    $cedula = usuario_auth_normalizar_cedula($_POST['cedula'] ?? '');
    if (!preg_match('/^[0-9]{9}$/', $cedula)) {
        $_SESSION['usuario_fallos'] = $fallos + 1;
        $db->close();
        usuario_auth_responder(400, ['ok' => false, 'mensaje' => 'Escribí tu cédula de 9 dígitos para continuar.']);
    }
    $cuentaWeb = usuario_web_por_cedula($db, $cedula);
    if ($cuentaWeb === false) {
        $db->close();
        usuario_auth_responder(500, ['ok' => false, 'mensaje' => 'No se pudo consultar la cuenta.']);
    }
    if ($cuentaWeb && !(int) $cuentaWeb['activo']) {
        $db->close();
        $_SESSION['usuario_fallos'] = $fallos + 1;
        usuario_auth_responder(401, ['ok' => false, 'mensaje' => 'Esa cédula todavía no tiene una cuenta. Podés crearla.']);
    }
    if (!$cuentaWeb) {
        $cuentaWeb = usuario_web_desde_afiliado($db, $cedula);
        if ($cuentaWeb === false) {
            $db->close();
            usuario_auth_responder(500, ['ok' => false, 'mensaje' => 'No se pudo consultar la cuenta.']);
        }
    }
    if (!$cuentaWeb) {
        $db->close();
        $_SESSION['usuario_fallos'] = $fallos + 1;
        usuario_auth_responder(401, ['ok' => false, 'mensaje' => 'Esa cédula todavía no tiene una cuenta. Podés crearla.']);
    }
    if (sitraina_usuario_id() > 0) {
        $db->close();
        usuario_auth_responder(409, ['ok' => false, 'mensaje' => 'Ya iniciaste sesión en este navegador. Cerrala antes de entrar de nuevo.']);
    }
    $ocupada = sitraina_cuenta_sesion_ocupada($db, (int) $cuentaWeb['id']);
    if ($ocupada === null) {
        $db->close();
        usuario_auth_responder(500, ['ok' => false, 'mensaje' => 'No se pudo consultar la cuenta.']);
    }
    if ($ocupada) {
        $db->close();
        usuario_auth_responder(409, ['ok' => false, 'mensaje' => 'Ya hay una sesión abierta en otra pestaña o dispositivo. Cerrala ahí para poder entrar acá.']);
    }
    $claveSesion = sitraina_usuario_tomar($db, (int) $cuentaWeb['id']);
    if ($claveSesion === false) {
        $db->close();
        usuario_auth_responder(409, ['ok' => false, 'mensaje' => 'Ya hay una sesión abierta en otra pestaña o dispositivo. Cerrala ahí para poder entrar acá.']);
    }
    $db->close();
    session_regenerate_id(true);
    $_SESSION['usuario_sesion'] = $claveSesion;
    $_SESSION['usuario_id'] = (int) $cuentaWeb['id'];
    $_SESSION['usuario_nombre'] = (string) $cuentaWeb['nombre'];
    $_SESSION['usuario_correo'] = (string) ($cuentaWeb['correo'] ?? '');
    $_SESSION['usuario_cedula'] = (string) ($cuentaWeb['cedula'] ?? $cedula);
    $_SESSION['usuario_fallos'] = 0;
    unset($_SESSION['usuario_token']);
    usuario_auth_responder(200, array_merge(usuario_auth_estado(), ['mensaje' => 'Listo, ya entraste.']));
}

if ($accion === 'registrar') {
    $nombre = trim((string) ($_POST['nombre'] ?? ''));
    $correo = usuario_auth_correo_opcional($_POST['correo'] ?? '');
    $cedula = usuario_auth_normalizar_cedula($_POST['cedula'] ?? '');
    if ($nombre === '' || strlen($nombre) > 120) {
        $db->close();
        usuario_auth_responder(400, ['ok' => false, 'mensaje' => 'Escribí tu nombre. Si quedó muy largo, acortalo un poco.']);
    }
    if (!preg_match('/^[0-9]{9}$/', $cedula)) {
        $db->close();
        usuario_auth_responder(400, ['ok' => false, 'mensaje' => 'La cédula es obligatoria y debe tener 9 dígitos.']);
    }
    if ($correo === false) {
        $db->close();
        usuario_auth_responder(400, ['ok' => false, 'mensaje' => 'Revisá el correo. Si lo ponés, tiene que estar completo.']);
    }
    if (sitraina_usuario_id() > 0) {
        $db->close();
        usuario_auth_responder(409, ['ok' => false, 'mensaje' => 'Ya iniciaste sesión en este navegador. Cerrala antes de crear otra cuenta.']);
    }
    if ($correo !== '') {
        $consulta = $db->prepare(
            'INSERT INTO Usuario_Web (nombre, correo, cedula, activo) VALUES (?, ?, ?, 1)'
        );
        if (!$consulta) {
            $db->close();
            usuario_auth_responder(500, ['ok' => false, 'mensaje' => 'No pudimos crear la cuenta en este momento. Intentá de nuevo más tarde.']);
        }
        $consulta->bind_param('sss', $nombre, $correo, $cedula);
    } else {
        $consulta = $db->prepare(
            'INSERT INTO Usuario_Web (nombre, correo, cedula, activo) VALUES (?, NULL, ?, 1)'
        );
        if (!$consulta) {
            $db->close();
            usuario_auth_responder(500, ['ok' => false, 'mensaje' => 'No pudimos crear la cuenta en este momento. Intentá de nuevo más tarde.']);
        }
        $consulta->bind_param('ss', $nombre, $cedula);
    }
    $ok = $consulta->execute();
    $codigo = $consulta->errno;
    $nuevoId = $ok ? (int) $db->insert_id : 0;
    $consulta->close();
    $claveSesion = ($ok && $nuevoId > 0) ? sitraina_usuario_tomar($db, $nuevoId) : false;
    if ($ok && $nuevoId > 0 && $claveSesion === false) {
        $db->close();
        usuario_auth_responder(500, ['ok' => false, 'mensaje' => 'No se pudo crear la cuenta.']);
    }
    $db->close();
    if (!$ok) {
        if ($codigo === 1062) {
            usuario_auth_responder(409, ['ok' => false, 'mensaje' => 'Esa cédula o ese correo ya tiene una cuenta.']);
        }
        usuario_auth_responder(500, ['ok' => false, 'mensaje' => 'No se pudo crear la cuenta.']);
    }
    session_regenerate_id(true);
    $_SESSION['usuario_sesion'] = $claveSesion;
    $_SESSION['usuario_id'] = $nuevoId;
    $_SESSION['usuario_nombre'] = $nombre;
    $_SESSION['usuario_correo'] = $correo !== '' ? $correo : '';
    $_SESSION['usuario_cedula'] = $cedula;
    $_SESSION['usuario_fallos'] = 0;
    unset($_SESSION['usuario_token']);
    usuario_auth_responder(200, array_merge(usuario_auth_estado(), ['mensaje' => 'Listo, tu cuenta quedó creada.']));
}

usuario_auth_responder(400, ['ok' => false, 'mensaje' => 'No reconocimos lo que pediste. Volvé a intentarlo.']);
