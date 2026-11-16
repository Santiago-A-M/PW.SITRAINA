<?php
require_once __DIR__ . '/conexion.php';

/* Lee meses, días y horas guardados y los separa por tipo. */
function leer_agenda($mysqli) {
    $reglas = ['fechas' => [], 'meses' => [], 'horas' => [], 'filas' => []];
    $consulta = $mysqli->prepare('SELECT tipo, valor, estado FROM Agenda ORDER BY tipo, valor');
    if (!$consulta) {
        return null;
    }
    $consulta->execute();
    $consulta->bind_result($tipo, $valor, $estado);
    while ($consulta->fetch()) {
        $reglas['filas'][] = ['tipo' => $tipo, 'valor' => $valor, 'estado' => $estado];
        if ($tipo === 'fecha') {
            $reglas['fechas'][$valor] = $estado;
        } elseif ($tipo === 'mes') {
            $reglas['meses'][$valor] = $estado;
        } elseif ($tipo === 'hora') {
            $reglas['horas'][$valor] = $estado;
        }
    }
    $consulta->close();
    return $reglas;
}

/* Lee las citas ya reservadas (con comentarios y correo si existen). */
function leer_citas($mysqli) {
    if (!$mysqli) {
        return [];
    }
    asegurar_cancelado_cita($mysqli);
    asegurar_modalidad_cita($mysqli);
    asegurar_abogado_cita($mysqli);
    asegurar_archivo_cita($mysqli);
    $citas = [];
    $id = 0;
    $fecha = '';
    $hora = '';
    $cedula = '';
    $persona = '';
    $correo = '';
    $motivo = '';
    $notas = '';
    $creadoEn = '';
    $usuarioId = 0;
    $canceladoEn = null;
    $modalidad = '';
    $abogadoCedula = '';
    $archivadoEn = null;
    $consulta = $mysqli->prepare(
        'SELECT id, fecha, hora, cedula, persona, correo, motivo, notas, creado_en, usuario_id, cancelado_en, modalidad, abogado_cedula, archivado_en FROM Consulta_Asesoria ORDER BY creado_en DESC, fecha DESC, hora DESC'
    );
    $conArchivo = (bool) $consulta;
    if (!$consulta) {
        $abogadoCedula = '';
        $archivadoEn = null;
    }
    if (!$consulta) {
        $consulta = $mysqli->prepare(
            'SELECT id, fecha, hora, cedula, persona, correo, motivo, notas, creado_en, usuario_id, cancelado_en, modalidad FROM Consulta_Asesoria ORDER BY creado_en DESC, fecha DESC, hora DESC'
        );
    }
    $conModalidad = (bool) $consulta;
    if (!$consulta) {
        $consulta = $mysqli->prepare(
            'SELECT id, fecha, hora, cedula, persona, correo, motivo, notas, creado_en, usuario_id, cancelado_en FROM Consulta_Asesoria ORDER BY creado_en DESC, fecha DESC, hora DESC'
        );
    }
    $conCancelado = (bool) $consulta;
    if (!$consulta) {
        $consulta = $mysqli->prepare(
            'SELECT id, fecha, hora, cedula, persona, correo, motivo, notas, creado_en, usuario_id FROM Consulta_Asesoria ORDER BY creado_en DESC, fecha DESC, hora DESC'
        );
    }
    if (!$consulta) {
        return [];
    }
    $consulta->execute();
    if ($conArchivo) {
        $consulta->bind_result($id, $fecha, $hora, $cedula, $persona, $correo, $motivo, $notas, $creadoEn, $usuarioId, $canceladoEn, $modalidad, $abogadoCedula, $archivadoEn);
    } elseif ($conModalidad) {
        $consulta->bind_result($id, $fecha, $hora, $cedula, $persona, $correo, $motivo, $notas, $creadoEn, $usuarioId, $canceladoEn, $modalidad);
    } elseif ($conCancelado) {
        $consulta->bind_result($id, $fecha, $hora, $cedula, $persona, $correo, $motivo, $notas, $creadoEn, $usuarioId, $canceladoEn);
    } else {
        $consulta->bind_result($id, $fecha, $hora, $cedula, $persona, $correo, $motivo, $notas, $creadoEn, $usuarioId);
    }
    while ($consulta->fetch()) {
        $citas[] = [
            'id' => (int) $id,
            'fecha' => $fecha === null ? '' : (string) $fecha,
            'hora' => $hora === null ? '' : (string) $hora,
            'cedula' => preg_replace('/\D/', '', (string) $cedula),
            'persona' => (string) $persona,
            'correo' => (string) $correo,
            'motivo' => (string) $motivo,
            'notas' => (string) $notas,
            'creado_en' => (string) $creadoEn,
            'usuario_id' => (int) $usuarioId,
            'cancelado_en' => (($conArchivo || $conModalidad || $conCancelado) && $canceladoEn !== null) ? (string) $canceladoEn : '',
            'modalidad' => ($conArchivo || $conModalidad) ? (string) $modalidad : '',
            'abogado_cedula' => $conArchivo ? preg_replace('/\D/', '', (string) $abogadoCedula) : '',
            'archivado_en' => ($conArchivo && $archivadoEn !== null) ? (string) $archivadoEn : '',
        ];
    }
    $consulta->close();
    return $citas;
}

/* Recorta texto para columnas de la cita. */
function recortar_cita($texto, $maximo) {
    $texto = trim((string) $texto);
    if (function_exists('mb_substr')) {
        return mb_substr($texto, 0, $maximo);
    }
    return substr($texto, 0, $maximo);
}

/* Reserva una hora. Devuelve true, false si ya estaba tomada, o null si no se pudo guardar. */
function reservar_cita($mysqli, $fecha, $hora, $persona = '', $motivo = '', $notas = '', $correo = '', $cedula = '') {
    $persona = recortar_cita($persona, 120);
    $motivo = recortar_cita($motivo, 800);
    $notas = recortar_cita($notas, 800);
    $correo = strtolower(recortar_cita($correo, 120));
    $cedula = preg_replace('/\D/', '', (string) $cedula);
    if (strlen($cedula) > 9) {
        $cedula = substr($cedula, 0, 9);
    }
    $usuarioId = 0;
    if (function_exists('sitraina_id_si_cuenta_en_formulario')) {
        $usuarioId = (int) sitraina_id_si_cuenta_en_formulario([$correo]);
    }
    $uid = $usuarioId > 0 ? $usuarioId : null;
    $consulta = $mysqli->prepare(
        'INSERT INTO Consulta_Asesoria (fecha, hora, cedula, persona, correo, motivo, notas, usuario_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    );
    if (!$consulta) {
        return null;
    }
    $consulta->bind_param('sssssssi', $fecha, $hora, $cedula, $persona, $correo, $motivo, $notas, $uid);
    $guardo = $consulta->execute();
    $duplicada = $consulta->errno === 1062;
    $nuevoId = $guardo ? (int) $mysqli->insert_id : 0;
    $consulta->close();
    if ($guardo) {
        return $nuevoId > 0 ? $nuevoId : true;
    }
    if ($duplicada) {
        return false;
    }
    return null;
}

/* Permite guardar una solicitud de cita sin día ni hora. La fecha la asigna el administrador al aceptar. */
function permitir_cita_sin_fecha($mysqli) {
    $mysqli->query('ALTER TABLE Consulta_Asesoria MODIFY fecha CHAR(10) NULL DEFAULT NULL');
    $mysqli->query('ALTER TABLE Consulta_Asesoria MODIFY hora CHAR(5) NULL DEFAULT NULL');
}

/* Registra la solicitud sin turno. Devuelve el id, false si no se pudo, o null si falló la conexión de la consulta. */
function reservar_solicitud_cita($mysqli, $persona = '', $motivo = '', $correo = '', $cedula = '') {
    permitir_cita_sin_fecha($mysqli);
    $persona = recortar_cita($persona, 120);
    $motivo = recortar_cita($motivo, 800);
    $correo = strtolower(recortar_cita($correo, 120));
    $cedula = preg_replace('/\D/', '', (string) $cedula);
    if (strlen($cedula) > 9) {
        $cedula = substr($cedula, 0, 9);
    }
    $usuarioId = 0;
    if (function_exists('sitraina_id_si_cuenta_en_formulario')) {
        $usuarioId = (int) sitraina_id_si_cuenta_en_formulario([$correo]);
    }
    $uid = $usuarioId > 0 ? $usuarioId : null;
    $notas = '';
    $consulta = $mysqli->prepare(
        'INSERT INTO Consulta_Asesoria (fecha, hora, cedula, persona, correo, motivo, notas, usuario_id) VALUES (NULL, NULL, ?, ?, ?, ?, ?, ?)'
    );
    if (!$consulta) {
        return null;
    }
    $consulta->bind_param('sssssi', $cedula, $persona, $correo, $motivo, $notas, $uid);
    $guardo = $consulta->execute();
    $nuevoId = $guardo ? (int) $mysqli->insert_id : 0;
    $consulta->close();
    return $guardo && $nuevoId > 0 ? $nuevoId : false;
}

/* Escribe el día que el administrador asignó al aceptar. No cambia la hora si ya existía. */
function asignar_fecha_cita($mysqli, $id, $fecha) {
    $id = (int) $id;
    if ($id < 1 || !preg_match('/^\d{4}-\d{2}-\d{2}$/', (string) $fecha)) {
        return false;
    }
    $consulta = $mysqli->prepare('UPDATE Consulta_Asesoria SET fecha = ? WHERE id = ?');
    if (!$consulta) {
        return false;
    }
    $consulta->bind_param('si', $fecha, $id);
    $ok = $consulta->execute();
    $consulta->close();
    return $ok;
}

/* Pasa un día hábil a ocupado solo si sigue abierto. Así dos aceptaciones a la vez no ganan las dos. */
function reclamar_fecha_habil($fecha) {
    if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', (string) $fecha)) {
        return 'invalida';
    }
    $db = abrir_agenda();
    if (!$db) {
        return 'error';
    }
    $tipo = 'fecha';
    $estado = '';
    $sel = $db->prepare('SELECT estado FROM Agenda WHERE tipo = ? AND valor = ? LIMIT 1');
    if (!$sel) {
        $db->close();
        return 'error';
    }
    $sel->bind_param('ss', $tipo, $fecha);
    $sel->execute();
    $sel->bind_result($estado);
    $hay = $sel->fetch();
    $sel->close();
    if (!$hay) {
        $db->close();
        return 'no_habil';
    }
    if ($estado === 'bloqueada') {
        $db->close();
        return 'bloqueada';
    }
    if ($estado === 'ocupada') {
        $db->close();
        return 'ocupada';
    }
    if ($estado !== 'abierta') {
        $db->close();
        return 'no_habil';
    }
    $up = $db->prepare("UPDATE Agenda SET estado = 'ocupada' WHERE tipo = ? AND valor = ? AND estado = 'abierta'");
    if (!$up) {
        $db->close();
        return 'error';
    }
    $up->bind_param('ss', $tipo, $fecha);
    $up->execute();
    $gano = $up->affected_rows === 1;
    $up->close();
    $db->close();
    return $gano ? 'ok' : 'ocupada';
}

