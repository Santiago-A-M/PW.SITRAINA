<?php
/* Ingreso al panel: sitraina (sin cédula) o cuenta personal con cédula. */
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
    $cuenta = strtolower(trim((string) ($_POST['cuenta'] ?? '')));
    $cedula = preg_replace('/\D/', '', (string) ($_POST['cedula'] ?? ''));
    $clave = (string) ($_POST['clave'] ?? '');
    $fallos = (int) ($_SESSION['admin_fallos'] ?? 0);
    $esSitraina = ($cuenta === 'sitraina@ina.ac.cr');

    if (!hash_equals(token_admin(), $token)) {
        $error = 'Vuelve a enviar el formulario.';
    } elseif ($fallos >= 8) {
        $error = 'Demasiados intentos. Espera un momento y vuelve a probar.';
    } elseif ($cuenta === '' || $clave === '' || strlen($cuenta) > 120) {
        $_SESSION['admin_fallos'] = $fallos + 1;
        $error = 'Cuenta o clave incorrectos.';
    } elseif (!$esSitraina && (strlen($cedula) !== 9)) {
        $_SESSION['admin_fallos'] = $fallos + 1;
        $error = 'Para esta cuenta la cédula es obligatoria.';
    } else {
        $mysqli = conectar_admin();
        if ($mysqli === null) {
            $error = 'Falta admin/config.php en el servidor.';
        } elseif ($mysqli === false) {
            $error = 'No se pudo conectar con la base de administración.';
        } else {
            $hashFalso = '$2y$10$SitrainaAdminDummySaltu7eKq8mN3pL2wX9vB4cD6fH1jR5tYaZx';
            if ($esSitraina) {
                $consulta = $mysqli->prepare(
                    'SELECT clave_hash, cedula FROM Admin_Info WHERE cuenta = ? AND activo = 1 LIMIT 1'
                );
                if ($consulta) {
                    $consulta->bind_param('s', $cuenta);
                }
            } else {
                $consulta = $mysqli->prepare(
                    'SELECT clave_hash, cedula FROM Admin_Info WHERE cuenta = ? AND cedula = ? AND activo = 1 LIMIT 1'
                );
                if ($consulta) {
                    $consulta->bind_param('ss', $cuenta, $cedula);
                }
            }
            if (!$consulta) {
                $mysqli->close();
                $error = 'No se pudo revisar la cuenta. Confirma que la tabla Admin_Info existe.';
            } else {
                $consulta->execute();
                $consulta->bind_result($hashGuardado, $cedulaGuardada);
                $hay = $consulta->fetch();
                $consulta->close();
                $mysqli->close();
                $hash = $hay ? $hashGuardado : $hashFalso;
                $coincide = password_verify($clave, $hash);
                if (!$hay || !$coincide) {
                    $_SESSION['admin_fallos'] = $fallos + 1;
                    $error = 'Cuenta, cédula o clave incorrectos.';
                } else {
                    session_regenerate_id(true);
                    $_SESSION['admin_usuario'] = $esSitraina ? 'sitraina@ina.ac.cr' : $cedula;
                    $_SESSION['admin_cuenta'] = $cuenta;
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
    $etiqueta = !empty($_SESSION['admin_cuenta']) ? $_SESSION['admin_cuenta'] : $_SESSION['admin_usuario'];
    vista('panel.html', [
        'usuario' => 'Sesión de ' . $etiqueta . '.',
        'token' => token_admin(),
    ]);
    exit;
}

vista('index.html', [
    'token' => token_admin(),
    'error' => $error,
]);
