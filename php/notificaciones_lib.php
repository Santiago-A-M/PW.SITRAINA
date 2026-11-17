<?php
/* Avisos calculados desde Consulta_* y Respuesta_*. Notificacion_Leida solo guarda la lectura. */

function notif_asegurar_tabla($db) {
    if (!$db) {
        return false;
    }
    static $lista = false;
    if ($lista) {
        return true;
    }
    $consulta = $db->query("SHOW TABLES LIKE 'Notificacion_Leida'");
    $hay = $consulta && $consulta->num_rows > 0;
    if ($consulta) {
        $consulta->free();
    }
    if (!$hay) {
        $hay = (bool) $db->query(
            "CREATE TABLE IF NOT EXISTS Notificacion_Leida (
                id INT UNSIGNED NOT NULL AUTO_INCREMENT,
                audiencia ENUM('admin','abogado','usuario') NOT NULL,
                cuenta VARCHAR(120) NOT NULL,
                tipo VARCHAR(32) NOT NULL,
                origen_id INT UNSIGNED NOT NULL,
                marca VARCHAR(80) NOT NULL,
                leido_en DATETIME NOT NULL,
                PRIMARY KEY (id),
                UNIQUE KEY uk_notificacion_leida (audiencia, cuenta, tipo, origen_id, marca),
                KEY idx_notificacion_leida_quien (audiencia, cuenta, leido_en)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
        );
    }
    $lista = $hay;
    return $hay;
}

function notif_marca_valida($marca) {
    return is_string($marca) && preg_match('/^[a-z0-9][a-z0-9:T._-]{0,79}$/', $marca) === 1;
}

function notif_tipo_valido($tipo) {
    return in_array($tipo, ['contacto', 'afilacion', 'cita'], true);
}

function notif_recorte($texto, $maximo) {
    $texto = trim(preg_replace('/\s+/', ' ', (string) $texto));
    if (function_exists('mb_substr')) {
        return mb_substr($texto, 0, $maximo, 'UTF-8');
    }
    return substr($texto, 0, $maximo);
}

function notif_momento($fecha) {
    $fecha = trim((string) $fecha);
    if (!preg_match('/^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2})/', $fecha, $partes)) {
        return '';
    }
    return $partes[1] . 'T' . $partes[2];
}

function notif_reciente($fecha) {
    $momento = notif_momento($fecha);
    if ($momento === '') {
        $dia = substr(trim((string) $fecha), 0, 10);
        if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $dia)) {
            return false;
        }
        $momento = $dia . 'T00:00';
    }
    $cuando = DateTime::createFromFormat('Y-m-d\TH:i', $momento, new DateTimeZone('America/Costa_Rica'));
    if (!$cuando) {
        return false;
    }
    $limite = new DateTime('now', new DateTimeZone('America/Costa_Rica'));
    $limite->modify('-21 days');
    return $cuando >= $limite;
}

function notif_clave($aviso) {
    return $aviso['tipo'] . ':' . $aviso['origen_id'] . ':' . $aviso['marca'];
}

function notif_filas($db, $sql) {
    $filas = [];
    $resultado = $db->query($sql);
    if (!$resultado) {
        return null;
    }
    while ($fila = $resultado->fetch_assoc()) {
        $filas[] = $fila;
    }
    $resultado->free();
    return $filas;
}