/* Devuelve a hábil un día que se acaba de reclamar, si guardar la cita falló. */
function devolver_fecha_habil($fecha) {
    if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', (string) $fecha)) {
        return;
    }
    $db = abrir_agenda();
    if (!$db) {
        return;
    }
    $tipo = 'fecha';
    $up = $db->prepare("UPDATE Agenda SET estado = 'abierta' WHERE tipo = ? AND valor = ? AND estado = 'ocupada'");
    if ($up) {
        $up->bind_param('ss', $tipo, $fecha);
        $up->execute();
        $up->close();
    }
    $db->close();
}

/* Columna de la cancelación hecha por la persona. No borra citas. */
function asegurar_cancelado_cita($mysqli) {
    if (!$mysqli) {
        return false;
    }
    $col = $mysqli->query("SHOW COLUMNS FROM Consulta_Asesoria LIKE 'cancelado_en'");
    if ($col && $col->num_rows > 0) {
        $col->free();
        return true;
    }
    if ($col) {
        $col->free();
    }
    $mysqli->query('ALTER TABLE Consulta_Asesoria ADD COLUMN cancelado_en DATETIME NULL DEFAULT NULL');
    $col = $mysqli->query("SHOW COLUMNS FROM Consulta_Asesoria LIKE 'cancelado_en'");
    $existe = $col && $col->num_rows > 0;
    if ($col) {
        $col->free();
    }
    return $existe;
}

/* Cédula del abogado de Usuarios_Legales que recibe la cita. Vacía si todavía no hay columna. */
function asegurar_abogado_cita($mysqli) {
    if (!$mysqli) {
        return false;
    }
    $col = $mysqli->query("SHOW COLUMNS FROM Consulta_Asesoria LIKE 'abogado_cedula'");
    $existe = $col && $col->num_rows > 0;
    if ($col) {
        $col->free();
    }
    if ($existe) {
        return true;
    }
    $mysqli->query('ALTER TABLE Consulta_Asesoria ADD COLUMN abogado_cedula CHAR(9) NULL DEFAULT NULL');
    $col = $mysqli->query("SHOW COLUMNS FROM Consulta_Asesoria LIKE 'abogado_cedula'");
    $existe = $col && $col->num_rows > 0;
    if ($col) {
        $col->free();
    }
    return $existe;
}

/* La papelera aparta la cita sin borrarla. */
function asegurar_archivo_cita($mysqli) {
    if (!$mysqli) {
        return false;
    }
    $col = $mysqli->query("SHOW COLUMNS FROM Consulta_Asesoria LIKE 'archivado_en'");
    $existe = $col && $col->num_rows > 0;
    if ($col) {
        $col->free();
    }
    if ($existe) {
        return true;
    }
    $mysqli->query('ALTER TABLE Consulta_Asesoria ADD COLUMN archivado_en DATETIME NULL DEFAULT NULL');
    $col = $mysqli->query("SHOW COLUMNS FROM Consulta_Asesoria LIKE 'archivado_en'");
    $existe = $col && $col->num_rows > 0;
    if ($col) {
        $col->free();
    }
    return $existe;
}

/* Abogados activos en Usuarios_Legales. Lista vacía si esa base no responde. */
function legales_abogados_activos() {
    static $cache = null;
    if ($cache !== null) {
        return $cache;
    }
    $cache = [];
    $archivo = dirname(__DIR__) . '/admin/config_legales.php';
    if (!is_file($archivo)) {
        return $cache;
    }
    $config = require $archivo;
    if (!is_array($config)) {
        return $cache;
    }
    mysqli_report(MYSQLI_REPORT_OFF);
    try {
        $db = new mysqli($config['host'], $config['usuario'], $config['clave'], $config['nombre']);
    } catch (Throwable $e) {
        return $cache;
    }
    if ($db->connect_errno) {
        return $cache;
    }
    $db->set_charset('utf8mb4');
    $db->query("SET time_zone = '-06:00'");
    $resultado = $db->query('SELECT id, cuenta, cedula, nombre FROM Abogado WHERE activo = 1 ORDER BY id ASC');
    if ($resultado) {
        while ($fila = $resultado->fetch_assoc()) {
            $cedula = preg_replace('/\D/', '', (string) ($fila['cedula'] ?? ''));
            $cuenta = strtolower(trim((string) ($fila['cuenta'] ?? '')));
            if (strlen($cedula) !== 9) {
                continue;
            }
            $cache[] = [
                'id' => (int) ($fila['id'] ?? 0),
                'cuenta' => $cuenta,
                'cedula' => $cedula,
                'nombre' => trim((string) ($fila['nombre'] ?? '')),
            ];
        }
        $resultado->free();
    }
    $db->close();
    return $cache;
}

/* Si hay un solo abogado activo, la cita nueva queda a su nombre. */
function abogado_cedula_para_cita() {
    $lista = legales_abogados_activos();
    if (count($lista) !== 1) {
        return '';
    }
    return (string) $lista[0]['cedula'];
}

function ahora_costa_rica_sql() {
    return (new DateTime('now', new DateTimeZone('America/Costa_Rica')))->format('Y-m-d H:i:s');
}

function hoy_costa_rica() {
    return (new DateTime('today', new DateTimeZone('America/Costa_Rica')))->format('Y-m-d');
}

/* Hoy inclusive y los 15 días naturales siguientes, en hora de Costa Rica. */
function ventana_reserva_publica() {
    $zona = new DateTimeZone('America/Costa_Rica');
    $hoy = new DateTime('today', $zona);
    $limite = clone $hoy;
    $limite->modify('+15 days');
    return [$hoy->format('Y-m-d'), $limite->format('Y-m-d')];
}

function fecha_en_ventana_reserva($fecha) {
    if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', (string) $fecha)) {
        return false;
    }
    list($hoy, $limite) = ventana_reserva_publica();
    return $fecha >= $hoy && $fecha <= $limite;
}

function hora_de_cita_ya_paso($fecha, $hora) {
    $zona = new DateTimeZone('America/Costa_Rica');
    $momento = DateTime::createFromFormat('Y-m-d H:i', $fecha . ' ' . $hora, $zona);
    if (!$momento) {
        return true;
    }
    return $momento < new DateTime('now', $zona);
}

