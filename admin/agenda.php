<?php
/* Guarda y lee la agenda del administrador. Exige sesión y, al guardar, el token. */
ob_start();
require __DIR__ . '/sesion.php';
require dirname(__DIR__) . '/php/disponibilidad.php';
require dirname(__DIR__) . '/php/respuestas.php';
ob_end_clean();

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

/* Devuelve un JSON y termina la petición. */
function responder($codigo, $datos) {
    http_response_code($codigo);
    echo json_encode($datos);
    exit;
}

/* Valida fecha Y-m-d. */
function validar_fecha_admin($valor) {
    $dia = DateTime::createFromFormat('!Y-m-d', $valor);
    return $dia && $dia->format('Y-m-d') === $valor;
}

/* Valida hora HH:MM y la normaliza. */
function validar_hora_admin($valor) {
    $hora = normalizar_hora_cita($valor);
    return $hora === '' ? null : $hora;
}

/* "YYYY-MM-DD HH:MM": el cierre de atención de ese día, puesto a mano. */
function validar_cierre_excepcion($valor) {
    $partes = partir_hora_excepcion($valor);
    if (!$partes) {
        return null;
    }
    return $partes[0] . ' ' . $partes[1];
}

function asegurar_valor_agenda($mysqli) {
    if (!$mysqli) {
        return false;
    }
    $col = $mysqli->query("SHOW COLUMNS FROM Agenda LIKE 'valor'");
    if (!$col) {
        return false;
    }
    $fila = $col->fetch_assoc();
    $col->free();
    $tipo = strtolower((string) ($fila['Type'] ?? ''));
    if (preg_match('/(?:var)?char\((\d+)\)/', $tipo, $medida) && (int) $medida[1] < 32) {
        return (bool) $mysqli->query('ALTER TABLE Agenda MODIFY valor VARCHAR(32) NOT NULL');
    }
    return true;
}

function mensaje_horario_cita($resultado) {
    if ($resultado === 'ocupada') {
        return 'Este horario ya no se encuentra disponible. Elegí otro horario.';
    }
    if ($resultado === 'pasada') {
        return 'Elegí el día de hoy o uno posterior.';
    }
    if ($resultado === 'bloqueada') {
        return 'Ese día no se ofrece.';
    }
    if ($resultado === 'hora_no_habil') {
        return 'Esa hora no está disponible en el horario.';
    }
    if ($resultado === 'no_habil' || $resultado === 'invalida') {
        return 'Ese día no está disponible.';
    }
    if ($resultado === 'cancelada') {
        return 'Una cita cancelada no vuelve a ocupar un horario.';
    }
    return 'No se pudo reservar ese horario.';
}

/* Lee el estado actual de un día. null si no hay fila. */
function estado_fecha_agenda($mysqli, $fecha) {
    $tipo = 'fecha';
    $estado = '';
    $consulta = $mysqli->prepare('SELECT estado FROM Agenda WHERE tipo = ? AND valor = ? LIMIT 1');
    if (!$consulta) {
        return null;
    }
    $consulta->bind_param('ss', $tipo, $fecha);
    $consulta->execute();
    $consulta->bind_result($estado);
    $hay = $consulta->fetch();
    $consulta->close();
    return $hay ? (string) $estado : '';
}

/* Crea el mes como hábil solo si todavía no existe. No cambia un mes ya guardado. */
function asegurar_mes_agenda($mysqli, $mes) {
    if (!preg_match('/^\d{4}-\d{2}$/', $mes)) {
        return;
    }
    $tipo = 'mes';
    $estado = 'abierta';
    $consulta = $mysqli->prepare(
        'INSERT INTO Agenda (tipo, valor, estado) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE estado = estado'
    );
    if (!$consulta) {
        return;
    }
    $consulta->bind_param('sss', $tipo, $mes, $estado);
    $consulta->execute();
    $consulta->close();
}

