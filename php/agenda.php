<?php
/* Entrega al calendario público los meses, días, horas (admin) y citas (usuarios). */
require __DIR__ . '/disponibilidad.php';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

$vacio = ['fechas' => new stdClass(), 'meses' => new stdClass(), 'horas' => new stdClass()];
$admin = abrir_admin();
if (!$admin) {
    echo json_encode($vacio);
    exit;
}
$reglas = leer_agenda($admin);
$admin->close();
if (!is_array($reglas)) {
    echo json_encode($vacio);
    exit;
}

$citas = [];
$usuarios = abrir_usuarios();
if ($usuarios) {
    foreach (leer_citas($usuarios) as $cita) {
        $citas[$cita['fecha']][] = $cita['hora'];
    }
    $usuarios->close();
}

echo json_encode([
    'fechas' => $reglas['fechas'] ?: new stdClass(),
    'meses' => $reglas['meses'] ?: new stdClass(),
    'horas' => $reglas['horas'] ?: new stdClass(),
    'citas' => $citas ?: new stdClass(),
]);
