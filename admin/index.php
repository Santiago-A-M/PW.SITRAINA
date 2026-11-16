<?php
/* Ingreso al panel: sitraina (sin cédula) o cuenta personal con cédula. Sin clave. */
require __DIR__ . '/sesion.php';

mysqli_report(MYSQLI_REPORT_OFF);

$error = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $token = (string) ($_POST['token'] ?? '');
    $cuenta = strtolower(trim((string) ($_POST['cuenta'] ?? '')));
    $cedula = preg_replace('/\D/', '', (string) ($_POST['cedula'] ?? ''));
    $fallos = (int) ($_SESSION['admin_fallos'] ?? 0);
    $esSitraina = ($cuenta === 'sitraina@ina.ac.cr');

    if (!hash_equals(token_admin(), $token)) {
        $error = 'Volvé a intentarlo desde esta página.';
    } elseif ($fallos >= 8) {
        $error = 'Demasiados intentos. Esperá un momento y volvé a probar.';
    } elseif ($cuenta === '' || strlen($cuenta) > 120) {
        $_SESSION['admin_fallos'] = $fallos + 1;
        $error = 'Cuenta o cédula incorrectos.';
    } elseif (!$esSitraina && (strlen($cedula) !== 9)) {
        $_SESSION['admin_fallos'] = $fallos + 1;
        $error = 'Para esta cuenta la cédula es obligatoria.';
    } else {
        $mysqli = conectar_admin();
        if ($mysqli === null) {
            $error = 'No pudimos entrar en este momento. Intentá más tarde.';
        } elseif ($mysqli === false) {
            $error = 'No pudimos conectar en este momento. Intentá más tarde.';
        } else {
            $conRol = asegurar_rol_admin($mysqli);
            if ($conRol && $esSitraina) {
                $consulta = $mysqli->prepare(
                    'SELECT cedula, rol FROM Admin_Info WHERE cuenta = ? AND activo = 1 LIMIT 1'
                );
                if ($consulta) {
                    $consulta->bind_param('s', $cuenta);
                }
            } elseif ($conRol) {
                $consulta = $mysqli->prepare(
                    'SELECT cedula, rol FROM Admin_Info WHERE cuenta = ? AND cedula = ? AND activo = 1 LIMIT 1'
                );
                if ($consulta) {
                    $consulta->bind_param('ss', $cuenta, $cedula);
                }
            } elseif ($esSitraina) {
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
                $error = 'No pudimos revisar la cuenta en este momento. Intentá más tarde.';
            } else {
                $consulta->execute();
                $cedulaGuardada = '';
                $rolGuardado = 'admin';
                if ($conRol) {
                    $consulta->bind_result($cedulaGuardada, $rolGuardado);
                } else {
                    $consulta->bind_result($cedulaGuardada);
                }
                $hay = $consulta->fetch();
                $consulta->close();
                $mysqli->close();
                if (!$hay || (string) $rolGuardado === 'abogado') {
                    $_SESSION['admin_fallos'] = $fallos + 1;
                    $error = 'Cuenta o cédula incorrectos.';
                } else {
                    session_regenerate_id(true);
                    $_SESSION['admin_usuario'] = $esSitraina ? 'sitraina@ina.ac.cr' : $cedula;
                    $_SESSION['admin_cuenta'] = $cuenta;
                    $_SESSION['admin_rol'] = 'admin';
                    if (!$esSitraina) {
                        $_SESSION['admin_cedula'] = $cedula;
                    } else {
                        unset($_SESSION['admin_cedula']);
                    }
                    $_SESSION['admin_fallos'] = 0;
                    $_SESSION['admin_token'] = bin2hex(random_bytes(16));
                    unset($_SESSION['legal_ingreso']);
                    header('Location: index.php');
                    exit;
                }
            }
        }
    }
}

if (empty($_SESSION['legal_ingreso']) && !empty($_SESSION['admin_usuario'])) {
    $rolIngreso = rol_personal_admin();
    if ($rolIngreso === '') {
        $_SESSION = [];
    }
}
if (empty($_SESSION['legal_ingreso']) && !empty($_SESSION['admin_usuario']) && (string) ($_SESSION['admin_rol'] ?? '') === 'admin') {
    $etiqueta = !empty($_SESSION['admin_cuenta']) ? $_SESSION['admin_cuenta'] : $_SESSION['admin_usuario'];
    vista('panel.html', [
        'usuario' => 'Sesión de ' . $etiqueta . '.',
        'token' => token_admin(),
        'rol-clase' => '',
    ]);
    exit;
}

vista('index.html', [
    'token' => token_admin(),
    'error' => $error,
]);
