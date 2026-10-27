<?php
/* BASE Info_Respuestas: Respuesta_Contacto / Respuesta_Afiliacion / Respuesta_Asesoria.
   Las consultas viven en Info_Consultas (php/config.php). */

function abrir_respuestas() {
    $candidatos = [
        dirname(__DIR__) . '/admin/config_respuestas.php',
        __DIR__ . '/config_respuestas.php',
    ];
    $archivo = null;
    foreach ($candidatos as $ruta) {
        if (is_file($ruta)) {
            $archivo = $ruta;
            break;
        }
    }
    if ($archivo === null) {
        return null;
    }
    $config = require $archivo;
    if (!is_array($config)) {
        return null;
    }
    mysqli_report(MYSQLI_REPORT_OFF);
    $mysqli = mysqli_init();
    if (!$mysqli) {
        return null;
    }
    $mysqli->options(MYSQLI_OPT_CONNECT_TIMEOUT, 5);
    try {
        $ok = $mysqli->real_connect($config['host'], $config['usuario'], $config['clave'], $config['nombre']);
    } catch (Throwable $e) {
        return null;
    }
    if (!$ok || $mysqli->connect_errno) {
        return null;
    }
    $mysqli->set_charset('utf8mb4');
    return $mysqli;
}

function tabla_respuesta_por_tipo($tipo) {
    if ($tipo === 'contacto') {
        return 'Respuesta_Contacto';
    }
    if ($tipo === 'afilacion') {
        return 'Respuesta_Afiliacion';
    }
    if ($tipo === 'cita') {
        return 'Respuesta_Asesoria';
    }
    return null;
}

/* Guarda una consulta de Contacto en Info_Consultas. */
function registrar_contacto_consulta($nombre, $correo, $asunto, $mensaje) {
    require_once __DIR__ . '/disponibilidad.php';
    $db = abrir_consultas();
    if (!$db) {
        return false;
    }
    $nombre = trim((string) $nombre);
    $correo = strtolower(trim((string) $correo));
    $asunto = trim((string) $asunto);
    $mensaje = trim((string) $mensaje);
    $consulta = $db->prepare(
        'INSERT INTO Consulta_Contacto (nombre, correo, asunto, mensaje) VALUES (?, ?, ?, ?)'
    );
    if (!$consulta) {
        $db->close();
        return false;
    }
    $consulta->bind_param('ssss', $nombre, $correo, $asunto, $mensaje);
    $ok = $consulta->execute();
    $consulta->close();
    $db->close();
    return $ok;
}

function registrar_contacto_respuesta($nombre, $correo, $asunto, $mensaje) {
    return registrar_contacto_consulta($nombre, $correo, $asunto, $mensaje);
}

function guardar_respuesta_enviada($tipo, $origenId, $estado, $respuesta, $adminUsuario) {
    $tabla = tabla_respuesta_por_tipo($tipo);
    if ($tabla === null) {
        return false;
    }
    $origenId = (int) $origenId;
    $estado = (string) $estado;
    $respuesta = trim((string) $respuesta);
    $adminUsuario = trim((string) $adminUsuario);
    if ($origenId < 1 || $respuesta === '' || !in_array($estado, ['aceptada', 'rechazada', 'neutral'], true)) {
        return false;
    }
    $db = abrir_respuestas();
    if (!$db) {
        return false;
    }
    $sql = 'INSERT INTO `' . $tabla . '` (origen_id, estado, respuesta, admin_usuario, respondido_en)
            VALUES (?, ?, ?, ?, NOW())
            ON DUPLICATE KEY UPDATE estado = VALUES(estado), respuesta = VALUES(respuesta),
              admin_usuario = VALUES(admin_usuario), respondido_en = NOW()';
    $consulta = $db->prepare($sql);
    if (!$consulta) {
        $db->close();
        return false;
    }
    $consulta->bind_param('isss', $origenId, $estado, $respuesta, $adminUsuario);
    $ok = $consulta->execute();
    $consulta->close();
    $db->close();
    return $ok;
}

function borrar_respuesta_enviada($tipo, $origenId) {
    $tabla = tabla_respuesta_por_tipo($tipo);
    if ($tabla === null) {
        return false;
    }
    $origenId = (int) $origenId;
    if ($origenId < 1) {
        return false;
    }
    $db = abrir_respuestas();
    if (!$db) {
        return false;
    }
    $consulta = $db->prepare('DELETE FROM `' . $tabla . '` WHERE origen_id = ? LIMIT 1');
    if (!$consulta) {
        $db->close();
        return false;
    }
    $consulta->bind_param('i', $origenId);
    $ok = $consulta->execute() && $consulta->affected_rows > 0;
    $consulta->close();
    $db->close();
    return $ok;
}

function mapa_respuestas_por_tipo($dbRespuestas, $tipo) {
    $mapa = [];
    $tabla = tabla_respuesta_por_tipo($tipo);
    if (!$dbRespuestas || $tabla === null) {
        return $mapa;
    }
    $consulta = $dbRespuestas->prepare(
        'SELECT origen_id, estado, respuesta, admin_usuario, respondido_en FROM `' . $tabla . '`'
    );
    if (!$consulta) {
        return $mapa;
    }
    $consulta->execute();
    /* get_result requiere mysqlnd; si no está, usamos bind_result (InfinityFree). */
    if (method_exists($consulta, 'get_result')) {
        $resultado = $consulta->get_result();
        if ($resultado) {
            while ($fila = $resultado->fetch_assoc()) {
                $mapa[(int) $fila['origen_id']] = $fila;
            }
            $resultado->free();
        }
    } else {
        $origenId = 0;
        $estado = '';
        $respuesta = '';
        $adminUsuario = '';
        $respondidoEn = '';
        $consulta->bind_result($origenId, $estado, $respuesta, $adminUsuario, $respondidoEn);
        while ($consulta->fetch()) {
            $mapa[(int) $origenId] = [
                'origen_id' => (int) $origenId,
                'estado' => (string) $estado,
                'respuesta' => (string) $respuesta,
                'admin_usuario' => (string) $adminUsuario,
                'respondido_en' => (string) $respondidoEn,
            ];
        }
    }
    $consulta->close();
    return $mapa;
}

function etiqueta_estado_respuesta($estado) {
    $mapa = [
        'pendiente' => 'Pendiente',
        'aceptada' => 'Aceptada',
        'rechazada' => 'Rechazada',
        'neutral' => 'Respondida',
    ];
    return $mapa[$estado] ?? $estado;
}
