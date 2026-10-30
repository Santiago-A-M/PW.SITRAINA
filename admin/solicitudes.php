<?php
/* Lista consultas de usuarios y guarda SOLO las respuestas en la base respuestas. */
ob_start();
require __DIR__ . '/sesion.php';
require dirname(__DIR__) . '/php/respuestas.php';
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
        'editado' => $resp && !empty($resp['editado']) ? 1 : 0,
    ]);
    return $base;
}

function listar_contactos($dbUsuarios, $dbResp, $cuentas = null) {
    $mapa = mapa_respuestas_por_tipo($dbResp, 'contacto');
    $resultado = $dbUsuarios->query(
        'SELECT id, nombre, correo, asunto, mensaje, creado_en, usuario_id FROM Consulta_Contacto ORDER BY creado_en DESC LIMIT 300'
    );
    if (!$resultado) {
        return null;
    }
    $filas = [];
    while ($fila = $resultado->fetch_assoc()) {
        $id = (int) $fila['id'];
        $item = mezclar_con_respuesta($fila, $mapa[$id] ?? null);
        $item['cuenta_web'] = solicitud_visible_en_bandeja('contacto', $fila, $cuentas) ? 1 : 0;
        $filas[] = $item;
    }
    $resultado->free();
    return $filas;
}