function notif_respuestas_de($dbResp, $tipo, $ids) {
    $tabla = function_exists('tabla_respuesta_por_tipo') ? tabla_respuesta_por_tipo($tipo) : null;
    $ids = array_values(array_unique(array_filter(array_map('intval', (array) $ids))));
    if (!$dbResp || $tabla === null || !$ids) {
        return [];
    }
    $lista = implode(',', $ids);
    $conEditado = function_exists('respuestas_tiene_editado') && respuestas_tiene_editado($dbResp, $tabla);
    $sql = $conEditado
        ? 'SELECT origen_id, estado, respondido_en, editado, admin_usuario FROM `' . $tabla . '` WHERE origen_id IN (' . $lista . ')'
        : 'SELECT origen_id, estado, respondido_en, 0 AS editado, admin_usuario FROM `' . $tabla . '` WHERE origen_id IN (' . $lista . ')';
    $filas = notif_filas($dbResp, $sql);
    if ($filas === null) {
        $sql = $conEditado
            ? 'SELECT origen_id, estado, respondido_en, editado FROM `' . $tabla . '` WHERE origen_id IN (' . $lista . ')'
            : 'SELECT origen_id, estado, respondido_en, 0 AS editado FROM `' . $tabla . '` WHERE origen_id IN (' . $lista . ')';
        $filas = notif_filas($dbResp, $sql);
    }
    $mapa = [];
    foreach ((array) $filas as $fila) {
        $mapa[(int) $fila['origen_id']] = $fila;
    }
    return $mapa;
}

function notif_aviso($tipo, $id, $marca, $titulo, $texto, $cuando) {
    return [
        'tipo' => $tipo,
        'origen_id' => (int) $id,
        'marca' => $marca,
        'titulo' => notif_recorte($titulo, 40),
        'texto' => notif_recorte($texto, 160),
        'cuando' => notif_momento($cuando) !== '' ? str_replace('T', ' ', notif_momento($cuando)) : substr(trim((string) $cuando), 0, 16),
    ];
}

function notif_estado_texto($estado) {
    if ($estado === 'aceptada') {
        return 'aceptada';
    }
    if ($estado === 'rechazada') {
        return 'rechazada';
    }
    if ($estado === 'neutral') {
        return 'respondida';
    }
    return 'actualizada';
}

function notif_titulo_evento($tipo, $evento, $estado = '') {
    if ($evento === 'nuevo') {
        if ($tipo === 'cita') {
            return 'Nueva cita';
        }
        if ($tipo === 'afilacion') {
            return 'Nueva afiliación';
        }
        return 'Nueva consulta';
    }
    if ($evento === 'cancelado') {
        return 'Cita cancelada';
    }
    if ($evento === 'horario') {
        return 'Cita programada';
    }
    $palabra = 'actualizada';
    if ($estado === 'aceptada') {
        $palabra = $tipo === 'cita' ? 'aprobada' : 'aceptada';
    } elseif ($estado === 'rechazada') {
        $palabra = 'rechazada';
    } elseif ($estado === 'neutral') {
        $palabra = 'respondida';
    }
    if ($tipo === 'cita') {
        return 'Cita ' . $palabra;
    }
    if ($tipo === 'afilacion') {
        return 'Afiliación ' . $palabra;
    }
    return 'Consulta ' . $palabra;
}

function notif_citas_breves($db) {
    if (function_exists('asegurar_cancelado_cita')) {
        asegurar_cancelado_cita($db);
    }
    if (function_exists('asegurar_abogado_cita')) {
        asegurar_abogado_cita($db);
    }
    $filas = notif_filas(
        $db,
        'SELECT id, persona, fecha, hora, creado_en, cancelado_en, abogado_cedula, usuario_id FROM Consulta_Asesoria ORDER BY id DESC LIMIT 80'
    );
    if ($filas !== null) {
        return $filas;
    }
    return notif_filas(
        $db,
        'SELECT id, persona, fecha, hora, creado_en, usuario_id FROM Consulta_Asesoria ORDER BY id DESC LIMIT 80'
    );
}

function notif_cita_del_abogado($fila, $cedula) {
    $cedula = preg_replace('/\D/', '', (string) $cedula);
    $dueno = preg_replace('/\D/', '', (string) ($fila['abogado_cedula'] ?? ''));
    if ($dueno !== '') {
        return $cedula !== '' && $dueno === $cedula;
    }
    if (!function_exists('legales_abogados_activos')) {
        return false;
    }
    $activos = legales_abogados_activos();
    if (count($activos) !== 1) {
        return false;
    }
    $unica = preg_replace('/\D/', '', (string) ($activos[0]['cedula'] ?? ''));
    return $cedula !== '' && $unica === $cedula;
}