function etiqueta_dia_es($iso) {
    $meses = [
        1 => 'enero', 2 => 'febrero', 3 => 'marzo', 4 => 'abril',
        5 => 'mayo', 6 => 'junio', 7 => 'julio', 8 => 'agosto',
        9 => 'septiembre', 10 => 'octubre', 11 => 'noviembre', 12 => 'diciembre',
    ];
    if (!preg_match('/^(\d{4})-(\d{2})-(\d{2})/', (string) $iso, $partes)) {
        return (string) $iso;
    }
    $mes = (int) $partes[2];
    return (int) $partes[3] . ' de ' . ($meses[$mes] ?? $partes[2]) . ' de ' . $partes[1];
}

function etiqueta_momento_es($fechaHora) {
    $texto = trim((string) $fechaHora);
    $dia = etiqueta_dia_es(substr($texto, 0, 10));
    if (!preg_match('/(\d{2}):(\d{2})/', $texto, $hora)) {
        return $dia;
    }
    $h = (int) $hora[1];
    $sufijo = $h >= 12 ? 'p. m.' : 'a. m.';
    $doce = $h % 12;
    if ($doce === 0) {
        $doce = 12;
    }
    return $dia . ' a las ' . $doce . ':' . $hora[2] . ' ' . $sufijo;
}

/* Quince días exactos: 360 horas desde el momento de la cancelación, en hora de Costa Rica. */
function plazo_reprogramacion_cita($canceladoEn) {
    $texto = trim((string) $canceladoEn);
    if ($texto === '') {
        return null;
    }
    $zona = new DateTimeZone('America/Costa_Rica');
    $inicio = DateTime::createFromFormat('Y-m-d H:i:s', substr($texto, 0, 19), $zona);
    if (!$inicio || $inicio->format('Y-m-d H:i:s') !== substr($texto, 0, 19)) {
        $corto = substr($texto, 0, 16);
        $inicio = DateTime::createFromFormat('Y-m-d H:i', $corto, $zona);
        if (!$inicio || $inicio->format('Y-m-d H:i') !== $corto) {
            $dia = substr($texto, 0, 10);
            $inicio = DateTime::createFromFormat('!Y-m-d', $dia, $zona);
            if (!$inicio || $inicio->format('Y-m-d') !== $dia) {
                return null;
            }
            $inicio->setTime(0, 0, 0);
        }
    }
    $limite = clone $inicio;
    $limite->modify('+360 hours');
    $ahora = new DateTime('now', $zona);
    $segundos = $limite->getTimestamp() - $ahora->getTimestamp();
    if ($segundos < 0) {
        $segundos = 0;
    }
    return [
        'cancelado' => $inicio->format('Y-m-d H:i:s'),
        'limite' => $limite->format('Y-m-d H:i:s'),
        'limite_unix' => $limite->getTimestamp(),
        'ahora_unix' => $ahora->getTimestamp(),
        'segundos' => $segundos,
        'vigente' => $ahora < $limite,
    ];
}

function cita_fecha_programada($fecha) {
    return (bool) preg_match('/^\d{4}-\d{2}-\d{2}$/', (string) $fecha);
}

/* True si otra cita no cancelada ya usa ese día. Si no se puede comprobar, no se libera. */
function otra_cita_activa_en_fecha($mysqli, $fecha, $exceptoId) {
    $exceptoId = (int) $exceptoId;
    $consulta = $mysqli->prepare(
        'SELECT id FROM Consulta_Asesoria WHERE fecha = ? AND id <> ? AND cancelado_en IS NULL LIMIT 1'
    );
    if (!$consulta) {
        return true;
    }
    $consulta->bind_param('si', $fecha, $exceptoId);
    $consulta->execute();
    $id = 0;
    $consulta->bind_result($id);
    $hay = $consulta->fetch();
    $consulta->close();
    return (bool) $hay;
}

function liberar_dia_cita_cancelada($mysqli, $fecha, $exceptoId) {
    if (!cita_fecha_programada($fecha)) {
        return;
    }
    if (otra_cita_activa_en_fecha($mysqli, $fecha, $exceptoId)) {
        return;
    }
    devolver_fecha_habil($fecha);
}

/* Ids de Respuesta_Asesoria por estado. null si esa base no se pudo leer. */
function ids_citas_por_estado($estado) {
    $estado = (string) $estado;
    if ($estado !== 'aceptada' && $estado !== 'rechazada' && $estado !== 'neutral') {
        return [];
    }
    if (!function_exists('abrir_respuestas')) {
        require_once __DIR__ . '/respuestas.php';
    }
    $db = abrir_respuestas();
    if (!$db) {
        return null;
    }
    $lista = [];
    $consulta = $db->prepare('SELECT origen_id FROM Respuesta_Asesoria WHERE estado = ?');
    if (!$consulta) {
        $db->close();
        return null;
    }
    $consulta->bind_param('s', $estado);
    if (!$consulta->execute()) {
        $consulta->close();
        $db->close();
        return null;
    }
    $origen = 0;
    $consulta->bind_result($origen);
    while ($consulta->fetch()) {
        $numero = (int) $origen;
        if ($numero > 0) {
            $lista[] = $numero;
        }
    }
    $consulta->close();
    $db->close();
    return $lista;
}

/* Ids con respuesta aceptada. La respuesta vive en otra base, así que no se puede unir en SQL. */
function ids_citas_aceptadas() {
    return ids_citas_por_estado('aceptada');
}

function ids_citas_rechazadas() {
    return ids_citas_por_estado('rechazada');
}

/* Fecha YYYY-MM-DD, o vacío si no es un día real. */
function normalizar_fecha_cita($fecha) {
    $fecha = trim((string) $fecha);
    if (!preg_match('/^(\d{4})-(\d{2})-(\d{2})/', $fecha, $partes)) {
        return '';
    }
    $iso = $partes[1] . '-' . $partes[2] . '-' . $partes[3];
    $dia = DateTime::createFromFormat('!Y-m-d', $iso);
    if (!$dia || $dia->format('Y-m-d') !== $iso) {
        return '';
    }
    return $iso;
}

/* Hora HH:MM de 24 horas. Acepta 9:00, 09:00:00 y 9:00 a. m. / p. m. */
function normalizar_hora_cita($hora) {
    $texto = trim((string) $hora);
    if ($texto === '') {
        return '';
    }
    $meridiano = '';
    if (preg_match('/^(.+?)\s*([ap])\.?\s*m\.?$/i', $texto, $sufijo)) {
        $texto = trim($sufijo[1]);
        $meridiano = strtolower($sufijo[2]);
    }
    if (!preg_match('/^(\d{1,2})\s*:\s*(\d{2})(?::\d{2})?$/', $texto, $partes)) {
        return '';
    }
    $h = (int) $partes[1];
    $minuto = (int) $partes[2];
    if ($minuto > 59) {
        return '';
    }
    if ($meridiano !== '') {
        if ($h < 1 || $h > 12) {
            return '';
        }
        if ($meridiano === 'a' && $h === 12) {
            $h = 0;
        } elseif ($meridiano === 'p' && $h < 12) {
            $h += 12;
        }
    }
    if ($h > 23) {
        return '';
    }
    return sprintf('%02d:%02d', $h, $minuto);
}

function dia_de_cupo($clave) {
    $clave = trim((string) $clave);
    if (!preg_match('/^(\d{4}-\d{2}-\d{2})(?:\s+\d{2}:\d{2})?$/', $clave, $partes)) {
        return '';
    }
    return normalizar_fecha_cita($partes[1]);
}

function normalizar_clave_cupo($clave) {
    return dia_de_cupo($clave);
}

