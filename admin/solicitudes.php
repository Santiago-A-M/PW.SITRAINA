<?php
/* Lista consultas de usuarios y guarda SOLO las respuestas en la base respuestas. */
ob_start();
require __DIR__ . '/sesion.php';
require dirname(__DIR__) . '/php/respuestas.php';
require dirname(__DIR__) . '/php/correo_smtp.php';
require dirname(__DIR__) . '/php/disponibilidad.php';
ob_end_clean();

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

function solicitudes_responder($codigo, $datos) {
    http_response_code($codigo);
    echo json_encode($datos, JSON_UNESCAPED_UNICODE);
    exit;
}

/* Una fila de mysqli_stmt: get_result (mysqlnd) o bind_result. */
function solicitudes_fetch_assoc($consulta, $columnas) {
    if (method_exists($consulta, 'get_result')) {
        $res = $consulta->get_result();
        if (!$res) {
            return null;
        }
        $fila = $res->fetch_assoc();
        $res->free();
        return $fila ?: null;
    }
    $vars = [];
    $refs = [];
    foreach ($columnas as $i => $nombre) {
        $vars[$nombre] = null;
        $refs[$i] = &$vars[$nombre];
    }
    call_user_func_array([$consulta, 'bind_result'], $refs);
    if (!$consulta->fetch()) {
        return null;
    }
    $fila = [];
    foreach ($columnas as $nombre) {
        $fila[$nombre] = $vars[$nombre];
    }
    return $fila;
}

function abrir_consultas_db() {
    return abrir_consultas();
}

function mezclar_con_respuesta($fila, $resp, $extra = []) {
    $estado = $resp ? (string) ($resp['estado'] ?? 'pendiente') : 'pendiente';
    $base = array_merge($fila, $extra, [
        'estado' => $estado,
        'respuesta' => $resp ? (string) ($resp['respuesta'] ?? '') : '',
        'admin_usuario' => $resp ? (string) ($resp['admin_usuario'] ?? '') : '',
        'respondido_en' => $resp ? (string) ($resp['respondido_en'] ?? '') : '',
    ]);
    return $base;
}

function listar_contactos($dbUsuarios, $dbResp) {
    $mapa = mapa_respuestas_por_tipo($dbResp, 'contacto');
    $resultado = $dbUsuarios->query(
        'SELECT id, nombre, correo, asunto, mensaje, creado_en FROM Consulta_Contacto ORDER BY creado_en DESC LIMIT 300'
    );
    if (!$resultado) {
        return null;
    }
    $filas = [];
    while ($fila = $resultado->fetch_assoc()) {
        $id = (int) $fila['id'];
        $filas[] = mezclar_con_respuesta($fila, $mapa[$id] ?? null);
    }
    $resultado->free();
    return $filas;
}

function listar_citas($dbUsuarios, $dbResp) {
    $mapa = mapa_respuestas_por_tipo($dbResp, 'cita');
    $filas = [];
    foreach (leer_citas($dbUsuarios) as $cita) {
        $id = (int) ($cita['id'] ?? 0);
        if ($id < 1) {
            continue;
        }
        $filas[] = mezclar_con_respuesta([
            'id' => $id,
            'persona' => (string) ($cita['persona'] ?? ''),
            'correo' => (string) ($cita['correo'] ?? ''),
            'fecha' => (string) ($cita['fecha'] ?? ''),
            'hora' => (string) ($cita['hora'] ?? ''),
            'motivo' => (string) ($cita['motivo'] ?? ''),
            'creado_en' => (string) ($cita['creado_en'] ?? ''),
        ], $mapa[$id] ?? null);
    }
    usort($filas, function ($a, $b) {
        $ea = ($a['estado'] ?? '') === 'pendiente' ? 0 : 1;
        $eb = ($b['estado'] ?? '') === 'pendiente' ? 0 : 1;
        if ($ea !== $eb) {
            return $ea - $eb;
        }
        $ca = (string) ($a['creado_en'] ?? '');
        $cb = (string) ($b['creado_en'] ?? '');
        if ($ca !== '' || $cb !== '') {
            return strcmp($cb, $ca);
        }
        $fa = ((string) ($a['fecha'] ?? '')) . ' ' . ((string) ($a['hora'] ?? ''));
        $fb = ((string) ($b['fecha'] ?? '')) . ' ' . ((string) ($b['hora'] ?? ''));
        return strcmp($fb, $fa);
    });
    return array_slice($filas, 0, 300);
}

