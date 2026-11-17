<?php
/* Catálogo de Documentación: lectura/escritura JSON por categoría. */

require_once __DIR__ . '/hoja_lib.php';

function docs_categorias() {
    return [
        'efemerides' => 'Efemérides',
        'hoja' => 'Hoja del Miércoles',
        'convenios' => 'Convenios',
        'legales' => 'Documentos legales',
        'informes' => 'Informes de labores',
        'actas' => 'Actas de asamblea',
    ];
}

function docs_es_categoria($categoria) {
    return array_key_exists($categoria, docs_categorias());
}

function docs_ruta_catalogo($categoria) {
    return dirname(__DIR__) . '/documentos/catalogo/' . $categoria . '.json';
}

function docs_responder($codigo, $datos) {
    hoja_responder($codigo, $datos);
}

function docs_leer_json($ruta) {
    if (!is_file($ruta)) {
        return [];
    }
    $raw = file_get_contents($ruta);
    if ($raw === false || trim($raw) === '') {
        return [];
    }
    $datos = json_decode($raw, true);
    return is_array($datos) ? $datos : null;
}

function docs_guardar_json($ruta, $lista) {
    if (!is_array($lista)) {
        return false;
    }
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

function docs_limpiar_texto($texto, $max) {
    $texto = trim(preg_replace('/\s+/', ' ', (string) $texto));
    if (function_exists('mb_substr')) {
        return mb_substr($texto, 0, $max, 'UTF-8');
    }
    return substr($texto, 0, $max);
}

function docs_id_nuevo($categoria) {
    return $categoria . '-admin-' . date('YmdHis') . '-' . bin2hex(random_bytes(3));
}

function docs_normalizar_archivo($item) {
    return [
        'id' => trim((string) ($item['id'] ?? '')),
        'titulo' => trim((string) ($item['titulo'] ?? '')),
        'desc' => trim((string) ($item['desc'] ?? '')),
        'archivo' => trim((string) ($item['archivo'] ?? '')),
        'origen' => ((string) ($item['origen'] ?? '') === 'admin') ? 'admin' : 'base',
        'creado_en' => trim((string) ($item['creado_en'] ?? '')),
    ];
}

function docs_normalizar_efemeride($item) {
    return [
        'id' => trim((string) ($item['id'] ?? '')),
        'fecha' => trim((string) ($item['fecha'] ?? '')),
        'titulo' => trim((string) ($item['titulo'] ?? '')),
        'texto' => trim((string) ($item['texto'] ?? '')),
        'media' => trim((string) ($item['media'] ?? '')),
        'origen' => ((string) ($item['origen'] ?? '') === 'admin') ? 'admin' : 'base',
        'creado_en' => trim((string) ($item['creado_en'] ?? '')),
    ];
}

function docs_normalizar_convenio($item) {
    $rubro = trim((string) ($item['rubro'] ?? 'salud'));
    if (!in_array($rubro, ['salud', 'educacion', 'turismo'], true)) {
        $rubro = 'salud';
    }
    return [
        'id' => trim((string) ($item['id'] ?? '')),
        'titulo' => trim((string) ($item['titulo'] ?? '')),
        'nota' => trim((string) ($item['nota'] ?? '')),
        'rubro' => $rubro,
        'imagen' => trim((string) ($item['imagen'] ?? '')),
        'origen' => ((string) ($item['origen'] ?? '') === 'admin') ? 'admin' : 'base',
        'creado_en' => trim((string) ($item['creado_en'] ?? '')),
    ];
}

function docs_leer_categoria($categoria) {
    if ($categoria === 'hoja') {
        $lista = hoja_leer_volumenes();
        if ($lista === null) {
            return null;
        }
        $salida = [];
        foreach ($lista as $item) {
            $salida[] = [
                'id' => $item['id'],
                'titulo' => $item['titulo'],
                'desc' => $item['desc'],
                'archivo' => $item['src'],
                'src' => $item['src'],
                'pdf' => $item['pdf'],
                'pdf_nombre' => $item['pdf_nombre'],
                'origen' => $item['origen'],
                'creado_en' => $item['creado_en'] ?? '',
            ];
        }
        return $salida;
    }

    $ruta = docs_ruta_catalogo($categoria);
    $datos = docs_leer_json($ruta);
    if ($datos === null) {
        return null;
    }
    $salida = [];
    foreach ($datos as $item) {
        if (!is_array($item)) {
            continue;
        }
        if ($categoria === 'efemerides') {
            $n = docs_normalizar_efemeride($item);
            if ($n['titulo'] === '') {
                continue;
            }
            $salida[] = $n;
        } elseif ($categoria === 'convenios') {
            $n = docs_normalizar_convenio($item);
            if ($n['titulo'] === '' || $n['imagen'] === '') {
                continue;
            }
            $salida[] = $n;
        } else {
            $n = docs_normalizar_archivo($item);
            if ($n['titulo'] === '' || $n['archivo'] === '') {
                continue;
            }
            $salida[] = $n;
        }
    }
    return $salida;
}

function docs_guardar_categoria($categoria, $lista) {
    if ($categoria === 'hoja') {
        $volumenes = [];
        foreach ($lista as $item) {
            $volumenes[] = [
                'id' => $item['id'],
                'titulo' => $item['titulo'],
                'desc' => $item['desc'] ?? '',
                'src' => $item['src'] ?? ($item['archivo'] ?? ''),
                'pdf' => $item['pdf'] ?? '',
                'pdf_nombre' => $item['pdf_nombre'] ?? '',
                'origen' => $item['origen'] ?? 'admin',
                'creado_en' => $item['creado_en'] ?? '',
            ];
        }
        return hoja_guardar_volumenes($volumenes);
    }
    return docs_guardar_json(docs_ruta_catalogo($categoria), $lista);
}

function docs_borrar_archivo_si_local($rutaRelativa, $prefijos) {
    $rutaRelativa = str_replace('\\', '/', trim((string) $rutaRelativa));
    if ($rutaRelativa === '') {
        return;
    }
    $ok = false;
    foreach ($prefijos as $prefijo) {
        if (strpos($rutaRelativa, $prefijo) === 0) {
            $ok = true;
            break;
        }
    }
    if (!$ok) {
        return;
    }
    if (strpos($rutaRelativa, '..') !== false) {
        return;
    }
    $archivo = dirname(__DIR__) . '/' . str_replace('/', DIRECTORY_SEPARATOR, $rutaRelativa);
    if (is_file($archivo)) {
        @unlink($archivo);
    }
}

function docs_recibir_upload($campo, $dirRelativo, $extensiones, $mimes, $maxMb, $obligatorio, $prefijoNombre) {
    if (empty($_FILES[$campo]) || !is_array($_FILES[$campo])) {
        if ($obligatorio) {
            docs_responder(400, ['ok' => false, 'mensaje' => 'Elegí el archivo.']);
        }
        return null;
    }
    $file = $_FILES[$campo];
    $error = (int) ($file['error'] ?? UPLOAD_ERR_NO_FILE);
    if ($error === UPLOAD_ERR_NO_FILE) {
        if ($obligatorio) {
            docs_responder(400, ['ok' => false, 'mensaje' => 'Elegí el archivo.']);
        }
        return null;
    }
    if ($error === UPLOAD_ERR_INI_SIZE || $error === UPLOAD_ERR_FORM_SIZE) {
        docs_responder(400, ['ok' => false, 'mensaje' => 'El archivo es demasiado pesado para subirlo desde aquí.']);
    }
    if ($error !== UPLOAD_ERR_OK) {
        docs_responder(400, ['ok' => false, 'mensaje' => 'No se pudo recibir el archivo. Intentá de nuevo.']);
    }

    $tmp = (string) ($file['tmp_name'] ?? '');
    $tamano = (int) ($file['size'] ?? 0);
    if ($tmp === '' || !is_uploaded_file($tmp) || $tamano < 1) {
        docs_responder(400, ['ok' => false, 'mensaje' => 'El archivo no es válido.']);
    }
    if ($tamano > $maxMb * 1024 * 1024) {
        docs_responder(400, ['ok' => false, 'mensaje' => 'El archivo no puede pasar de ' . $maxMb . ' MB.']);
    }

    $nombreOriginal = strtolower((string) ($file['name'] ?? ''));
    $ext = '';
    foreach ($extensiones as $e) {
        if (substr($nombreOriginal, -strlen($e)) === $e) {
            $ext = $e;
            break;
        }
    }
    $finfo = function_exists('finfo_open') ? finfo_open(FILEINFO_MIME_TYPE) : false;
    $mime = $finfo ? finfo_file($finfo, $tmp) : '';
    if ($finfo) {
        finfo_close($finfo);
    }
    $mimeOk = $mime === '' || in_array($mime, $mimes, true);
    if ($ext === '' || !$mimeOk) {
        docs_responder(400, ['ok' => false, 'mensaje' => 'El tipo de archivo no está permitido.']);
    }

    $dirAbs = dirname(__DIR__) . '/' . str_replace('/', DIRECTORY_SEPARATOR, $dirRelativo);
    if (!is_dir($dirAbs) && !mkdir($dirAbs, 0755, true)) {
        docs_responder(500, ['ok' => false, 'mensaje' => 'No se pudo preparar la carpeta de archivos.']);
    }

    $base = preg_replace('/[^a-zA-Z0-9_-]+/', '-', (string) $prefijoNombre);
    $base = trim($base, '-');
    if ($base === '') {
        $base = 'archivo';
    }
    if (function_exists('mb_substr')) {
        $base = mb_substr($base, 0, 40, 'UTF-8');
    } else {
        $base = substr($base, 0, 40);
    }
    $nombreArchivo = $base . '-' . date('Ymd-His') . '-' . bin2hex(random_bytes(3)) . $ext;
    $destino = $dirAbs . DIRECTORY_SEPARATOR . $nombreArchivo;
    if (!move_uploaded_file($tmp, $destino)) {
        docs_responder(500, ['ok' => false, 'mensaje' => 'No se pudo guardar el archivo.']);
    }
    return rtrim($dirRelativo, '/') . '/' . $nombreArchivo;
}
