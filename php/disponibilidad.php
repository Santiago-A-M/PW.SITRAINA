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

/* Lee las citas ya reservadas. Si la tabla no existe, devuelve una lista vacía. */
function leer_citas($mysqli) {
    $citas = [];
    $consulta = $mysqli->prepare('SELECT fecha, hora FROM citas ORDER BY fecha, hora');
    if (!$consulta) {
        return [];
    }
    $consulta->execute();
    $consulta->bind_result($fecha, $hora);
    while ($consulta->fetch()) {
        $citas[] = ['fecha' => $fecha, 'hora' => $hora];
    }
    $consulta->close();
    return $citas;
}

/* Reserva una hora. Devuelve true, false si ya estaba tomada, o null si no se pudo guardar. */
function reservar_cita($mysqli, $fecha, $hora) {
    $consulta = $mysqli->prepare('INSERT INTO citas (fecha, hora) VALUES (?, ?)');
    if (!$consulta) {
        return null;
    }
    $consulta->bind_param('ss', $fecha, $hora);
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
