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
    if ($id < 1) {
        return 0;
    }
    if (!sitraina_usuario_sesion_sigue($id)) {
        return 0;
    }
    return $id;
}

/* Una cuenta solo puede tener una sesión viva. Pasado este rato sin uso, se suelta. */
function sitraina_usuario_sesion_minutos() {
    return 5;
}

function sitraina_usuario_columnas_sesion($db) {
    if (!$db) {
        return false;
    }
    foreach (['sesion_clave' => 'VARCHAR(64) NULL DEFAULT NULL', 'sesion_en' => 'DATETIME NULL DEFAULT NULL'] as $nombre => $tipo) {
        $col = $db->query("SHOW COLUMNS FROM Usuario_Web LIKE '" . $nombre . "'");
        $existe = $col && $col->num_rows > 0;
        if ($col) {
            $col->free();
        }
        if ($existe) {
            continue;
        }
        if (!$db->query('ALTER TABLE Usuario_Web ADD COLUMN ' . $nombre . ' ' . $tipo)) {
            return false;
        }
    }
    return true;
}

function sitraina_usuario_cerrar_local() {
    unset(
        $_SESSION['usuario_id'],
        $_SESSION['usuario_nombre'],
        $_SESSION['usuario_correo'],
        $_SESSION['usuario_cedula'],
        $_SESSION['usuario_sesion'],
        $_SESSION['usuario_token']
    );
}

/* true si esta sesión sigue siendo la única. false si otra pestaña o dispositivo la reemplazó. */
function sitraina_usuario_sesion_sigue($id) {
    static $resuelto = null;
    if ($resuelto !== null) {
        return $resuelto;
    }
    $id = (int) $id;
    $local = (string) ($_SESSION['usuario_sesion'] ?? '');
    if ($id < 1) {
        $resuelto = false;
        return false;
    }
    if (!function_exists('abrir_cuentas_web')) {
        require_once __DIR__ . '/conexion.php';
    }
    $db = abrir_cuentas_web();
    if (!$db || !sitraina_usuario_columnas_sesion($db)) {
        if ($db) {
            $db->close();
        }
        $resuelto = true;
        return true;
    }
    $minutos = sitraina_usuario_sesion_minutos();
    $clave = '';
    $vigente = 0;
    $consulta = $db->prepare(
        'SELECT sesion_clave, (sesion_en IS NOT NULL AND sesion_en >= DATE_SUB(NOW(), INTERVAL ' . $minutos . ' MINUTE)) FROM Usuario_Web WHERE id = ? LIMIT 1'
    );
    if (!$consulta) {
        $db->close();
        $resuelto = true;
        return true;
    }
    $consulta->bind_param('i', $id);
    $consulta->execute();
    $consulta->bind_result($clave, $vigente);
    $hay = $consulta->fetch();
    $consulta->close();
    if (!$hay) {
        $db->close();
        sitraina_usuario_cerrar_local();
        $resuelto = false;
        return false;
    }
    $clave = (string) $clave;
    $viva = ((int) $vigente) === 1 && $clave !== '';
    if ($local !== '' && hash_equals($clave, $local)) {
        $renovar = $db->prepare('UPDATE Usuario_Web SET sesion_en = NOW() WHERE id = ? AND sesion_clave = ? LIMIT 1');
        if ($renovar) {
            $renovar->bind_param('is', $id, $local);
            $renovar->execute();
            $renovar->close();
        }
        $db->close();
        $resuelto = true;
        return true;
    }
    if ($viva) {
        $db->close();
        sitraina_usuario_cerrar_local();
        $resuelto = false;
        return false;
    }
    $nueva = bin2hex(random_bytes(16));
    $tomar = $db->prepare(
        'UPDATE Usuario_Web SET sesion_clave = ?, sesion_en = NOW() WHERE id = ? AND (sesion_clave IS NULL OR sesion_clave = \'\' OR sesion_en IS NULL OR sesion_en < DATE_SUB(NOW(), INTERVAL ' . $minutos . ' MINUTE)) LIMIT 1'
    );
    $quedo = false;
    if ($tomar) {
        $tomar->bind_param('si', $nueva, $id);
        $tomar->execute();
        $quedo = $tomar->affected_rows === 1;
        $tomar->close();
    }
    $db->close();
    if (!$quedo) {
        sitraina_usuario_cerrar_local();
        $resuelto = false;
        return false;
    }
    $_SESSION['usuario_sesion'] = $nueva;
    $resuelto = true;
    return true;
}

