<?php
/* Ingreso al panel: sitraina (sin cédula) o cuenta personal con cédula. Sin clave. */
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
    $fallos = (int) ($_SESSION['admin_fallos'] ?? 0);
    $esSitraina = ($cuenta === 'sitraina@ina.ac.cr');

    if (!hash_equals(token_admin(), $token)) {
        $error = 'Vuelve a enviar el formulario.';
    } elseif ($fallos >= 8) {
        $error = 'Demasiados intentos. Espera un momento y vuelve a probar.';
    } elseif ($cuenta === '' || strlen($cuenta) > 120) {
        $_SESSION['admin_fallos'] = $fallos + 1;
        $error = 'Cuenta o cédula incorrectos.';
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
            if ($esSitraina) {
                $consulta = $mysqli->prepare(
                    'SELECT cedula FROM Admin_Info WHERE cuenta = ? AND activo = 1 LIMIT 1'
                );
                if ($consulta) {
                    $consulta->bind_param('s', $cuenta);
                }
            } else {
                $consulta = $mysqli->prepare(
                    'SELECT cedula FROM Admin_Info WHERE cuenta = ? AND cedula = ? AND activo = 1 LIMIT 1'
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
                $consulta->bind_result($cedulaGuardada);
                $hay = $consulta->fetch();
                $consulta->close();
                $mysqli->close();
                if (!$hay) {
                    $_SESSION['admin_fallos'] = $fallos + 1;
                    $error = 'Cuenta o cédula incorrectos.';
                } else {
                    session_regenerate_id(true);
                    $_SESSION['admin_usuario'] = $esSitraina ? 'sitraina@ina.ac.cr' : $cedula;
                    $_SESSION['admin_cuenta'] = $cuenta;
                    if (!$esSitraina) {
                        $_SESSION['admin_cedula'] = $cedula;
                    } else {
                        unset($_SESSION['admin_cedula']);
                    }
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
