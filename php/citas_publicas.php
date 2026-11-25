<?php
/* Reserva pública de una cita jurídica. La sesión y la afiliación se leen en el servidor. */
ob_start();
require_once __DIR__ . '/sesion_usuario.php';
require_once __DIR__ . '/disponibilidad.php';
require_once __DIR__ . '/respuestas.php';
require_once __DIR__ . '/correo_smtp.php';
ob_end_clean();

date_default_timezone_set('America/Costa_Rica');
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');
header('X-LiteSpeed-Cache-Control: no-cache');
header('X-Frame-Options: DENY');

function citas_responder($codigo, $datos) {
    http_response_code($codigo);
    echo json_encode($datos, JSON_UNESCAPED_UNICODE);
    exit;
}

function citas_afiliado_sesion() {
    $cedulaSesion = sitraina_cedula_cuenta();
    if ($cedulaSesion === '') {
        return null;
    }
    $db = abrir_afiliados();
    if (!$db) {
        return false;
    }
    $consulta = $db->prepare('SELECT cedula, nombre_completo, correo, estado FROM Cuenta WHERE cedula = ? LIMIT 1');
    if (!$consulta) {
        $consulta = $db->prepare('SELECT cedula, nombre_completo, correo FROM Cuenta WHERE cedula = ? LIMIT 1');
        if (!$consulta) {
            $db->close();
            return false;
        }
        $consulta->bind_param('s', $cedulaSesion);
        $consulta->execute();
        $cedula = '';
        $nombre = '';
        $correoGuardado = '';
        $consulta->bind_result($cedula, $nombre, $correoGuardado);
        $hay = $consulta->fetch();
        $consulta->close();
        $db->close();
        if (!$hay) {
            return null;
        }
        $correo = strtolower(trim((string) $correoGuardado));
        if ($correo === '' || !filter_var($correo, FILTER_VALIDATE_EMAIL)) {
            $correo = sitraina_correo_cuenta();
        }
        return [
            'cedula' => preg_replace('/\D/', '', (string) $cedula),
            'nombre' => trim((string) $nombre),
            'correo' => $correo,
            'estado' => '',
        ];
    }
    $consulta->bind_param('s', $cedulaSesion);
    $consulta->execute();
    $cedula = '';
    $nombre = '';
    $correoGuardado = '';
    $estado = '';
    $consulta->bind_result($cedula, $nombre, $correoGuardado, $estado);
    $hay = $consulta->fetch();
    $consulta->close();
    $db->close();
    if (!$hay) {
        return null;
    }
    $correo = strtolower(trim((string) $correoGuardado));
    if ($correo === '' || !filter_var($correo, FILTER_VALIDATE_EMAIL)) {
        $correo = sitraina_correo_cuenta();
    }
    return [
        'cedula' => preg_replace('/\D/', '', (string) $cedula),
        'nombre' => trim((string) $nombre),
        'correo' => $correo,
        'estado' => trim((string) $estado),
    ];
}

function citas_mensaje_marca($marca) {
    if ($marca === 'sin_sesion') {
        return 'Iniciá sesión para reservar una cita.';
    }
    if ($marca === 'sin_cedula') {
        return 'Tu cuenta no tiene cédula. Completá la cédula en tu cuenta para poder pedir cita.';
    }
    if ($marca === 'menor_anio') {
        return 'Todavía no cumplís un año de afiliación. Para gestionar una cita de asesoría, comunicate con Secretaría.';
    }
    if ($marca === 'error') {
        return 'No se pudo revisar la afiliación. Intentá de nuevo más tarde.';
    }
    return 'La asesoría legal se brinda únicamente a las personas afiliadas a SITRAINA.';
}

function citas_exigir_afiliado() {
    $marca = sitraina_marca_afiliacion();
    if ($marca === 'sin_sesion') {
        citas_responder(401, ['ok' => false, 'mensaje' => citas_mensaje_marca($marca), 'motivo' => $marca]);
    }
    if ($marca === 'error') {
        citas_responder(500, ['ok' => false, 'mensaje' => citas_mensaje_marca($marca), 'motivo' => $marca]);
    }
    if ($marca !== 'si') {
        citas_responder(403, ['ok' => false, 'mensaje' => citas_mensaje_marca($marca), 'motivo' => $marca]);
    }
    $afiliado = citas_afiliado_sesion();
    if ($afiliado === false) {
        citas_responder(500, ['ok' => false, 'mensaje' => 'No pudimos revisar tu afiliación. Intentá de nuevo más tarde.']);
    }
    if ($afiliado === null || $afiliado['cedula'] === '' || $afiliado['nombre'] === '') {
        citas_responder(403, ['ok' => false, 'mensaje' => citas_mensaje_marca('no'), 'motivo' => 'no']);
    }
    return $afiliado;
}