function notif_armar_eventos($audiencia, $cedulaAbogado, $usuarioId) {
    if (!function_exists('abrir_consultas') || !function_exists('abrir_respuestas')) {
        return null;
    }
    $db = abrir_consultas();
    $dbResp = abrir_respuestas();
    if (!$db || !$dbResp) {
        if ($db) {
            $db->close();
        }
        if ($dbResp) {
            $dbResp->close();
        }
        return null;
    }
    $avisos = [];
    $tipos = $audiencia === 'abogado' ? ['cita'] : ['contacto', 'afilacion', 'cita'];
    if ($audiencia !== 'abogado') {
        $contactos = notif_filas($db, 'SELECT id, nombre, asunto, creado_en, usuario_id FROM Consulta_Contacto ORDER BY id DESC LIMIT 60');
        if ($contactos === null) {
            $contactos = notif_filas($db, 'SELECT id, nombre, asunto, creado_en FROM Consulta_Contacto ORDER BY id DESC LIMIT 60');
        }
        $afiliaciones = notif_filas($db, 'SELECT id, nombre, creado_en, usuario_id FROM Consulta_Afiliacion ORDER BY id DESC LIMIT 60');
        if ($afiliaciones === null) {
            $afiliaciones = notif_filas($db, 'SELECT id, nombre, creado_en FROM Consulta_Afiliacion ORDER BY id DESC LIMIT 60');
        }
        if ($contactos === null || $afiliaciones === null) {
            $db->close();
            $dbResp->close();
            return null;
        }
        $respContacto = notif_respuestas_de($dbResp, 'contacto', array_column($contactos, 'id'));
        $respAfiliacion = notif_respuestas_de($dbResp, 'afilacion', array_column($afiliaciones, 'id'));
        foreach ($contactos as $fila) {
            $id = (int) $fila['id'];
            $nombre = trim((string) ($fila['nombre'] ?? '')) !== '' ? $fila['nombre'] : 'Sin nombre';
            $dueno = (int) ($fila['usuario_id'] ?? 0);
            if ($audiencia === 'admin' && notif_reciente($fila['creado_en'] ?? '')) {
                $avisos[] = notif_aviso('contacto', $id, 'nuevo', notif_titulo_evento('contacto', 'nuevo'), 'Nueva consulta de ' . $nombre, $fila['creado_en']);
            }
            $resp = $respContacto[$id] ?? null;
            if ($resp && $audiencia === 'usuario' && $dueno === $usuarioId && notif_reciente($resp['respondido_en'] ?? '')) {
                $estadoRaw = (string) ($resp['estado'] ?? '');
                $estado = notif_estado_texto($estadoRaw);
                $marca = 'estado:' . preg_replace('/[^a-z]/', '', $estadoRaw) . ':' . notif_momento($resp['respondido_en']) . ':' . ((int) ($resp['editado'] ?? 0));
                $avisos[] = notif_aviso('contacto', $id, $marca, notif_titulo_evento('contacto', 'estado', $estadoRaw), 'Tu consulta fue ' . $estado . '.', $resp['respondido_en']);
            }
        }
        foreach ($afiliaciones as $fila) {
            $id = (int) $fila['id'];
            $nombre = trim((string) ($fila['nombre'] ?? '')) !== '' ? $fila['nombre'] : 'Sin nombre';
            $dueno = (int) ($fila['usuario_id'] ?? 0);
            if ($audiencia === 'admin' && notif_reciente($fila['creado_en'] ?? '')) {
                $avisos[] = notif_aviso('afilacion', $id, 'nuevo', notif_titulo_evento('afilacion', 'nuevo'), 'Nueva afiliación de ' . $nombre, $fila['creado_en']);
            }
            $resp = $respAfiliacion[$id] ?? null;
            if ($resp && $audiencia === 'usuario' && $dueno === $usuarioId && notif_reciente($resp['respondido_en'] ?? '')) {
                $estadoRaw = (string) ($resp['estado'] ?? '');
                $estado = notif_estado_texto($estadoRaw);
                $marca = 'estado:' . preg_replace('/[^a-z]/', '', $estadoRaw) . ':' . notif_momento($resp['respondido_en']) . ':' . ((int) ($resp['editado'] ?? 0));
                $avisos[] = notif_aviso('afilacion', $id, $marca, notif_titulo_evento('afilacion', 'estado', $estadoRaw), 'Tu afiliación fue ' . $estado . '.', $resp['respondido_en']);
            }
        }
    }
    if (in_array('cita', $tipos, true)) {
        $citas = notif_citas_breves($db);
        if ($citas === null) {
            $db->close();
            $dbResp->close();
            return null;
        }
        if ($audiencia === 'abogado') {
            $citas = array_values(array_filter($citas, function ($fila) use ($cedulaAbogado) {
                return notif_cita_del_abogado($fila, $cedulaAbogado);
            }));
        }
        $respCita = notif_respuestas_de($dbResp, 'cita', array_column($citas, 'id'));
        foreach ($citas as $fila) {
            $id = (int) $fila['id'];
            $nombre = trim((string) ($fila['persona'] ?? '')) !== '' ? $fila['persona'] : 'Sin nombre';
            $dueno = (int) ($fila['usuario_id'] ?? 0);
            $fecha = trim((string) ($fila['fecha'] ?? ''));
            $hora = trim((string) ($fila['hora'] ?? ''));
            $cancelado = trim((string) ($fila['cancelado_en'] ?? ''));
            if (($audiencia === 'admin' || $audiencia === 'abogado') && notif_reciente($fila['creado_en'] ?? '')) {
                $avisos[] = notif_aviso('cita', $id, 'nuevo', notif_titulo_evento('cita', 'nuevo'), $nombre . ' hizo una consulta de cita con asesoría.', $fila['creado_en']);
            }
            $resp = $respCita[$id] ?? null;
            $respuestaAutomatica = $resp && trim((string) ($resp['admin_usuario'] ?? '')) === 'reserva-afiliado';
            if ($resp && notif_reciente($resp['respondido_en'] ?? '')) {
                $estadoRaw = (string) ($resp['estado'] ?? '');
                $estado = notif_estado_texto($estadoRaw);
                $marca = 'estado:' . preg_replace('/[^a-z]/', '', $estadoRaw) . ':' . notif_momento($resp['respondido_en']) . ':' . ((int) ($resp['editado'] ?? 0));
                $tituloCita = notif_titulo_evento('cita', 'estado', $estadoRaw);
                if ($audiencia === 'abogado' && !$respuestaAutomatica) {
                    $avisos[] = notif_aviso('cita', $id, $marca, $tituloCita, 'La cita de ' . $nombre . ' fue ' . $estado . '.', $resp['respondido_en']);
                }
                if ($audiencia === 'usuario' && $dueno === $usuarioId) {
                    $avisos[] = notif_aviso('cita', $id, $marca, $tituloCita, 'Tu cita fue ' . $estado . '.', $resp['respondido_en']);
                }
            }
            if ($cancelado !== '' && notif_reciente($cancelado) && ($audiencia === 'admin' || $audiencia === 'abogado')) {
                $avisos[] = notif_aviso('cita', $id, 'cancelado:' . notif_momento($cancelado), notif_titulo_evento('cita', 'cancelado'), 'Se canceló la cita de ' . $nombre . '.', $cancelado);
            }
            if ($cancelado !== '' && notif_reciente($cancelado) && $audiencia === 'usuario' && $dueno === $usuarioId) {
                $avisos[] = notif_aviso('cita', $id, 'cancelado:' . notif_momento($cancelado), notif_titulo_evento('cita', 'cancelado'), 'Tu cita fue cancelada.', $cancelado);
            }
            if ($fecha !== '' && $hora !== '' && $cancelado === '' && notif_reciente($fila['creado_en'] ?? '') && $audiencia === 'usuario' && $dueno === $usuarioId) {
                $horaCorta = substr($hora, 0, 5);
                $avisos[] = notif_aviso('cita', $id, 'horario:' . $fecha . 'T' . $horaCorta, notif_titulo_evento('cita', 'horario'), 'Tu cita quedó para el ' . $fecha . ' a las ' . $horaCorta . '.', $fila['creado_en']);
            }
        }
    }
    $db->close();
    $dbResp->close();
    if ($audiencia === 'usuario') {
        $avisos = array_values(array_filter($avisos, function ($aviso) {
            return strpos($aviso['marca'], 'estado:') === 0
                || strpos($aviso['marca'], 'cancelado:') === 0
                || strpos($aviso['marca'], 'horario:') === 0;
        }));
    }
    if ($audiencia === 'admin') {
        $avisos = array_values(array_filter($avisos, function ($aviso) {
            return strpos($aviso['marca'], 'estado:') !== 0;
        }));
    }
    return $avisos;
}

