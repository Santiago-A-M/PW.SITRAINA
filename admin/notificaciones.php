<?php
/* Avisos del personal. El abogado solo recibe citas de asesoría. */
ob_start();
require __DIR__ . '/sesion.php';
require dirname(__DIR__) . '/php/respuestas.php';
require dirname(__DIR__) . '/php/disponibilidad.php';
require dirname(__DIR__) . '/php/notificaciones_lib.php';
ob_end_clean();

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Robots-Tag: noindex, nofollow');

function notif_admin_responder($codigo, $datos) {
    http_response_code($codigo);
    echo json_encode($datos, JSON_UNESCAPED_UNICODE);
    exit;
}

$rol = rol_personal_admin();
if ($rol !== 'admin' && $rol !== 'abogado') {
    notif_admin_responder(401, ['ok' => false, 'mensaje' => 'Entrá para continuar.']);
}

$audiencia = $rol === 'abogado' ? 'abogado' : 'admin';
$cedula = preg_replace('/\D/', '', (string) ($_SESSION['admin_cedula'] ?? ''));
$cuenta = $audiencia === 'abogado'
    ? $cedula
    : strtolower(trim((string) ($_SESSION['admin_cuenta'] ?? $_SESSION['admin_usuario'] ?? '')));
if ($cuenta === '') {
    $cuenta = $audiencia === 'abogado' ? '' : 'admin';
}
if ($audiencia === 'abogado' && strlen($cuenta) !== 9) {
    notif_admin_responder(403, ['ok' => false, 'mensaje' => 'Esta sección es solo para el equipo de asesoría legal.']);
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $token = (string) ($_POST['token'] ?? '');
    if (!hash_equals(token_admin(), $token)) {
        notif_admin_responder(403, ['ok' => false, 'mensaje' => 'Volvé a abrir el panel e intentá de nuevo.']);
    }
    $accion = (string) ($_POST['accion'] ?? '');
    if ($accion === 'leidas') {
        $hecho = notif_marcar_todas($audiencia, $cuenta, $cedula, 0);
    } elseif ($accion === 'leida') {
        $tipo = (string) ($_POST['tipo'] ?? '');
        if ($audiencia === 'abogado' && $tipo !== 'cita') {
            notif_admin_responder(403, ['ok' => false, 'mensaje' => 'Ese aviso no corresponde a asesoría legal.']);
        }
        $hecho = notif_marcar($audiencia, $cuenta, $tipo, (int) ($_POST['id'] ?? 0), (string) ($_POST['marca'] ?? ''), $cedula, 0);
    } else {
        notif_admin_responder(400, ['ok' => false, 'mensaje' => 'No se pudo completar.']);
    }
    if ($hecho === null) {
        notif_admin_responder(500, ['ok' => false, 'mensaje' => 'No se pudo guardar la lectura.']);
    }
    if ($hecho === false) {
        notif_admin_responder(403, ['ok' => false, 'mensaje' => 'Ese aviso no está en tu lista.']);
    }
}

$resumen = notif_resumen($audiencia, $cuenta, $cedula, 0);
if ($resumen === null) {
    notif_admin_responder(500, ['ok' => false, 'mensaje' => 'No pudimos leer los avisos.']);
}
$resumen['ok'] = true;
$sinLeer = array_values(array_filter($resumen['avisos'], function ($aviso) {
    return empty($aviso['leido']);
}));
$resumen['avisos'] = array_slice($sinLeer, 0, 30);
notif_admin_responder(200, $resumen);
