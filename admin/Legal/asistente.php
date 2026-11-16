<?php
/* Asistente del panel de abogados. La clave no sale de este archivo. */
ob_start();
require dirname(__DIR__) . '/sesion.php';
require __DIR__ . '/asistente_guia.php';
ob_end_clean();

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Robots-Tag: noindex, nofollow');

function legal_asistente_responder($codigo, $datos) {
    http_response_code($codigo);
    echo json_encode($datos, JSON_UNESCAPED_UNICODE);
    exit;
}

function legal_asistente_config() {
    $config = [
        'url' => 'https://api.groq.com/openai/v1/chat/completions',
        'modelo' => 'llama-3.3-70b-versatile',
        'clave' => '',
    ];
    $entorno = getenv('SITRAINA_ASISTENTE_CLAVE');
    if (is_string($entorno) && $entorno !== '') {
        $config['clave'] = $entorno;
    }
    $archivo = __DIR__ . '/config_asistente.php';
    if (is_file($archivo)) {
        $leido = require $archivo;
        if (is_array($leido)) {
            if (!empty($leido['url']) && is_string($leido['url'])) {
                $config['url'] = $leido['url'];
            }
            if (!empty($leido['modelo']) && is_string($leido['modelo'])) {
                $config['modelo'] = $leido['modelo'];
            }
            if (!empty($leido['clave']) && is_string($leido['clave'])) {
                $config['clave'] = $leido['clave'];
            }
        }
    }
    return $config;
}

function legal_asistente_listo($config) {
    $partes = parse_url((string) ($config['url'] ?? ''));
    if (!is_array($partes)) {
        return false;
    }
    $host = strtolower((string) ($partes['host'] ?? ''));
    $permitidos = ['api.groq.com', 'api.openai.com'];
    $clave = (string) ($config['clave'] ?? '');
    return ($partes['scheme'] ?? '') === 'https'
        && in_array($host, $permitidos, true)
        && strlen($clave) >= 20
        && strlen($clave) <= 300;
}

function legal_asistente_historial() {
    $lista = $_SESSION['legal_asistente'] ?? [];
    if (!is_array($lista)) {
        return [];
    }
    $limpia = [];
    foreach ($lista as $item) {
        if (!is_array($item)) {
            continue;
        }
        $rol = (string) ($item['rol'] ?? '');
        $texto = (string) ($item['texto'] ?? '');
        if (($rol !== 'user' && $rol !== 'assistant') || $texto === '') {
            continue;
        }
        $limpia[] = ['rol' => $rol, 'texto' => $texto];
    }
    if (count($limpia) > 8) {
        $limpia = array_slice($limpia, -8);
    }
    return $limpia;
}

function legal_asistente_cupo() {
    $ahora = time();
    $previas = $_SESSION['legal_asistente_veces'] ?? [];
    if (!is_array($previas)) {
        $previas = [];
    }
    $vigentes = [];
    foreach ($previas as $marca) {
        $marca = (int) $marca;
        if ($marca > $ahora - 600) {
            $vigentes[] = $marca;
        }
    }
    if (count($vigentes) >= 8) {
        $_SESSION['legal_asistente_veces'] = $vigentes;
        return false;
    }
    $vigentes[] = $ahora;
    $_SESSION['legal_asistente_veces'] = $vigentes;
    return true;
}

function legal_asistente_llamar($config, $mensajes) {
    $cuerpo = json_encode([
        'model' => $config['modelo'],
        'temperature' => 0.2,
        'max_tokens' => 450,
        'messages' => $mensajes,
    ], JSON_UNESCAPED_UNICODE);
    if (!is_string($cuerpo)) {
        return [0, ''];
    }
    $url = (string) $config['url'];
    $clave = (string) $config['clave'];
    if (function_exists('curl_init')) {
        $canal = curl_init($url);
        if ($canal === false) {
            return [0, ''];
        }
        curl_setopt_array($canal, [
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => $cuerpo,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 25,
            CURLOPT_HTTPHEADER => [
                'Content-Type: application/json',
                'Authorization: Bearer ' . $clave,
                'Accept: application/json',
            ],
        ]);
        $raw = curl_exec($canal);
        $codigo = (int) curl_getinfo($canal, CURLINFO_HTTP_CODE);
        curl_close($canal);
        return [$codigo, is_string($raw) ? $raw : ''];
    }
    $contexto = stream_context_create([
        'http' => [
            'method' => 'POST',
            'header' => "Content-Type: application/json\r\nAuthorization: Bearer " . $clave . "\r\nAccept: application/json\r\n",
            'content' => $cuerpo,
            'timeout' => 25,
            'ignore_errors' => true,
        ],
    ]);
    $raw = @file_get_contents($url, false, $contexto);
    $codigo = 0;
    if (isset($http_response_header[0]) && preg_match('/\s(\d{3})\s/', (string) $http_response_header[0], $hallado)) {
        $codigo = (int) $hallado[1];
    }
    return [$codigo, is_string($raw) ? $raw : ''];
}