function notif_leidas($db, $audiencia, $cuenta) {
    $mapa = [];
    $consulta = $db->prepare(
        'SELECT tipo, origen_id, marca FROM Notificacion_Leida WHERE audiencia = ? AND cuenta = ? AND leido_en >= DATE_SUB(NOW(), INTERVAL 30 DAY)'
    );
    if (!$consulta) {
        return null;
    }
    $consulta->bind_param('ss', $audiencia, $cuenta);
    if (!$consulta->execute()) {
        $consulta->close();
        return null;
    }
    $tipo = '';
    $origen = 0;
    $marca = '';
    $consulta->bind_result($tipo, $origen, $marca);
    while ($consulta->fetch()) {
        $mapa[$tipo . ':' . (int) $origen . ':' . $marca] = true;
    }
    $consulta->close();
    return $mapa;
}

function notif_resumen($audiencia, $cuenta, $cedulaAbogado, $usuarioId) {
    $db = abrir_consultas();
    if (!$db || !notif_asegurar_tabla($db)) {
        if ($db) {
            $db->close();
        }
        return null;
    }
    $leidas = notif_leidas($db, $audiencia, $cuenta);
    $db->close();
    if ($leidas === null) {
        return null;
    }
    $avisos = notif_armar_eventos($audiencia, $cedulaAbogado, $usuarioId);
    if ($avisos === null) {
        return null;
    }
    usort($avisos, function ($a, $b) {
        $cmp = strcmp((string) $b['cuando'], (string) $a['cuando']);
        if ($cmp !== 0) {
            return $cmp;
        }
        return $b['origen_id'] - $a['origen_id'];
    });
    $claves = [];
    $salida = [];
    $noLeidas = 0;
    foreach ($avisos as $aviso) {
        $clave = notif_clave($aviso);
        if (isset($claves[$clave])) {
            continue;
        }
        $claves[$clave] = true;
        $leido = isset($leidas[$clave]);
        if (!$leido) {
            $noLeidas++;
        }
        $aviso['leido'] = $leido ? 1 : 0;
        $salida[] = $aviso;
    }
    $firmaBase = implode('|', array_keys($claves));
    if ($audiencia === 'admin') {
        $firmaBase .= '||' . notif_huella_admin();
    }
    return [
        'firma' => sha1($firmaBase),
        'no_leidas' => $noLeidas,
        'avisos' => $salida,
    ];
}

