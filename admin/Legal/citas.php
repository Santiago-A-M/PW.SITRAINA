<?php
/* Lista las citas del abogado y aparta en la papelera las que no quiere, sin borrarlas. */
ob_start();
require dirname(__DIR__) . '/sesion.php';
require dirname(__DIR__) . '/../php/disponibilidad.php';
ob_end_clean();

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Robots-Tag: noindex, nofollow');

function legal_responder($codigo, $datos) {
    http_response_code($codigo);
    echo json_encode($datos, JSON_UNESCAPED_UNICODE);
    exit;
}

function legal_hora_legible($hora) {
    $hora = normalizar_hora_cita($hora);
    if (!preg_match('/^(\d{2}):(\d{2})$/', $hora, $partes)) {
        return '';
    }
    $h = (int) $partes[1];
    $sufijo = $h >= 12 ? 'p. m.' : 'a. m.';
    $doce = $h % 12;
    if ($doce === 0) {
        $doce = 12;
    }
    return $doce . ':' . $partes[2] . ' ' . $sufijo;
}

function legal_dia_semana($fecha) {
    $fecha = normalizar_fecha_cita($fecha);
    if ($fecha === '') {
        return '';
    }
    $dia = DateTime::createFromFormat('!Y-m-d', $fecha, new DateTimeZone('America/Costa_Rica'));
    if (!$dia || $dia->format('Y-m-d') !== $fecha) {
        return '';
    }
    $nombres = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
    return $nombres[(int) $dia->format('w')] ?? '';
}

function legal_modalidad($valor) {
    $valor = strtolower(trim((string) $valor));
    if ($valor === 'presencial') {
        return 'En persona';
    }
    if ($valor === 'virtual') {
        return 'En línea';
    }
    return '';
}

/* Papelera si el abogado la apartó o si la solicitud fue rechazada. Si no, manda la fecha. */
function legal_grupo_cita($cita, DateTime $ahora, $rechazada) {
    if (trim((string) ($cita['archivado_en'] ?? '')) !== '' || $rechazada) {
        return 'papelera';
    }
    if (trim((string) ($cita['cancelado_en'] ?? '')) !== '') {
        return 'cancelada';
    }
    $fecha = normalizar_fecha_cita($cita['fecha'] ?? '');
    $hora = normalizar_hora_cita($cita['hora'] ?? '');
    if ($fecha === '' || $hora === '') {
        return 'proxima';
    }
    $fin = fin_cita_una_hora($hora);
    $marca = $fin !== '' ? $fin : $hora;
    $momento = DateTime::createFromFormat('Y-m-d H:i', $fecha . ' ' . $marca, new DateTimeZone('America/Costa_Rica'));
    if (!$momento) {
        return 'proxima';
    }
    return $momento <= $ahora ? 'anterior' : 'proxima';
}

function legal_es_suya($cita, $cedula) {
    $dueno = preg_replace('/\D/', '', (string) ($cita['abogado_cedula'] ?? ''));
    if ($dueno === '') {
        return true;
    }
    return $cedula !== '' && $dueno === $cedula;
}

function legal_fila($cita, $grupo, $rechazada) {
    $fecha = normalizar_fecha_cita($cita['fecha'] ?? '');
    $hora = normalizar_hora_cita($cita['hora'] ?? '');
    $fin = $hora !== '' ? fin_cita_una_hora($hora) : '';
    $cancelado = trim((string) ($cita['cancelado_en'] ?? ''));
    $creado = trim((string) ($cita['creado_en'] ?? ''));
    return [
        'id' => (int) ($cita['id'] ?? 0),
        'persona' => trim((string) ($cita['persona'] ?? '')),
        'correo' => trim((string) ($cita['correo'] ?? '')),
        'cedula' => trim((string) ($cita['cedula'] ?? '')),
        'motivo' => trim((string) ($cita['motivo'] ?? '')),
        'notas' => trim((string) ($cita['notas'] ?? '')),
        'modalidad' => legal_modalidad($cita['modalidad'] ?? ''),
        'fecha' => $fecha,
        'fecha_texto' => $fecha !== '' ? etiqueta_dia_es($fecha) : '',
        'dia' => legal_dia_semana($fecha),
        'hora' => $hora,
        'hora_texto' => legal_hora_legible($hora),
        'fin' => $fin,
        'fin_texto' => legal_hora_legible($fin),
        'estado' => $grupo,
        'grupo' => $grupo,
        'archivada' => trim((string) ($cita['archivado_en'] ?? '')) !== '',
        'rechazada' => (bool) $rechazada,
        'archivado_en' => trim((string) ($cita['archivado_en'] ?? '')),
        'cancelado_en' => $cancelado,
        'cancelado_texto' => $cancelado !== '' ? etiqueta_momento_es($cancelado) : '',
        'creado_en' => $creado,
        'creado_texto' => $creado !== '' ? etiqueta_momento_es($creado) : '',
    ];
}

