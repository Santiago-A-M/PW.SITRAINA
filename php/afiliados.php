<?php
header('Content-Type: application/json; charset=utf-8');

function responder($ok, $mensaje, $codigo = 200) {
    http_response_code($codigo);
    echo json_encode(['ok' => $ok, 'mensaje' => $mensaje], JSON_UNESCAPED_UNICODE);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    responder(false, 'Método no permitido.', 405);
}

$configArchivo = __DIR__ . '/config.php';
if (!is_file($configArchivo)) {
    responder(false, 'Falta la configuración de la base de datos.', 500);
}

$config = require $configArchivo;
$accion = $_POST['accion'] ?? '';
$cedula = preg_replace('/\D/', '', (string) ($_POST['cedula'] ?? ''));
$correo = strtolower(trim((string) ($_POST['correo'] ?? '')));

if (!preg_match('/^[0-9]{9}$/', $cedula)) {
    responder(false, 'La cédula debe tener 9 dígitos.');
}
if (!preg_match('/^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9\-]+(?:\.[a-zA-Z0-9\-]+)*\.[a-zA-Z]{2,}$/', $correo)) {
    responder(false, 'Escribe un correo válido.');
}

$mysqli = @new mysqli($config['host'], $config['usuario'], $config['clave'], $config['nombre']);
if ($mysqli->connect_errno) {
    responder(false, 'No se pudo conectar con la base de datos.', 500);
}
$mysqli->set_charset('utf8mb4');

if ($accion === 'verificar') {
    $consulta = $mysqli->prepare('SELECT id FROM afiliados WHERE cedula = ? AND correo = ? AND activo = 1 LIMIT 1');
    if (!$consulta) {
        $mysqli->close();
        responder(false, 'No se pudo consultar la tabla de afiliados.', 500);
    }
    $consulta->bind_param('ss', $cedula, $correo);
    $consulta->execute();
    $consulta->store_result();
    $encontrado = $consulta->num_rows === 1;
    $consulta->close();
    $mysqli->close();
    if ($encontrado) {
        responder(true, 'Persona afiliada.');
    }
    responder(false, 'Esa cédula y ese correo no figuran como persona afiliada activa.');
}

if ($accion === 'guardar') {
    $consulta = $mysqli->prepare('SELECT cedula, correo FROM afiliados WHERE cedula = ? OR correo = ?');
    if (!$consulta) {
        $mysqli->close();
        responder(false, 'No se pudo consultar la tabla de afiliados.', 500);
    }
    $consulta->bind_param('ss', $cedula, $correo);
    $consulta->execute();
    $consulta->bind_result($cedulaFila, $correoFila);
    $existeCedula = false;
    $correoOcupado = false;
    while ($consulta->fetch()) {
        if ($cedulaFila === $cedula) {
            $existeCedula = true;
        } elseif ($correoFila === $correo) {
            $correoOcupado = true;
        }
    }
    $consulta->close();

    if ($correoOcupado) {
        $mysqli->close();
        responder(false, 'Ese correo ya está registrado con otra cédula.');
    }

    if ($existeCedula) {
        $cambio = $mysqli->prepare('UPDATE afiliados SET correo = ?, activo = 1 WHERE cedula = ?');
        if (!$cambio) {
            $mysqli->close();
            responder(false, 'No se pudo guardar la afiliación.', 500);
        }
        $cambio->bind_param('ss', $correo, $cedula);
    } else {
        $cambio = $mysqli->prepare('INSERT INTO afiliados (cedula, correo, activo) VALUES (?, ?, 1)');
        if (!$cambio) {
            $mysqli->close();
            responder(false, 'No se pudo guardar la afiliación.', 500);
        }
        $cambio->bind_param('ss', $cedula, $correo);
    }
    $guardado = $cambio->execute();
    $cambio->close();
    $mysqli->close();
    if (!$guardado) {
        responder(false, 'No se pudo guardar la afiliación.', 500);
    }
    responder(true, 'Afiliación guardada.');
}

$mysqli->close();
responder(false, 'Acción no reconocida.', 400);
