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

function bandeja_aviso_cita($fila, $resp) {
    $fecha = trim((string) ($fila['fecha'] ?? ''));
    $cancelado = trim((string) ($fila['cancelado_en'] ?? ''));
    $aceptada = (string) ($resp['estado'] ?? '') === 'aceptada';
    $programada = cita_fecha_programada($fecha);
    $plazo = $cancelado !== '' ? plazo_reprogramacion_cita($cancelado) : null;
    $puedeCancelar = $aceptada && $programada && $cancelado === '';
    $vigente = $plazo && !empty($plazo['vigente']);
    $puedeReprogramar = $aceptada && $vigente;
    $aviso = '';
    if ($puedeCancelar) {
        $aviso = 'Esta cita está confirmada. Si la cancelás, tenés 15 días desde ese momento para volver a pedirla. La nueva queda para el mismo día en que la pidas, si ese día está disponible.';
    } elseif ($plazo && $vigente) {
        $aviso = 'Cancelaste esta cita el ' . etiqueta_momento_es($plazo['cancelado']) . '. Podés volver a pedirla hasta el ' . etiqueta_momento_es($plazo['limite']) . '. La nueva queda para el mismo día en que la pidas, si ese día está disponible.';
    } elseif ($plazo) {
        $aviso = 'El plazo de 15 días venció el ' . etiqueta_momento_es($plazo['limite']) . '. Esta cita queda cancelada y ya no se puede recuperar. Podés enviar una solicitud nueva.';
    }
    return [
        'fecha' => $fecha,
        'hora' => trim((string) ($fila['hora'] ?? '')),
        'cancelado_en' => $cancelado,
        'plazo_limite' => $plazo['limite'] ?? '',
        'plazo_vigente' => $vigente ? 1 : 0,
        'segundos_restantes' => $plazo ? (int) $plazo['segundos'] : 0,
        'limite_unix' => $plazo ? (int) $plazo['limite_unix'] : 0,
        'ahora_unix' => $plazo ? (int) $plazo['ahora_unix'] : 0,
        'puede_cancelar' => $puedeCancelar ? 1 : 0,
        'puede_reprogramar' => $puedeReprogramar ? 1 : 0,
        'aviso_plazo' => $aviso,
    ];
}

