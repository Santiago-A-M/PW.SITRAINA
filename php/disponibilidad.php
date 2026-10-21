<?php
/* Conexión y reglas de la agenda: qué días y horas se pueden reservar. */

/* Abre la base de administración. Si no hay config.php, devuelve null. */
function abrir_agenda() {
    $archivo = dirname(__DIR__) . '/admin/config.php';
    if (!is_file($archivo)) {
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
        $conectado = $mysqli->real_connect($config['host'], $config['usuario'], $config['clave'], $config['nombre']);
    } catch (Throwable $e) {
        return null;
    }
    if (!$conectado || $mysqli->connect_errno) {
        return null;
    }
    $mysqli->set_charset('utf8mb4');
    return $mysqli;
}

/* Lee meses, días y horas guardados y los separa por tipo. */
function leer_agenda($mysqli) {
    $reglas = ['fechas' => [], 'meses' => [], 'horas' => [], 'filas' => []];
    $consulta = $mysqli->prepare('SELECT tipo, valor, estado FROM agenda ORDER BY tipo, valor');
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
    $citas = [];
    $consulta = $mysqli->prepare('SELECT id, fecha, hora, persona, correo, motivo, notas FROM citas ORDER BY fecha, hora');
    if ($consulta) {
        $consulta->execute();
        $consulta->bind_result($id, $fecha, $hora, $persona, $correo, $motivo, $notas);
        while ($consulta->fetch()) {
            $citas[] = [
                'id' => (int) $id,
                'fecha' => $fecha,
                'hora' => $hora,
                'persona' => (string) $persona,
                'correo' => (string) $correo,
                'motivo' => (string) $motivo,
                'notas' => (string) $notas,
            ];
        }
        $consulta->close();
        return $citas;
    }
    $consulta = $mysqli->prepare('SELECT id, fecha, hora, persona, motivo, notas FROM citas ORDER BY fecha, hora');
    if ($consulta) {
        $consulta->execute();
        $consulta->bind_result($id, $fecha, $hora, $persona, $motivo, $notas);
        while ($consulta->fetch()) {
            $citas[] = [
                'id' => (int) $id,
                'fecha' => $fecha,
                'hora' => $hora,
                'persona' => (string) $persona,
                'correo' => '',
                'motivo' => (string) $motivo,
                'notas' => (string) $notas,
            ];
        }
        $consulta->close();
        return $citas;
    }
    /* Respaldo si aún no se agregaron las columnas de comentarios. */
    $consulta = $mysqli->prepare('SELECT id, fecha, hora FROM citas ORDER BY fecha, hora');
    if (!$consulta) {
        return [];
    }
    $consulta->execute();
    $consulta->bind_result($id, $fecha, $hora);
    while ($consulta->fetch()) {
        $citas[] = [
            'id' => (int) $id,
            'fecha' => $fecha,
            'hora' => $hora,
            'persona' => '',
            'correo' => '',
            'motivo' => '',
            'notas' => '',
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
function reservar_cita($mysqli, $fecha, $hora, $persona = '', $motivo = '', $notas = '', $correo = '') {
    $persona = recortar_cita($persona, 120);
    $motivo = recortar_cita($motivo, 800);
    $notas = recortar_cita($notas, 800);
    $correo = strtolower(recortar_cita($correo, 120));
    $consulta = $mysqli->prepare('INSERT INTO citas (fecha, hora, persona, correo, motivo, notas) VALUES (?, ?, ?, ?, ?, ?)');
    if ($consulta) {
        $consulta->bind_param('ssssss', $fecha, $hora, $persona, $correo, $motivo, $notas);
    } else {
        $consulta = $mysqli->prepare('INSERT INTO citas (fecha, hora, persona, motivo, notas) VALUES (?, ?, ?, ?, ?)');
        if ($consulta) {
            $consulta->bind_param('sssss', $fecha, $hora, $persona, $motivo, $notas);
        } else {
            $consulta = $mysqli->prepare('INSERT INTO citas (fecha, hora) VALUES (?, ?)');
            if (!$consulta) {
                return null;
            }
            $consulta->bind_param('ss', $fecha, $hora);
        }
    }
    $guardo = $consulta->execute();
    $duplicada = $consulta->errno === 1062;
    $consulta->close();
    if ($guardo) {
        return true;
    }
    if ($duplicada) {
        return false;
    }
    return null;
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
        $consulta = $mysqli->prepare('UPDATE citas SET fecha = ?, hora = ?, persona = ?, correo = ?, motivo = ?, notas = ? WHERE id = ? LIMIT 1');
        if ($consulta) {
            $consulta->bind_param('ssssssi', $fecha, $hora, $persona, $correo, $motivo, $notas, $id);
            $ok = $consulta->execute();
            $consulta->close();
            return $ok;
        }
    }
    $consulta = $mysqli->prepare('UPDATE citas SET fecha = ?, hora = ?, persona = ?, motivo = ?, notas = ? WHERE id = ? LIMIT 1');
    if (!$consulta) {
        $consulta = $mysqli->prepare('UPDATE citas SET fecha = ?, hora = ? WHERE id = ? LIMIT 1');
        if (!$consulta) {
            return false;
        }
        $consulta->bind_param('ssi', $fecha, $hora, $id);
    } else {
        $consulta->bind_param('sssssi', $fecha, $hora, $persona, $motivo, $notas, $id);
    }
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

    $raiz = dirname(__DIR__);
    $exception = $raiz . '/phpmailer/src/exception.php';
    $phpmailer = $raiz . '/phpmailer/src/phpmailer.php';
    $smtp = $raiz . '/phpmailer/src/smtp.php';
    if (!is_file($exception) || !is_file($phpmailer) || !is_file($smtp)) {
        return false;
    }
    require_once $exception;
    require_once $phpmailer;
    require_once $smtp;

    try {
        $mail = new \PHPMailer\PHPMailer\PHPMailer(true);
        $mail->isSMTP();
        $mail->Host = 'smtp.ina.ac.cr';
        $mail->SMTPAuth = true;
        $mail->Username = 'sitraina@ina.ac.cr';
        $mail->Password = 'Prueb@2026';
        $mail->SMTPSecure = \PHPMailer\PHPMailer\PHPMailer::ENCRYPTION_STARTTLS;
        $mail->Port = 587;
        $mail->CharSet = 'UTF-8';
        $mail->setFrom('sitraina@ina.ac.cr', 'SITRAINA');
        $mail->addAddress($correo, $persona !== '' ? $persona : $correo);
        $mail->addReplyTo('sitraina@ina.ac.cr', 'SITRAINA');
        $mail->isHTML(true);
        $mail->Subject = $asunto;
        $mail->Body = nl2br(htmlspecialchars($cuerpo, ENT_QUOTES, 'UTF-8'));
        $mail->AltBody = $cuerpo;
        $mail->send();
        return true;
    } catch (\Throwable $e) {
        return false;
    }
}

/* Borra una cita por id. */
function borrar_cita_id($mysqli, $id) {
    $id = (int) $id;
    if ($id < 1) {
        return false;
    }
    $consulta = $mysqli->prepare('DELETE FROM citas WHERE id = ? LIMIT 1');
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
    $consulta = $mysqli->prepare('DELETE FROM citas WHERE fecha = ? AND hora = ? LIMIT 1');
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
        if ($estadoHora === 'abierta') {
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