function notif_huella_admin() {
    $db = abrir_consultas();
    $dbResp = abrir_respuestas();
    if (!$db || !$dbResp) {
        if ($db) {
            $db->close();
        }
        if ($dbResp) {
            $dbResp->close();
        }
        return '';
    }
    $trozos = [];
    foreach (['Respuesta_Contacto', 'Respuesta_Afiliacion', 'Respuesta_Asesoria'] as $tabla) {
        $filas = notif_filas($dbResp, 'SELECT id, estado, respondido_en FROM ' . $tabla . ' ORDER BY id DESC LIMIT 40');
        if (!is_array($filas)) {
            continue;
        }
        foreach ($filas as $fila) {
            $trozos[] = $tabla . ':' . (int) $fila['id'] . ':' . ($fila['estado'] ?? '') . ':' . ($fila['respondido_en'] ?? '');
        }
    }
    $citas = notif_citas_breves($db);
    if (is_array($citas)) {
        foreach ($citas as $fila) {
            $trozos[] = 'cita:' . (int) $fila['id'] . ':' . ($fila['fecha'] ?? '') . ':' . substr((string) ($fila['hora'] ?? ''), 0, 5) . ':' . ($fila['cancelado_en'] ?? '');
        }
    }
    foreach (['Consulta_Contacto' => 'contacto', 'Consulta_Afiliacion' => 'afilacion'] as $tabla => $tipo) {
        $filas = notif_filas($db, 'SELECT id, creado_en FROM `' . $tabla . '` ORDER BY id DESC LIMIT 40');
        if (!is_array($filas)) {
            continue;
        }
        foreach ($filas as $fila) {
            $trozos[] = $tipo . ':' . (int) ($fila['id'] ?? 0) . ':' . ($fila['creado_en'] ?? '');
        }
    }
    $db->close();
    $dbResp->close();
    return implode('|', $trozos);
}