function listar_afiliados() {
    $db = abrir_afiliados();
    if (!$db) {
        return null;
    }
    $resultado = $db->query(
        'SELECT id, cedula, nombre_completo, correo, creado_en
         FROM Cuenta ORDER BY id DESC LIMIT 500'
    );
    if (!$resultado) {
        $db->close();
        return null;
    }
    $filas = [];
    while ($fila = $resultado->fetch_assoc()) {
        $filas[] = [
            'id' => (int) $fila['id'],
            'cedula' => preg_replace('/\D/', '', (string) $fila['cedula']),
            'nombre_completo' => (string) ($fila['nombre_completo'] ?? ''),
            'correo' => strtolower(trim((string) ($fila['correo'] ?? ''))),
            'creado_en' => (string) ($fila['creado_en'] ?? ''),
        ];
    }
    $resultado->free();
    $db->close();
    return $filas;
}

function listar_afilaciones($dbConsultas, $dbResp) {
    if (!$dbConsultas) {
        return null;
    }
    $mapa = mapa_respuestas_por_tipo($dbResp, 'afilacion');
    $resultado = $dbConsultas->query(
        'SELECT id, nombre, cedula, correo_ina, correo_personal, creado_en
         FROM Consulta_Afiliacion ORDER BY id DESC LIMIT 300'
    );
    if (!$resultado) {
        return null;
    }
    $filas = [];
    while ($fila = $resultado->fetch_assoc()) {
        $id = (int) $fila['id'];
        $correo = strtolower(trim((string) (($fila['correo_personal'] ?: $fila['correo_ina']) ?: '')));
        $filas[] = mezclar_con_respuesta([
            'id' => $id,
            'nombre' => (string) $fila['nombre'],
            'cedula' => preg_replace('/\D/', '', (string) $fila['cedula']),
            'correo' => $correo,
            'creado_en' => (string) ($fila['creado_en'] ?? ''),
        ], $mapa[$id] ?? null);
    }
    $resultado->free();
    return $filas;
}

function buscar_consulta($tipo, $id) {
    $id = (int) $id;
    if ($id < 1) {
        return null;
    }
    if ($tipo === 'contacto') {
        $db = abrir_usuarios();
        if (!$db) {
            return null;
        }
        $consulta = $db->prepare(
            'SELECT id, nombre, correo, asunto, mensaje, creado_en FROM Consulta_Contacto WHERE id = ? LIMIT 1'
        );
        if (!$consulta) {
            $db->close();
            return null;
        }
        $consulta->bind_param('i', $id);
        $consulta->execute();
        $fila = solicitudes_fetch_assoc($consulta, ['id', 'nombre', 'correo', 'asunto', 'mensaje', 'creado_en']);
        $consulta->close();
        $db->close();
        return $fila ?: null;
    }
    if ($tipo === 'cita') {
        $db = abrir_usuarios();
        if (!$db) {
            return null;
        }
        $cita = cita_por_id($db, $id);
        $db->close();
        if (!$cita) {
            return null;
        }
        return [
            'id' => (int) $cita['id'],
            'persona' => (string) ($cita['persona'] ?? ''),
            'correo' => (string) ($cita['correo'] ?? ''),
            'fecha' => (string) ($cita['fecha'] ?? ''),
            'hora' => (string) ($cita['hora'] ?? ''),
            'motivo' => (string) ($cita['motivo'] ?? ''),
        ];
    }
    if ($tipo === 'afilacion') {
        $db = abrir_consultas();
        if (!$db) {
            return null;
        }
        $consulta = $db->prepare(
            'SELECT id, nombre, cedula, correo_ina, correo_personal, creado_en FROM Consulta_Afiliacion WHERE id = ? LIMIT 1'
        );
        if (!$consulta) {
            $db->close();
            return null;
        }
        $consulta->bind_param('i', $id);
        $consulta->execute();
        $fila = solicitudes_fetch_assoc($consulta, ['id', 'nombre', 'cedula', 'correo_ina', 'correo_personal', 'creado_en']);
        $consulta->close();
        $db->close();
        if (!$fila) {
            return null;
        }
        return [
            'id' => (int) $fila['id'],
            'nombre' => (string) $fila['nombre'],
            'cedula' => preg_replace('/\D/', '', (string) $fila['cedula']),
            'correo' => strtolower(trim((string) (($fila['correo_personal'] ?: $fila['correo_ina']) ?: ''))),
        ];
    }
    return null;
}

