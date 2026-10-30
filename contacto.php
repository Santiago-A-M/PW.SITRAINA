<?php
/* Recibe el formulario de contacto: guarda en Consulta_Contacto. */

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Location: index.html#contacto');
    exit;
}

require_once __DIR__ . '/php/sesion_usuario.php';
require_once __DIR__ . '/php/respuestas.php';
sitraina_sesion_usuario();
sitraina_exige_cuenta('index.html#contacto', '');

$nombre = htmlspecialchars(trim((string) ($_POST['nombre'] ?? '')), ENT_QUOTES, 'UTF-8');
$email = filter_var((string) ($_POST['email'] ?? ''), FILTER_SANITIZE_EMAIL);
$asunto = htmlspecialchars(trim((string) ($_POST['asunto'] ?? '')), ENT_QUOTES, 'UTF-8');
$mensaje = htmlspecialchars(trim((string) ($_POST['mensaje'] ?? '')), ENT_QUOTES, 'UTF-8');

function pagina_contacto($tipo, $titulo, $mensaje) {
    $tituloSeguro = htmlspecialchars($titulo, ENT_QUOTES, 'UTF-8');
    $mensajeSeguro = htmlspecialchars($mensaje, ENT_QUOTES, 'UTF-8');
    echo '<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">';
    echo '<meta name="viewport" content="width=device-width, initial-scale=1.0">';
    echo '<title>' . $tituloSeguro . '</title>';
    echo '<link rel="stylesheet" href="css/avisos.css?v=1.2">';
    $tipoAviso = ($tipo === 'exito' || $tipo === 'sesion') ? $tipo : 'error';
    echo '</head><body data-sit-aviso="' . $tipoAviso . '" data-sit-titulo="' . $tituloSeguro . '" data-sit-texto="' . $mensajeSeguro . '">';
    echo '<main style="padding:120px 20px"><p><a href="index.html#contacto">Volver al inicio</a></p></main>';
    echo '<script src="js/avisos.js?v=1.2"></script></body></html>';
    exit;
}

if ($nombre === '' || $email === '' || $mensaje === '') {
    pagina_contacto('error', 'Revisá la información', 'El nombre, el correo y el mensaje son obligatorios.');
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL) || !preg_match('/^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9\-]+(?:\.[a-zA-Z0-9\-]+)*\.[a-zA-Z]{2,}$/', $email)) {
    pagina_contacto('error', 'Revisá la información', 'El correo electrónico no es válido.');
}
if (strlen($nombre) > 120 || strlen($asunto) > 120 || strlen($mensaje) > 2000) {
    pagina_contacto('error', 'Revisá la información', 'Uno de los datos es demasiado largo.');
}

$nombrePlano = html_entity_decode($nombre, ENT_QUOTES, 'UTF-8');
$asuntoPlano = html_entity_decode($asunto, ENT_QUOTES, 'UTF-8');
$mensajePlano = html_entity_decode($mensaje, ENT_QUOTES, 'UTF-8');

$guardado = registrar_contacto_consulta($nombrePlano, $email, $asuntoPlano, $mensajePlano);

if ($guardado) {
    $detalle = 'Gracias. Tu mensaje quedó en el panel de administración.';
    if (sitraina_id_si_cuenta_en_formulario([$email])) {
        $detalle .= ' Como ya iniciaste sesión con este correo, la respuesta va a llegar a Mis mensajes.';
    } else {
        $detalle .= ' Para que la respuesta llegue a Mis mensajes, iniciá sesión y enviá el formulario con el correo de esa cuenta.';
    }
    pagina_contacto('exito', '¡Solicitud enviada!', $detalle);
}

pagina_contacto('error', 'No se pudo enviar', 'Ocurrió un problema al registrar el mensaje. Volvé a intentarlo más tarde o escribinos a sitraina@ina.ac.cr.');
