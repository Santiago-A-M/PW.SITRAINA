<?php
/* Mis mensajes: respuestas de Info_Respuestas de solicitudes enviadas con esta sesión. */
ob_start();
require_once __DIR__ . '/sesion_usuario.php';
require_once __DIR__ . '/disponibilidad.php';
require_once __DIR__ . '/respuestas.php';
ob_end_clean();

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Frame-Options: DENY');

function bandeja_responder($codigo, $datos) {
    http_response_code($codigo);
    echo json_encode($datos, JSON_UNESCAPED_UNICODE);
    exit;
}

function bandeja_filas($consulta, $columnas) {
    if (method_exists($consulta, 'get_result')) {
        $res = $consulta->get_result();
        if (!$res) {
            return [];
        }
        $filas = [];
        while ($fila = $res->fetch_assoc()) {
            $filas[] = $fila;
        }
        $res->free();
        return $filas;
    }
    $vars = [];
    $refs = [];
    foreach ($columnas as $i => $nombre) {
        $vars[$nombre] = null;
        $refs[$i] = &$vars[$nombre];
    }
    call_user_func_array([$consulta, 'bind_result'], $refs);
    $filas = [];
    while ($consulta->fetch()) {
        $fila = [];
        foreach ($columnas as $nombre) {
            $fila[$nombre] = $vars[$nombre];
        }
        $filas[] = $fila;
    }
    return $filas;
}

function bandeja_tipo_respuesta($tipo) {
    if ($tipo === 'afiliacion') {
        return 'afilacion';
    }
    if ($tipo === 'contacto' || $tipo === 'cita') {
        return $tipo;
    }
    return null;
}

function bandeja_asunto($tipo, $fila) {
    if ($tipo === 'contacto') {
        $original = trim((string) ($fila['asunto'] ?? ''));
        if ($original !== '') {
            return 'Respuesta: ' . $original;
        }
        return 'Respuesta a su mensaje de contacto';
    }
    if ($tipo === 'cita') {
        return 'Respuesta a su solicitud de cita';
    }
    return 'Respuesta a su solicitud de afiliación';
}

function bandeja_armar($tipo, $fila, $resp) {
    $origen = (int) ($fila['id'] ?? 0);
    return [
        'id' => $tipo . ':' . $origen,
        'tipo' => $tipo,
        'origen_id' => $origen,
        'estado' => (string) ($resp['estado'] ?? ''),
        'asunto' => bandeja_asunto($tipo, $fila),
        'cuerpo' => (string) ($resp['respuesta'] ?? ''),
        'admin_usuario' => (string) ($resp['admin_usuario'] ?? ''),
        'editado' => !empty($resp['editado']) ? 1 : 0,
        'leido_en' => null,
        'creado_en' => (string) ($resp['respondido_en'] ?? ''),
    ];
}

function bandeja_correo_cuenta($db, $usuarioId) {
    $consulta = $db->prepare('SELECT correo FROM Usuario_Web WHERE id = ? AND activo = 1 LIMIT 1');
    if (!$consulta) {
        return '';
    }
    $consulta->bind_param('i', $usuarioId);
    $consulta->execute();
    $correo = '';
    $consulta->bind_result($correo);
    $hay = $consulta->fetch();
    $consulta->close();
    if (!$hay) {
        return '';
    }
    return strtolower(trim((string) $correo));
}

function bandeja_consultas($db, $tipo, $usuarioId) {
    $usuarioId = (int) $usuarioId;
    if ($tipo === 'contacto') {
        $consulta = $db->prepare(
            'SELECT id, nombre, correo, asunto FROM Consulta_Contacto WHERE usuario_id = ? ORDER BY id DESC LIMIT 200'
        );
        $columnas = ['id', 'nombre', 'correo', 'asunto'];
    } elseif ($tipo === 'cita') {
        $consulta = $db->prepare(
            'SELECT id, persona, correo, fecha, hora FROM Consulta_Asesoria WHERE usuario_id = ? ORDER BY id DESC LIMIT 200'
        );
        $columnas = ['id', 'persona', 'correo', 'fecha', 'hora'];
    } else {
        $consulta = $db->prepare(
            'SELECT id, nombre, correo_ina, correo_personal FROM Consulta_Afiliacion WHERE usuario_id = ? ORDER BY id DESC LIMIT 200'
        );
        $columnas = ['id', 'nombre', 'correo_ina', 'correo_personal'];
    }
    if (!$consulta) {
        return null;
    }
    $consulta->bind_param('i', $usuarioId);
    $consulta->execute();
    $filas = bandeja_filas($consulta, $columnas);
    $consulta->close();
    return $filas;
}