if (empty($_SESSION['admin_usuario']) || !personal_es_abogado()) {
    legal_responder(403, ['ok' => false, 'mensaje' => 'Esta sección es solo para el equipo de asesoría legal.']);
}

$cedulaAbogado = preg_replace('/\D/', '', (string) ($_SESSION['admin_cedula'] ?? ''));

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $token = (string) ($_POST['token'] ?? '');
    $accion = (string) ($_POST['accion'] ?? '');
    $id = (int) ($_POST['id'] ?? 0);
    if (!hash_equals(token_admin(), $token)) {
        legal_responder(403, ['ok' => false, 'mensaje' => 'Volvé a abrir el panel e intentá de nuevo.']);
    }
    if ($id < 1 || ($accion !== 'archivar' && $accion !== 'restaurar')) {
        legal_responder(400, ['ok' => false, 'mensaje' => 'No se pudo completar.']);
    }
    $dbAccion = abrir_consultas();
    if (!$dbAccion || !asegurar_archivo_cita($dbAccion) || !asegurar_cupo_cita($dbAccion)) {
        if ($dbAccion) {
            $dbAccion->close();
        }
        legal_responder(500, ['ok' => false, 'mensaje' => 'No pudimos guardar el cambio. Intentá más tarde.']);
    }
    $propia = null;
    foreach (leer_citas($dbAccion) as $citaAccion) {
        if ((int) ($citaAccion['id'] ?? 0) === $id && legal_es_suya($citaAccion, $cedulaAbogado)) {
            $propia = $citaAccion;
            break;
        }
    }
    if (!$propia) {
        $dbAccion->close();
        legal_responder(404, ['ok' => false, 'mensaje' => 'Esa cita no está en tu lista.']);
    }
    if ($accion === 'archivar') {
        $marca = ahora_costa_rica_sql();
        $guardar = $dbAccion->prepare('UPDATE Consulta_Asesoria SET archivado_en = ?, cupo_activo = NULL WHERE id = ? LIMIT 1');
        if (!$guardar) {
            $dbAccion->close();
            legal_responder(500, ['ok' => false, 'mensaje' => 'No se pudo mandar a la papelera.']);
        }
        $guardar->bind_param('si', $marca, $id);
        $hecho = $guardar->execute();
        $guardar->close();
        $dbAccion->close();
        if (!$hecho) {
            legal_responder(500, ['ok' => false, 'mensaje' => 'No se pudo mandar a la papelera.']);
        }
        legal_responder(200, ['ok' => true, 'grupo' => 'papelera', 'mensaje' => 'La cita quedó en la papelera. No se borró.']);
    }
    $limpiar = $dbAccion->prepare('UPDATE Consulta_Asesoria SET archivado_en = NULL WHERE id = ? LIMIT 1');
    if (!$limpiar) {
        $dbAccion->close();
        legal_responder(500, ['ok' => false, 'mensaje' => 'No se pudo devolver la cita.']);
    }
    $limpiar->bind_param('i', $id);
    $devuelta = $limpiar->execute();
    $limpiar->close();
    if (!$devuelta) {
        $dbAccion->close();
        legal_responder(500, ['ok' => false, 'mensaje' => 'No se pudo devolver la cita.']);
    }
    $fechaCita = normalizar_fecha_cita($propia['fecha'] ?? '');
    $horaCita = normalizar_hora_cita($propia['hora'] ?? '');
    $rechazadaAhora = false;
    $rechazadasAhora = ids_citas_rechazadas();
    if (is_array($rechazadasAhora)) {
        $rechazadaAhora = in_array($id, array_map('intval', $rechazadasAhora), true);
    }
    $cancelada = trim((string) ($propia['cancelado_en'] ?? '')) !== '';
    if ($rechazadaAhora) {
        $mensaje = 'La cita sigue en la papelera porque fue rechazada. No se borró.';
    } elseif ($cancelada) {
        $mensaje = 'La cita volvió a Canceladas.';
    } else {
        $mensaje = 'La cita volvió a tu lista.';
    }
    $puedeCupo = !$cancelada && !$rechazadaAhora && $fechaCita !== '' && $horaCita !== '' && !hora_de_cita_ya_paso($fechaCita, $horaCita);
    if ($puedeCupo) {
        $dbAccion->begin_transaction();
        $ajeno = cupo_dia_ajeno($dbAccion, $fechaCita, $id);
        if ($ajeno === null) {
            $dbAccion->rollback();
            $mensaje = 'La cita volvió a tu lista.';
        } elseif ($ajeno) {
            $dbAccion->rollback();
            $mensaje = 'La cita volvió a tu lista. Ese día ya lo tiene otra persona, así que no vuelve a ocuparlo.';
        } else {
            $clave = clave_cupo_dia($fechaCita);
            $poner = $dbAccion->prepare("UPDATE Consulta_Asesoria SET cupo_activo = ? WHERE id = ? AND (cupo_activo IS NULL OR cupo_activo = '') AND archivado_en IS NULL LIMIT 1");
            $tomo = false;
            if ($poner) {
                $poner->bind_param('si', $clave, $id);
                $tomo = $poner->execute() && $poner->affected_rows === 1;
                $poner->close();
            }
            if ($tomo && $dbAccion->commit()) {
                $mensaje = 'La cita volvió a tu lista.';
            } else {
                $dbAccion->rollback();
                $mensaje = 'La cita volvió a tu lista. Ese día ya lo tiene otra persona, así que no vuelve a ocuparlo.';
            }
        }
    }
    $dbAccion->close();
    legal_responder(200, ['ok' => true, 'mensaje' => $mensaje]);
}

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    legal_responder(405, ['ok' => false, 'mensaje' => 'No se pudo completar.']);
}

