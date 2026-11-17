<?php
/* Administración de Documentación. Solo rol admin. CRUD por categoría. */
ob_start();
require __DIR__ . '/sesion.php';
require dirname(__DIR__) . '/php/documentos_lib.php';
ob_end_clean();

header('X-Robots-Tag: noindex, nofollow');
header('Cache-Control: no-store');

$rol = rol_personal_admin();
if ($rol !== 'admin') {
    docs_responder(401, ['ok' => false, 'mensaje' => 'Entrá como administrador para continuar.']);
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $categoria = trim((string) ($_GET['categoria'] ?? ''));
    if ($categoria === '') {
        $todas = [];
        foreach (docs_categorias() as $id => $nombre) {
            $lista = docs_leer_categoria($id);
            if ($lista === null) {
                docs_responder(500, ['ok' => false, 'mensaje' => 'No se pudo leer ' . $nombre . '.']);
            }
            $todas[$id] = $lista;
        }
        docs_responder(200, [
            'ok' => true,
            'categorias' => docs_categorias(),
            'items' => $todas,
        ]);
    }
    if (!docs_es_categoria($categoria)) {
        docs_responder(400, ['ok' => false, 'mensaje' => 'Categoría no válida.']);
    }
    $lista = docs_leer_categoria($categoria);
    if ($lista === null) {
        docs_responder(500, ['ok' => false, 'mensaje' => 'No se pudo leer el catálogo.']);
    }
    docs_responder(200, [
        'ok' => true,
        'categoria' => $categoria,
        'items' => $lista,
    ]);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    docs_responder(405, ['ok' => false, 'mensaje' => 'Método no permitido.']);
}

$token = (string) ($_POST['token'] ?? '');
if (!hash_equals(token_admin(), $token)) {
    docs_responder(403, ['ok' => false, 'mensaje' => 'Volvé a abrir el panel e intentá de nuevo.']);
}

$accion = (string) ($_POST['accion'] ?? '');
$categoria = trim((string) ($_POST['categoria'] ?? ''));
if (!docs_es_categoria($categoria)) {
    docs_responder(400, ['ok' => false, 'mensaje' => 'Categoría no válida.']);
}

$lista = docs_leer_categoria($categoria);
if ($lista === null) {
    docs_responder(500, ['ok' => false, 'mensaje' => 'No se pudo leer el catálogo.']);
}

function docs_admin_buscar_indice($lista, $id) {
    foreach ($lista as $i => $item) {
        if (($item['id'] ?? '') === $id) {
            return $i;
        }
    }
    return -1;
}

if ($accion === 'borrar') {
    $id = trim((string) ($_POST['id'] ?? ''));
    if ($id === '') {
        docs_responder(400, ['ok' => false, 'mensaje' => 'Falta el documento a quitar.']);
    }
    $indice = docs_admin_buscar_indice($lista, $id);
    if ($indice < 0) {
        docs_responder(400, ['ok' => false, 'mensaje' => 'No se encontró ese documento.']);
    }
    $borrado = $lista[$indice];
    array_splice($lista, $indice, 1);
    if (!docs_guardar_categoria($categoria, $lista)) {
        docs_responder(500, ['ok' => false, 'mensaje' => 'No se pudo actualizar el catálogo.']);
    }
    if (($borrado['origen'] ?? '') === 'admin') {
        if ($categoria === 'hoja') {
            docs_borrar_archivo_si_local($borrado['src'] ?? ($borrado['archivo'] ?? ''), ['hojamier/Videos/']);
        } elseif ($categoria === 'efemerides') {
            docs_borrar_archivo_si_local($borrado['media'] ?? '', ['efemerides/']);
        } elseif ($categoria === 'convenios') {
            docs_borrar_archivo_si_local($borrado['imagen'] ?? '', ['convenios/img-conv/']);
        } else {
            docs_borrar_archivo_si_local($borrado['archivo'] ?? '', ['documentos/']);
        }
    }
    docs_responder(200, [
        'ok' => true,
        'mensaje' => 'Se quitó el documento.',
        'categoria' => $categoria,
        'items' => $lista,
    ]);
}

