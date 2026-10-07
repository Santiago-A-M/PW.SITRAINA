<?php
use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

require 'phpmailer/src/exeption.php';
require 'phpmailer/src/phpmailer.php';
require 'phpmailer/src/smpt.php';

date_default_timezone_set('America/Costa_Rica');

function h($valor) {
    return htmlspecialchars((string) $valor, ENT_QUOTES, 'UTF-8');
}

function pagina($titulo, $cuerpo) {
    echo '<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">';
    echo '<meta name="viewport" content="width=device-width, initial-scale=1.0">';
    echo '<title>' . h($titulo) . '</title>';
    echo '<link rel="stylesheet" href="css/estilo.css?v=2.18">';
    echo '<link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&display=swap" rel="stylesheet">';
    echo '</head><body>';
    echo '<header class="header"><div class="logo"><a href="index.html"><img src="img/logo.png" alt="SITRAINA"></a></div></header>';
    echo '<main class="cita-aviso">' . $cuerpo . '</main></body></html>';
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Location: solicitar-cita.html');
    exit;
}

if (trim($_POST['sitio'] ?? '') !== '') {
    pagina('Solicitud recibida', '<h1>Recibimos tu solicitud</h1><p><a class="btn" href="asesoria-legal.html">Volver a asesoría</a></p>');
    exit;
}

$nombre = trim($_POST['nombre'] ?? '');
$cedula = trim($_POST['cedula'] ?? '');
$email = trim($_POST['email'] ?? '');
$telefono = trim($_POST['telefono'] ?? '');
$afiliado = trim($_POST['afiliado'] ?? '');
$sede = trim($_POST['sede'] ?? '');
$motivo = trim($_POST['motivo'] ?? '');
$fecha = trim($_POST['fecha'] ?? '');
$hora = trim($_POST['hora'] ?? '');
$horas = ['07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00'];
$meses = [1 => 'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'setiembre', 'octubre', 'noviembre', 'diciembre'];

$cita = DateTime::createFromFormat('Y-m-d H:i', $fecha . ' ' . $hora);
$errores = [];

if ($nombre === '' || $cedula === '' || $email === '' || $telefono === '' || $sede === '' || $motivo === '') {
    $errores[] = 'Faltan datos indispensables del consultante.';
}
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    $errores[] = 'El correo electrónico no es válido.';
}
if (!in_array($afiliado, ['Sí', 'No'], true)) {
    $errores[] = 'Indica si la persona está afiliada.';
}
if (!$cita || $cita->format('Y-m-d H:i') !== $fecha . ' ' . $hora || !in_array($hora, $horas, true)) {
    $errores[] = 'La fecha o la hora no son válidas.';
} else {
    $dia = (int) $cita->format('N');
    $ahora = new DateTime();
    $limite = (clone $ahora)->modify('+3 months');
    if ($dia >= 6 || $cita < $ahora || $cita > $limite) {
        $errores[] = 'La cita debe ser un día hábil, dentro de los próximos tres meses y en una hora disponible.';
    }
}

if ($errores) {
    $lista = '';
    foreach ($errores as $error) {
        $lista .= '<li>' . h($error) . '</li>';
    }
    pagina('No se pudo enviar la cita', '<h1>Revisa la solicitud</h1><ul>' . $lista . '</ul><p><a class="btn" href="solicitar-cita.html">Volver al formulario</a></p>');
    exit;
}

$fechaTexto = (int) $cita->format('j') . ' de ' . $meses[(int) $cita->format('n')] . ' de ' . $cita->format('Y');
$horaTexto = $cita->format('H:i');

$datos = [
    'Nombre' => $nombre,
    'Cédula' => $cedula,
    'Correo' => $email,
    'Teléfono' => $telefono,
    'Afiliado' => $afiliado,
    'Sede o centro' => $sede,
    'Fecha' => $fechaTexto,
    'Hora' => $horaTexto,
    'Motivo' => $motivo
];

$filas = '';
foreach ($datos as $etiqueta => $valor) {
    $filas .= '<p><strong>' . h($etiqueta) . ':</strong> ' . nl2br(h($valor)) . '</p>';
}

$preparar = function () {
    $mail = new PHPMailer(true);
    $mail->isSMTP();
    $mail->Host = 'smtp.ina.ac.cr';
    $mail->SMTPAuth = true;
    $mail->Username = 'sitraina@ina.ac.cr';
    $mail->Password = 'TU_CONTRASEÑA';
    $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
    $mail->Port = 587;
    $mail->CharSet = 'UTF-8';
    $mail->setFrom('sitraina@ina.ac.cr', 'SITRAINA');
    $mail->isHTML(true);
    return $mail;
};

try {
    $oficina = $preparar();
    $oficina->addAddress('sitraina@ina.ac.cr');
    $oficina->addAddress('asesorialegalsitraina@gmail.com');
    $oficina->addReplyTo($email, $nombre);
    $oficina->Subject = 'Solicitud de cita legal: ' . $fechaTexto . ' ' . $horaTexto;
    $oficina->Body = '<h2>Nueva solicitud de cita con el asesor legal</h2>' . $filas;
    $oficina->send();

    $aviso = $preparar();
    $aviso->addAddress($email, $nombre);
    $aviso->Subject = 'Recibimos tu solicitud de cita con el asesor legal';
    $aviso->Body = '<h2>Recibimos tu solicitud</h2>'
        . '<p>Hola ' . h($nombre) . ', SITRAINA recibió tu solicitud de cita con el asesor legal.</p>'
        . '<p><strong>Fecha:</strong> ' . h($fechaTexto) . '<br><strong>Hora:</strong> ' . h($horaTexto) . '</p>'
        . '<p>La solicitud también llegó a sitraina@ina.ac.cr y a asesorialegalsitraina@gmail.com. El equipo te contactará para confirmar la cita.</p>';
    $aviso->send();

    pagina(
        'Cita recibida',
        '<h1>Recibimos tu solicitud de cita</h1>'
        . '<p>Hola <strong>' . h($nombre) . '</strong>. La cita quedó registrada para el <strong>' . h($fechaTexto) . '</strong> a las <strong>' . h($horaTexto) . '</strong>.</p>'
        . '<p>Enviamos este mismo aviso a <strong>' . h($email) . '</strong>. La solicitud llegó a SITRAINA y a Asesoría Legal.</p>'
        . '<p><a class="btn" href="asesoria-legal.html">Volver a asesoría</a></p>'
    );
} catch (Exception $e) {
    pagina(
        'No se pudo enviar la cita',
        '<h1>No se pudo entregar la solicitud</h1>'
        . '<p>Escríbela directamente a <a href="mailto:sitraina@ina.ac.cr">sitraina@ina.ac.cr</a> y a <a href="mailto:asesorialegalsitraina@gmail.com">asesorialegalsitraina@gmail.com</a>.</p>'
        . '<p><a class="btn" href="solicitar-cita.html">Volver al formulario</a></p>'
    );
}
