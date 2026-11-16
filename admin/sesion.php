<?php
/* Sesión del administrador: cookie, token y reemplazo de los textos {{ }} del HTML. */
header('X-Frame-Options: DENY');
header('X-Robots-Tag: noindex, nofollow');
header('Cache-Control: no-store');
header('Referrer-Policy: no-referrer');

$https = !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off';
$script = str_replace('\\', '/', $_SERVER['SCRIPT_NAME'] ?? '/admin/index.php');
$marca = '/admin/';
$pos = strpos($script, $marca);
if ($pos !== false) {
    $ruta = substr($script, 0, $pos) . $marca;
} else {
    $ruta = rtrim(str_replace('\\', '/', dirname($script)), '/') . '/';
}

session_set_cookie_params([
    'lifetime' => 0,
    'path' => $ruta,
    'secure' => $https,
    'httponly' => true,
    'samesite' => 'Lax',
]);
session_start();

/* Escapa un texto antes de insertarlo en el HTML. */
function h($texto) {
    return htmlspecialchars((string) $texto, ENT_QUOTES, 'UTF-8');
}

/* Crea o reutiliza el token que protege los formularios del administrador. */
function token_admin() {
    if (empty($_SESSION['admin_token'])) {
        $_SESSION['admin_token'] = bin2hex(random_bytes(16));
    }
    return $_SESSION['admin_token'];
}

/* Conexión a Info_Cuentas_Admins. null si falta config; false si no conecta. */
function conectar_admin() {
    $archivo = __DIR__ . '/config.php';
    if (!is_file($archivo)) {
        return null;
    }
    $config = require $archivo;
    if (!is_array($config)) {
        return false;
    }
    mysqli_report(MYSQLI_REPORT_OFF);
    try {
        $mysqli = new mysqli($config['host'], $config['usuario'], $config['clave'], $config['nombre']);
    } catch (Throwable $e) {
        return false;
    }
    if ($mysqli->connect_errno) {
        return false;
    }
    $mysqli->set_charset('utf8mb4');
    $mysqli->query("SET time_zone = '-06:00'");
    return $mysqli;
}

/* La columna rol distingue al administrador general del abogado. */
function asegurar_rol_admin($mysqli) {
    if (!$mysqli) {
        return false;
    }
    $col = $mysqli->query("SHOW COLUMNS FROM Admin_Info LIKE 'rol'");
    $existe = $col && $col->num_rows > 0;
    if ($col) {
        $col->free();
    }
    if ($existe) {
        return true;
    }
    return (bool) $mysqli->query(
        "ALTER TABLE Admin_Info ADD COLUMN rol ENUM('admin','abogado') NOT NULL DEFAULT 'admin'"
    );
}

/* El ingreso de Legal no se pisa con una cuenta de administración que use el mismo correo. */
function sesion_abogado_legal() {
    if (empty($_SESSION['legal_ingreso'])) {
        return null;
    }
    $cuenta = strtolower(trim((string) ($_SESSION['admin_cuenta'] ?? '')));
    $cedula = preg_replace('/\D/', '', (string) ($_SESSION['admin_cedula'] ?? ''));
    $legal = abogado_activo($cuenta, $cedula);
    if ($legal === true) {
        $_SESSION['admin_rol'] = 'abogado';
        return true;
    }
    if ($legal === null && (string) ($_SESSION['admin_rol'] ?? '') === 'abogado') {
        return true;
    }
    unset($_SESSION['legal_ingreso']);
    return false;
}

/* Rol leído de MySQL. No usa nada enviado por el navegador. */
function rol_personal_admin() {
    if (empty($_SESSION['admin_usuario'])) {
        return '';
    }
    if (sesion_abogado_legal() === true) {
        return 'abogado';
    }
    $cuenta = strtolower(trim((string) ($_SESSION['admin_cuenta'] ?? '')));
    if ($cuenta === '' || strlen($cuenta) > 120) {
        return '';
    }
    $db = conectar_admin();
    if (!$db) {
        $guardado = (string) ($_SESSION['admin_rol'] ?? '');
        return ($guardado === 'admin' || $guardado === 'abogado') ? $guardado : '';
    }
    $hayColumna = asegurar_rol_admin($db);
    if (!$hayColumna) {
        $db->close();
        $_SESSION['admin_rol'] = 'admin';
        return 'admin';
    }
    $consulta = $db->prepare('SELECT rol FROM Admin_Info WHERE cuenta = ? AND activo = 1 LIMIT 1');
    if (!$consulta) {
        $db->close();
        return '';
    }
    $consulta->bind_param('s', $cuenta);
    $consulta->execute();
    $rol = '';
    $consulta->bind_result($rol);
    $hay = $consulta->fetch();
    $consulta->close();
    $db->close();
    if (!$hay) {
        $cedulaSesion = preg_replace('/\D/', '', (string) ($_SESSION['admin_cedula'] ?? ''));
        $legal = abogado_activo($cuenta, $cedulaSesion);
        if ($legal === true) {
            $_SESSION['admin_rol'] = 'abogado';
            return 'abogado';
        }
        if ($legal === null && (string) ($_SESSION['admin_rol'] ?? '') === 'abogado') {
            return 'abogado';
        }
        $_SESSION['admin_rol'] = '';
        return '';
    }
    $rol = ((string) $rol === 'abogado') ? 'abogado' : 'admin';
    $_SESSION['admin_rol'] = $rol;
    return $rol;
}