function citas_mensaje_cupo($resultado) {
    if ($resultado === 'ocupada') {
        return 'Ese día ya está ocupado. Elegí otro dentro de los 15 días.';
    }
    if ($resultado === 'pasada') {
        return 'Esa hora ya pasó. Elegí un horario más adelante.';
    }
    if ($resultado === 'bloqueada' || $resultado === 'no_habil' || $resultado === 'hora_no_habil') {
        return 'Ese día u horario no está disponible.';
    }
    if ($resultado === 'invalida') {
        return 'La fecha o la hora no son válidas.';
    }
    return 'No se pudo reservar el horario. Volvé a intentarlo.';
}

function citas_correos_aviso() {
    $salida = ['abogado' => '', 'secretaria' => ''];
    $nombres = ['abogado' => 'CITA_CORREO_ABOGADO', 'secretaria' => 'CITA_CORREO_SECRETARIA'];
    foreach ($nombres as $clave => $variable) {
        $correo = strtolower(sitraina_entorno($variable));
        if ($correo !== '' && filter_var($correo, FILTER_VALIDATE_EMAIL)) {
            $salida[$clave] = $correo;
        }
    }
    if ($salida['abogado'] !== '' && $salida['secretaria'] !== '') {
        return $salida;
    }
    $archivo = __DIR__ . '/config_citas_aviso.php';
    if (!is_file($archivo)) {
        return $salida;
    }
    $lista = require $archivo;
    if (!is_array($lista)) {
        return $salida;
    }
    foreach (['abogado', 'secretaria'] as $clave) {
        if ($salida[$clave] !== '') {
            continue;
        }
        $correo = strtolower(trim((string) ($lista[$clave] ?? '')));
        if ($correo !== '' && filter_var($correo, FILTER_VALIDATE_EMAIL)) {
            $salida[$clave] = $correo;
        }
    }
    return $salida;
}

function citas_avisar($afiliado, $cuando, $modalidadTexto, $motivo) {
    $datos = 'Fecha y hora: ' . $cuando . "\n"
        . 'Modalidad: ' . $modalidadTexto . "\n"
        . 'Motivo: ' . $motivo . "\n";
    $confirmacion = 'Hola ' . $afiliado['nombre'] . ",\n\n"
        . "Tu cita de asesoría jurídica quedó confirmada.\n\n"
        . $datos;
    $aviso = "Se registró una cita de asesoría jurídica.\n\n"
        . 'Persona: ' . $afiliado['nombre'] . "\n"
        . 'Correo: ' . $afiliado['correo'] . "\n"
        . $datos;
    enviar_correo_sitraina(
        $afiliado['correo'],
        $afiliado['nombre'],
        'Confirmación de tu cita de asesoría jurídica',
        $confirmacion
    );
    $oficinas = ['abogado' => 'Asesoría jurídica', 'secretaria' => 'Secretaría'];
    $enviados = [strtolower($afiliado['correo']) => true];
    foreach (citas_correos_aviso() as $clave => $correo) {
        $correo = strtolower($correo);
        if ($correo === '' || isset($enviados[$correo])) {
            continue;
        }
        $enviados[$correo] = true;
        enviar_correo_sitraina(
            $correo,
            $oficinas[$clave] ?? 'SITRAINA',
            'Cita de asesoría jurídica — ' . $afiliado['nombre'],
            $aviso
        );
    }
    $asignada = abogado_cedula_para_cita();
    foreach (legales_abogados_activos() as $abogado) {
        if ($asignada !== '' && (string) ($abogado['cedula'] ?? '') !== $asignada) {
            continue;
        }
        $correo = strtolower(trim((string) ($abogado['cuenta'] ?? '')));
        if ($correo === '' || isset($enviados[$correo]) || !filter_var($correo, FILTER_VALIDATE_EMAIL)) {
            continue;
        }
        $enviados[$correo] = true;
        $nombre = trim((string) ($abogado['nombre'] ?? ''));
        enviar_correo_sitraina(
            $correo,
            $nombre !== '' ? $nombre : 'Asesoría jurídica',
            'Cita de asesoría jurídica — ' . $afiliado['nombre'],
            $aviso
        );
    }
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $marca = sitraina_marca_afiliacion();
    $afiliado = ($marca === 'si' || $marca === 'menor_anio') ? citas_afiliado_sesion() : null;
    $puedeReservar = $marca === 'si' && is_array($afiliado) && $afiliado['cedula'] !== '' && $afiliado['nombre'] !== '';
    $calendario = calendario_reserva_publica();
    if (!$calendario) {
        citas_responder(500, ['ok' => false, 'mensaje' => 'No se pudieron leer los horarios.']);
    }
    citas_responder(200, [
        'ok' => true,
        'puede_reservar' => $puedeReservar,
        'sesion' => $marca !== 'sin_sesion',
        'afiliado' => $marca === 'si' || $marca === 'menor_anio',
        'motivo' => $marca,
        'mensaje' => $puedeReservar ? '' : citas_mensaje_marca($marca),
        'token' => sitraina_usuario_token(),
        'nombre' => $puedeReservar ? $afiliado['nombre'] : '',
        'correo' => $puedeReservar ? $afiliado['correo'] : '',
        'hoy' => $calendario['hoy'],
        'limite' => $calendario['limite'],
        'mes_inicio' => $calendario['mes_inicio'],
        'mes_fin' => $calendario['mes_fin'],
        'dias' => $calendario['dias'],
    ]);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    citas_responder(405, ['ok' => false, 'mensaje' => 'No se pudo completar. Volvé a intentarlo desde la página.']);
}