if (empty($_SESSION['admin_usuario'])) {
    legal_asistente_responder(401, ['ok' => false, 'mensaje' => 'La sesión se cerró. Volvé a entrar al panel.']);
}
if (!personal_es_abogado()) {
    legal_asistente_responder(403, ['ok' => false, 'mensaje' => 'Este asistente es solo para el panel de abogados.']);
}

$config = legal_asistente_config();
$metodo = (string) ($_SERVER['REQUEST_METHOD'] ?? 'GET');

if ($metodo === 'GET') {
    legal_asistente_responder(200, [
        'ok' => true,
        'listo' => legal_asistente_listo($config),
        'mensajes' => legal_asistente_historial(),
    ]);
}

if ($metodo !== 'POST') {
    legal_asistente_responder(405, ['ok' => false, 'mensaje' => 'No se pudo completar.']);
}

$token = (string) ($_POST['token'] ?? '');
if (!hash_equals(token_admin(), $token)) {
    legal_asistente_responder(403, ['ok' => false, 'mensaje' => 'Volvé a abrir el panel e intentá de nuevo.']);
}

$accion = (string) ($_POST['accion'] ?? '');
if ($accion === 'nueva') {
    $_SESSION['legal_asistente'] = [];
    legal_asistente_responder(200, ['ok' => true, 'mensajes' => []]);
}
if ($accion !== 'mensaje') {
    legal_asistente_responder(400, ['ok' => false, 'mensaje' => 'No se pudo completar.']);
}

$texto = trim((string) ($_POST['mensaje'] ?? ''));
$texto = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F]/', '', $texto) ?? '';
if ($texto === '') {
    legal_asistente_responder(400, ['ok' => false, 'mensaje' => 'Escribí la consulta antes de enviarla.']);
}
if (strlen($texto) > 600) {
    legal_asistente_responder(400, ['ok' => false, 'mensaje' => 'La consulta es demasiado larga. Resumila e intentá de nuevo.']);
}
if (!legal_asistente_listo($config)) {
    legal_asistente_responder(503, ['ok' => false, 'mensaje' => 'El asistente todavía no está conectado. Avisá al administrador del sitio.']);
}
if (!legal_asistente_cupo()) {
    legal_asistente_responder(429, ['ok' => false, 'mensaje' => 'Hiciste varias consultas seguidas. Esperá unos minutos y volvé a intentar.']);
}

$mensajes = [[
    'role' => 'system',
    'content' => legal_asistente_guia(),
]];
foreach (legal_asistente_historial() as $item) {
    $mensajes[] = [
        'role' => $item['rol'] === 'assistant' ? 'assistant' : 'user',
        'content' => $item['texto'],
    ];
}
$mensajes[] = ['role' => 'user', 'content' => $texto];

list($codigo, $raw) = legal_asistente_llamar($config, $mensajes);
$decodificado = json_decode($raw, true);
$respuesta = '';
if (is_array($decodificado)) {
    $respuesta = trim((string) ($decodificado['choices'][0]['message']['content'] ?? ''));
}
if ($codigo === 429) {
    legal_asistente_responder(429, ['ok' => false, 'mensaje' => 'El asistente está recibiendo demasiadas consultas. Esperá un momento y volvé a intentar.']);
}
if ($codigo < 200 || $codigo >= 300 || $respuesta === '') {
    $aviso = $codigo === 401 || $codigo === 403
        ? 'El asistente no pudo identificarse. Avisá al administrador del sitio.'
        : 'No hay conexión con el asistente en este momento. Probá de nuevo en un rato.';
    legal_asistente_responder(503, ['ok' => false, 'mensaje' => $aviso]);
}

if (strlen($respuesta) > 2000) {
    $respuesta = substr($respuesta, 0, 2000);
}
$historial = legal_asistente_historial();
$historial[] = ['rol' => 'user', 'texto' => $texto];
$historial[] = ['rol' => 'assistant', 'texto' => $respuesta];
$_SESSION['legal_asistente'] = array_slice($historial, -8);

legal_asistente_responder(200, [
    'ok' => true,
    'respuesta' => $respuesta,
]);
