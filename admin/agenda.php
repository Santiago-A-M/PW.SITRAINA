<?php
/* Guarda y lee la agenda del administrador. Exige sesión y, al guardar, el token. */
ob_start();
require __DIR__ . '/sesion.php';
require dirname(__DIR__) . '/php/disponibilidad.php';
ob_end_clean();

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

/* Devuelve un JSON y termina la petición. */
function responder($codigo, $datos) {
    http_response_code($codigo);
    echo json_encode($datos);
    exit;
}

try {
if (empty($_SESSION['admin_usuario'])) {
    responder(403, ['ok' => false, 'mensaje' => 'Inicia sesión.']);
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $mysqli = abrir_agenda();
    if (!$mysqli) {
        responder(500, ['ok' => false, 'mensaje' => 'Falta la conexión de la base de administración.']);
    }
    $reglas = leer_agenda($mysqli);
    $citas = is_array($reglas) ? leer_citas($mysqli) : [];
    $mysqli->close();
    if (!is_array($reglas)) {
        responder(500, ['ok' => false, 'mensaje' => 'Falta la tabla agenda. Ejecuta sql/admin.sql en esa base.']);
    }
    responder(200, ['ok' => true, 'reglas' => $reglas['filas'], 'citas' => $citas]);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    responder(405, ['ok' => false, 'mensaje' => 'No se pudo guardar.']);
}

$token = (string) ($_POST['token'] ?? '');
if (!hash_equals(token_admin(), $token)) {
    responder(400, ['ok' => false, 'mensaje' => 'Vuelve a cargar la página e inténtalo de nuevo.']);
}

$tipo = (string) ($_POST['tipo'] ?? '');
$valor = trim((string) ($_POST['valor'] ?? ''));
$estado = (string) ($_POST['estado'] ?? '');
$accion = (string) ($_POST['accion'] ?? '');

if (!in_array($tipo, ['fecha', 'mes', 'hora'], true) || !in_array($accion, ['guardar', 'quitar'], true)) {
    responder(400, ['ok' => false, 'mensaje' => 'El dato no es válido.']);
}

if ($tipo === 'fecha') {
    $dia = DateTime::createFromFormat('!Y-m-d', $valor);
    if (!$dia || $dia->format('Y-m-d') !== $valor) {
        responder(400, ['ok' => false, 'mensaje' => 'Elige una fecha válida.']);
    }
} elseif ($tipo === 'mes') {
    $mes = DateTime::createFromFormat('!Y-m', $valor);
    if (!$mes || $mes->format('Y-m') !== $valor) {
        responder(400, ['ok' => false, 'mensaje' => 'Elige un mes válido.']);
    }
} else {
    if (!preg_match('/^(\d{2}):(\d{2})/', $valor, $partes)) {
        responder(400, ['ok' => false, 'mensaje' => 'Elige una hora válida.']);
    }
    $hora = (int) $partes[1];
    $minuto = (int) $partes[2];
    if ($hora > 23 || $minuto > 59) {
        responder(400, ['ok' => false, 'mensaje' => 'Elige una hora y minutos válidos.']);
    }
    $valor = sprintf('%02d:%02d', $hora, $minuto);
}

if ($accion === 'guardar' && !in_array($estado, ['abierta', 'bloqueada', 'ocupada'], true)) {
    responder(400, ['ok' => false, 'mensaje' => 'Elige disponible o no disponible.']);
}

$mysqli = abrir_agenda();
if (!$mysqli) {
    responder(500, ['ok' => false, 'mensaje' => 'No se pudo conectar con la base de administración.']);
}

if ($accion === 'quitar') {
    $consulta = $mysqli->prepare('DELETE FROM agenda WHERE tipo = ? AND valor = ?');
    if (!$consulta) {
        $mysqli->close();
        responder(500, ['ok' => false, 'mensaje' => 'Falta la tabla agenda. Ejecuta sql/admin.sql en esa base.']);
    }
    $consulta->bind_param('ss', $tipo, $valor);
} else {
    $consulta = $mysqli->prepare('INSERT INTO agenda (tipo, valor, estado) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE estado = ?');
    if (!$consulta) {
        $mysqli->close();
        responder(500, ['ok' => false, 'mensaje' => 'Falta la tabla agenda. Ejecuta sql/admin.sql en esa base.']);
    }
    $consulta->bind_param('ssss', $tipo, $valor, $estado, $estado);
}

$guardo = $consulta->execute();
$consulta->close();
$mysqli->close();
if (!$guardo) {
    responder(500, ['ok' => false, 'mensaje' => 'No se pudo guardar el cambio.']);
}
responder(200, ['ok' => true]);
} catch (Throwable $e) {
    responder(500, ['ok' => false, 'mensaje' => 'No se pudo leer la agenda. Revisa la base de administración.']);
}