$db = abrir_consultas();
if (!$db) {
    legal_responder(500, ['ok' => false, 'mensaje' => 'No pudimos leer las citas en este momento. Intentá más tarde.']);
}

$unica = abogado_cedula_para_cita();
if ($unica !== '' && $cedulaAbogado === $unica && asegurar_abogado_cita($db)) {
    $reclamar = $db->prepare("UPDATE Consulta_Asesoria SET abogado_cedula = ? WHERE abogado_cedula IS NULL OR abogado_cedula = ''");
    if ($reclamar) {
        $reclamar->bind_param('s', $unica);
        $reclamar->execute();
        $reclamar->close();
    }
}

$ahora = new DateTime('now', new DateTimeZone('America/Costa_Rica'));
$rechazadas = ids_citas_rechazadas();
$esRechazada = [];
if (is_array($rechazadas)) {
    foreach ($rechazadas as $rechazada) {
        $esRechazada[(int) $rechazada] = true;
    }
}
$grupos = ['proxima' => [], 'anterior' => [], 'cancelada' => [], 'papelera' => []];
$vistos = [];
foreach (leer_citas($db) as $cita) {
    $id = (int) ($cita['id'] ?? 0);
    if ($id < 1 || isset($vistos[$id]) || !legal_es_suya($cita, $cedulaAbogado)) {
        continue;
    }
    $vistos[$id] = true;
    $rechazada = isset($esRechazada[$id]);
    $grupo = legal_grupo_cita($cita, $ahora, $rechazada);
    $grupos[$grupo][] = legal_fila($cita, $grupo, $rechazada);
}
$db->close();

$porCuando = function ($fila) {
    $fecha = (string) ($fila['fecha'] ?? '');
    $hora = (string) ($fila['hora'] ?? '');
    if ($fecha === '') {
        return '9999-99-99 99:99';
    }
    return $fecha . ' ' . ($hora !== '' ? $hora : '00:00');
};
usort($grupos['proxima'], function ($a, $b) use ($porCuando) {
    return strcmp($porCuando($a), $porCuando($b));
});
usort($grupos['anterior'], function ($a, $b) use ($porCuando) {
    return strcmp($porCuando($b), $porCuando($a));
});
usort($grupos['cancelada'], function ($a, $b) {
    $ca = (string) ($a['cancelado_en'] ?? '');
    $cb = (string) ($b['cancelado_en'] ?? '');
    if ($ca !== $cb) {
        return strcmp($cb, $ca);
    }
    return ((int) ($b['id'] ?? 0)) - ((int) ($a['id'] ?? 0));
});
usort($grupos['papelera'], function ($a, $b) {
    $ca = (string) ($a['archivado_en'] ?? '');
    $cb = (string) ($b['archivado_en'] ?? '');
    if ($ca !== $cb) {
        return strcmp($cb, $ca);
    }
    return ((int) ($b['id'] ?? 0)) - ((int) ($a['id'] ?? 0));
});

legal_responder(200, [
    'ok' => true,
    'hoy' => hoy_costa_rica(),
    'actualizado' => $ahora->format('Y-m-d H:i:s'),
    'grupos' => $grupos,
]);