/* La cita activa más antigua de un día sin cupo lo toma. No borra filas ni le quita el cupo a otra cita del mismo día. */
function rellenar_cupos_citas_activas($mysqli) {
    if (!$mysqli) {
        return false;
    }
    $rechazadas = ids_citas_rechazadas();
    $soloAceptadas = !is_array($rechazadas);
    $aceptadas = $soloAceptadas ? ids_citas_aceptadas() : null;
    if ($soloAceptadas && !is_array($aceptadas)) {
        return false;
    }
    $esRechazada = [];
    if (is_array($rechazadas)) {
        foreach ($rechazadas as $rechazada) {
            $esRechazada[(int) $rechazada] = true;
        }
    }
    $esAceptada = [];
    if (is_array($aceptadas)) {
        foreach ($aceptadas as $aceptada) {
            $esAceptada[(int) $aceptada] = true;
        }
    }
    asegurar_archivo_cita($mysqli);
    $resultado = $mysqli->query('SELECT id, fecha, hora, cupo_activo, cancelado_en, archivado_en FROM Consulta_Asesoria');
    if (!$resultado) {
        $resultado = $mysqli->query('SELECT id, fecha, hora, cupo_activo, cancelado_en FROM Consulta_Asesoria');
    }
    if (!$resultado) {
        return false;
    }
    $activas = [];
    $soltar = [];
    $conCupo = [];
    while ($fila = $resultado->fetch_assoc()) {
        $id = (int) ($fila['id'] ?? 0);
        if ($id < 1) {
            continue;
        }
        $cancelada = trim((string) ($fila['cancelado_en'] ?? '')) !== '';
        $archivada = trim((string) ($fila['archivado_en'] ?? '')) !== '';
        $dia = normalizar_fecha_cita((string) ($fila['fecha'] ?? ''));
        $horaOk = normalizar_hora_cita((string) ($fila['hora'] ?? ''));
        $cupoDia = dia_de_cupo((string) ($fila['cupo_activo'] ?? ''));
        $tieneCupo = $cupoDia !== '';
        $rechazada = isset($esRechazada[$id]);
        $puedeOcupar = !$cancelada && !$archivada && $dia !== '' && $horaOk !== '' && !$rechazada;
        if ($soloAceptadas) {
            $puedeOcupar = $puedeOcupar && isset($esAceptada[$id]);
        }
        if (!$puedeOcupar) {
            if ($tieneCupo) {
                $soltar[] = $id;
            }
            continue;
        }
        $activas[$dia][] = $id;
        if ($cupoDia === $dia) {
            $conCupo[$dia] = true;
        }
    }
    $resultado->free();

    $liberar = $mysqli->prepare('UPDATE Consulta_Asesoria SET cupo_activo = NULL WHERE id = ? AND cupo_activo IS NOT NULL LIMIT 1');
    if (!$liberar) {
        return false;
    }
    foreach ($soltar as $idSoltar) {
        $liberar->bind_param('i', $idSoltar);
        $liberar->execute();
    }
    $ganadores = [];
    foreach ($activas as $dia => $ids) {
        if (!empty($conCupo[$dia])) {
            continue;
        }
        sort($ids, SORT_NUMERIC);
        $ganadores[$dia] = (int) $ids[0];
    }
    $liberar->close();

    $diaCupo = '';
    $idCupo = 0;
    $poner = $mysqli->prepare(
        "UPDATE Consulta_Asesoria SET cupo_activo = ? WHERE id = ? AND (cupo_activo IS NULL OR cupo_activo = '') LIMIT 1"
    );
    if (!$poner) {
        return false;
    }
    foreach ($ganadores as $diaCupo => $idCupo) {
        $poner->bind_param('si', $diaCupo, $idCupo);
        $poner->execute();
    }
    $poner->close();
    return true;
}

/* Un horario activo por cita. NULL si está pendiente sin hora, rechazada o cancelada. */
function asegurar_cupo_cita($mysqli) {
    if (!$mysqli) {
        return false;
    }
    static $relleno = false;
    $col = $mysqli->query("SHOW COLUMNS FROM Consulta_Asesoria LIKE 'cupo_activo'");
    $existe = $col && $col->num_rows > 0;
    if ($col) {
        $col->free();
    }
    if (!$existe) {
        $mysqli->query('ALTER TABLE Consulta_Asesoria ADD COLUMN cupo_activo VARCHAR(16) NULL DEFAULT NULL');
    }
    asegurar_cancelado_cita($mysqli);
    if (!$relleno && rellenar_cupos_citas_activas($mysqli)) {
        $relleno = true;
    }
    $unico = $mysqli->query("SHOW INDEX FROM Consulta_Asesoria WHERE Key_name = 'uk_consulta_asesoria_cupo'");
    $hayUnico = $unico && $unico->num_rows > 0;
    if ($unico) {
        $unico->free();
    }
    if (!$hayUnico) {
        $mysqli->query('ALTER TABLE Consulta_Asesoria ADD UNIQUE KEY uk_consulta_asesoria_cupo (cupo_activo)');
        $unico = $mysqli->query("SHOW INDEX FROM Consulta_Asesoria WHERE Key_name = 'uk_consulta_asesoria_cupo'");
        $hayUnico = $unico && $unico->num_rows > 0;
        if ($unico) {
            $unico->free();
        }
        if (!$hayUnico && rellenar_cupos_citas_activas($mysqli)) {
            $mysqli->query('ALTER TABLE Consulta_Asesoria ADD UNIQUE KEY uk_consulta_asesoria_cupo (cupo_activo)');
            $unico = $mysqli->query("SHOW INDEX FROM Consulta_Asesoria WHERE Key_name = 'uk_consulta_asesoria_cupo'");
            $hayUnico = $unico && $unico->num_rows > 0;
            if ($unico) {
                $unico->free();
            }
        }
    }
    if ($hayUnico) {
        $viejo = $mysqli->query("SHOW INDEX FROM Consulta_Asesoria WHERE Key_name = 'uk_consulta_asesoria_fecha_hora'");
        $hayViejo = $viejo && $viejo->num_rows > 0;
        if ($viejo) {
            $viejo->free();
        }
        if ($hayViejo) {
            $mysqli->query('ALTER TABLE Consulta_Asesoria DROP INDEX uk_consulta_asesoria_fecha_hora');
        }
    }
    $col = $mysqli->query("SHOW COLUMNS FROM Consulta_Asesoria LIKE 'cupo_activo'");
    $listo = $col && $col->num_rows > 0;
    if ($col) {
        $col->free();
    }
    return $listo;
}

function asegurar_modalidad_cita($mysqli) {
    if (!$mysqli) {
        return false;
    }
    $col = $mysqli->query("SHOW COLUMNS FROM Consulta_Asesoria LIKE 'modalidad'");
    $existe = $col && $col->num_rows > 0;
    if ($col) {
        $col->free();
    }
    if ($existe) {
        return true;
    }
    $mysqli->query(
        "ALTER TABLE Consulta_Asesoria ADD COLUMN modalidad ENUM('presencial','virtual') NULL DEFAULT NULL"
    );
    $col = $mysqli->query("SHOW COLUMNS FROM Consulta_Asesoria LIKE 'modalidad'");
    $existe = $col && $col->num_rows > 0;
    if ($col) {
        $col->free();
    }
    return $existe;
}

function clave_cupo_cita($fecha, $hora) {
    $fecha = normalizar_fecha_cita($fecha);
    $hora = normalizar_hora_cita($hora);
    if ($fecha === '' || $hora === '') {
        return '';
    }
    return $fecha . ' ' . $hora;
}

function clave_cupo_dia($fecha) {
    return normalizar_fecha_cita($fecha);
}

/* Bloquea las filas que ya ocupan ese día, en el formato nuevo o en el de fecha y hora. */
function cupo_dia_ajeno($db, $fecha, $exceptoId = 0) {
    $fecha = normalizar_fecha_cita($fecha);
    if ($fecha === '' || !$db) {
        return null;
    }
    $prefijo = $fecha . ' %';
    $sel = $db->prepare('SELECT id FROM Consulta_Asesoria WHERE cupo_activo = ? OR cupo_activo LIKE ? FOR UPDATE');
    if (!$sel) {
        return null;
    }
    $sel->bind_param('ss', $fecha, $prefijo);
    if (!$sel->execute()) {
        $sel->close();
        return null;
    }
    $otro = 0;
    $sel->bind_result($otro);
    $ajeno = false;
    while ($sel->fetch()) {
        if ((int) $otro !== (int) $exceptoId) {
            $ajeno = true;
        }
    }
    $sel->close();
    return $ajeno;
}

/* Fechas de Agenda y los días del mes en curso hasta el último mes con una fecha guardada.
   Reservar sigue limitado a hoy y los 15 días siguientes. */
