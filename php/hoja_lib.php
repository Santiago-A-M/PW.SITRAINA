<?php
/* Catálogo de la Hoja del Miércoles: lectura y escritura del JSON. */

function hoja_ruta_json() {
    return dirname(__DIR__) . '/hojamier/volumenes.json';
}

function hoja_ruta_videos() {
    return dirname(__DIR__) . '/hojamier/Videos';
}

function hoja_responder($codigo, $datos) {
    http_response_code($codigo);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    echo json_encode($datos, JSON_UNESCAPED_UNICODE);
    exit;
}

function hoja_leer_volumenes() {
    $ruta = hoja_ruta_json();
    if (!is_file($ruta)) {
        return [];
    }
    $raw = file_get_contents($ruta);
    if ($raw === false || trim($raw) === '') {
        return [];
    }
    $datos = json_decode($raw, true);
    if (!is_array($datos)) {
        return null;
    }
    $salida = [];
    foreach ($datos as $item) {
        if (!is_array($item)) {
            continue;
        }
        $titulo = trim((string) ($item['titulo'] ?? ''));
        $src = trim((string) ($item['src'] ?? ''));
        if ($titulo === '' || $src === '') {
            continue;
        }
        $salida[] = [
            'id' => trim((string) ($item['id'] ?? '')),
            'titulo' => $titulo,
            'desc' => trim((string) ($item['desc'] ?? '')),
            'src' => $src,
            'pdf' => trim((string) ($item['pdf'] ?? '')),
            'pdf_nombre' => trim((string) ($item['pdf_nombre'] ?? '')),
            'origen' => ((string) ($item['origen'] ?? '') === 'admin') ? 'admin' : 'base',
            'creado_en' => trim((string) ($item['creado_en'] ?? '')),
        ];
    }
    return $salida;
}

function hoja_guardar_volumenes($lista) {
    if (!is_array($lista)) {
        return false;
    }
    $ruta = hoja_ruta_json();
    $dir = dirname($ruta);
    if (!is_dir($dir) && !mkdir($dir, 0755, true)) {
        return false;
    }
    $json = json_encode(array_values($lista), JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    if ($json === false) {
        return false;
    }
    $tmp = $ruta . '.tmp';
    if (file_put_contents($tmp, $json . "\n", LOCK_EX) === false) {
        return false;
    }
    return rename($tmp, $ruta);
}

function hoja_limpiar_titulo($titulo) {
    $titulo = trim(preg_replace('/\s+/', ' ', (string) $titulo));
    if (function_exists('mb_substr')) {
        return mb_substr($titulo, 0, 80, 'UTF-8');
    }
    return substr($titulo, 0, 80);
}

function hoja_limpiar_desc($desc) {
    $desc = trim(preg_replace('/\s+/', ' ', (string) $desc));
    if (function_exists('mb_substr')) {
        return mb_substr($desc, 0, 280, 'UTF-8');
    }
    return substr($desc, 0, 280);
}

function hoja_nombre_video_seguro($titulo) {
    $base = preg_replace('/[^a-zA-Z0-9_-]+/', '-', (string) $titulo);
    $base = trim($base, '-');
    if ($base === '') {
        $base = 'volumen';
    }
    if (function_exists('mb_substr')) {
        $base = mb_substr($base, 0, 40, 'UTF-8');
    } else {
        $base = substr($base, 0, 40);
    }
    return 'Hojadelmiercoles-' . $base . '-' . date('d-m-Y') . '-' . bin2hex(random_bytes(3)) . '.mp4';
}