function bandeja_armar($tipo, $fila, $resp) {
    $origen = (int) ($fila['id'] ?? 0);
    $mensaje = [
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
    if ($tipo === 'cita') {
        foreach (bandeja_aviso_cita($fila, $resp) as $clave => $valor) {
            $mensaje[$clave] = $valor;
        }
    }
    return $mensaje;
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
        asegurar_cancelado_cita($db);
        $consulta = $db->prepare(
            'SELECT id, persona, correo, fecha, hora, cancelado_en FROM Consulta_Asesoria WHERE usuario_id = ? ORDER BY id DESC LIMIT 200'
        );
        $columnas = ['id', 'persona', 'correo', 'fecha', 'hora', 'cancelado_en'];
        if (!$consulta) {
            $consulta = $db->prepare(
                'SELECT id, persona, correo, fecha, hora FROM Consulta_Asesoria WHERE usuario_id = ? ORDER BY id DESC LIMIT 200'
            );
            $columnas = ['id', 'persona', 'correo', 'fecha', 'hora'];
        }
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

function bandeja_cita_de($db, $usuarioId, $origenId) {
    if (!asegurar_cancelado_cita($db)) {
        return null;
    }
    $consulta = $db->prepare(
        'SELECT id, fecha, hora, cancelado_en FROM Consulta_Asesoria WHERE id = ? AND usuario_id = ? LIMIT 1'
    );
    if (!$consulta) {
        return null;
    }
    $usuarioId = (int) $usuarioId;
    $origenId = (int) $origenId;
    $consulta->bind_param('ii', $origenId, $usuarioId);
    $consulta->execute();
    $id = 0;
    $fecha = '';
    $hora = '';
    $cancelado = null;
    $consulta->bind_result($id, $fecha, $hora, $cancelado);
    $hay = $consulta->fetch();
    $consulta->close();
    if (!$hay) {
        return false;
    }
    return [
        'id' => (int) $id,
        'fecha' => $fecha === null ? '' : (string) $fecha,
        'hora' => $hora === null ? '' : (string) $hora,
        'cancelado_en' => $cancelado === null ? '' : (string) $cancelado,
    ];
}

function bandeja_cita_aceptada($origenId) {
    $dbResp = abrir_respuestas();
    if (!$dbResp) {
        return null;
    }
    $mapa = mapa_respuestas_por_tipo($dbResp, 'cita');
    $dbResp->close();
    return (string) ($mapa[(int) $origenId]['estado'] ?? '') === 'aceptada';
}

function bandeja_mensaje_sin_cupo($resultado) {
    if ($resultado === 'ocupada') {
        return 'Esa hora acaba de ocuparse. Podés intentar con otra, dentro de los 15 días.';
    }
    if ($resultado === 'bloqueada' || $resultado === 'no_habil') {
        return 'Hoy no está disponible. Podés intentarlo otro día, dentro de los 15 días.';
    }
    return 'No se pudo reprogramar la cita. Volvé a intentarlo.';
}

function bandeja_grupo_cita($fila, $resp) {
    if (trim((string) ($fila['cancelado_en'] ?? '')) !== '') {
        return 'cancelada';
    }
    $estado = (string) ($resp['estado'] ?? '');
    if ($estado === 'aceptada') {
        return 'aprobada';
    }
    if ($estado === 'rechazada') {
        return 'rechazada';
    }
    return 'revision';
}

function bandeja_mis_citas($db, $usuarioId) {
    if (!asegurar_cancelado_cita($db) || !asegurar_modalidad_cita($db)) {
        return null;
    }
    $consulta = $db->prepare(
        'SELECT id, persona, fecha, hora, motivo, creado_en, cancelado_en, modalidad FROM Consulta_Asesoria WHERE usuario_id = ? ORDER BY id DESC LIMIT 200'
    );
    if (!$consulta) {
        return null;
    }
    $usuarioId = (int) $usuarioId;
    $consulta->bind_param('i', $usuarioId);
    $consulta->execute();
    $filas = bandeja_filas($consulta, ['id', 'persona', 'fecha', 'hora', 'motivo', 'creado_en', 'cancelado_en', 'modalidad']);
    $consulta->close();
    $dbResp = abrir_respuestas();
    if (!$dbResp) {
        return null;
    }
    $mapa = mapa_respuestas_por_tipo($dbResp, 'cita');
    $dbResp->close();
    $salida = [];
    $ahoraUnix = (new DateTime('now', new DateTimeZone('America/Costa_Rica')))->getTimestamp();
    foreach ($filas as $fila) {
        $id = (int) ($fila['id'] ?? 0);
        if ($id < 1) {
            continue;
        }
        $resp = $mapa[$id] ?? ['estado' => 'pendiente', 'respuesta' => '', 'respondido_en' => '', 'editado' => 0];
        $extra = bandeja_aviso_cita($fila, $resp);
        $salida[] = array_merge([
            'id' => 'cita:' . $id,
            'origen_id' => $id,
            'persona' => (string) ($fila['persona'] ?? ''),
            'motivo' => (string) ($fila['motivo'] ?? ''),
            'modalidad' => (string) ($fila['modalidad'] ?? ''),
            'creado_en' => (string) ($fila['creado_en'] ?? ''),
            'estado' => (string) ($resp['estado'] ?? 'pendiente'),
            'grupo' => bandeja_grupo_cita($fila, $resp),
            'respuesta' => (string) ($resp['respuesta'] ?? ''),
            'respondido_en' => (string) ($resp['respondido_en'] ?? ''),
            'editado' => !empty($resp['editado']) ? 1 : 0,
        ], $extra);
    }
    return ['citas' => $salida, 'ahora_unix' => $ahoraUnix];
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
        ? 'No pudimos abrir tu cuenta en este momento. Intentá de nuevo más tarde.'
        : 'No pudimos abrir tu cuenta en este momento. Intentá de nuevo más tarde.';
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
        bandeja_responder(500, ['ok' => false, 'mensaje' => 'No pudimos abrir tus mensajes en este momento. Intentá de nuevo más tarde.']);
    }
    $mensajes = [];
    foreach (['contacto', 'cita', 'afiliacion'] as $tipo) {
        $parte = bandeja_mensajes_de($dbConsultas, $tipo, $usuarioId);
        if ($parte === null) {
            $dbConsultas->close();
            bandeja_responder(500, ['ok' => false, 'mensaje' => 'No pudimos leer las respuestas. Intentá de nuevo más tarde.']);
        }
        $mensajes = array_merge($mensajes, $parte);
    }
    $dbConsultas->close();
    usort($mensajes, function ($a, $b) {
        return strcmp((string) $b['creado_en'], (string) $a['creado_en']);
    });
    bandeja_responder(200, ['ok' => true, 'mensajes' => array_slice($mensajes, 0, 300)]);
}

if ($accion === 'mis_citas') {
    $dbConsultas = abrir_consultas();
    if (!$dbConsultas) {
        bandeja_responder(500, ['ok' => false, 'mensaje' => 'No pudimos abrir tus mensajes en este momento. Intentá de nuevo más tarde.']);
    }
    $lista = bandeja_mis_citas($dbConsultas, $usuarioId);
    $dbConsultas->close();
    if ($lista === null) {
        bandeja_responder(500, ['ok' => false, 'mensaje' => 'No se pudieron leer tus citas.']);
    }
    bandeja_responder(200, [
        'ok' => true,
        'citas' => $lista['citas'],
        'ahora_unix' => (int) $lista['ahora_unix'],
    ]);
}

if ($accion === 'leer' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $token = (string) ($_POST['token'] ?? '');
    if (!sitraina_usuario_token_ok($token)) {
        bandeja_responder(400, ['ok' => false, 'mensaje' => 'Volvé a intentarlo desde la página.']);
    }
    $partes = explode(':', (string) ($_POST['id'] ?? ''), 2);
    $tipo = $partes[0] ?? '';
    $origenId = (int) ($partes[1] ?? 0);
    if (bandeja_tipo_respuesta($tipo) === null || $origenId < 1) {
        bandeja_responder(400, ['ok' => false, 'mensaje' => 'Elegí un mensaje.']);
    }
    $dbConsultas = abrir_consultas();
    if (!$dbConsultas) {
        bandeja_responder(500, ['ok' => false, 'mensaje' => 'No pudimos abrir tus mensajes en este momento. Intentá de nuevo más tarde.']);
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

if (($accion === 'cancelar_cita' || $accion === 'reprogramar_cita') && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $token = (string) ($_POST['token'] ?? '');
    if (!sitraina_usuario_token_ok($token)) {
        bandeja_responder(400, ['ok' => false, 'mensaje' => 'Volvé a enviar la solicitud.']);
    }
    $partes = explode(':', (string) ($_POST['id'] ?? ''), 2);
    $tipo = $partes[0] ?? '';
    $origenId = (int) ($partes[1] ?? 0);
    if ($tipo !== 'cita' || $origenId < 1) {
        bandeja_responder(400, ['ok' => false, 'mensaje' => 'Elegí una cita programada.']);
    }
    $db = abrir_consultas();
    if (!$db) {
        bandeja_responder(500, ['ok' => false, 'mensaje' => 'No pudimos abrir tus mensajes en este momento. Intentá de nuevo más tarde.']);
    }
    $cita = bandeja_cita_de($db, $usuarioId, $origenId);
    if ($cita === null) {
        $db->close();
        bandeja_responder(500, ['ok' => false, 'mensaje' => 'No pudimos cancelar la cita en este momento. Intentá de nuevo más tarde.']);
    }
    if ($cita === false) {
        $db->close();
        bandeja_responder(404, ['ok' => false, 'mensaje' => 'No se encontró la cita.']);
    }
    $aceptada = bandeja_cita_aceptada($origenId);
    if ($aceptada === null) {
        $db->close();
        bandeja_responder(500, ['ok' => false, 'mensaje' => 'No se pudo leer la respuesta de la cita.']);
    }
    if (!$aceptada) {
        $db->close();
        bandeja_responder(400, ['ok' => false, 'mensaje' => 'Solo se puede cancelar o reprogramar una cita que ya fue aceptada.']);
    }

    if ($accion === 'cancelar_cita') {
        if (!cita_fecha_programada($cita['fecha'])) {
            $db->close();
            bandeja_responder(400, ['ok' => false, 'mensaje' => 'Solo se cancela una cita que ya tiene día asignado.']);
        }
        if (trim((string) $cita['cancelado_en']) !== '') {
            $db->close();
            bandeja_responder(400, ['ok' => false, 'mensaje' => 'Esa cita ya está cancelada.']);
        }
        $marca = ahora_costa_rica_sql();
        asegurar_cupo_cita($db);
        $up = $db->prepare('UPDATE Consulta_Asesoria SET cancelado_en = ?, cupo_activo = NULL WHERE id = ? AND usuario_id = ? AND cancelado_en IS NULL LIMIT 1');
        if (!$up) {
            $db->close();
            bandeja_responder(500, ['ok' => false, 'mensaje' => 'No se pudo cancelar la cita.']);
        }
        $up->bind_param('sii', $marca, $origenId, $usuarioId);
        $up->execute();
        $hecho = $up->affected_rows === 1;
        $up->close();
        if (!$hecho) {
            $db->close();
            bandeja_responder(400, ['ok' => false, 'mensaje' => 'Esa cita ya está cancelada.']);
        }
        liberar_dia_cita_cancelada($db, $cita['fecha'], $origenId);
        $db->close();
        $plazo = plazo_reprogramacion_cita($marca);
        $limite = $plazo ? etiqueta_momento_es($plazo['limite']) : '';
        bandeja_responder(200, [
            'ok' => true,
            'mensaje' => 'La cita quedó cancelada y ese horario volvió a quedar libre. Tenés hasta el ' . $limite . ' (360 horas desde ahora) para volver a agendarla. La nueva cita queda para ese mismo día, en el primer horario libre.',
        ]);
    }

    $plazo = plazo_reprogramacion_cita($cita['cancelado_en']);
    if (!$plazo) {
        $db->close();
        bandeja_responder(400, ['ok' => false, 'mensaje' => 'Esta cita no está cancelada.']);
    }
    if (empty($plazo['vigente'])) {
        $db->close();
        bandeja_responder(400, [
            'ok' => false,
            'mensaje' => 'El plazo de 15 días venció el ' . etiqueta_momento_es($plazo['limite']) . '. Ya no se puede recuperar esta cita.',
        ]);
    }
    $hoy = hoy_costa_rica();
    $horaHoy = hora_libre_en_fecha($hoy, (string) ($cita['hora'] ?? ''));
    if ($horaHoy === '') {
        $db->close();
        bandeja_responder(400, ['ok' => false, 'mensaje' => 'Hoy no tiene una hora libre. Podés intentarlo otro día, dentro de los 15 días.']);
    }
    $db->close();
    $reclamo = reclamar_horario_cita($origenId, $hoy, $horaHoy, true);
    if ($reclamo !== 'ok') {
        bandeja_responder(400, ['ok' => false, 'mensaje' => bandeja_mensaje_sin_cupo($reclamo === 'hora_no_habil' || $reclamo === 'no_habil' || $reclamo === 'bloqueada' ? 'no_habil' : $reclamo)]);
    }
    bandeja_responder(200, [
        'ok' => true,
        'mensaje' => 'La cita quedó para hoy, ' . etiqueta_momento_es($hoy . ' ' . $horaHoy) . '.',
    ]);
}

bandeja_responder(400, ['ok' => false, 'mensaje' => 'Acción no reconocida.']);