function borrar_consulta_origen($tipo, $id) {
    $id = (int) $id;
    if ($id < 1) {
        return false;
    }
    if ($tipo === 'contacto') {
        $db = abrir_usuarios();
        if (!$db) {
            return false;
        }
        $consulta = $db->prepare('DELETE FROM Consulta_Contacto WHERE id = ? LIMIT 1');
        if (!$consulta) {
            $db->close();
            return false;
        }
        $consulta->bind_param('i', $id);
        $ok = $consulta->execute() && $consulta->affected_rows > 0;
        $consulta->close();
        $db->close();
        return $ok;
    }
    if ($tipo === 'cita') {
        $db = abrir_usuarios();
        if (!$db) {
            return false;
        }
        $ok = borrar_cita_id($db, $id);
        $db->close();
        return $ok;
    }
    if ($tipo === 'afilacion') {
        $db = abrir_consultas();
        if (!$db) {
            return false;
        }
        $consulta = $db->prepare('DELETE FROM Consulta_Afiliacion WHERE id = ? LIMIT 1');
        if (!$consulta) {
            $db->close();
            return false;
        }
        $consulta->bind_param('i', $id);
        $ok = $consulta->execute() && $consulta->affected_rows > 0;
        $consulta->close();
        $db->close();
        return $ok;
    }
    return false;
}