function notif_marcar($audiencia, $cuenta, $tipo, $origenId, $marca, $cedulaAbogado, $usuarioId) {
    if (!notif_tipo_valido($tipo) || $origenId < 1 || !notif_marca_valida($marca)) {
        return false;
    }
    $avisos = notif_armar_eventos($audiencia, $cedulaAbogado, $usuarioId);
    if ($avisos === null) {
        return null;
    }
    $permitido = false;
    foreach ($avisos as $aviso) {
        if ($aviso['tipo'] === $tipo && (int) $aviso['origen_id'] === $origenId && $aviso['marca'] === $marca) {
            $permitido = true;
            break;
        }
    }
    if (!$permitido) {
        return false;
    }
    $db = abrir_consultas();
    if (!$db || !notif_asegurar_tabla($db)) {
        if ($db) {
            $db->close();
        }
        return null;
    }
    $consulta = $db->prepare(
        'INSERT IGNORE INTO Notificacion_Leida (audiencia, cuenta, tipo, origen_id, marca, leido_en) VALUES (?, ?, ?, ?, ?, NOW())'
    );
    if (!$consulta) {
        $db->close();
        return null;
    }
    $consulta->bind_param('sssis', $audiencia, $cuenta, $tipo, $origenId, $marca);
    $ok = $consulta->execute();
    $consulta->close();
    $db->close();
    return $ok ? true : null;
}

function notif_marcar_todas($audiencia, $cuenta, $cedulaAbogado, $usuarioId) {
    $resumen = notif_resumen($audiencia, $cuenta, $cedulaAbogado, $usuarioId);
    if ($resumen === null) {
        return null;
    }
    $db = abrir_consultas();
    if (!$db || !notif_asegurar_tabla($db)) {
        if ($db) {
            $db->close();
        }
        return null;
    }
    $consulta = $db->prepare(
        'INSERT IGNORE INTO Notificacion_Leida (audiencia, cuenta, tipo, origen_id, marca, leido_en) VALUES (?, ?, ?, ?, ?, NOW())'
    );
    if (!$consulta) {
        $db->close();
        return null;
    }
    foreach ($resumen['avisos'] as $aviso) {
        if (!empty($aviso['leido'])) {
            continue;
        }
        $tipo = $aviso['tipo'];
        $origenId = (int) $aviso['origen_id'];
        $marca = $aviso['marca'];
        $consulta->bind_param('sssis', $audiencia, $cuenta, $tipo, $origenId, $marca);
        if (!$consulta->execute()) {
            $consulta->close();
            $db->close();
            return null;
        }
    }
    $consulta->close();
    $db->close();
    return true;
}
