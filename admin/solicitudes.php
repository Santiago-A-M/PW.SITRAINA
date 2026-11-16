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
        $cancelado = trim((string) ($cita['cancelado_en'] ?? ''));
        $plazo = $cancelado !== '' ? plazo_reprogramacion_cita($cancelado) : null;
        $item = [
            'id' => $id,
            'cedula' => (string) ($cita['cedula'] ?? ''),
            'persona' => (string) ($cita['persona'] ?? ''),
            'correo' => (string) ($cita['correo'] ?? ''),
            'fecha' => (string) ($cita['fecha'] ?? ''),
            'hora' => (string) ($cita['hora'] ?? ''),
            'motivo' => (string) ($cita['motivo'] ?? ''),
            'notas' => (string) ($cita['notas'] ?? ''),
            'modalidad' => (string) ($cita['modalidad'] ?? ''),
            'creado_en' => (string) ($cita['creado_en'] ?? ''),
            'usuario_id' => (int) ($cita['usuario_id'] ?? 0),
            'cancelado_en' => $cancelado,
            'plazo_limite' => $plazo['limite'] ?? '',
            'plazo_vigente' => ($plazo && !empty($plazo['vigente'])) ? 1 : 0,
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
$rolPersonal = rol_personal_admin();
if ($rolPersonal === '') {
    solicitudes_responder(403, ['ok' => false, 'mensaje' => 'Entrá para continuar.']);
}
if ($rolPersonal === 'abogado') {
    solicitudes_responder(403, ['ok' => false, 'mensaje' => 'Las citas de asesoría se consultan en Legal.']);
}

$dbResp = abrir_respuestas();
if (!$dbResp) {
    solicitudes_responder(500, ['ok' => false, 'mensaje' => 'No pudimos guardar las respuestas en este momento. Intentá más tarde.']);
}

$dbUsuarios = abrir_consultas();
if (!$dbUsuarios) {
    $dbResp->close();
    solicitudes_responder(500, ['ok' => false, 'mensaje' => 'No pudimos abrir las solicitudes en este momento. Intentá más tarde.']);
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $tipo = (string) ($_GET['tipo'] ?? 'todas');
    if ($tipo === 'todas') {
        if ($rolPersonal === 'abogado') {
            $datos = [
                'contacto' => [],
                'cita' => listar_citas($dbUsuarios, $dbResp),
                'afilacion' => [],
                'afiliados' => [],
            ];
        } else {
            $datos = [
                'contacto' => listar_contactos($dbUsuarios, $dbResp),
                'cita' => listar_citas($dbUsuarios, $dbResp),
                'afilacion' => listar_afilaciones($dbUsuarios, $dbResp),
                'afiliados' => listar_afiliados(),
            ];
        }
        $dbUsuarios->close();
        $dbResp->close();
        foreach ($datos as $clave => $lista) {
            if ($lista === null) {
                solicitudes_responder(500, [
                    'ok' => false,
                    'mensaje' => 'No pudimos leer los datos. Intentá más tarde.',
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
            solicitudes_responder(500, ['ok' => false, 'mensaje' => 'No pudimos leer las personas afiliadas. Intentá más tarde.']);
        }
        solicitudes_responder(200, ['ok' => true, 'tipo' => 'afiliados', 'filas' => $lista]);
    }
    if ($tipo === 'cupos') {
        $cupos = listar_cupos_asignacion();
        $dbUsuarios->close();
        $dbResp->close();
        if ($cupos === null) {
            solicitudes_responder(500, ['ok' => false, 'mensaje' => 'No se pudieron leer los horarios.']);
        }
        solicitudes_responder(200, ['ok' => true, 'cupos' => $cupos]);
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
        solicitudes_responder(405, ['ok' => false, 'mensaje' => 'No se pudo completar. Volvé a intentarlo desde la página.']);
}

$token = (string) ($_POST['token'] ?? '');
if (!hash_equals(token_admin(), $token)) {
    $dbUsuarios->close();
    $dbResp->close();
    solicitudes_responder(400, ['ok' => false, 'mensaje' => 'Volvé a abrir la página e intentá de nuevo.']);
}

$accion = (string) ($_POST['accion'] ?? '');

/* Cuenta solo se escribe desde este panel (sesión de admin + token). */
if ($accion === 'agregar_afiliado' || $accion === 'eliminar_afiliado') {
    $dbUsuarios->close();
    $dbResp->close();
    $dbAfiliados = abrir_afiliados();
    if (!$dbAfiliados) {
        solicitudes_responder(500, ['ok' => false, 'mensaje' => 'No pudimos abrir las personas afiliadas. Intentá más tarde.']);
    }
    $dbAfiliados->query("SET @sitraina_panel = '1'");
    if ($accion === 'eliminar_afiliado') {
        $idAfiliado = (int) ($_POST['id'] ?? 0);
        if ($idAfiliado < 1) {
            $dbAfiliados->close();
            solicitudes_responder(400, ['ok' => false, 'mensaje' => 'Elegí a la persona.']);
        }
        $borrar = $dbAfiliados->prepare('DELETE FROM Cuenta WHERE id = ? LIMIT 1');
        if (!$borrar) {
            $dbAfiliados->close();
            solicitudes_responder(500, ['ok' => false, 'mensaje' => 'No pudimos quitar a esa persona.']);
        }
        $borrar->bind_param('i', $idAfiliado);
        $borro = $borrar->execute() && $borrar->affected_rows > 0;
        $borrar->close();
        $dbAfiliados->close();
        if (!$borro) {
            solicitudes_responder(404, ['ok' => false, 'mensaje' => 'Esa persona ya no está en la lista.']);
        }
        solicitudes_responder(200, ['ok' => true, 'mensaje' => 'Listo, se quitó a esa persona.']);
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
        solicitudes_responder(500, ['ok' => false, 'mensaje' => 'No pudimos anotar a esa persona.']);
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
        solicitudes_responder(500, ['ok' => false, 'mensaje' => 'No pudimos anotar a esa persona.']);
    }
    solicitudes_responder(200, ['ok' => true, 'mensaje' => 'Listo, la persona quedó anotada.']);
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
        solicitudes_responder(400, ['ok' => false, 'mensaje' => 'Elegí al menos una solicitud.']);
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
        solicitudes_responder(400, ['ok' => false, 'mensaje' => 'No se quitó nada. Revisá lo que elegiste.']);
    }
    solicitudes_responder(200, [
        'ok' => true,
        'mensaje' => $borrados === 1
            ? 'Se quitó 1 solicitud.'
            : ('Se quitaron ' . $borrados . ' solicitudes.'),
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
    solicitudes_responder(400, ['ok' => false, 'mensaje' => 'Elegí aceptar, no aceptar, o una respuesta sin decisión.']);
}
if ($respuesta === '' || strlen($respuesta) > 4000) {
    solicitudes_responder(400, ['ok' => false, 'mensaje' => 'Escribí la respuesta. Si quedó muy larga, acortala un poco.']);
}

$fila = buscar_consulta($tipo, $id);
if (!$fila) {
    solicitudes_responder(404, ['ok' => false, 'mensaje' => 'No se encontró esa consulta.']);
}

$enBandeja = solicitud_visible_en_bandeja($tipo, $fila);
$horarioMovido = false;
$tomoNuevo = false;
$fechaPrevia = '';
$horaPrevia = '';

if ($tipo === 'cita' && $estado === 'aceptada') {
    $estadoPrevio = '';
    $dbEstado = abrir_respuestas();
    if ($dbEstado) {
        $tablaEstado = tabla_respuesta_por_tipo('cita');
        $consultaEstado = $dbEstado->prepare('SELECT estado FROM `' . $tablaEstado . '` WHERE origen_id = ? LIMIT 1');
        if ($consultaEstado) {
            $consultaEstado->bind_param('i', $id);
            $consultaEstado->execute();
            $consultaEstado->bind_result($estadoPrevio);
            if (!$consultaEstado->fetch()) {
                $estadoPrevio = '';
            }
            $consultaEstado->close();
        }
        $dbEstado->close();
    }
    $fechaPrevia = normalizar_fecha_cita((string) ($fila['fecha'] ?? ''));
    $horaPrevia = normalizar_hora_cita((string) ($fila['hora'] ?? ''));
    $fechaPost = normalizar_fecha_cita((string) ($_POST['fecha_asignada'] ?? ''));
    $horaPost = normalizar_hora_cita((string) ($_POST['hora_asignada'] ?? ''));
    $fechaCita = $fechaPost !== '' ? $fechaPost : $fechaPrevia;
    $horaCita = $horaPost !== '' ? $horaPost : $horaPrevia;
    $cambiaHorario = $fechaCita !== '' && $horaCita !== '' && ($fechaCita !== $fechaPrevia || $horaCita !== $horaPrevia);
    if ($estadoPrevio !== 'aceptada' || $cambiaHorario) {
        if ($fechaCita === '' || $horaCita === '') {
            solicitudes_responder(400, ['ok' => false, 'mensaje' => 'Elegí el mes, el día y la hora.']);
        }
        $preparado = ($rolPersonal === 'admin') ? preparar_horario_asignado($fechaCita, $horaCita) : 'ok';
        $dbCupo = abrir_consultas();
        $horarioActual = $dbCupo ? cita_horario_por_id($dbCupo, $id) : null;
        if ($dbCupo) {
            $dbCupo->close();
        }
        $cupoActual = $horarioActual ? normalizar_clave_cupo((string) $horarioActual['cupo_activo']) : '';
        $claveNueva = clave_cupo_dia($fechaCita);
        if ($preparado !== 'ok') {
            $reclamo = $preparado;
        } elseif ($cupoActual !== '' && $cupoActual === $claveNueva && !$cambiaHorario) {
            $reclamo = 'ok';
        } elseif ($cupoActual !== '' || $estadoPrevio === 'aceptada') {
            $reclamo = mover_horario_cita($id, $fechaCita, $horaCita);
            $horarioMovido = $reclamo === 'ok';
        } else {
            $reclamo = reclamar_horario_cita($id, $fechaCita, $horaCita, false);
            $tomoNuevo = $reclamo === 'ok';
        }
        if ($reclamo === 'ocupada') {
            solicitudes_responder(409, ['ok' => false, 'mensaje' => 'Ese día ya está ocupado. Elegí otro.']);
        }
        if ($reclamo === 'bloqueada') {
            solicitudes_responder(409, ['ok' => false, 'mensaje' => 'Ese día no se ofrece.']);
        }
        if ($reclamo === 'hora_no_habil') {
            solicitudes_responder(409, ['ok' => false, 'mensaje' => 'Esa hora no está disponible en el horario.']);
        }
        if ($reclamo === 'pasada') {
            solicitudes_responder(409, ['ok' => false, 'mensaje' => 'Elegí el día de hoy o uno posterior.']);
        }
        if ($reclamo === 'no_habil' || $reclamo === 'invalida') {
            solicitudes_responder(409, ['ok' => false, 'mensaje' => 'Ese día no está disponible.']);
        }
        if ($reclamo !== 'ok') {
            solicitudes_responder(500, ['ok' => false, 'mensaje' => 'No se pudo reservar ese horario.']);
        }
        $lineaCita = 'Cita confirmada para el ' . etiqueta_momento_es($fechaCita . ' ' . $horaCita) . '.';
        if (stripos($respuesta, 'Cita confirmada para el') === false) {
            $respuesta .= "\n\n" . $lineaCita;
        }
        if (strlen($respuesta) > 4000) {
            if ($horarioMovido && $fechaPrevia !== '' && $horaPrevia !== '') {
                if (mover_horario_cita($id, $fechaPrevia, $horaPrevia) !== 'ok') {
                    soltar_horario_cita($id, $fechaPrevia, $horaPrevia);
                }
            } elseif ($tomoNuevo) {
                soltar_horario_cita($id, $fechaPrevia, $horaPrevia);
            }
            solicitudes_responder(400, ['ok' => false, 'mensaje' => 'La respuesta quedó demasiado larga al agregar la fecha y la hora. Acortala e intentá de nuevo.']);
        }
    }
}

if (!guardar_respuesta_enviada($tipo, $id, $estado, $respuesta, $admin, $editar)) {
    if ($tipo === 'cita' && $estado === 'aceptada' && isset($reclamo) && $reclamo === 'ok') {
        if ($horarioMovido && $fechaPrevia !== '' && $horaPrevia !== '') {
            if (mover_horario_cita($id, $fechaPrevia, $horaPrevia) !== 'ok') {
                soltar_horario_cita($id, $fechaPrevia, $horaPrevia);
            }
        } elseif ($tomoNuevo) {
            soltar_horario_cita($id, $fechaPrevia, $horaPrevia);
        }
    }
    solicitudes_responder(500, ['ok' => false, 'mensaje' => 'No pudimos guardar la respuesta.']);
}

if ($tipo === 'cita' && $estado === 'rechazada') {
    liberar_cupo_cita($id);
}

if ($enBandeja) {
    solicitudes_responder(200, [
        'ok' => true,
        'mensaje' => 'Respuesta guardada. La persona la verá en Mis mensajes, porque ya había entrado con esa cuenta.',
        'estado' => $estado,
        'bandeja' => true,
    ]);
}

solicitudes_responder(200, [
    'ok' => true,
    'mensaje' => 'Respuesta guardada. Esta solicitud no se envió con la cuenta abierta, así que no aparece en Mis mensajes.',
    'estado' => $estado,
    'bandeja' => false,
]);
} catch (Throwable $e) {
    solicitudes_responder(500, ['ok' => false, 'mensaje' => 'No pudimos traer las solicitudes. Intentá más tarde.']);
}
