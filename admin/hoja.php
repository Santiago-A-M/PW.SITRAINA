<?php
/* Administración de volúmenes de la Hoja del Miércoles. Solo rol admin. */
ob_start();
require __DIR__ . '/sesion.php';
require dirname(__DIR__) . '/php/hoja_lib.php';
ob_end_clean();

header('X-Robots-Tag: noindex, nofollow');
header('Cache-Control: no-store');

$rol = rol_personal_admin();
if ($rol !== 'admin') {
    hoja_responder(401, ['ok' => false, 'mensaje' => 'Entrá como administrador para continuar.']);
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $lista = hoja_leer_volumenes();
    if ($lista === null) {
        hoja_responder(500, ['ok' => false, 'mensaje' => 'No se pudieron leer las ediciones.']);
    }
    hoja_responder(200, ['ok' => true, 'volumenes' => $lista]);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    hoja_responder(405, ['ok' => false, 'mensaje' => 'Método no permitido.']);
}

$token = (string) ($_POST['token'] ?? '');
if (!hash_equals(token_admin(), $token)) {
    hoja_responder(403, ['ok' => false, 'mensaje' => 'Volvé a abrir el panel e intentá de nuevo.']);
}

$accion = (string) ($_POST['accion'] ?? '');
$lista = hoja_leer_volumenes();
if ($lista === null) {
    hoja_responder(500, ['ok' => false, 'mensaje' => 'No se pudieron leer las ediciones.']);
}

function hoja_borrar_video_si_local($src) {
    $src = trim((string) $src);
    if (strpos($src, 'hojamier/Videos/') !== 0) {
        return;
    }
    $archivo = dirname(__DIR__) . '/' . str_replace(['/', '\\'], DIRECTORY_SEPARATOR, $src);
    if (is_file($archivo)) {
        @unlink($archivo);
    }
}

function hoja_recibir_video_opcional($titulo, $obligatorio) {
    if (empty($_FILES['video']) || !is_array($_FILES['video'])) {
        if ($obligatorio) {
            hoja_responder(400, ['ok' => false, 'mensaje' => 'Elegí el video del volumen.']);
        }
        return null;
    }
    $video = $_FILES['video'];
    $error = (int) ($video['error'] ?? UPLOAD_ERR_NO_FILE);
    if ($error === UPLOAD_ERR_NO_FILE) {
        if ($obligatorio) {
            hoja_responder(400, ['ok' => false, 'mensaje' => 'Elegí el video del volumen.']);
        }
        return null;
    }
    if ($error === UPLOAD_ERR_INI_SIZE || $error === UPLOAD_ERR_FORM_SIZE) {
        hoja_responder(400, ['ok' => false, 'mensaje' => 'El video es demasiado pesado para subirlo desde aquí.']);
    }
    if ($error !== UPLOAD_ERR_OK) {
        hoja_responder(400, ['ok' => false, 'mensaje' => 'No se pudo recibir el video. Intentá de nuevo.']);
    }

    $tmp = (string) ($video['tmp_name'] ?? '');
    $tamano = (int) ($video['size'] ?? 0);
    if ($tmp === '' || !is_uploaded_file($tmp) || $tamano < 1) {
        hoja_responder(400, ['ok' => false, 'mensaje' => 'El archivo del video no es válido.']);
    }
    if ($tamano > 80 * 1024 * 1024) {
        hoja_responder(400, ['ok' => false, 'mensaje' => 'El video no puede pasar de 80 MB.']);
    }

    $finfo = function_exists('finfo_open') ? finfo_open(FILEINFO_MIME_TYPE) : false;
    $mime = $finfo ? finfo_file($finfo, $tmp) : '';
    if ($finfo) {
        finfo_close($finfo);
    }
    $nombreOriginal = strtolower((string) ($video['name'] ?? ''));
    $esMp4 = substr($nombreOriginal, -4) === '.mp4'
        || $mime === 'video/mp4'
        || $mime === 'application/mp4'
        || $mime === 'video/quicktime';
    if (!$esMp4) {
        hoja_responder(400, ['ok' => false, 'mensaje' => 'El video tiene que ser MP4.']);
    }

    $dirVideos = hoja_ruta_videos();
    if (!is_dir($dirVideos) && !mkdir($dirVideos, 0755, true)) {
        hoja_responder(500, ['ok' => false, 'mensaje' => 'No se pudo preparar la carpeta de videos.']);
    }

    $nombreArchivo = hoja_nombre_video_seguro($titulo);
    $destino = $dirVideos . DIRECTORY_SEPARATOR . $nombreArchivo;
    if (!move_uploaded_file($tmp, $destino)) {
        hoja_responder(500, ['ok' => false, 'mensaje' => 'No se pudo guardar el video.']);
    }
    return 'hojamier/Videos/' . $nombreArchivo;
}