if (!sitraina_usuario_token_ok((string) ($_POST['token'] ?? ''))) {
    citas_responder(403, ['ok' => false, 'mensaje' => 'Volvé a abrir el calendario e intentá de nuevo.']);
}

$afiliado = citas_exigir_afiliado();
$fecha = normalizar_fecha_cita((string) ($_POST['fecha'] ?? ''));
$hora = normalizar_hora_cita((string) ($_POST['hora'] ?? ''));
$modalidad = strtolower(trim((string) ($_POST['modalidad'] ?? '')));
$motivo = trim((string) ($_POST['motivo'] ?? ''));
$largoMotivo = function_exists('mb_strlen') ? mb_strlen($motivo, 'UTF-8') : strlen($motivo);

if ($fecha === '' || !fecha_en_ventana_reserva($fecha)) {
    citas_responder(400, ['ok' => false, 'mensaje' => 'Solo se puede pedir cita desde hoy y hasta 15 días después.']);
}
if ($hora === '' || hora_de_cita_ya_paso($fecha, $hora)) {
    citas_responder(400, ['ok' => false, 'mensaje' => 'Esa hora ya no está disponible.']);
}
if ($modalidad !== 'presencial' && $modalidad !== 'virtual') {
    citas_responder(400, ['ok' => false, 'mensaje' => 'Elegí si preferís la cita en persona o en línea.']);
}
if ($motivo === '' || $largoMotivo > 800) {
    citas_responder(400, ['ok' => false, 'mensaje' => 'Contanos el motivo. Si quedó muy largo, acortalo un poco.']);
}

$id = 0;
$cupo = reservar_cita_con_cupo(
    $afiliado['cedula'],
    $afiliado['nombre'],
    $afiliado['correo'],
    $motivo,
    sitraina_usuario_id(),
    $modalidad,
    $fecha,
    $hora,
    $id
);
if ($cupo !== 'ok' || $id < 1) {
    $codigo = ($cupo === 'ocupada' || $cupo === 'pasada' || $cupo === 'bloqueada' || $cupo === 'no_habil' || $cupo === 'hora_no_habil' || $cupo === 'invalida') ? 409 : 500;
    citas_responder($codigo, ['ok' => false, 'mensaje' => citas_mensaje_cupo($cupo)]);
}

$modalidadTexto = $modalidad === 'virtual' ? 'En línea' : 'En persona';
$cuando = etiqueta_momento_es($fecha . ' ' . $hora);
$respuesta = 'Cita confirmada para el ' . $cuando . '. Será ' . strtolower($modalidadTexto) . '.';
$guardoMensaje = guardar_respuesta_enviada('cita', $id, 'aceptada', $respuesta, 'reserva-afiliado', false);
citas_avisar($afiliado, $cuando, $modalidadTexto, $motivo);

citas_responder(200, [
    'ok' => true,
    'mensaje' => $guardoMensaje
        ? 'La cita quedó reservada. También aparece en Opciones → Citas.'
        : 'La cita quedó reservada. El horario ya no está disponible para otra persona.',
    'cuando' => $cuando,
    'modalidad' => $modalidadTexto,
]);