function listar_citas($dbUsuarios, $dbResp, $cuentas = null) {
    $mapa = mapa_respuestas_por_tipo($dbResp, 'cita');
    $filas = [];
    foreach (leer_citas($dbUsuarios) as $cita) {
        $id = (int) ($cita['id'] ?? 0);
        if ($id < 1) {
            continue;
        }
        $item = [
            'id' => $id,
            'persona' => (string) ($cita['persona'] ?? ''),
            'correo' => (string) ($cita['correo'] ?? ''),
            'fecha' => (string) ($cita['fecha'] ?? ''),
            'hora' => (string) ($cita['hora'] ?? ''),
            'motivo' => (string) ($cita['motivo'] ?? ''),
            'creado_en' => (string) ($cita['creado_en'] ?? ''),
            'usuario_id' => (int) ($cita['usuario_id'] ?? 0),
        ];
        $item['cuenta_web'] = solicitud_visible_en_bandeja('cita', $item, $cuentas) ? 1 : 0;
        $filas[] = mezclar_con_respuesta($item, $mapa[$id] ?? null);
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

function listar_afilaciones($dbConsultas, $dbResp, $cuentas = null) {
    if (!$dbConsultas) {
        return null;
    }
    $mapa = mapa_respuestas_por_tipo($dbResp, 'afilacion');
    $resultado = $dbConsultas->query(
        'SELECT id, nombre, cedula, correo_ina, correo_personal, creado_en, usuario_id
         FROM Consulta_Afiliacion ORDER BY id DESC LIMIT 300'
    );
    if (!$resultado) {
        return null;
    }
    $filas = [];
    while ($fila = $resultado->fetch_assoc()) {
        $id = (int) $fila['id'];
        $correo = strtolower(trim((string) (($fila['correo_personal'] ?: $fila['correo_ina']) ?: '')));
        $item = [
            'id' => $id,
            'nombre' => (string) $fila['nombre'],
            'cedula' => preg_replace('/\D/', '', (string) $fila['cedula']),
            'correo' => $correo,
            'correo_ina' => (string) ($fila['correo_ina'] ?? ''),
            'correo_personal' => (string) ($fila['correo_personal'] ?? ''),
            'creado_en' => (string) ($fila['creado_en'] ?? ''),
            'usuario_id' => (int) ($fila['usuario_id'] ?? 0),
        ];
        $item['cuenta_web'] = solicitud_visible_en_bandeja('afilacion', $item, $cuentas) ? 1 : 0;
        $filas[] = mezclar_con_respuesta($item, $mapa[$id] ?? null);
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
            'SELECT id, nombre, correo, asunto, mensaje, creado_en, usuario_id FROM Consulta_Contacto WHERE id = ? LIMIT 1'
        );
        if (!$consulta) {
            $db->close();
            return null;
        }
        $consulta->bind_param('i', $id);
        $consulta->execute();
        $fila = solicitudes_fetch_assoc($consulta, ['id', 'nombre', 'correo', 'asunto', 'mensaje', 'creado_en', 'usuario_id']);
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
            'usuario_id' => (int) ($cita['usuario_id'] ?? 0),
        ];
    }
    if ($tipo === 'afilacion') {
        $db = abrir_consultas();
        if (!$db) {
            return null;
        }
        $consulta = $db->prepare(
            'SELECT id, nombre, cedula, correo_ina, correo_personal, creado_en, usuario_id FROM Consulta_Afiliacion WHERE id = ? LIMIT 1'
        );
        if (!$consulta) {
            $db->close();
            return null;
        }
        $consulta->bind_param('i', $id);
        $consulta->execute();
        $fila = solicitudes_fetch_assoc($consulta, ['id', 'nombre', 'cedula', 'correo_ina', 'correo_personal', 'creado_en', 'usuario_id']);
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
            'correo_ina' => (string) ($fila['correo_ina'] ?? ''),
            'correo_personal' => (string) ($fila['correo_personal'] ?? ''),
            'usuario_id' => (int) ($fila['usuario_id'] ?? 0),
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

/* Cuenta solo se escribe desde este panel (sesión de admin + token). */
if ($accion === 'agregar_afiliado' || $accion === 'eliminar_afiliado') {
    $dbUsuarios->close();
    $dbResp->close();
    $dbAfiliados = abrir_afiliados();
    if (!$dbAfiliados) {
        solicitudes_responder(500, ['ok' => false, 'mensaje' => 'No se pudo abrir Info_Afiliados.']);
    }
    $dbAfiliados->query("SET @sitraina_panel = '1'");
    if ($accion === 'eliminar_afiliado') {
        $idAfiliado = (int) ($_POST['id'] ?? 0);
        if ($idAfiliado < 1) {
            $dbAfiliados->close();
            solicitudes_responder(400, ['ok' => false, 'mensaje' => 'Elegí un afiliado.']);
        }
        $borrar = $dbAfiliados->prepare('DELETE FROM Cuenta WHERE id = ? LIMIT 1');
        if (!$borrar) {
            $dbAfiliados->close();
            solicitudes_responder(500, ['ok' => false, 'mensaje' => 'No se pudo eliminar el afiliado.']);
        }
        $borrar->bind_param('i', $idAfiliado);
        $borro = $borrar->execute() && $borrar->affected_rows > 0;
        $borrar->close();
        $dbAfiliados->close();
        if (!$borro) {
            solicitudes_responder(404, ['ok' => false, 'mensaje' => 'Ese afiliado ya no está en la lista.']);
        }
        solicitudes_responder(200, ['ok' => true, 'mensaje' => 'Afiliado eliminado.']);
    }
    $cedulaNueva = preg_replace('/\D/', '', (string) ($_POST['cedula'] ?? ''));
    $nombreNuevo = trim((string) ($_POST['nombre_completo'] ?? ''));
    $correoNuevo = strtolower(trim((string) ($_POST['correo'] ?? '')));
    $largoNombre = function_exists('mb_strlen') ? mb_strlen($nombreNuevo, 'UTF-8') : strlen($nombreNuevo);
    if (!preg_match('/^[0-9]{9}$/', $cedulaNueva)) {
        $dbAfiliados->close();
        solicitudes_responder(400, ['ok' => false, 'mensaje' => 'La cédula debe tener 9 dígitos.']);
    }
    if ($nombreNuevo === '' || $largoNombre > 120) {
        $dbAfiliados->close();
        solicitudes_responder(400, ['ok' => false, 'mensaje' => 'Escribí el nombre completo.']);
    }
    if (!preg_match('/^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9\-]+(?:\.[a-zA-Z0-9\-]+)*\.[a-zA-Z]{2,}$/', $correoNuevo) || strlen($correoNuevo) > 120) {
        $dbAfiliados->close();
        solicitudes_responder(400, ['ok' => false, 'mensaje' => 'Escribí un correo válido.']);
    }
    $creadoEn = (new DateTime('now', new DateTimeZone('America/Costa_Rica')))->format('Y-m-d H:i:s');
    $insertar = $dbAfiliados->prepare('INSERT INTO Cuenta (cedula, nombre_completo, correo, creado_en) VALUES (?, ?, ?, ?)');
    if (!$insertar) {
        $dbAfiliados->close();
        solicitudes_responder(500, ['ok' => false, 'mensaje' => 'No se pudo guardar el afiliado.']);
    }
    $insertar->bind_param('ssss', $cedulaNueva, $nombreNuevo, $correoNuevo, $creadoEn);
    $guardo = $insertar->execute();
    $duplicado = !$guardo && ((int) $insertar->errno === 1062 || (int) $dbAfiliados->errno === 1062);
    $insertar->close();
    $dbAfiliados->close();
    if ($duplicado) {
        solicitudes_responder(409, ['ok' => false, 'mensaje' => 'Esa cédula o ese correo ya está registrado.']);
    }
    if (!$guardo) {
        solicitudes_responder(500, ['ok' => false, 'mensaje' => 'No se pudo guardar el afiliado.']);
    }
    solicitudes_responder(200, ['ok' => true, 'mensaje' => 'Afiliado registrado.']);
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
$editar = (string) ($_POST['editar'] ?? '') === '1';
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

$enBandeja = solicitud_visible_en_bandeja($tipo, $fila);

if (!guardar_respuesta_enviada($tipo, $id, $estado, $respuesta, $admin, $editar)) {
    solicitudes_responder(500, ['ok' => false, 'mensaje' => 'No se pudo guardar la respuesta en Info_Respuestas.']);
}

if ($enBandeja) {
    solicitudes_responder(200, [
        'ok' => true,
        'mensaje' => 'Respuesta guardada. Llega a Mis mensajes porque la persona ya había iniciado sesión con esa cuenta.',
        'estado' => $estado,
        'bandeja' => true,
    ]);
}

solicitudes_responder(200, [
    'ok' => true,
    'mensaje' => 'Respuesta guardada. Esta solicitud no se envió con la cuenta iniciada: no aparece en Mis mensajes.',
    'estado' => $estado,
    'bandeja' => false,
]);
} catch (Throwable $e) {
    solicitudes_responder(500, ['ok' => false, 'mensaje' => 'No se pudieron cargar las solicitudes.']);
}