function calendario_reserva_publica() {
    $agenda = agenda_para_citas();
    if (!$agenda) {
        return null;
    }
    $db = abrir_consultas();
    if (!$db) {
        return null;
    }
    $ocupados = cupos_ocupados($db, false);
    $db->close();
    if ($ocupados === null) {
        return null;
    }
    $tomados = [];
    foreach ($ocupados as $clave) {
        $diaCupo = dia_de_cupo($clave);
        if ($diaCupo !== '') {
            $tomados[$diaCupo] = true;
        }
    }
    list($hoy, $limite) = ventana_reserva_publica();
    $zona = new DateTimeZone('America/Costa_Rica');
    $inicio = DateTime::createFromFormat('!Y-m-d', substr($hoy, 0, 8) . '01', $zona);
    $finVentana = DateTime::createFromFormat('!Y-m-d', $limite, $zona);
    if (!$inicio || !$finVentana) {
        return null;
    }
    foreach (array_keys($tomados) as $iso) {
        if ($iso < $inicio->format('Y-m-d')) {
            $masTemprano = DateTime::createFromFormat('!Y-m-d', substr($iso, 0, 8) . '01', $zona);
            if ($masTemprano) {
                $inicio = $masTemprano;
            }
        }
    }
    $finVentana->modify('last day of this month');
    $ultima = $finVentana->format('Y-m-d');
    foreach ($agenda['estado_fecha'] as $iso => $estadoFecha) {
        if ($iso > $ultima) {
            $ultima = $iso;
        }
    }
    foreach (array_keys($agenda['fin_fecha'] ?? []) as $iso) {
        if ($iso > $ultima) {
            $ultima = $iso;
        }
    }
    foreach (array_keys($tomados) as $iso) {
        if ($iso > $ultima) {
            $ultima = $iso;
        }
    }
    $finNav = DateTime::createFromFormat('!Y-m-d', $ultima, $zona);
    if (!$finNav) {
        return null;
    }
    $finNav->modify('last day of this month');
    $armado = [];
    $cursor = clone $inicio;
    while ($cursor <= $finVentana) {
        $armado[$cursor->format('Y-m-d')] = true;
        $cursor->modify('+1 day');
    }
    foreach ($agenda['estado_fecha'] as $iso => $estadoFecha) {
        if ($iso >= $inicio->format('Y-m-d')) {
            $armado[$iso] = true;
        }
    }
    foreach (array_keys($agenda['fin_fecha'] ?? []) as $iso) {
        if ($iso >= $inicio->format('Y-m-d')) {
            $armado[$iso] = true;
        }
    }
    foreach (array_keys($tomados) as $iso) {
        if ($iso >= $inicio->format('Y-m-d')) {
            $armado[$iso] = true;
        }
    }
    ksort($armado);
    $dias = [];
    foreach (array_keys($armado) as $fecha) {
        $dia = DateTime::createFromFormat('!Y-m-d', $fecha, $zona);
        if (!$dia || $dia->format('Y-m-d') !== $fecha) {
            continue;
        }
        $estado = (string) ($agenda['estado_fecha'][$fecha] ?? '');
        if (!in_array($estado, ['abierta', 'bloqueada', 'ocupada'], true)) {
            $estado = '';
        }
        $pasado = $fecha < $hoy;
        $fuera = $fecha > $limite;
        $ocupada = !empty($tomados[$fecha]);
        $habil = !$ocupada && !$pasado && dia_habil_en_agenda($fecha, $agenda);
        $horas = [];
        $hayLibre = false;
        if ($habil) {
            foreach (inicios_hasta(limite_publico_fecha($fecha, $agenda)) as $hora) {
                $pasada = hora_de_cita_ya_paso($fecha, $hora);
                if (!$pasada) {
                    $hayLibre = true;
                }
                $horas[] = [
                    'hora' => $hora,
                    'fin' => fin_cita_una_hora($hora),
                    'libre' => !$pasada,
                    'pasada' => $pasada,
                ];
            }
        }
        $habil = $habil && $hayLibre;
        $dias[] = [
            'fecha' => $fecha,
            'numero' => (int) $dia->format('j'),
            'etiqueta' => etiqueta_dia_es($fecha),
            'pasado' => $pasado,
            'fuera' => $fuera,
            'ocupada' => $ocupada,
            'habil' => $habil,
            'estado' => $estado,
            'horas' => $horas,
        ];
    }
    return [
        'hoy' => $hoy,
        'limite' => $limite,
        'mes_inicio' => $inicio->format('Y-m'),
        'mes_fin' => $finNav->format('Y-m'),
        'dias' => $dias,
    ];
}

function agenda_para_citas() {
    $db = abrir_agenda();
    if (!$db) {
        return null;
    }
    $reglas = leer_agenda($db);
    $db->close();
    if (!is_array($reglas)) {
        return null;
    }
    $hoy = hoy_costa_rica();
    $fechas = [];
    $estadoFecha = [];
    foreach ($reglas['fechas'] as $valor => $estado) {
        $iso = normalizar_fecha_cita($valor);
        if ($iso === '') {
            continue;
        }
        if (!isset($estadoFecha[$iso]) || $estado !== 'abierta') {
            $estadoFecha[$iso] = $estado;
        }
        if ($estadoFecha[$iso] === 'abierta' && $iso >= $hoy) {
            $fechas[$iso] = $iso;
        } else {
            unset($fechas[$iso]);
        }
    }
    $fechas = array_values($fechas);
    sort($fechas);
    $horas = [];
    $estadoHora = [];
    $finFecha = [];
    foreach ($reglas['horas'] as $valor => $estado) {
        $partesExcepcion = partir_hora_excepcion($valor);
        if ($partesExcepcion) {
            if ($estado === 'abierta') {
                $diaExcepcion = $partesExcepcion[0];
                $cierre = $partesExcepcion[1];
                if (!isset($finFecha[$diaExcepcion]) || $cierre > $finFecha[$diaExcepcion]) {
                    $finFecha[$diaExcepcion] = $cierre;
                }
            }
            continue;
        }
        $hora = normalizar_hora_cita($valor);
        if ($hora === '') {
            continue;
        }
        if (!isset($estadoHora[$hora]) || $estado !== 'abierta') {
            $estadoHora[$hora] = $estado;
        }
        if ($estadoHora[$hora] === 'abierta') {
            $horas[$hora] = $hora;
        } else {
            unset($horas[$hora]);
        }
    }
    $horas = array_values($horas);
    sort($horas);
    $estadoMes = [];
    foreach ($reglas['meses'] as $valor => $estado) {
        $mes = trim((string) $valor);
        if (preg_match('/^\d{4}-\d{2}$/', $mes)) {
            $estadoMes[$mes] = (string) $estado;
        }
    }
    return [
        'fechas' => $fechas,
        'horas' => $horas,
        'estado_fecha' => $estadoFecha,
        'estado_hora' => $estadoHora,
        'fin_fecha' => $finFecha,
        'estado_mes' => $estadoMes,
    ];
}

/* Martes = 2 y jueves = 4, en hora de Costa Rica. */
function es_martes_o_jueves($fecha) {
    $fecha = normalizar_fecha_cita($fecha);
    if ($fecha === '') {
        return false;
    }
    $dia = DateTime::createFromFormat('!Y-m-d', $fecha, new DateTimeZone('America/Costa_Rica'));
    if (!$dia || $dia->format('Y-m-d') !== $fecha) {
        return false;
    }
    $semana = (int) $dia->format('w');
    return $semana === 2 || $semana === 4;
}

/* El fin es siempre una hora después del inicio. */
function fin_cita_una_hora($hora) {
    $hora = normalizar_hora_cita($hora);
    if (!preg_match('/^(\d{2}):(\d{2})$/', $hora, $partes)) {
        return '';
    }
    $h = (int) $partes[1] + 1;
    if ($h > 23) {
        return '';
    }
    return sprintf('%02d:%02d', $h, $partes[2]);
}

/* Martes hasta las 14:00. Jueves hasta las 13:00. */
function limite_fin_cita($fecha) {
    $fecha = normalizar_fecha_cita($fecha);
    if ($fecha === '' || !es_martes_o_jueves($fecha)) {
        return '';
    }
    $dia = DateTime::createFromFormat('!Y-m-d', $fecha, new DateTimeZone('America/Costa_Rica'));
    if (!$dia) {
        return '';
    }
    return (int) $dia->format('w') === 2 ? '14:00' : '13:00';
}

/* Una hora guardada para un día concreto: "YYYY-MM-DD HH:MM" es el cierre de ese día. */
function partir_hora_excepcion($valor) {
    $valor = trim((string) $valor);
    if (!preg_match('/^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2})$/', $valor, $partes)) {
        return null;
    }
    $fecha = normalizar_fecha_cita($partes[1]);
    $hora = normalizar_hora_cita($partes[2]);
    if ($fecha === '' || $hora === '' || $hora < '09:00') {
        return null;
    }
    return [$fecha, $hora];
}

/* Inicios de una hora, desde las 8:00 a. m., que no pasen del cierre indicado. */
function inicios_hasta($limite) {
    $limite = normalizar_hora_cita($limite);
    if ($limite === '' || $limite < '09:00') {
        return [];
    }
    $validos = [];
    for ($hora = 8; $hora <= 22; $hora++) {
        $inicio = sprintf('%02d:00', $hora);
        $fin = fin_cita_una_hora($inicio);
        if ($fin !== '' && $fin <= $limite) {
            $validos[] = $inicio;
        }
    }
    return $validos;
}

/* Inicios de una hora que terminan a la hora de salida de ese día. */
function inicios_cita_legal($fecha) {
    return inicios_hasta(limite_fin_cita($fecha));
}