if ($accion === 'borrar') {
    $id = trim((string) ($_POST['id'] ?? ''));
    if ($id === '') {
        hoja_responder(400, ['ok' => false, 'mensaje' => 'Falta el volumen a quitar.']);
    }
    $nuevo = [];
    $borrado = null;
    foreach ($lista as $item) {
        if ($item['id'] === $id) {
            $borrado = $item;
            continue;
        }
        $nuevo[] = $item;
    }
    if ($borrado === null) {
        hoja_responder(400, ['ok' => false, 'mensaje' => 'No se encontró ese volumen.']);
    }
    if (!hoja_guardar_volumenes($nuevo)) {
        hoja_responder(500, ['ok' => false, 'mensaje' => 'No se pudo actualizar el catálogo.']);
    }
    if (($borrado['origen'] ?? '') === 'admin') {
        hoja_borrar_video_si_local($borrado['src'] ?? '');
    }
    hoja_responder(200, ['ok' => true, 'volumenes' => $nuevo, 'mensaje' => 'Se quitó el volumen.']);
}

if ($accion === 'editar') {
    $id = trim((string) ($_POST['id'] ?? ''));
    $titulo = hoja_limpiar_titulo($_POST['titulo'] ?? '');
    $desc = hoja_limpiar_desc($_POST['desc'] ?? '');
    if ($id === '') {
        hoja_responder(400, ['ok' => false, 'mensaje' => 'Falta el volumen a editar.']);
    }
    if ($titulo === '') {
        hoja_responder(400, ['ok' => false, 'mensaje' => 'Escribí el nombre o número del volumen.']);
    }
    if ($desc === '') {
        $desc = 'Edición de la Hoja del Miércoles.';
    }

    $indice = -1;
    foreach ($lista as $i => $item) {
        if ($item['id'] === $id) {
            $indice = $i;
            break;
        }
    }
    if ($indice < 0) {
        hoja_responder(400, ['ok' => false, 'mensaje' => 'No se encontró ese volumen.']);
    }

    $actual = $lista[$indice];
    $srcNuevo = hoja_recibir_video_opcional($titulo, false);
    $srcAnterior = (string) ($actual['src'] ?? '');
    if ($srcNuevo !== null) {
        $actual['src'] = $srcNuevo;
        if (($actual['origen'] ?? '') === 'admin') {
            hoja_borrar_video_si_local($srcAnterior);
        }
        $actual['origen'] = 'admin';
    }
    $actual['titulo'] = $titulo;
    $actual['desc'] = $desc;
    $actual['creado_en'] = date('c');
    $lista[$indice] = $actual;

    if (!hoja_guardar_volumenes($lista)) {
        if ($srcNuevo !== null) {
            hoja_borrar_video_si_local($srcNuevo);
        }
        hoja_responder(500, ['ok' => false, 'mensaje' => 'No se pudo guardar el cambio.']);
    }

    hoja_responder(200, [
        'ok' => true,
        'mensaje' => 'Se actualizó el volumen.',
        'volumen' => $actual,
        'volumenes' => $lista,
    ]);
}

if ($accion !== 'agregar') {
    hoja_responder(400, ['ok' => false, 'mensaje' => 'Acción no reconocida.']);
}

$titulo = hoja_limpiar_titulo($_POST['titulo'] ?? '');
$desc = hoja_limpiar_desc($_POST['desc'] ?? '');
if ($titulo === '') {
    hoja_responder(400, ['ok' => false, 'mensaje' => 'Escribí el nombre o número del volumen.']);
}
if ($desc === '') {
    $desc = 'Edición de la Hoja del Miércoles.';
}

$src = hoja_recibir_video_opcional($titulo, true);
$id = 'admin-' . date('YmdHis') . '-' . bin2hex(random_bytes(3));
$item = [
    'id' => $id,
    'titulo' => $titulo,
    'desc' => $desc,
    'src' => $src,
    'pdf' => '',
    'pdf_nombre' => '',
    'origen' => 'admin',
    'creado_en' => date('c'),
];
$lista[] = $item;
if (!hoja_guardar_volumenes($lista)) {
    hoja_borrar_video_si_local($src);
    hoja_responder(500, ['ok' => false, 'mensaje' => 'Se guardó el video, pero no el catálogo. Intentá de nuevo.']);
}

hoja_responder(200, [
    'ok' => true,
    'mensaje' => 'El volumen ya está publicado en la Hoja del Miércoles.',
    'volumen' => $item,
    'volumenes' => $lista,
]);
