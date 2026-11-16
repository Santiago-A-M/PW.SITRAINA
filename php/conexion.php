<?php
/* Conexiones: Info_Afiliados, Info_Consultas, Info_Cuentas_Admins y Usuarios_Web. */

function abrir_mysql_desde($archivo) {
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
    /* Costa Rica no cambia el reloj. InfinityFree suele estar en UTC y TIMESTAMP se muestra en esa zona. */
    $mysqli->query("SET time_zone = '-06:00'");
    return $mysqli;
}

/* Info_Cuentas_Admins: Admin_Info + Agenda. */
function abrir_admin() {
    return abrir_mysql_desde(dirname(__DIR__) . '/admin/config.php');
}

/* Info_Consultas: Consulta_Contacto, Consulta_Afiliacion, Consulta_Asesoria. */
function abrir_consultas() {
    return abrir_mysql_desde(__DIR__ . '/config.php');
}

/* Alias de compatibilidad. */
function abrir_usuarios() {
    return abrir_consultas();
}

/* Info_Afiliados: tabla Cuenta (alta y baja solo desde el panel). */
function abrir_afiliados() {
    return abrir_mysql_desde(__DIR__ . '/config_afiliados.php');
}

/* Usuarios_Web: cuentas de ingreso (Usuario_Web). */
function abrir_cuentas_web() {
    return abrir_mysql_desde(__DIR__ . '/config_usuarios.php');
}

function abrir_agenda() {
    return abrir_admin();
}