function personal_es_abogado() {
    return rol_personal_admin() === 'abogado';
}

/* Usuarios_Legales. null si falta el archivo; false si la base todavía no conecta. */
function conectar_legales() {
    $archivo = __DIR__ . '/config_legales.php';
    if (!is_file($archivo)) {
        return null;
    }
    $config = require $archivo;
    if (!is_array($config)) {
        return false;
    }
    mysqli_report(MYSQLI_REPORT_OFF);
    try {
        $mysqli = new mysqli($config['host'], $config['usuario'], $config['clave'], $config['nombre']);
    } catch (Throwable $e) {
        return false;
    }
    if ($mysqli->connect_errno) {
        /* 1049: la base todavía no existe en el hosting. No es un abogado. */
        return ((int) $mysqli->connect_errno === 1049) ? null : false;
    }
    $mysqli->set_charset('utf8mb4');
    $mysqli->query("SET time_zone = '-06:00'");
    return $mysqli;
}

/* La base la crea el hosting. Esta tabla guarda correo, cédula y nombre del abogado. */
function asegurar_tabla_legales($mysqli) {
    if (!$mysqli) {
        return false;
    }
    $creo = $mysqli->query(
        "CREATE TABLE IF NOT EXISTS Abogado (
            id INT UNSIGNED NOT NULL AUTO_INCREMENT,
            cuenta VARCHAR(120) NOT NULL,
            cedula CHAR(9) NOT NULL,
            nombre VARCHAR(120) NOT NULL DEFAULT '',
            activo TINYINT(1) NOT NULL DEFAULT 1,
            creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            UNIQUE KEY uk_abogado_cuenta (cuenta),
            UNIQUE KEY uk_abogado_cedula (cedula)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
    );
    if ($creo) {
        return true;
    }
    $revisar = $mysqli->query("SHOW TABLES LIKE 'Abogado'");
    $existe = $revisar && $revisar->num_rows > 0;
    if ($revisar) {
        $revisar->free();
    }
    return $existe;
}

/* true si esa cuenta puede entrar a Legal. null si la base no responde. */
function abogado_activo($cuenta, $cedula) {
    $cuenta = strtolower(trim((string) $cuenta));
    $cedula = preg_replace('/\D/', '', (string) $cedula);
    if ($cuenta === '' || strlen($cuenta) > 120 || strlen($cedula) !== 9) {
        return false;
    }
    $db = conectar_legales();
    if ($db === null) {
        return false;
    }
    if ($db === false || !asegurar_tabla_legales($db)) {
        if ($db) {
            $db->close();
        }
        return null;
    }
    $consulta = $db->prepare('SELECT cedula, activo FROM Abogado WHERE LOWER(TRIM(cuenta)) = ? LIMIT 1');
    if (!$consulta) {
        $db->close();
        return null;
    }
    $consulta->bind_param('s', $cuenta);
    $consulta->execute();
    $cedulaGuardada = '';
    $activo = 0;
    $consulta->bind_result($cedulaGuardada, $activo);
    $hay = $consulta->fetch();
    $consulta->close();
    $db->close();
    if (!$hay) {
        return false;
    }
    $cedulaGuardada = preg_replace('/\D/', '', (string) $cedulaGuardada);
    $estaActivo = ((string) $activo === '1' || (int) $activo === 1);
    return $estaActivo && $cedulaGuardada === $cedula;
}

/* Lee un HTML y cambia {{token}}, {{error}} y los demás marcadores por su valor. */
function vista($archivo, $datos) {
    $html = file_get_contents(__DIR__ . '/' . $archivo);
    foreach ($datos as $clave => $valor) {
        $seguro = h($valor);
        if ($seguro !== '') {
            $html = str_replace('hidden>{{' . $clave . '}}', '>' . $seguro, $html);
            $html = str_replace('data-' . $clave . ' hidden', 'data-' . $clave, $html);
        }
        $html = str_replace('{{' . $clave . '}}', $seguro, $html);
    }
    echo $html;
}
