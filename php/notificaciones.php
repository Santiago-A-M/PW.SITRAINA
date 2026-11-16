<?php
/* Avisos de la cuenta pública. Solo los de su usuario_id. */
ob_start();
require_once __DIR__ . '/sesion_usuario.php';
require_once __DIR__ . '/respuestas.php';
require_once __DIR__ . '/disponibilidad.php';
require_once __DIR__ . '/notificaciones_lib.php';
ob_end_clean();

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

function notif_usuario_responder($codigo, $datos) {
    http_response_code($codigo);
    echo json_encode($datos, JSON_UNESCAPED_UNICODE);
    exit;
}

$usuarioId = sitraina_usuario_id();
if ($usuarioId < 1) {
    notif_usuario_responder(401, ['ok' => false, 'mensaje' => 'Ingresá para ver tus avisos.']);
}
$cuenta = (string) $usuarioId;

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $token = (string) ($_POST['token'] ?? '');
    if (!sitraina_usuario_token_ok($token)) {
        notif_usuario_responder(403, ['ok' => false, 'mensaje' => 'Volvé a intentarlo desde la página.']);
    }
    $accion = (string) ($_POST['accion'] ?? '');
    if ($accion === 'leidas') {
        $hecho = notif_marcar_todas('usuario', $cuenta, '', $usuarioId);
    } elseif ($accion === 'leida') {
        $hecho = notif_marcar(
            'usuario',
            $cuenta,
            (string) ($_POST['tipo'] ?? ''),
            (int) ($_POST['id'] ?? 0),
            (string) ($_POST['marca'] ?? ''),
            '',
            $usuarioId
        );
    } else {
        notif_usuario_responder(400, ['ok' => false, 'mensaje' => 'No se pudo completar.']);
    }
    if ($hecho === null) {
        notif_usuario_responder(500, ['ok' => false, 'mensaje' => 'No se pudo guardar la lectura.']);
    }
    if ($hecho === false) {
        notif_usuario_responder(403, ['ok' => false, 'mensaje' => 'Ese aviso no está en tu cuenta.']);
    }
}

$resumen = notif_resumen('usuario', $cuenta, '', $usuarioId);
if ($resumen === null) {
    notif_usuario_responder(500, ['ok' => false, 'mensaje' => 'No pudimos leer tus avisos.']);
}
$resumen['ok'] = true;
$sinLeer = array_values(array_filter($resumen['avisos'], function ($aviso) {
    return empty($aviso['leido']);
}));
$resumen['avisos'] = array_slice($sinLeer, 0, 30);
notif_usuario_responder(200, $resumen);