/* Guarda hábil o no hábil. No toca un día que ya está ocupado por una cita aceptada. */
function guardar_fecha_sin_pisar_ocupada($mysqli, $fecha, $estado) {
    $actual = estado_fecha_agenda($mysqli, $fecha);
    if ($actual === null) {
        return 'error';
    }
    if ($actual === 'ocupada') {
        return 'omitida_ocupada';
    }
    if ($actual === $estado) {
        return 'ya_estaba';
    }
    $tipo = 'fecha';
    if ($actual === '') {
        $consulta = $mysqli->prepare('INSERT INTO Agenda (tipo, valor, estado) VALUES (?, ?, ?)');
        if (!$consulta) {
            return 'error';
        }
        $consulta->bind_param('sss', $tipo, $fecha, $estado);
        $ok = $consulta->execute();
        $consulta->close();
        return $ok ? 'guardada' : 'error';
    }
    $consulta = $mysqli->prepare(
        "UPDATE Agenda SET estado = ? WHERE tipo = ? AND valor = ? AND estado <> 'ocupada'"
    );
    if (!$consulta) {
        return 'error';
    }
    $consulta->bind_param('sss', $estado, $tipo, $fecha);
    $ok = $consulta->execute();
    $consulta->close();
    if (!$ok) {
        return 'error';
    }
    $despues = estado_fecha_agenda($mysqli, $fecha);
    if ($despues === 'ocupada') {
        return 'omitida_ocupada';
    }
    return $despues === $estado ? 'guardada' : 'error';
}

/* Aplica el mismo estado a varias fechas y arma el resumen. */
function aplicar_fechas_agenda($mysqli, $fechas, $estado) {
    $guardadas = 0;
    $omitidas = 0;
    $ya = 0;
    $detalle = [];
    foreach ($fechas as $fecha) {
        asegurar_mes_agenda($mysqli, substr($fecha, 0, 7));
        $resultado = guardar_fecha_sin_pisar_ocupada($mysqli, $fecha, $estado);
        if ($resultado === 'guardada') {
            $guardadas++;
        } elseif ($resultado === 'omitida_ocupada') {
            $omitidas++;
        } elseif ($resultado === 'ya_estaba') {
            $ya++;
        } else {
            return null;
        }
        if ($estado === 'bloqueada' && ($resultado === 'guardada' || $resultado === 'ya_estaba')) {
            $prefijoCierre = $fecha . ' %';
            $borrarCierre = $mysqli->prepare("DELETE FROM Agenda WHERE tipo = 'hora' AND valor LIKE ?");
            if ($borrarCierre) {
                $borrarCierre->bind_param('s', $prefijoCierre);
                $borrarCierre->execute();
                $borrarCierre->close();
            }
        }
        $detalle[] = ['fecha' => $fecha, 'resultado' => $resultado];
    }
    return [
        'guardadas' => $guardadas,
        'omitidas_ocupadas' => $omitidas,
        'ya_estaban' => $ya,
        'detalle' => $detalle,
    ];
}

function mensaje_lote_fechas($resumen, $accionTexto) {
    $texto = $accionTexto . ': ' . (int) $resumen['guardadas'] . ' fecha(s).';
    if ((int) $resumen['ya_estaban'] > 0) {
        $texto .= ' ' . (int) $resumen['ya_estaban'] . ' ya estaban así.';
    }
    if ((int) $resumen['omitidas_ocupadas'] > 0) {
        $texto .= ' ' . (int) $resumen['omitidas_ocupadas'] . ' siguen ocupadas por una cita aceptada.';
    }
    return $texto;
}