function bandeja_mensajes_de($dbConsultas, $tipo, $usuarioId) {
    $filas = bandeja_consultas($dbConsultas, $tipo, $usuarioId);
    if ($filas === null) {
        return null;
    }
    $dbResp = abrir_respuestas();
    if (!$dbResp) {
        return null;
    }
    $mapa = mapa_respuestas_por_tipo($dbResp, bandeja_tipo_respuesta($tipo));
    $dbResp->close();
    $salida = [];
    foreach ($filas as $fila) {
        $id = (int) ($fila['id'] ?? 0);
        if ($id < 1 || empty($mapa[$id]['respuesta'])) {
            continue;
        }
        $salida[] = bandeja_armar($tipo, $fila, $mapa[$id]);
    }
    return $salida;
}

sitraina_sesion_usuario();
$usuarioId = sitraina_usuario_id();
if ($usuarioId < 1) {
    bandeja_responder(401, ['ok' => false, 'mensaje' => 'Ingresá para ver tus mensajes.']);
}

$accion = strtolower(trim((string) ($_GET['accion'] ?? $_POST['accion'] ?? 'listar')));
$dbCuentas = abrir_cuentas_web();
if (!$dbCuentas) {
    $avisoCuentas = is_file(__DIR__ . '/config_usuarios.php')
        ? 'No se pudo conectar con if0_43158097_Usuario_Web. Revisá que esa base exista y que sql/07_Usuarios_Web.sql ya se haya ejecutado.'
        : 'No se pudo abrir Usuarios_Web. Falta php/config_usuarios.php en el servidor.';
    bandeja_responder(500, ['ok' => false, 'mensaje' => $avisoCuentas]);
}
$correoCuenta = bandeja_correo_cuenta($dbCuentas, $usuarioId);
$dbCuentas->close();
if ($correoCuenta === '' || !filter_var($correoCuenta, FILTER_VALIDATE_EMAIL)) {
    bandeja_responder(401, ['ok' => false, 'mensaje' => 'Ingresá para ver tus mensajes.']);
}

if ($accion === 'listar') {
    $dbConsultas = abrir_consultas();
    if (!$dbConsultas) {
        bandeja_responder(500, ['ok' => false, 'mensaje' => 'No se pudo abrir Info_Consultas.']);
    }
    $mensajes = [];
    foreach (['contacto', 'cita', 'afiliacion'] as $tipo) {
        $parte = bandeja_mensajes_de($dbConsultas, $tipo, $usuarioId);
        if ($parte === null) {
            $dbConsultas->close();
            bandeja_responder(500, ['ok' => false, 'mensaje' => 'No se pudieron leer las respuestas. Revisá Info_Respuestas.']);
        }
        $mensajes = array_merge($mensajes, $parte);
    }
    $dbConsultas->close();
    usort($mensajes, function ($a, $b) {
        return strcmp((string) $b['creado_en'], (string) $a['creado_en']);
    });
    bandeja_responder(200, ['ok' => true, 'mensajes' => array_slice($mensajes, 0, 300)]);
}

if ($accion === 'leer' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $token = (string) ($_POST['token'] ?? '');
    if (!sitraina_usuario_token_ok($token)) {
        bandeja_responder(400, ['ok' => false, 'mensaje' => 'Volvé a enviar el formulario.']);
    }
    $partes = explode(':', (string) ($_POST['id'] ?? ''), 2);
    $tipo = $partes[0] ?? '';
    $origenId = (int) ($partes[1] ?? 0);
    if (bandeja_tipo_respuesta($tipo) === null || $origenId < 1) {
        bandeja_responder(400, ['ok' => false, 'mensaje' => 'Elegí un mensaje.']);
    }
    $dbConsultas = abrir_consultas();
    if (!$dbConsultas) {
        bandeja_responder(500, ['ok' => false, 'mensaje' => 'No se pudo abrir Info_Consultas.']);
    }
    $filas = bandeja_consultas($dbConsultas, $tipo, $usuarioId);
    $dbConsultas->close();
    if ($filas === null) {
        bandeja_responder(500, ['ok' => false, 'mensaje' => 'No se pudo leer la solicitud.']);
    }
    $fila = null;
    foreach ($filas as $item) {
        if ((int) ($item['id'] ?? 0) === $origenId) {
            $fila = $item;
            break;
        }
    }
    if (!$fila) {
        bandeja_responder(404, ['ok' => false, 'mensaje' => 'No se encontró el mensaje.']);
    }
    $dbResp = abrir_respuestas();
    if (!$dbResp) {
        bandeja_responder(500, ['ok' => false, 'mensaje' => 'No se pudieron leer las respuestas.']);
    }
    $mapa = mapa_respuestas_por_tipo($dbResp, bandeja_tipo_respuesta($tipo));
    $dbResp->close();
    if (empty($mapa[$origenId]['respuesta'])) {
        bandeja_responder(404, ['ok' => false, 'mensaje' => 'No se encontró el mensaje.']);
    }
    bandeja_responder(200, ['ok' => true, 'mensaje' => bandeja_armar($tipo, $fila, $mapa[$origenId])]);
}

bandeja_responder(400, ['ok' => false, 'mensaje' => 'Acción no reconocida.']);