/* Cierre puesto a mano para un día. No depende de la ventana de 15 días. */
function fin_manual_fecha($agenda, $fecha) {
    if (!is_array($agenda)) {
        return '';
    }
    $mapa = $agenda['fin_fecha'] ?? [];
    return normalizar_hora_cita((string) ($mapa[$fecha] ?? ''));
}

/* Tope de ese día: la excepción del admin, o el horario automático de martes y jueves. */
function limite_publico_fecha($fecha, $agenda) {
    $fecha = normalizar_fecha_cita($fecha);
    if ($fecha === '' || !is_array($agenda)) {
        return '';
    }
    $estado = (string) ($agenda['estado_fecha'][$fecha] ?? '');
    if ($estado === 'bloqueada' || $estado === 'ocupada') {
        return '';
    }
    $manual = fin_manual_fecha($agenda, $fecha);
    if ($manual !== '') {
        return $manual;
    }
    if (fecha_en_ventana_reserva($fecha) && es_martes_o_jueves($fecha)) {
        return limite_fin_cita($fecha);
    }
    return '';
}

/* Martes o jueves de la ventana, o un día que el admin dejó abierto a mano. */
function dia_habil_en_agenda($fecha, $agenda) {
    $fecha = normalizar_fecha_cita($fecha);
    if ($fecha === '' || !is_array($agenda)) {
        return false;
    }
    return inicios_hasta(limite_publico_fecha($fecha, $agenda)) !== [];
}

function cupos_ocupados($mysqli, $reparar = true) {
    if (!$mysqli) {
        return null;
    }
    if ($reparar) {
        if (!asegurar_cupo_cita($mysqli)) {
            return null;
        }
    } else {
        $columna = $mysqli->query("SHOW COLUMNS FROM Consulta_Asesoria LIKE 'cupo_activo'");
        $hayColumna = $columna && $columna->num_rows > 0;
        if ($columna) {
            $columna->free();
        }
        if (!$hayColumna && !asegurar_cupo_cita($mysqli)) {
            return null;
        }
    }
    $lista = [];
    $resultado = $mysqli->query('SELECT cupo_activo FROM Consulta_Asesoria WHERE cupo_activo IS NOT NULL');
    if (!$resultado) {
        return null;
    }
    while ($fila = $resultado->fetch_assoc()) {
        $clave = normalizar_clave_cupo((string) ($fila['cupo_activo'] ?? ''));
        if ($clave !== '') {
            $lista[$clave] = $clave;
        }
    }
    $resultado->free();
    return array_values($lista);
}

function listar_cupos_asignacion() {
    $agenda = agenda_para_citas();
    if (!$agenda) {
        return null;
    }
    $db = abrir_consultas();
    if (!$db) {
        return null;
    }
    $ocupados = cupos_ocupados($db);
    $db->close();
    if ($ocupados === null) {
        return null;
    }
    return [
        'fechas' => $agenda['fechas'],
        'horas' => $agenda['horas'],
        'ocupados' => $ocupados,
    ];
}

/* Abre el día y la hora al asignar una cita. No pisa un día no hábil ni uno ocupado, ni una hora que no esté abierta. */
function preparar_horario_asignado($fecha, $hora) {
    $fecha = normalizar_fecha_cita($fecha);
    $hora = normalizar_hora_cita($hora);
    if ($fecha === '' || $hora === '') {
        return 'invalida';
    }
    if ($fecha < hoy_costa_rica()) {
        return 'pasada';
    }
    $db = abrir_agenda();
    if (!$db) {
        return 'error';
    }
    $leer = function ($tipo, $valor) use ($db) {
        $estado = '';
        $consulta = $db->prepare('SELECT estado FROM Agenda WHERE tipo = ? AND valor = ? LIMIT 1');
        if (!$consulta) {
            return null;
        }
        $consulta->bind_param('ss', $tipo, $valor);
        $consulta->execute();
        $consulta->bind_result($estado);
        $hay = $consulta->fetch();
        $consulta->close();
        return $hay ? (string) $estado : '';
    };
    $estadoFecha = $leer('fecha', $fecha);
    if ($estadoFecha === null) {
        $db->close();
        return 'error';
    }
    if ($estadoFecha === 'bloqueada') {
        $db->close();
        return 'bloqueada';
    }
    if ($estadoFecha === 'ocupada') {
        $db->close();
        return 'ocupada';
    }
    $estadoHora = $leer('hora', $hora);
    if ($estadoHora === null) {
        $db->close();
        return 'error';
    }
    if ($estadoHora !== '' && $estadoHora !== 'abierta') {
        $db->close();
        return 'hora_no_habil';
    }
    $db->begin_transaction();
    $abierta = 'abierta';
    $mes = substr($fecha, 0, 7);
    $tipoMes = 'mes';
    $asegurar = $db->prepare('INSERT INTO Agenda (tipo, valor, estado) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE estado = estado');
    if (!$asegurar) {
        $db->rollback();
        $db->close();
        return 'error';
    }
    $asegurar->bind_param('sss', $tipoMes, $mes, $abierta);
    $ok = $asegurar->execute();
    $asegurar->close();
    if (!$ok) {
        $db->rollback();
        $db->close();
        return 'error';
    }
    if ($estadoFecha === '') {
        $tipoFecha = 'fecha';
        $insertar = $db->prepare('INSERT INTO Agenda (tipo, valor, estado) VALUES (?, ?, ?)');
        if (!$insertar) {
            $db->rollback();
            $db->close();
            return 'error';
        }
        $insertar->bind_param('sss', $tipoFecha, $fecha, $abierta);
        $ok = $insertar->execute();
        $duplicada = !$ok && (int) $db->errno === 1062;
        $insertar->close();
        if (!$ok && !$duplicada) {
            $db->rollback();
            $db->close();
            return 'error';
        }
    }
    if ($estadoHora === '') {
        $tipoHora = 'hora';
        $insertar = $db->prepare('INSERT INTO Agenda (tipo, valor, estado) VALUES (?, ?, ?)');
        if (!$insertar) {
            $db->rollback();
            $db->close();
            return 'error';
        }
        $insertar->bind_param('sss', $tipoHora, $hora, $abierta);
        $ok = $insertar->execute();
        $duplicada = !$ok && (int) $db->errno === 1062;
        $insertar->close();
        if (!$ok && !$duplicada) {
            $db->rollback();
            $db->close();
            return 'error';
        }
    }
    $estadoFecha = $leer('fecha', $fecha);
    $estadoHora = $leer('hora', $hora);
    if ($estadoFecha !== 'abierta' || $estadoHora !== 'abierta') {
        $db->rollback();
        $db->close();
        if ($estadoFecha === 'bloqueada') {
            return 'bloqueada';
        }
        if ($estadoFecha === 'ocupada') {
            return 'ocupada';
        }
        if ($estadoHora !== 'abierta') {
            return 'hora_no_habil';
        }
        return 'error';
    }
    $db->commit();
    $db->close();
    return 'ok';
}

/* Día hábil y hora abierta, en la agenda ya normalizada. */
function estado_horario_agenda($fecha, $hora) {
    $fecha = normalizar_fecha_cita($fecha);
    $hora = normalizar_hora_cita($hora);
    if ($fecha === '' || $hora === '') {
        return 'invalida';
    }
    if ($fecha < hoy_costa_rica()) {
        return 'pasada';
    }
    $agenda = agenda_para_citas();
    if (!$agenda) {
        return 'error';
    }
    $estadoFecha = (string) ($agenda['estado_fecha'][$fecha] ?? '');
    if ($estadoFecha === 'bloqueada') {
        return 'bloqueada';
    }
    if ($estadoFecha === 'ocupada') {
        return 'ocupada';
    }
    $limite = limite_publico_fecha($fecha, $agenda);
    if ($limite === '') {
        return 'no_habil';
    }
    $fin = fin_cita_una_hora($hora);
    if ($fin === '' || $fin > $limite || !in_array($hora, inicios_hasta($limite), true)) {
        return 'hora_no_habil';
    }
    if (hora_de_cita_ya_paso($fecha, $hora)) {
        return 'pasada';
    }
    return 'ok';
}