try {
if (empty($_SESSION['admin_usuario'])) {
    solicitudes_responder(403, ['ok' => false, 'mensaje' => 'Inicia sesión.']);
}

$dbResp = abrir_respuestas();
if (!$dbResp) {
    solicitudes_responder(500, ['ok' => false, 'mensaje' => 'Falta admin/config_respuestas.php o las tablas Respuesta_*.']);
}

$dbUsuarios = abrir_consultas();
if (!$dbUsuarios) {
    $dbResp->close();
    solicitudes_responder(500, ['ok' => false, 'mensaje' => 'Falta php/config.php o la base Info_Consultas.']);
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $tipo = (string) ($_GET['tipo'] ?? 'todas');
    if ($tipo === 'todas') {
        $datos = [
            'contacto' => listar_contactos($dbUsuarios, $dbResp),
            'cita' => listar_citas($dbUsuarios, $dbResp),
            'afilacion' => listar_afilaciones($dbUsuarios, $dbResp),
            'afiliados' => listar_afiliados(),
        ];
        $dbUsuarios->close();
        $dbResp->close();
        foreach ($datos as $clave => $lista) {
            if ($lista === null) {
                solicitudes_responder(500, [
                    'ok' => false,
                    'mensaje' => 'No se pudieron leer los datos. Revisá configs y sql/01–04.',
                ]);
            }
        }
        solicitudes_responder(200, ['ok' => true, 'datos' => $datos]);
    }
    if ($tipo === 'afiliados') {
        $lista = listar_afiliados();
        $dbUsuarios->close();
        $dbResp->close();
        if ($lista === null) {
            solicitudes_responder(500, ['ok' => false, 'mensaje' => 'No se pudo leer Cuenta (Info_Afiliados).']);
        }
        solicitudes_responder(200, ['ok' => true, 'tipo' => 'afiliados', 'filas' => $lista]);
    }
    if (!in_array($tipo, ['contacto', 'cita', 'afilacion'], true)) {
        $dbUsuarios->close();
        $dbResp->close();
        solicitudes_responder(400, ['ok' => false, 'mensaje' => 'Tipo no válido.']);
    }
    if ($tipo === 'contacto') {
        $lista = listar_contactos($dbUsuarios, $dbResp);
    } elseif ($tipo === 'cita') {
        $lista = listar_citas($dbUsuarios, $dbResp);
    } else {
        $lista = listar_afilaciones($dbUsuarios, $dbResp);
    }
    $dbUsuarios->close();
    $dbResp->close();
    if ($lista === null) {
        solicitudes_responder(500, ['ok' => false, 'mensaje' => 'No se pudo leer la lista.']);
    }
    solicitudes_responder(200, ['ok' => true, 'tipo' => $tipo, 'filas' => $lista]);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    $dbUsuarios->close();
    $dbResp->close();
    solicitudes_responder(405, ['ok' => false, 'mensaje' => 'Método no permitido.']);
}

$token = (string) ($_POST['token'] ?? '');
if (!hash_equals(token_admin(), $token)) {
    $dbUsuarios->close();
    $dbResp->close();
    solicitudes_responder(400, ['ok' => false, 'mensaje' => 'Vuelve a cargar la página.']);
}

$accion = (string) ($_POST['accion'] ?? '');

/* Los afiliados de Cuenta se cargan solo en phpMyAdmin; no hay toggle aquí. */
if ($accion === 'toggle_afiliado') {
    $dbUsuarios->close();
    $dbResp->close();
    solicitudes_responder(400, [
        'ok' => false,
        'mensaje' => 'Los afiliados se cargan o editan manualmente en Info_Afiliados (tabla Cuenta).',
    ]);
}

/* Borrar una o varias consultas (sección o papelera). */
if ($accion === 'eliminar_consulta' || $accion === 'eliminar_papelera') {
    $dbUsuarios->close();
    $dbResp->close();
    $items = [];
    if ($accion === 'eliminar_consulta') {
        $tipoUno = (string) ($_POST['tipo'] ?? '');
        $idUno = (int) ($_POST['id'] ?? 0);
        if (in_array($tipoUno, ['contacto', 'cita', 'afilacion'], true) && $idUno > 0) {
            $items[] = ['tipo' => $tipoUno, 'id' => $idUno];
        }
    } else {
        $crudo = (string) ($_POST['items'] ?? '[]');
        $decoded = json_decode($crudo, true);
        if (is_array($decoded)) {
            $items = $decoded;
        }
    }
    if (!$items) {
        solicitudes_responder(400, ['ok' => false, 'mensaje' => 'Seleccioná al menos una consulta.']);
    }
    $borrados = 0;
    foreach ($items as $item) {
        if (!is_array($item)) {
            continue;
        }
        $tipoItem = (string) ($item['tipo'] ?? '');
        $idItem = (int) ($item['id'] ?? 0);
        if (!in_array($tipoItem, ['contacto', 'cita', 'afilacion'], true) || $idItem < 1) {
            continue;
        }
        if ($accion === 'eliminar_papelera') {
            $dbCheck = abrir_respuestas();
            if (!$dbCheck) {
                continue;
            }
            $tablaResp = tabla_respuesta_por_tipo($tipoItem);
            if ($tablaResp === null) {
                $dbCheck->close();
                continue;
            }
            $check = $dbCheck->prepare(
                'SELECT id FROM `' . $tablaResp . '` WHERE origen_id = ? AND estado = \'rechazada\' LIMIT 1'
            );
            if (!$check) {
                $dbCheck->close();
                continue;
            }
            $check->bind_param('i', $idItem);
            $check->execute();
            $check->store_result();
            $eraRechazada = $check->num_rows > 0;
            $check->close();
            $dbCheck->close();
            if (!$eraRechazada) {
                continue;
            }
        }
        borrar_respuesta_enviada($tipoItem, $idItem);
        if (borrar_consulta_origen($tipoItem, $idItem)) {
            $borrados++;
        }
    }
    if ($borrados < 1) {
        solicitudes_responder(400, ['ok' => false, 'mensaje' => 'No se borró nada. Revisá la selección.']);
    }
    solicitudes_responder(200, [
        'ok' => true,
        'mensaje' => $borrados === 1
            ? 'Se borró 1 consulta de la base de datos.'
            : ('Se borraron ' . $borrados . ' consultas de la base de datos.'),
        'borrados' => $borrados,
    ]);
}

$tipo = (string) ($_POST['tipo'] ?? '');
$id = (int) ($_POST['id'] ?? 0);
$estado = (string) ($_POST['estado'] ?? '');
$respuesta = trim((string) ($_POST['respuesta'] ?? ''));
$admin = (string) ($_SESSION['admin_usuario'] ?? '');

$dbUsuarios->close();
$dbResp->close();

if (!in_array($tipo, ['contacto', 'cita', 'afilacion'], true)) {
    solicitudes_responder(400, ['ok' => false, 'mensaje' => 'Tipo no válido.']);
}
if ($id < 1) {
    solicitudes_responder(400, ['ok' => false, 'mensaje' => 'Elegí una solicitud.']);
}
if (!in_array($estado, ['aceptada', 'rechazada', 'neutral'], true)) {
    solicitudes_responder(400, ['ok' => false, 'mensaje' => 'Elegí Aceptar, Rechazar o Respuesta neutral.']);
}
if ($respuesta === '' || strlen($respuesta) > 4000) {
    solicitudes_responder(400, ['ok' => false, 'mensaje' => 'Escribí la respuesta (máximo 4000 caracteres).']);
}

$fila = buscar_consulta($tipo, $id);
if (!$fila) {
    solicitudes_responder(404, ['ok' => false, 'mensaje' => 'No se encontró esa consulta.']);
}

$correo = strtolower(trim((string) ($fila['correo'] ?? '')));
$nombre = trim((string) ($fila['nombre'] ?? ($fila['persona'] ?? '')));
if ($correo === '') {
    solicitudes_responder(400, ['ok' => false, 'mensaje' => 'Esa consulta no tiene correo.']);
}

$titulos = [
    'contacto' => 'Respuesta a su mensaje de contacto - SITRAINA',
    'cita' => 'Respuesta a su solicitud de cita - SITRAINA',
    'afilacion' => 'Respuesta a su solicitud de afiliación - SITRAINA',
];
$etiquetas = [
    'aceptada' => 'aceptada',
    'rechazada' => 'no aceptada',
    'neutral' => 'respondida',
];
$cuerpo = 'Hola' . ($nombre !== '' ? (' ' . $nombre) : '') . ",\n\n";
$cuerpo .= 'Le escribimos desde SITRAINA. Su solicitud fue marcada como ' . $etiquetas[$estado] . ".\n\n";
$cuerpo .= $respuesta . "\n\n";
$cuerpo .= "— Administración SITRAINA\n";

/* Primero la base (InfinityFree): el panel y los pendientes no dependen del correo. */
if (!guardar_respuesta_enviada($tipo, $id, $estado, $respuesta, $admin)) {
    solicitudes_responder(500, ['ok' => false, 'mensaje' => 'No se pudo guardar la respuesta en Info_Respuestas.']);
}

$correoOk = enviar_correo_sitraina_con_respaldo($correo, $nombre, $titulos[$tipo], $cuerpo);
if ($correoOk) {
    solicitudes_responder(200, [
        'ok' => true,
        'mensaje' => 'Respuesta guardada y enviada a ' . $correo . '.',
        'estado' => $estado,
        'correo_ok' => true,
    ]);
}

solicitudes_responder(200, [
    'ok' => true,
    'mensaje' => 'Respuesta guardada. El correo a ' . $correo . ' no se pudo enviar ahora (SMTP bloqueado o no disponible en el hosting).',
    'estado' => $estado,
    'correo_ok' => false,
]);
} catch (Throwable $e) {
    solicitudes_responder(500, ['ok' => false, 'mensaje' => 'No se pudieron cargar las solicitudes.']);
}
