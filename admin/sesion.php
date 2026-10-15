<?php
/* Sesión del administrador: cookie, token y reemplazo de los textos {{ }} del HTML. */
header('X-Frame-Options: DENY');
header('X-Robots-Tag: noindex, nofollow');
header('Cache-Control: no-store');
header('Referrer-Policy: no-referrer');

$https = !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off';
$ruta = str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME'] ?? '/admin'));
$ruta = rtrim($ruta, '/') . '/';

session_set_cookie_params([
    'lifetime' => 0,
    'path' => $ruta,
    'secure' => $https,
    'httponly' => true,
    'samesite' => 'Lax',
]);
session_start();

/* Escapa un texto antes de insertarlo en el HTML. */
function h($texto) {
    return htmlspecialchars((string) $texto, ENT_QUOTES, 'UTF-8');
}

/* Crea o reutiliza el token que protege los formularios del administrador. */
function token_admin() {
    if (empty($_SESSION['admin_token'])) {
        $_SESSION['admin_token'] = bin2hex(random_bytes(16));
    }
    return $_SESSION['admin_token'];
}

/* Lee un HTML y cambia {{token}}, {{error}} y los demás marcadores por su valor. */
function vista($archivo, $datos) {
    $html = file_get_contents(__DIR__ . '/' . $archivo);
    foreach ($datos as $clave => $valor) {
        $seguro = h($valor);
        if ($seguro !== '') {
            $html = str_replace('hidden>{{' . $clave . '}}', '>' . $seguro, $html);
            $html = str_replace('data-' . $clave . ' hidden', 'data-' . $clave, $html);
        }
        $html = str_replace('{{' . $clave . '}}', $seguro, $html);
    }
    echo $html;
}