/* Reserva fecha y hora para una sola cita. El índice único impide que dos admins ganen el mismo horario. */
function reclamar_horario_cita($id, $fecha, $hora, $limpiarCancelacion = false) {
    $id = (int) $id;
    $fecha = normalizar_fecha_cita($fecha);
    $hora = normalizar_hora_cita($hora);
    $estado = estado_horario_agenda($fecha, $hora);
    if ($estado !== 'ok') {
        return $estado;
    }
    if ($id < 1) {
        return 'invalida';
    }
    $db = abrir_consultas();
    if (!$db || !asegurar_cupo_cita($db)) {
        if ($db) {
            $db->close();
        }
        return 'error';
    }
    $clave = clave_cupo_dia($fecha);
    if ($clave === '') {
        $db->close();
        return 'invalida';
    }
    $db->begin_transaction();
    $ajeno = cupo_dia_ajeno($db, $fecha, $id);
    if ($ajeno === null) {
        $db->rollback();
        $db->close();
        return 'error';
    }
    if ($ajeno) {
        $db->rollback();
        $db->close();
        return 'ocupada';
    }
    $sql = $limpiarCancelacion
        ? 'UPDATE Consulta_Asesoria SET fecha = ?, hora = ?, cupo_activo = ?, cancelado_en = NULL WHERE id = ? AND cupo_activo IS NULL AND cancelado_en IS NOT NULL LIMIT 1'
        : 'UPDATE Consulta_Asesoria SET fecha = ?, hora = ?, cupo_activo = ? WHERE id = ? AND cupo_activo IS NULL LIMIT 1';
    $up = $db->prepare($sql);
    if (!$up) {
        $db->rollback();
        $db->close();
        return 'error';
    }
    $up->bind_param('sssi', $fecha, $hora, $clave, $id);
    $guardo = $up->execute();
    $hecho = $guardo && $up->affected_rows === 1;
    $duplicado = !$guardo && ((int) $up->errno === 1062 || (int) $db->errno === 1062);
    $up->close();
    if (!$hecho) {
        $db->rollback();
        $db->close();
        return $duplicado ? 'ocupada' : 'error';
    }
    if (!$db->commit()) {
        $db->rollback();
        $db->close();
        return 'error';
    }
    $db->close();
    return 'ok';
}

/* Mueve una cita que ya ocupa un horario. La misma fila puede conservar su cupo. */
function mover_horario_cita($id, $fecha, $hora) {
    $id = (int) $id;
    $fecha = normalizar_fecha_cita($fecha);
    $hora = normalizar_hora_cita($hora);
    if ($id < 1) {
        return 'invalida';
    }
    $estado = estado_horario_agenda($fecha, $hora);
    if ($estado !== 'ok') {
        return $estado;
    }
    $db = abrir_consultas();
    if (!$db || !asegurar_cupo_cita($db)) {
        if ($db) {
            $db->close();
        }
        return 'error';
    }
    $clave = clave_cupo_dia($fecha);
    if ($clave === '') {
        $db->close();
        return 'invalida';
    }
    $db->begin_transaction();
    $propia = $db->prepare('SELECT cancelado_en FROM Consulta_Asesoria WHERE id = ? LIMIT 1 FOR UPDATE');
    if (!$propia) {
        $db->rollback();
        $db->close();
        return 'error';
    }
    $propia->bind_param('i', $id);
    $propia->execute();
    $cancelado = null;
    $propia->bind_result($cancelado);
    $existe = $propia->fetch();
    $propia->close();
    if (!$existe) {
        $db->rollback();
        $db->close();
        return 'error';
    }
    if (trim((string) $cancelado) !== '') {
        $db->rollback();
        $db->close();
        return 'cancelada';
    }
    $ajeno = cupo_dia_ajeno($db, $fecha, $id);
    if ($ajeno === null) {
        $db->rollback();
        $db->close();
        return 'error';
    }
    if ($ajeno) {
        $db->rollback();
        $db->close();
        return 'ocupada';
    }
    $up = $db->prepare('UPDATE Consulta_Asesoria SET fecha = ?, hora = ?, cupo_activo = ? WHERE id = ? AND cancelado_en IS NULL LIMIT 1');
    if (!$up) {
        $db->rollback();
        $db->close();
        return 'error';
    }
    $up->bind_param('sssi', $fecha, $hora, $clave, $id);
    $guardo = $up->execute();
    $hecho = $guardo && $up->affected_rows === 1;
    $duplicado = !$guardo && ((int) $up->errno === 1062 || (int) $db->errno === 1062);
    $up->close();
    if (!$hecho && !$duplicado) {
        $misma = $db->prepare('SELECT id FROM Consulta_Asesoria WHERE id = ? AND cupo_activo = ? LIMIT 1');
        if ($misma) {
            $misma->bind_param('is', $id, $clave);
            $misma->execute();
            $ya = 0;
            $misma->bind_result($ya);
            $hecho = $misma->fetch() && (int) $ya === $id;
            $misma->close();
        }
    }
    if (!$hecho) {
        $db->rollback();
        $db->close();
        return $duplicado ? 'ocupada' : 'error';
    }
    if (!$db->commit()) {
        $db->rollback();
        $db->close();
        return 'error';
    }
    $db->close();
    return 'ok';
}

