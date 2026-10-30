<?php
/* Sesión pública (distinta a /admin/). Cookie path /, HttpOnly, Lax. */

function sitraina_https() {
    return !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off';
}

function sitraina_sesion_usuario() {
    if (session_status() === PHP_SESSION_ACTIVE) {
        return session_name() === 'SITRAINAUSUARIO';
    }
    session_name('SITRAINAUSUARIO');
    session_set_cookie_params([
        'lifetime' => 0,
        'path' => '/',
        'secure' => sitraina_https(),
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
    session_start();
    return true;
}

function sitraina_usuario_id() {
    if (!sitraina_sesion_usuario()) {
        return 0;
    }
    $id = (int) ($_SESSION['usuario_id'] ?? 0);
    return $id > 0 ? $id : 0;
}

/* Correo de la cuenta con la que ya inició sesión. */
function sitraina_correo_cuenta() {
    $id = sitraina_usuario_id();
    if ($id < 1) {
        return '';
    }
    $guardado = strtolower(trim((string) ($_SESSION['usuario_correo'] ?? '')));
    if ($guardado !== '' && filter_var($guardado, FILTER_VALIDATE_EMAIL)) {
        return $guardado;
    }
    if (!function_exists('abrir_cuentas_web')) {
        require_once __DIR__ . '/disponibilidad.php';
    }
    $db = abrir_cuentas_web();
    if (!$db) {
        return '';
    }
    $consulta = $db->prepare('SELECT correo FROM Usuario_Web WHERE id = ? AND activo = 1 LIMIT 1');
    if (!$consulta) {
        $db->close();
        return '';
    }
    $consulta->bind_param('i', $id);
    $consulta->execute();
    $correo = '';
    $consulta->bind_result($correo);
    $hay = $consulta->fetch();
    $consulta->close();
    $db->close();
    if (!$hay) {
        return '';
    }
    $correo = strtolower(trim((string) $correo));
    if ($correo === '' || !filter_var($correo, FILTER_VALIDATE_EMAIL)) {
        return '';
    }
    $_SESSION['usuario_correo'] = $correo;
    return $correo;
}

/* Id de la sesión solo si el formulario trae el correo de esa cuenta. */
function sitraina_id_si_cuenta_en_formulario($correos) {
    $id = sitraina_usuario_id();
    $cuenta = sitraina_correo_cuenta();
    if ($id < 1 || $cuenta === '') {
        return null;
    }
    foreach ((array) $correos as $correo) {
        if (strtolower(trim((string) $correo)) === $cuenta) {
            return $id;
        }
    }
    return null;
}

function sitraina_usuario_token() {
    sitraina_sesion_usuario();
    if (empty($_SESSION['usuario_token'])) {
        $_SESSION['usuario_token'] = bin2hex(random_bytes(16));
    }
    return (string) $_SESSION['usuario_token'];
}

function sitraina_usuario_token_ok($token) {
    $esperado = sitraina_usuario_token();
    return is_string($token) && $token !== '' && hash_equals($esperado, $token);
}

/* Corta el envío si no hay cuenta pública. No usa datos enviados por el formulario. */
function sitraina_exige_cuenta($volver, $prefijo) {
    if (sitraina_usuario_id() > 0) {
        return;
    }
    $prefijo = (string) $prefijo;
    if ($prefijo !== '' && substr($prefijo, -1) !== '/') {
        $prefijo .= '/';
    }
    $titulo = 'Inicia sesión para continuar.';
    $texto = 'Para enviar solicitudes, consultas o utilizar nuestros formularios, necesitas tener una cuenta e iniciar sesión. Esto nos permite identificarte y gestionar tus solicitudes correctamente.';
    http_response_code(401);
    header('Content-Type: text/html; charset=UTF-8');
    header('Cache-Control: no-store');
    echo '<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">';
    echo '<meta name="viewport" content="width=device-width, initial-scale=1.0">';
    echo '<title>' . htmlspecialchars($titulo, ENT_QUOTES, 'UTF-8') . '</title>';
    echo '<link rel="stylesheet" href="' . $prefijo . 'css/avisos.css?v=1.2">';
    echo '</head><body data-sit-aviso="sesion" data-sit-titulo="' . htmlspecialchars($titulo, ENT_QUOTES, 'UTF-8') . '" data-sit-texto="' . htmlspecialchars($texto, ENT_QUOTES, 'UTF-8') . '">';
    echo '<main style="padding:120px 20px"><p><a href="' . htmlspecialchars((string) $volver, ENT_QUOTES, 'UTF-8') . '">Volver</a></p></main>';
    echo '<script src="' . $prefijo . 'js/avisos.js?v=1.2"></script></body></html>';
    exit;
}