try {
if (empty($_SESSION['admin_usuario'])) {
    responder(403, ['ok' => false, 'mensaje' => 'Inicia sesión.']);
}
if (rol_personal_admin() !== 'admin') {
    responder(403, ['ok' => false, 'mensaje' => 'No tenés permiso para cambiar los días y las horas.']);
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $admin = abrir_admin();
    if (!$admin) {
        responder(500, ['ok' => false, 'mensaje' => 'No pudimos conectar en este momento. Intentá más tarde.']);
    }
    $reglas = leer_agenda($admin);
    $admin->close();
    if (!is_array($reglas)) {
        responder(500, ['ok' => false, 'mensaje' => 'No pudimos guardar los días en este momento. Intentá más tarde.']);
    }
    $citas = [];
    $usuarios = abrir_usuarios();
    if ($usuarios) {
        $citas = leer_citas($usuarios);
        $usuarios->close();
    }
    responder(200, ['ok' => true, 'reglas' => $reglas['filas'], 'citas' => $citas]);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    responder(405, ['ok' => false, 'mensaje' => 'No se pudo guardar.']);
}

$token = (string) ($_POST['token'] ?? '');
if (!hash_equals(token_admin(), $token)) {
    responder(400, ['ok' => false, 'mensaje' => 'Volvé a abrir la página e intentá de nuevo.']);
}

$tipo = (string) ($_POST['tipo'] ?? '');
$valor = trim((string) ($_POST['valor'] ?? ''));
$estado = (string) ($_POST['estado'] ?? '');
$accion = (string) ($_POST['accion'] ?? '');

if ($accion === 'bloquear_quince') {
    if (!validar_fecha_admin($valor)) {
        responder(400, ['ok' => false, 'mensaje' => 'Elegí una fecha válida.']);
    }
    $zona = new DateTimeZone('America/Costa_Rica');
    $inicio = DateTime::createFromFormat('!Y-m-d', $valor, $zona);
    if (!$inicio) {
        responder(400, ['ok' => false, 'mensaje' => 'Elegí una fecha válida.']);
    }
    $siguientes = [];
    for ($i = 1; $i <= 15; $i++) {
        $dia = clone $inicio;
        $dia->modify('+' . $i . ' day');
        $siguientes[] = $dia->format('Y-m-d');
    }
    $mysqliQuince = abrir_agenda();
    if (!$mysqliQuince) {
        responder(500, ['ok' => false, 'mensaje' => 'No pudimos conectar en este momento. Intentá más tarde.']);
    }
    asegurar_mes_agenda($mysqliQuince, substr($valor, 0, 7));
    $resultadoInicio = guardar_fecha_sin_pisar_ocupada($mysqliQuince, $valor, 'abierta');
    if ($resultadoInicio === 'error' || $resultadoInicio === null) {
        $mysqliQuince->close();
        responder(500, ['ok' => false, 'mensaje' => 'No se pudo dejar disponible la fecha elegida.']);
    }
    $resumenQuince = aplicar_fechas_agenda($mysqliQuince, $siguientes, 'bloqueada');
    $mysqliQuince->close();
    if (!is_array($resumenQuince)) {
        responder(500, ['ok' => false, 'mensaje' => 'No pudimos reservar los 15 días siguientes.']);
    }
    $inicioLista = ($resultadoInicio === 'guardada' || $resultadoInicio === 'ya_estaba');
    $bloqueoLista = ((int) $resumenQuince['guardadas'] > 0 || (int) $resumenQuince['ya_estaban'] > 0);
    $detalleQuince = [[
        'fecha' => $valor,
        'resultado' => $resultadoInicio,
        'estado' => 'abierta',
    ]];
    foreach ($resumenQuince['detalle'] as $filaQuince) {
        $filaQuince['estado'] = 'bloqueada';
        $detalleQuince[] = $filaQuince;
    }
    if (!$inicioLista && !$bloqueoLista) {
        responder(400, [
            'ok' => false,
            'mensaje' => 'Esas fechas están ocupadas por citas aceptadas y no se modificaron.',
            'detalle' => $detalleQuince,
            'omitidas_ocupadas' => (int) $resumenQuince['omitidas_ocupadas'] + ($resultadoInicio === 'omitida_ocupada' ? 1 : 0),
        ]);
    }
    $textoQuince = $inicioLista
        ? 'La fecha elegida queda disponible.'
        : 'La fecha elegida sigue ocupada por una cita aceptada y no se cambió.';
    $textoQuince .= ' ' . mensaje_lote_fechas($resumenQuince, 'Los siguientes no se ofrecen');
    responder(200, [
        'ok' => true,
        'mensaje' => $textoQuince,
        'detalle' => $detalleQuince,
        'omitidas_ocupadas' => (int) $resumenQuince['omitidas_ocupadas'],
    ]);
}

if ($accion === 'guardar_lote') {
    if (!in_array($estado, ['abierta', 'bloqueada'], true)) {
        responder(400, ['ok' => false, 'mensaje' => 'Solo se puede marcar disponible o no disponible. Una hora se ocupa cuando se acepta una cita.']);
    }
    $fechas = [];
    foreach (preg_split('/\s*,\s*/', (string) ($_POST['fechas'] ?? '')) as $candidata) {
        $candidata = trim($candidata);
        if ($candidata === '') {
            continue;
        }
        if (!validar_fecha_admin($candidata)) {
            responder(400, ['ok' => false, 'mensaje' => 'Hay una fecha que no es válida.']);
        }
        if (!in_array($candidata, $fechas, true)) {
            $fechas[] = $candidata;
        }
    }
    if (!$fechas || count($fechas) > 120) {
        responder(400, ['ok' => false, 'mensaje' => 'Elegí al menos una fecha.']);
    }
    $mysqliLote = abrir_agenda();
    if (!$mysqliLote) {
        responder(500, ['ok' => false, 'mensaje' => 'No pudimos conectar en este momento. Intentá más tarde.']);
    }
    $resumen = aplicar_fechas_agenda($mysqliLote, $fechas, $estado);
    $mysqliLote->close();
    if (!is_array($resumen)) {
        responder(500, ['ok' => false, 'mensaje' => 'No se pudo guardar el cambio.']);
    }
    if ((int) $resumen['guardadas'] < 1 && (int) $resumen['ya_estaban'] < 1) {
        responder(400, [
            'ok' => false,
            'mensaje' => 'Esas fechas están ocupadas por citas aceptadas y no se modificaron.',
            'omitidas_ocupadas' => $resumen['omitidas_ocupadas'],
            'fechas' => $fechas,
            'detalle' => $resumen['detalle'],
        ]);
    }
    $texto = mensaje_lote_fechas($resumen, $estado === 'abierta' ? 'Quedaron disponibles' : 'No se ofrecen');
    responder(200, [
        'ok' => true,
        'mensaje' => $texto,
        'guardadas' => $resumen['guardadas'],
        'omitidas_ocupadas' => $resumen['omitidas_ocupadas'],
        'ya_estaban' => $resumen['ya_estaban'],
        'fechas' => $fechas,
        'detalle' => $resumen['detalle'],
    ]);
}

/* Gestión de citas reservadas (viven en la base de usuarios). */
if ($tipo === 'cita') {
    $mysqli = abrir_usuarios();
    if (!$mysqli) {
        responder(500, ['ok' => false, 'mensaje' => 'No pudimos abrir las cuentas en este momento.']);
    }

    if ($accion === 'quitar') {
        $id = (int) $valor;
        if ($id < 1 || !borrar_cita_id($mysqli, $id)) {
            $mysqli->close();
            responder(400, ['ok' => false, 'mensaje' => 'No se pudo eliminar la cita.']);
        }
        $mysqli->close();
        borrar_respuesta_enviada('cita', $id);
        responder(200, ['ok' => true]);
    }

    if ($accion === 'guardar') {
        $fecha = trim((string) ($_POST['fecha'] ?? ''));
        $hora = trim((string) ($_POST['hora'] ?? ''));
        $persona = (string) ($_POST['persona'] ?? '');
        $motivo = (string) ($_POST['motivo'] ?? '');
        $notas = (string) ($_POST['notas'] ?? '');
        $id = (int) ($_POST['id'] ?? 0);
        $hora = validar_hora_admin($hora);
        if ($id < 1) {
            $mysqli->close();
            responder(400, ['ok' => false, 'mensaje' => 'Solo se pueden comentar citas ya existentes.']);
        }
        $fecha = normalizar_fecha_cita($fecha);
        if ($fecha === '' || !$hora) {
            $mysqli->close();
            responder(400, ['ok' => false, 'mensaje' => 'Elegí fecha y hora válidas.']);
        }
        $horario = cita_horario_por_id($mysqli, $id);
        if (!$horario) {
            $mysqli->close();
            responder(404, ['ok' => false, 'mensaje' => 'No se encontró esa cita.']);
        }
        $fechaVieja = normalizar_fecha_cita($horario['fecha']);
        $horaVieja = normalizar_hora_cita($horario['hora']);
        $cancelada = trim((string) $horario['cancelado_en']) !== '';
        $rechazadas = ids_citas_rechazadas();
        $rechazada = is_array($rechazadas) && in_array($id, $rechazadas, true);
        $cambiaHorario = $fecha !== $fechaVieja || $hora !== $horaVieja;
        $puedeTomar = !$cancelada && !$rechazada;
        $yaOcupa = trim((string) $horario['cupo_activo']) !== '';
        if ($puedeTomar && $cambiaHorario) {
            $mysqli->close();
            $movio = $yaOcupa ? mover_horario_cita($id, $fecha, $hora) : reclamar_horario_cita($id, $fecha, $hora, false);
            if ($movio !== 'ok') {
                responder(409, ['ok' => false, 'mensaje' => mensaje_horario_cita($movio)]);
            }
            $mysqli = abrir_usuarios();
            if (!$mysqli) {
                responder(500, ['ok' => false, 'mensaje' => 'No pudimos abrir las cuentas en este momento.']);
            }
        }
        if (!actualizar_cita($mysqli, $id, $fecha, $hora, $persona, $motivo, $notas)) {
            $mysqli->close();
            responder(500, ['ok' => false, 'mensaje' => 'No se pudieron guardar los comentarios.']);
        }
        if ($cancelada || $rechazada) {
            $soltar = $mysqli->prepare('UPDATE Consulta_Asesoria SET cupo_activo = NULL WHERE id = ? LIMIT 1');
            if ($soltar) {
                $soltar->bind_param('i', $id);
                $soltar->execute();
                $soltar->close();
            }
        }
        $mysqli->close();
        responder(200, ['ok' => true]);
    }

    if ($accion === 'responder') {
        $id = (int) ($_POST['id'] ?? $valor);
        $mensaje = trim((string) ($_POST['mensaje'] ?? ''));
        if ($id < 1) {
            $mysqli->close();
            responder(400, ['ok' => false, 'mensaje' => 'Elegí una cita para responder.']);
        }
        if ($mensaje === '' || strlen($mensaje) > 2000) {
            $mysqli->close();
            responder(400, ['ok' => false, 'mensaje' => 'Escribí un mensaje de respuesta (máximo 2000 caracteres).']);
        }
        $cita = cita_por_id($mysqli, $id);
        if (!$cita) {
            $mysqli->close();
            responder(404, ['ok' => false, 'mensaje' => 'No se encontró esa cita.']);
        }
        $mysqli->close();
        $adminUser = (string) ($_SESSION['admin_usuario'] ?? '');
        if (!guardar_respuesta_enviada('cita', $id, 'neutral', $mensaje, $adminUser)) {
            responder(500, [
                'ok' => false,
                'mensaje' => 'No pudimos guardar la respuesta.',
            ]);
        }
        $enBandeja = solicitud_visible_en_bandeja('cita', $cita);
        if ($enBandeja) {
            responder(200, [
                'ok' => true,
                'mensaje' => 'Respuesta guardada. La persona la verá en Mis mensajes, porque ya había entrado con esa cuenta.',
                'bandeja' => true,
            ]);
        }
        responder(200, [
            'ok' => true,
            'mensaje' => 'Respuesta guardada. Esta solicitud no se envió con la cuenta abierta, así que no aparece en Mis mensajes.',
            'bandeja' => false,
        ]);
    }

    $mysqli->close();
    responder(400, ['ok' => false, 'mensaje' => 'La acción de la cita no es válida.']);
}

if (!in_array($tipo, ['fecha', 'mes', 'hora'], true) || !in_array($accion, ['guardar', 'quitar'], true)) {
    responder(400, ['ok' => false, 'mensaje' => 'El dato no es válido.']);
}

if ($tipo === 'fecha') {
    if (!validar_fecha_admin($valor)) {
        responder(400, ['ok' => false, 'mensaje' => 'Elegí una fecha válida.']);
    }
} elseif ($tipo === 'mes') {
    $mes = DateTime::createFromFormat('!Y-m', $valor);
    if (!$mes || $mes->format('Y-m') !== $valor) {
        responder(400, ['ok' => false, 'mensaje' => 'Elegí un mes válido.']);
    }
} else {
    $cierre = validar_cierre_excepcion($valor);
    if ($cierre) {
        $valor = $cierre;
    } else {
        $horaOk = validar_hora_admin($valor);
        if (!$horaOk) {
            responder(400, ['ok' => false, 'mensaje' => 'Elegí una hora válida. El cierre tiene que ser a las 9:00 a. m. o después, para que quepa una cita de una hora.']);
        }
        $valor = $horaOk;
    }
}

if ($accion === 'guardar' && $estado === 'ocupada') {
    responder(400, ['ok' => false, 'mensaje' => 'Una hora se ocupa solo cuando se acepta una cita.']);
}
if ($accion === 'guardar' && !in_array($estado, ['abierta', 'bloqueada'], true)) {
    responder(400, ['ok' => false, 'mensaje' => 'Elegí si el día está disponible o no.']);
}

$mysqli = abrir_agenda();
if (!$mysqli) {
    responder(500, ['ok' => false, 'mensaje' => 'No pudimos conectar en este momento. Intentá más tarde.']);
}
asegurar_valor_agenda($mysqli);

if ($tipo === 'fecha') {
    $actualFecha = estado_fecha_agenda($mysqli, $valor);
    if ($actualFecha === 'ocupada') {
        $mysqli->close();
        responder(400, ['ok' => false, 'mensaje' => 'Ese día está ocupado por una cita aceptada y no se cambia desde aquí.']);
    }
}

if ($accion === 'quitar') {
    $consulta = $mysqli->prepare('DELETE FROM Agenda WHERE tipo = ? AND valor = ?');
    if (!$consulta) {
        $mysqli->close();
        responder(500, ['ok' => false, 'mensaje' => 'No pudimos guardar los días en este momento. Intentá más tarde.']);
    }
    $consulta->bind_param('ss', $tipo, $valor);
    if ($tipo === 'fecha') {
        $prefijoHora = $valor . ' %';
        $borrarCierre = $mysqli->prepare("DELETE FROM Agenda WHERE tipo = 'hora' AND valor LIKE ?");
        if ($borrarCierre) {
            $borrarCierre->bind_param('s', $prefijoHora);
            $borrarCierre->execute();
            $borrarCierre->close();
        }
    }
} elseif ($tipo === 'fecha') {
    $resultadoFecha = guardar_fecha_sin_pisar_ocupada($mysqli, $valor, $estado);
    $mysqli->close();
    if ($resultadoFecha === 'omitida_ocupada') {
        responder(400, ['ok' => false, 'mensaje' => 'Ese día está ocupado por una cita aceptada y no se cambia desde aquí.']);
    }
    if ($resultadoFecha !== 'guardada' && $resultadoFecha !== 'ya_estaba') {
        responder(500, ['ok' => false, 'mensaje' => 'No se pudo guardar el cambio.']);
    }
    responder(200, ['ok' => true, 'mensaje' => 'Listo, quedó actualizado.']);
} else {
    $cierreGuardado = validar_cierre_excepcion($valor);
    if ($cierreGuardado && $tipo === 'hora') {
        $prefijoCierre = substr($cierreGuardado, 0, 10) . ' %';
        $limpiarCierre = $mysqli->prepare("DELETE FROM Agenda WHERE tipo = 'hora' AND valor LIKE ? AND valor <> ?");
        if ($limpiarCierre) {
            $limpiarCierre->bind_param('ss', $prefijoCierre, $cierreGuardado);
            $limpiarCierre->execute();
            $limpiarCierre->close();
        }
    }
    $consulta = $mysqli->prepare('INSERT INTO Agenda (tipo, valor, estado) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE estado = ?');
    if (!$consulta) {
        $mysqli->close();
        responder(500, ['ok' => false, 'mensaje' => 'No pudimos guardar los días en este momento. Intentá más tarde.']);
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
    responder(500, ['ok' => false, 'mensaje' => 'No pudimos leer los días y las horas. Intentá más tarde.']);
}