/* Inserta la cita y toma el horario en la misma transacción. Si el cupo está duplicado, no queda la fila. */
function reservar_cita_con_cupo($cedula, $persona, $correo, $motivo, $usuarioId, $modalidad, $fecha, $hora, &$nuevoId = 0) {
    $nuevoId = 0;
    $fecha = normalizar_fecha_cita($fecha);
    $hora = normalizar_hora_cita($hora);
    $estado = estado_horario_agenda($fecha, $hora);
    if ($estado !== 'ok') {
        return $estado;
    }
    if (hora_de_cita_ya_paso($fecha, $hora)) {
        return 'pasada';
    }
    $db = abrir_consultas();
    if (!$db) {
        return 'error';
    }
    permitir_cita_sin_fecha($db);
    if (!asegurar_modalidad_cita($db) || !asegurar_cupo_cita($db)) {
        $db->close();
        return 'error';
    }
    $persona = recortar_cita($persona, 120);
    $motivo = recortar_cita($motivo, 800);
    $correo = strtolower(recortar_cita($correo, 120));
    $cedula = preg_replace('/\D/', '', (string) $cedula);
    if (strlen($cedula) > 9) {
        $cedula = substr($cedula, 0, 9);
    }
    $notas = '';
    $usuarioId = (int) $usuarioId;
    $abogadoCedula = abogado_cedula_para_cita();
    $clave = clave_cupo_dia($fecha);
    if ($clave === '') {
        $db->close();
        return 'invalida';
    }
    $db->begin_transaction();
    $ajeno = cupo_dia_ajeno($db, $fecha, 0);
    if ($ajeno === null) {
        $db->rollback();
        $db->close();
        return 'error';
    }
    if ($ajeno) {
        $db->rollback();
        $db->close();
        return 'ocupada';
    }
    $conAbogado = $abogadoCedula !== '' && asegurar_abogado_cita($db);
    $ins = $conAbogado
        ? $db->prepare(
            'INSERT INTO Consulta_Asesoria (fecha, hora, cedula, persona, correo, motivo, notas, usuario_id, modalidad, cupo_activo, abogado_cedula) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        )
        : $db->prepare(
            'INSERT INTO Consulta_Asesoria (fecha, hora, cedula, persona, correo, motivo, notas, usuario_id, modalidad, cupo_activo) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        );
    if (!$ins) {
        $db->rollback();
        $db->close();
        return 'error';
    }
    if ($conAbogado) {
        $ins->bind_param('sssssssisss', $fecha, $hora, $cedula, $persona, $correo, $motivo, $notas, $usuarioId, $modalidad, $clave, $abogadoCedula);
    } else {
        $ins->bind_param('sssssssiss', $fecha, $hora, $cedula, $persona, $correo, $motivo, $notas, $usuarioId, $modalidad, $clave);
    }
    $guardo = $ins->execute();
    $nuevoId = $guardo ? (int) $db->insert_id : 0;
    $duplicado = !$guardo && ((int) $ins->errno === 1062 || (int) $db->errno === 1062);
    $ins->close();
    if (!$guardo || $nuevoId < 1) {
        $db->rollback();
        $db->close();
        $nuevoId = 0;
        return $duplicado ? 'ocupada' : 'error';
    }
    if (!$db->commit()) {
        $db->rollback();
        $db->close();
        $nuevoId = 0;
        return 'error';
    }
    $db->close();
    return 'ok';
}

/* Suelta el horario y conserva la fecha, la hora y el resto del registro. */
function liberar_cupo_cita($id) {
    $id = (int) $id;
    if ($id < 1) {
        return false;
    }
    $db = abrir_consultas();
    if (!$db) {
        return false;
    }
    if (!asegurar_cupo_cita($db)) {
        $db->close();
        return false;
    }
    $up = $db->prepare('UPDATE Consulta_Asesoria SET cupo_activo = NULL WHERE id = ? LIMIT 1');
    if (!$up) {
        $db->close();
        return false;
    }
    $ok = $up->execute();
    $up->close();
    $db->close();
    return $ok;
}

function cita_horario_por_id($mysqli, $id) {
    $id = (int) $id;
    if ($id < 1 || !$mysqli || !asegurar_cupo_cita($mysqli) || !asegurar_cancelado_cita($mysqli)) {
        return null;
    }
    $fecha = null;
    $hora = null;
    $cancelado = null;
    $cupo = null;
    $consulta = $mysqli->prepare('SELECT fecha, hora, cancelado_en, cupo_activo FROM Consulta_Asesoria WHERE id = ? LIMIT 1');
    if (!$consulta) {
        return null;
    }
    $consulta->bind_param('i', $id);
    $consulta->execute();
    $consulta->bind_result($fecha, $hora, $cancelado, $cupo);
    $hay = $consulta->fetch();
    $consulta->close();
    if (!$hay) {
        return null;
    }
    return [
        'fecha' => $fecha === null ? '' : (string) $fecha,
        'hora' => $hora === null ? '' : (string) $hora,
        'cancelado_en' => $cancelado === null ? '' : (string) $cancelado,
        'cupo_activo' => $cupo === null ? '' : (string) $cupo,
    ];
}

function soltar_horario_cita($id, $fechaPrevia, $horaPrevia) {
    $id = (int) $id;
    if ($id < 1) {
        return;
    }
    $db = abrir_consultas();
    if (!$db) {
        return;
    }
    if ($fechaPrevia === '' && $horaPrevia === '') {
        $up = $db->prepare('UPDATE Consulta_Asesoria SET fecha = NULL, hora = NULL, cupo_activo = NULL WHERE id = ? LIMIT 1');
        if ($up) {
            $up->bind_param('i', $id);
            $up->execute();
            $up->close();
        }
    } else {
        $up = $db->prepare('UPDATE Consulta_Asesoria SET fecha = ?, hora = ?, cupo_activo = NULL WHERE id = ? LIMIT 1');
        if ($up) {
            $up->bind_param('ssi', $fechaPrevia, $horaPrevia, $id);
            $up->execute();
            $up->close();
        }
    }
    $db->close();
}

function hora_libre_en_fecha($fecha, $preferida = '') {
    $datos = listar_cupos_asignacion();
    if (!$datos || !in_array($fecha, $datos['fechas'], true)) {
        return '';
    }
    $ocupados = array_fill_keys($datos['ocupados'], true);
    if (!empty($ocupados[$fecha])) {
        return '';
    }
    $preferida = trim((string) $preferida);
    if ($preferida !== '' && in_array($preferida, $datos['horas'], true)) {
        return $preferida;
    }
    return $datos['horas'][0] ?? '';
}

/* Actualiza comentarios de una cita (mantiene fecha/hora/correo). */
function actualizar_cita($mysqli, $id, $fecha, $hora, $persona = '', $motivo = '', $notas = '', $correo = null) {
    $id = (int) $id;
    if ($id < 1) {
        return false;
    }
    $persona = recortar_cita($persona, 120);
    $motivo = recortar_cita($motivo, 800);
    $notas = recortar_cita($notas, 800);
    if ($correo !== null) {
        $correo = strtolower(recortar_cita($correo, 120));
        $consulta = $mysqli->prepare('UPDATE Consulta_Asesoria SET fecha = ?, hora = ?, persona = ?, correo = ?, motivo = ?, notas = ? WHERE id = ? LIMIT 1');
        if ($consulta) {
            $consulta->bind_param('ssssssi', $fecha, $hora, $persona, $correo, $motivo, $notas, $id);
            $ok = $consulta->execute();
            $consulta->close();
            return $ok;
        }
    }
    $consulta = $mysqli->prepare('UPDATE Consulta_Asesoria SET fecha = ?, hora = ?, persona = ?, motivo = ?, notas = ? WHERE id = ? LIMIT 1');
    if (!$consulta) {
        return false;
    }
    $consulta->bind_param('sssssi', $fecha, $hora, $persona, $motivo, $notas, $id);
    $ok = $consulta->execute();
    $consulta->close();
    return $ok;
}

/* Obtiene una cita por id. */
function cita_por_id($mysqli, $id) {
    $id = (int) $id;
    if ($id < 1) {
        return null;
    }
    foreach (leer_citas($mysqli) as $cita) {
        if ((int) $cita['id'] === $id) {
            return $cita;
        }
    }
    return null;
}

/* Envía la respuesta del admin: de sitraina@ina.ac.cr al correo de la persona. */
function enviar_respuesta_cita($correo, $persona, $fecha, $hora, $mensaje) {
    $correo = strtolower(trim((string) $correo));
    $mensaje = trim((string) $mensaje);
    if ($correo === '' || $mensaje === '') {
        return false;
    }
    if (!preg_match('/^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9\-]+(?:\.[a-zA-Z0-9\-]+)*\.[a-zA-Z]{2,}$/', $correo)) {
        return false;
    }
    require_once __DIR__ . '/correo_smtp.php';
    $persona = trim((string) $persona);
    $asunto = 'Respuesta a su solicitud de cita - SITRAINA';
    $cuerpo = "Hola" . ($persona !== '' ? (' ' . $persona) : '') . ",\n\n";
    $cuerpo .= "Le escribimos desde SITRAINA sobre su solicitud de cita";
    if ($fecha !== '' && $hora !== '') {
        $cuerpo .= " del $fecha a las $hora";
    }
    $cuerpo .= ".\n\n";
    $cuerpo .= $mensaje . "\n\n";
    $cuerpo .= "— Administración SITRAINA\n";
    return enviar_correo_sitraina_con_respaldo($correo, $persona, $asunto, $cuerpo);
}

/* Borra una cita por id. */
function borrar_cita_id($mysqli, $id) {
    $id = (int) $id;
    if ($id < 1) {
        return false;
    }
    $consulta = $mysqli->prepare('DELETE FROM Consulta_Asesoria WHERE id = ? LIMIT 1');
    if (!$consulta) {
        return false;
    }
    $consulta->bind_param('i', $id);
    $ok = $consulta->execute();
    $consulta->close();
    return $ok;
}

/* Borra una reserva si el correo de confirmación no se pudo enviar. */
function liberar_cita($mysqli, $fecha, $hora) {
    $consulta = $mysqli->prepare('DELETE FROM Consulta_Asesoria WHERE fecha = ? AND hora = ? LIMIT 1');
    if (!$consulta) {
        return;
    }
    $consulta->bind_param('ss', $fecha, $hora);
    $consulta->execute();
    $consulta->close();
}

/* Comprueba que la fecha y la hora sigan abiertas, en hora de Costa Rica. */
function cita_permitida($fecha, $hora, $reglas) {
    if (!is_array($reglas)) {
        $reglas = ['fechas' => [], 'meses' => [], 'horas' => []];
    }
    if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $fecha) || !preg_match('/^\d{2}:\d{2}$/', $hora)) {
        return false;
    }
    $zona = new DateTimeZone('America/Costa_Rica');
    $dia = DateTime::createFromFormat('!Y-m-d', $fecha, $zona);
    $momento = DateTime::createFromFormat('!Y-m-d H:i', $fecha . ' ' . $hora, $zona);
    if (!$dia || !$momento) {
        return false;
    }
    $hoy = new DateTime('today', $zona);
    if ($dia < $hoy || $momento <= new DateTime('now', $zona)) {
        return false;
    }

    $mes = substr($fecha, 0, 7);
    $reglaDia = $reglas['fechas'][$fecha] ?? '';
    $reglaMes = $reglas['meses'][$mes] ?? '';
    $finDeSemana = in_array((int) $dia->format('w'), [0, 6], true);
    $limite = (clone $hoy)->modify('+3 months');

    $hayMeses = false;
    foreach ($reglas['meses'] as $estadoMes) {
        if ($estadoMes === 'abierta') {
            $hayMeses = true;
            break;
        }
    }
    if ($reglaDia === 'bloqueada' || $reglaDia === 'ocupada') {
        return false;
    }
    if ($reglaDia !== 'abierta') {
        if ($reglaMes === 'bloqueada' || $hayMeses) {
            return false;
        }
        if ($finDeSemana || $dia > $limite) {
            return false;
        }
    }

    $abiertas = [];
    foreach ($reglas['horas'] as $claveHora => $estadoHora) {
        if ($estadoHora === 'abierta' && !partir_hora_excepcion($claveHora)) {
            $abiertas[] = $claveHora;
        }
    }
    if ($abiertas) {
        return in_array($hora, $abiertas, true);
    }
    $base = ['07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00'];
    if (($reglas['horas'][$hora] ?? '') === 'bloqueada') {
        return false;
    }
    return in_array($hora, $base, true);
}
