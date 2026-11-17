<?php
/* Lista pública de volúmenes de la Hoja del Miércoles. */
require __DIR__ . '/hoja_lib.php';

header('X-Robots-Tag: noindex, nofollow');

$lista = hoja_leer_volumenes();
if ($lista === null) {
    hoja_responder(500, ['ok' => false, 'mensaje' => 'No se pudieron leer las ediciones.']);
}

$publicos = [];
foreach ($lista as $item) {
    $publicos[] = [
        'id' => $item['id'],
        'titulo' => $item['titulo'],
        'desc' => $item['desc'],
        'src' => $item['src'],
        'pdf' => $item['pdf'],
        'pdf_nombre' => $item['pdf_nombre'],
    ];
}

hoja_responder(200, ['ok' => true, 'volumenes' => $publicos]);