/* true si otra sesión de esa cuenta sigue abierta. null si no se pudo revisar. */
function sitraina_cuenta_sesion_ocupada($db, $id) {
    $id = (int) $id;
    if ($id < 1 || !$db) {
        return null;
    }
    if (!sitraina_usuario_columnas_sesion($db)) {
        return false;
    }
    $minutos = sitraina_usuario_sesion_minutos();
    $vigente = 0;
    $consulta = $db->prepare(
        'SELECT (sesion_clave IS NOT NULL AND sesion_clave <> \'\' AND sesion_en IS NOT NULL AND sesion_en >= DATE_SUB(NOW(), INTERVAL ' . $minutos . ' MINUTE)) FROM Usuario_Web WHERE id = ? LIMIT 1'
    );
    if (!$consulta) {
        return null;
    }
    $consulta->bind_param('i', $id);
    if (!$consulta->execute()) {
        $consulta->close();
        return null;
    }
    $consulta->bind_result($vigente);
    $hay = $consulta->fetch();
    $consulta->close();
    if (!$hay) {
        return null;
    }
    return ((int) $vigente) === 1;
}

/* Deja esta sesión como la única. false si otra acaba de ocuparla. */
function sitraina_usuario_tomar($db, $id) {
    $id = (int) $id;
    if ($id < 1 || !$db) {
        return false;
    }
    if (!sitraina_usuario_columnas_sesion($db)) {
        $nueva = bin2hex(random_bytes(16));
        $_SESSION['usuario_sesion'] = $nueva;
        return $nueva;
    }
    $nueva = bin2hex(random_bytes(16));
    $minutos = sitraina_usuario_sesion_minutos();
    $tomar = $db->prepare(
        'UPDATE Usuario_Web SET sesion_clave = ?, sesion_en = NOW() WHERE id = ? AND (sesion_clave IS NULL OR sesion_clave = \'\' OR sesion_en IS NULL OR sesion_en < DATE_SUB(NOW(), INTERVAL ' . $minutos . ' MINUTE)) LIMIT 1'
    );
    if (!$tomar) {
        return false;
    }
    $tomar->bind_param('si', $nueva, $id);
    $ok = $tomar->execute() && $tomar->affected_rows === 1;
    $tomar->close();
    if (!$ok) {
        return false;
    }
    $_SESSION['usuario_sesion'] = $nueva;
    return $nueva;
}

