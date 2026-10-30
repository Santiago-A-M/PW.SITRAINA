<?php
/* Registro, ingreso y cierre de sesión de Usuario_Web. */
ob_start();
require_once __DIR__ . '/sesion_usuario.php';
require_once __DIR__ . '/disponibilidad.php';
ob_end_clean();

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Frame-Options: DENY');

function usuario_auth_responder($codigo, $datos) {
    http_response_code($codigo);
    echo json_encode($datos, JSON_UNESCAPED_UNICODE);
    exit;
}

function usuario_auth_estado() {
    $id = sitraina_usuario_id();
    $nombre = '';
    if ($id > 0) {
        $nombre = (string) ($_SESSION['usuario_nombre'] ?? '');
    }
    return [
        'ok' => true,
        'ingresado' => $id > 0,
        'usuario_id' => $id,
        'nombre' => $nombre,
        'token' => sitraina_usuario_token(),
    ];
}

sitraina_sesion_usuario();
$accion = strtolower(trim((string) ($_GET['accion'] ?? $_POST['accion'] ?? 'estado')));

if ($accion === 'estado') {
    usuario_auth_responder(200, usuario_auth_estado());
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    usuario_auth_responder(405, ['ok' => false, 'mensaje' => 'Usá POST.']);
}

$token = (string) ($_POST['token'] ?? '');
if (!sitraina_usuario_token_ok($token)) {
    usuario_auth_responder(400, ['ok' => false, 'mensaje' => 'Volvé a enviar el formulario.']);
}

if ($accion === 'salir') {
    $_SESSION = [];
    if (ini_get('session.use_cookies')) {
        $p = session_get_cookie_params();
        setcookie(session_name(), '', time() - 42000, $p['path'], $p['domain'], $p['secure'], $p['httponly']);
    }
    session_destroy();
    sitraina_sesion_usuario();
    usuario_auth_responder(200, array_merge(usuario_auth_estado(), ['mensaje' => 'Sesión cerrada.']));
}

$fallos = (int) ($_SESSION['usuario_fallos'] ?? 0);
if ($fallos >= 8 && ($accion === 'ingresar' || $accion === 'registrar')) {
    usuario_auth_responder(429, ['ok' => false, 'mensaje' => 'Demasiados intentos. Esperá un momento y volvé a probar.']);
}

$db = abrir_cuentas_web();
if (!$db) {
    $avisoCuentas = is_file(__DIR__ . '/config_usuarios.php')
        ? 'No se pudo conectar con if0_43158097_Usuario_Web. Revisá que esa base exista y que sql/07_Usuarios_Web.sql ya se haya ejecutado.'
        : 'No se pudo abrir Usuarios_Web. Falta php/config_usuarios.php en el servidor.';
    usuario_auth_responder(500, ['ok' => false, 'mensaje' => $avisoCuentas]);
}

if ($accion === 'ingresar') {
    $correo = strtolower(trim((string) ($_POST['correo'] ?? '')));
    if (!filter_var($correo, FILTER_VALIDATE_EMAIL)) {
        $_SESSION['usuario_fallos'] = $fallos + 1;
        $db->close();
        usuario_auth_responder(400, ['ok' => false, 'mensaje' => 'El correo es obligatorio.']);
    }
    $consulta = $db->prepare('SELECT id, nombre, activo FROM Usuario_Web WHERE correo = ? LIMIT 1');
    if (!$consulta) {
        $db->close();
        usuario_auth_responder(500, ['ok' => false, 'mensaje' => 'No se pudo consultar la cuenta.']);
    }
    $consulta->bind_param('s', $correo);
    $consulta->execute();
    $id = 0;
    $nombre = '';
    $activo = 0;
    $consulta->bind_result($id, $nombre, $activo);
    $hay = $consulta->fetch();
    $consulta->close();
    $db->close();
    if (!$hay || !(int) $activo) {
        $_SESSION['usuario_fallos'] = $fallos + 1;
        usuario_auth_responder(401, ['ok' => false, 'mensaje' => 'Ese correo no tiene una cuenta activa.']);
    }
    session_regenerate_id(true);
    $_SESSION['usuario_id'] = (int) $id;
    $_SESSION['usuario_nombre'] = (string) $nombre;
    $_SESSION['usuario_correo'] = $correo;
    $_SESSION['usuario_fallos'] = 0;
    unset($_SESSION['usuario_token']);
    usuario_auth_responder(200, array_merge(usuario_auth_estado(), ['mensaje' => 'Ingreso correcto.']));
}

if ($accion === 'registrar') {
    $nombre = trim((string) ($_POST['nombre'] ?? ''));
    $correo = strtolower(trim((string) ($_POST['correo'] ?? '')));
    $cedula = preg_replace('/\D/', '', (string) ($_POST['cedula'] ?? ''));
    if ($cedula === '') {
        $cedula = null;
    } elseif (strlen($cedula) !== 9) {
        $db->close();
        usuario_auth_responder(400, ['ok' => false, 'mensaje' => 'La cédula, si la ponés, debe tener 9 dígitos.']);
    }
    if ($nombre === '' || strlen($nombre) > 120) {
        $db->close();
        usuario_auth_responder(400, ['ok' => false, 'mensaje' => 'Escribí tu nombre (máximo 120 caracteres).']);
    }
    if (!filter_var($correo, FILTER_VALIDATE_EMAIL) || strlen($correo) > 120) {
        $db->close();
        usuario_auth_responder(400, ['ok' => false, 'mensaje' => 'El correo no es válido.']);
    }
    $consulta = $db->prepare(
        'INSERT INTO Usuario_Web (nombre, correo, cedula, activo) VALUES (?, ?, ?, 1)'
    );
    if (!$consulta) {
        $db->close();
        usuario_auth_responder(500, ['ok' => false, 'mensaje' => 'No se pudo crear la cuenta. Ejecutá sql/07_Usuarios_Web.sql en phpMyAdmin.']);
    }
    $consulta->bind_param('sss', $nombre, $correo, $cedula);
    $ok = $consulta->execute();
    $codigo = $consulta->errno;
    $nuevoId = $ok ? (int) $db->insert_id : 0;
    $consulta->close();
    $db->close();
    if (!$ok) {
        if ($codigo === 1062) {
            usuario_auth_responder(409, ['ok' => false, 'mensaje' => 'Ese correo ya tiene una cuenta.']);
        }
        usuario_auth_responder(500, ['ok' => false, 'mensaje' => 'No se pudo crear la cuenta.']);
    }
    session_regenerate_id(true);
    $_SESSION['usuario_id'] = $nuevoId;
    $_SESSION['usuario_nombre'] = $nombre;
    $_SESSION['usuario_correo'] = $correo;
    $_SESSION['usuario_fallos'] = 0;
    unset($_SESSION['usuario_token']);
    usuario_auth_responder(200, array_merge(usuario_auth_estado(), ['mensaje' => 'Cuenta creada.']));
}

usuario_auth_responder(400, ['ok' => false, 'mensaje' => 'Acción no reconocida.']);
