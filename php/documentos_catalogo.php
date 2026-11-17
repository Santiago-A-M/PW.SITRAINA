<?php
/* Lectura pública del catálogo de Documentos. Solo GET. */
require __DIR__ . '/documentos_lib.php';

header('X-Robots-Tag: noindex, nofollow');
header('Cache-Control: no-store');

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    docs_responder(405, ['ok' => false, 'mensaje' => 'Método no permitido.']);
}

$categoria = trim((string) ($_GET['categoria'] ?? ''));
if ($categoria === '') {
    docs_responder(400, ['ok' => false, 'mensaje' => 'Indicá la categoría.']);
}
if (!docs_es_categoria($categoria)) {
    docs_responder(400, ['ok' => false, 'mensaje' => 'Categoría no válida.']);
}

$lista = docs_leer_categoria($categoria);
if ($lista === null) {
    docs_responder(500, ['ok' => false, 'mensaje' => 'No se pudo leer el catálogo.']);
}

$publicos = [];
foreach ($lista as $item) {
    if ($categoria === 'hoja') {
        $publicos[] = [
            'id' => $item['id'],
            'titulo' => $item['titulo'],
            'desc' => $item['desc'],
            'src' => $item['src'] ?? $item['archivo'],
            'pdf' => $item['pdf'] ?? '',
            'pdf_nombre' => $item['pdf_nombre'] ?? '',
        ];
    } elseif ($categoria === 'efemerides') {
        $publicos[] = [
            'id' => $item['id'],
            'fecha' => $item['fecha'],
            'titulo' => $item['titulo'],
            'texto' => $item['texto'],
            'media' => $item['media'],
        ];
    } elseif ($categoria === 'convenios') {
        $publicos[] = [
            'id' => $item['id'],
            'titulo' => $item['titulo'],
            'nota' => $item['nota'],
            'rubro' => $item['rubro'],
            'imagen' => $item['imagen'],
        ];
    } else {
        $publicos[] = [
            'id' => $item['id'],
            'titulo' => $item['titulo'],
            'desc' => $item['desc'],
            'archivo' => $item['archivo'],
        ];
    }
}

docs_responder(200, [
    'ok' => true,
    'categoria' => $categoria,
    'items' => $publicos,
]);