if ($accion === 'agregar' || $accion === 'editar') {
    $esEditar = $accion === 'editar';
    $id = trim((string) ($_POST['id'] ?? ''));
    $indice = -1;
    $actual = null;
    if ($esEditar) {
        if ($id === '') {
            docs_responder(400, ['ok' => false, 'mensaje' => 'Falta el documento a editar.']);
        }
        $indice = docs_admin_buscar_indice($lista, $id);
        if ($indice < 0) {
            docs_responder(400, ['ok' => false, 'mensaje' => 'No se encontró ese documento.']);
        }
        $actual = $lista[$indice];
    }

    if ($categoria === 'hoja') {
        $titulo = hoja_limpiar_titulo($_POST['titulo'] ?? '');
        $desc = hoja_limpiar_desc($_POST['desc'] ?? '');
        if ($titulo === '') {
            docs_responder(400, ['ok' => false, 'mensaje' => 'Escribí el nombre o número del volumen.']);
        }
        if ($desc === '') {
            $desc = 'Edición de la Hoja del Miércoles.';
        }
        $srcNuevo = null;
        if (!empty($_FILES['archivo']) || !empty($_FILES['video'])) {
            // Reusar helper de hoja vía upload genérico
            $campo = !empty($_FILES['video']) ? 'video' : 'archivo';
            $srcNuevo = docs_recibir_upload(
                $campo,
                'hojamier/Videos',
                ['.mp4'],
                ['video/mp4', 'application/mp4', 'video/quicktime'],
                80,
                !$esEditar,
                $titulo
            );
        } elseif (!$esEditar) {
            docs_responder(400, ['ok' => false, 'mensaje' => 'Elegí el video del volumen.']);
        }

        if ($esEditar) {
            $item = $actual;
            $item['titulo'] = $titulo;
            $item['desc'] = $desc;
            if ($srcNuevo !== null) {
                if (($item['origen'] ?? '') === 'admin') {
                    docs_borrar_archivo_si_local($item['src'] ?? ($item['archivo'] ?? ''), ['hojamier/Videos/']);
                }
                $item['src'] = $srcNuevo;
                $item['archivo'] = $srcNuevo;
                $item['origen'] = 'admin';
            }
            $item['creado_en'] = date('c');
            $lista[$indice] = $item;
        } else {
            $item = [
                'id' => docs_id_nuevo('hoja'),
                'titulo' => $titulo,
                'desc' => $desc,
                'src' => $srcNuevo,
                'archivo' => $srcNuevo,
                'pdf' => '',
                'pdf_nombre' => '',
                'origen' => 'admin',
                'creado_en' => date('c'),
            ];
            $lista[] = $item;
        }
    } elseif ($categoria === 'efemerides') {
        $fecha = docs_limpiar_texto($_POST['fecha'] ?? '', 80);
        $titulo = docs_limpiar_texto($_POST['titulo'] ?? '', 120);
        $texto = docs_limpiar_texto($_POST['texto'] ?? '', 800);
        if ($titulo === '') {
            docs_responder(400, ['ok' => false, 'mensaje' => 'Escribí el título de la efeméride.']);
        }
        if ($fecha === '') {
            docs_responder(400, ['ok' => false, 'mensaje' => 'Escribí la fecha.']);
        }
        $mediaNuevo = docs_recibir_upload(
            'archivo',
            'efemerides',
            ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.mp4'],
            ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'application/mp4'],
            40,
            !$esEditar,
            $titulo
        );
        if ($esEditar) {
            $item = $actual;
            $item['fecha'] = $fecha;
            $item['titulo'] = $titulo;
            $item['texto'] = $texto;
            if ($mediaNuevo !== null) {
                if (($item['origen'] ?? '') === 'admin') {
                    docs_borrar_archivo_si_local($item['media'] ?? '', ['efemerides/']);
                }
                $item['media'] = $mediaNuevo;
                $item['origen'] = 'admin';
            }
            $item['creado_en'] = date('c');
            $lista[$indice] = $item;
        } else {
            $item = [
                'id' => docs_id_nuevo('efemerides'),
                'fecha' => $fecha,
                'titulo' => $titulo,
                'texto' => $texto,
                'media' => $mediaNuevo,
                'origen' => 'admin',
                'creado_en' => date('c'),
            ];
            $lista[] = $item;
        }
    } elseif ($categoria === 'convenios') {
        $titulo = docs_limpiar_texto($_POST['titulo'] ?? '', 120);
        $nota = docs_limpiar_texto($_POST['nota'] ?? '', 200);
        $rubro = trim((string) ($_POST['rubro'] ?? 'salud'));
        if (!in_array($rubro, ['salud', 'educacion', 'turismo'], true)) {
            $rubro = 'salud';
        }
        if ($titulo === '') {
            docs_responder(400, ['ok' => false, 'mensaje' => 'Escribí el nombre del convenio.']);
        }
        $imgNuevo = docs_recibir_upload(
            'archivo',
            'convenios/img-conv/admin',
            ['.jpg', '.jpeg', '.png', '.webp', '.gif'],
            ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
            12,
            !$esEditar,
            $titulo
        );
        if ($esEditar) {
            $item = $actual;
            $item['titulo'] = $titulo;
            $item['nota'] = $nota !== '' ? $nota : 'Convenio para personas afiliadas';
            $item['rubro'] = $rubro;
            if ($imgNuevo !== null) {
                if (($item['origen'] ?? '') === 'admin') {
                    docs_borrar_archivo_si_local($item['imagen'] ?? '', ['convenios/img-conv/']);
                }
                $item['imagen'] = $imgNuevo;
                $item['origen'] = 'admin';
            }
            $item['creado_en'] = date('c');
            $lista[$indice] = $item;
        } else {
            $item = [
                'id' => docs_id_nuevo('convenios'),
                'titulo' => $titulo,
                'nota' => $nota !== '' ? $nota : 'Convenio para personas afiliadas',
                'rubro' => $rubro,
                'imagen' => $imgNuevo,
                'origen' => 'admin',
                'creado_en' => date('c'),
            ];
            $lista[] = $item;
        }
    } else {
        $titulo = docs_limpiar_texto($_POST['titulo'] ?? '', 160);
        $desc = docs_limpiar_texto($_POST['desc'] ?? '', 200);
        if ($titulo === '') {
            docs_responder(400, ['ok' => false, 'mensaje' => 'Escribí el título del documento.']);
        }
        if ($desc === '') {
            $desc = 'Documento';
        }
        $archNuevo = docs_recibir_upload(
            'archivo',
            'documentos',
            ['.pdf', '.docx', '.doc'],
            [
                'application/pdf',
                'application/msword',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'application/octet-stream',
            ],
            25,
            !$esEditar,
            $titulo
        );
        if ($esEditar) {
            $item = $actual;
            $item['titulo'] = $titulo;
            $item['desc'] = $desc;
            if ($archNuevo !== null) {
                if (($item['origen'] ?? '') === 'admin') {
                    docs_borrar_archivo_si_local($item['archivo'] ?? '', ['documentos/']);
                }
                $item['archivo'] = $archNuevo;
                $item['origen'] = 'admin';
            }
            $item['creado_en'] = date('c');
            $lista[$indice] = $item;
        } else {
            $item = [
                'id' => docs_id_nuevo($categoria),
                'titulo' => $titulo,
                'desc' => $desc,
                'archivo' => $archNuevo,
                'origen' => 'admin',
                'creado_en' => date('c'),
            ];
            $lista[] = $item;
        }
    }

    if (!docs_guardar_categoria($categoria, $lista)) {
        docs_responder(500, ['ok' => false, 'mensaje' => 'No se pudo guardar el catálogo.']);
    }

    docs_responder(200, [
        'ok' => true,
        'mensaje' => $esEditar ? 'Se actualizó el documento.' : 'Documento publicado.',
        'categoria' => $categoria,
        'item' => $item,
        'items' => $lista,
    ]);
}

docs_responder(400, ['ok' => false, 'mensaje' => 'Acción no reconocida.']);
