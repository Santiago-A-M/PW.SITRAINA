<?php
/* Ingreso al panel. Si la clave coincide, muestra panel.html; si no, el formulario. */
require __DIR__ . '/sesion.php';

mysqli_report(MYSQLI_REPORT_OFF);

/* Conecta con la base de administración. null si falta config.php; false si no conecta. */
function conectar_admin() {
    $archivo = __DIR__ . '/config.php';
    if (!is_file($archivo)) {
        return null;
    }
    $config = require $archivo;
    if (!is_array($config)) {
        return false;
    }
    try {
        $mysqli = new mysqli($config['host'], $config['usuario'], $config['clave'], $config['nombre']);
    } catch (Throwable $e) {
        return false;
    }
    if ($mysqli->connect_errno) {
        return false;
    }
    $mysqli->set_charset('utf8mb4');
    return $mysqli;
}

$error = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $token = (string) ($_POST['token'] ?? '');
    $usuario = trim((string) ($_POST['usuario'] ?? ''));
    $clave = (string) ($_POST['clave'] ?? '');
    $fallos = (int) ($_SESSION['admin_fallos'] ?? 0);

    if (!hash_equals(token_admin(), $token)) {
        $error = 'Vuelve a enviar el formulario.';
    } elseif ($fallos >= 8) {
        $error = 'Demasiados intentos. Espera un momento y vuelve a probar.';
    } elseif ($usuario === '' || $clave === '' || strlen($usuario) > 60) {
        $_SESSION['admin_fallos'] = $fallos + 1;
        $error = 'Usuario o clave incorrectos.';
    } else {
        $mysqli = conectar_admin();
        if ($mysqli === null) {
            $error = 'Falta admin/config.php en el servidor.';
        } elseif ($mysqli === false) {
            $error = 'No se pudo conectar con la base de administración.';
        } else {
            $hashFalso = '$2y$10$SitrainaAdminDummySaltu7eKq8mN3pL2wX9vB4cD6fH1jR5tYaZx';
            $consulta = $mysqli->prepare('SELECT clave_hash FROM cuentas WHERE usuario = ? AND activo = 1 LIMIT 1');
            if (!$consulta) {
                $mysqli->close();
                $error = 'No se pudo revisar la cuenta. Confirma que la tabla cuentas existe.';
            } else {
                $consulta->bind_param('s', $usuario);
                $consulta->execute();
                $consulta->bind_result($hashGuardado);
                $hay = $consulta->fetch();
                $consulta->close();
                $mysqli->close();
                $hash = $hay ? $hashGuardado : $hashFalso;
                $coincide = password_verify($clave, $hash);
                if (!$hay || !$coincide) {
                    $_SESSION['admin_fallos'] = $fallos + 1;
                    $error = 'Usuario o clave incorrectos.';
                } else {
                    session_regenerate_id(true);
                    $_SESSION['admin_usuario'] = $usuario;
                    $_SESSION['admin_fallos'] = 0;
                    $_SESSION['admin_token'] = bin2hex(random_bytes(16));
                    header('Location: index.php');
                    exit;
                }
            }
        }
    }
}

if (!empty($_SESSION['admin_usuario'])) {
    vista('panel.html', [
        'usuario' => 'Sesión de ' . $_SESSION['admin_usuario'] . '.',
        'token' => token_admin(),
    ]);
    exit;
}

vista('index.html', [
    'token' => token_admin(),
    'error' => $error,
]);