function sitraina_usuario_soltar($id, $clave) {
    $id = (int) $id;
    $clave = (string) $clave;
    if ($id < 1 || $clave === '') {
        return;
    }
    if (!function_exists('abrir_cuentas_web')) {
        require_once __DIR__ . '/conexion.php';
    }
    $db = abrir_cuentas_web();
    if (!$db || !sitraina_usuario_columnas_sesion($db)) {
        if ($db) {
            $db->close();
        }
        return;
    }
    $limpiar = $db->prepare('UPDATE Usuario_Web SET sesion_clave = NULL, sesion_en = NULL WHERE id = ? AND sesion_clave = ? LIMIT 1');
    if ($limpiar) {
        $limpiar->bind_param('is', $id, $clave);
        $limpiar->execute();
        $limpiar->close();
    }
    $db->close();
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
        require_once __DIR__ . '/conexion.php';
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

/* Cédula de la cuenta web con la que ya inició sesión (9 dígitos o vacío). */
function sitraina_cedula_cuenta() {
    $id = sitraina_usuario_id();
    if ($id < 1) {
        return '';
    }
    $guardada = preg_replace('/\D/', '', (string) ($_SESSION['usuario_cedula'] ?? ''));
    if (preg_match('/^[0-9]{9}$/', $guardada)) {
        return $guardada;
    }
    if (!function_exists('abrir_cuentas_web')) {
        require_once __DIR__ . '/conexion.php';
    }
    $db = abrir_cuentas_web();
    if (!$db) {
        return '';
    }
    $consulta = $db->prepare('SELECT cedula FROM Usuario_Web WHERE id = ? AND activo = 1 LIMIT 1');
    if (!$consulta) {
        $db->close();
        return '';
    }
    $consulta->bind_param('i', $id);
    $consulta->execute();
    $cedula = null;
    $consulta->bind_result($cedula);
    $hay = $consulta->fetch();
    $consulta->close();
    $db->close();
    if (!$hay) {
        return '';
    }
    $cedula = preg_replace('/\D/', '', (string) $cedula);
    if (!preg_match('/^[0-9]{9}$/', $cedula)) {
        return '';
    }
    $_SESSION['usuario_cedula'] = $cedula;
    return $cedula;
}

/*
 * La cuenta (Usuario_Web) y el afiliado (Cuenta) se cruzan por cédula.
 * Se busca siempre a partir del id de la sesión, nunca de un dato enviado por el navegador.
 * Devuelve: sin_sesion | sin_cedula | no | si | menor_anio | error
 * si = afiliado con MAS DE UN AÑO (o sin estado cargado).
 * menor_anio = afiliado con MENOS DE UN AÑO (no puede pedir cita).
 */
function sitraina_marca_afiliacion() {
    if (sitraina_usuario_id() < 1) {
        return 'sin_sesion';
    }
    $cedula = sitraina_cedula_cuenta();
    if ($cedula === '') {
        return 'sin_cedula';
    }
    if (!function_exists('abrir_afiliados')) {
        require_once __DIR__ . '/conexion.php';
    }
    $db = abrir_afiliados();
    if (!$db) {
        return 'error';
    }
    $consulta = $db->prepare('SELECT id, estado FROM Cuenta WHERE cedula = ? LIMIT 1');
    if (!$consulta) {
        /* Columna estado todavía no existe: solo comprobar cédula. */
        $consulta = $db->prepare('SELECT id FROM Cuenta WHERE cedula = ? LIMIT 1');
        if (!$consulta) {
            $db->close();
            return 'error';
        }
        $consulta->bind_param('s', $cedula);
        $pudo = $consulta->execute();
        if (!$pudo) {
            $consulta->close();
            $db->close();
            return 'error';
        }
        $consulta->store_result();
        $hay = $consulta->num_rows === 1;
        $consulta->close();
        $db->close();
        return $hay ? 'si' : 'no';
    }
    $consulta->bind_param('s', $cedula);
    $pudo = $consulta->execute();
    if (!$pudo) {
        $consulta->close();
        $db->close();
        return 'error';
    }
    $id = 0;
    $estado = null;
    $consulta->bind_result($id, $estado);
    $hay = $consulta->fetch();
    $consulta->close();
    $db->close();
    if (!$hay) {
        return 'no';
    }
    $estadoNorm = strtoupper(trim((string) $estado));
    $estadoNorm = str_replace(['Á', 'É', 'Í', 'Ó', 'Ú'], ['A', 'E', 'I', 'O', 'U'], $estadoNorm);
    if ($estadoNorm === 'MENOS DE UN ANO' || $estadoNorm === 'MENOS DE UN AÑO') {
        return 'menor_anio';
    }
    return 'si';
}

function sitraina_es_afiliado_registrado() {
    $marca = sitraina_marca_afiliacion();
    return $marca === 'si' || $marca === 'menor_anio';
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
    $titulo = 'Entrá con tu cuenta para continuar.';
    $texto = 'Para enviarnos una solicitud o un mensaje, primero creá tu cuenta y entrá. Así sabemos quién sos y te podemos responder.';
    http_response_code(401);
    header('Content-Type: text/html; charset=UTF-8');
    header('Cache-Control: no-store');
    echo '<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">';
    echo '<meta name="viewport" content="width=device-width, initial-scale=1.0">';
    echo '<title>' . htmlspecialchars($titulo, ENT_QUOTES, 'UTF-8') . '</title>';
    echo '<link rel="icon" type="image/png" href="' . $prefijo . 'img/favicon-logo.png?v=1">';
    echo '<link rel="stylesheet" href="' . $prefijo . 'css/avisos.css?v=2.0">';
    echo '</head><body data-sit-aviso="sesion" data-sit-titulo="' . htmlspecialchars($titulo, ENT_QUOTES, 'UTF-8') . '" data-sit-texto="' . htmlspecialchars($texto, ENT_QUOTES, 'UTF-8') . '">';
    echo '<main style="padding:120px 20px"><p><a href="' . htmlspecialchars((string) $volver, ENT_QUOTES, 'UTF-8') . '">Volver</a></p></main>';
    echo '<script src="' . $prefijo . 'js/avisos.js?v=1.3"></script></body></html>';
    exit;
}
