<?php
/* Entrega al calendario público los meses, días, horas y citas guardadas. */
require __DIR__ . '/disponibilidad.php';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

$vacio = ['fechas' => new stdClass(), 'meses' => new stdClass(), 'horas' => new stdClass()];
$mysqli = abrir_agenda();
if (!$mysqli) {
    echo json_encode($vacio);
    exit;
}
$reglas = leer_agenda($mysqli);
$citas = [];
if (is_array($reglas)) {
    foreach (leer_citas($mysqli) as $cita) {
        $citas[$cita['fecha']][] = $cita['hora'];
    }
}
$mysqli->close();
if (!is_array($reglas)) {
    echo json_encode($vacio);
    exit;
}

echo json_encode([
    'fechas' => $reglas['fechas'] ?: new stdClass(),
    'meses' => $reglas['meses'] ?: new stdClass(),
    'horas' => $reglas['horas'] ?: new stdClass(),
    'citas' => $citas ?: new stdClass(),
]);
