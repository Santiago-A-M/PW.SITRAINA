<?php
/* Recibe el formulario de contacto: guarda en Consulta_Contacto y avisa por SMTP si hay config. */
use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

require 'phpmailer/src/exception.php';
require 'phpmailer/src/phpmailer.php';
require 'phpmailer/src/smtp.php';
require_once __DIR__ . '/php/correo_smtp.php';

if ($_SERVER["REQUEST_METHOD"] == "POST") {
    $nombre = htmlspecialchars(trim($_POST['nombre'] ?? ''), ENT_QUOTES, 'UTF-8');
    $email = filter_var($_POST['email'] ?? '', FILTER_SANITIZE_EMAIL);
    $asunto = htmlspecialchars(trim($_POST['asunto'] ?? ''), ENT_QUOTES, 'UTF-8');
    $mensaje = htmlspecialchars(trim($_POST['mensaje'] ?? ''), ENT_QUOTES, 'UTF-8');

    if ($nombre === '' || $email === '' || $mensaje === '') {
        die("<h2>Error: el nombre, el correo y el mensaje son obligatorios.</h2>");
    }

    if (!filter_var($email, FILTER_VALIDATE_EMAIL) || !preg_match('/^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9\-]+(?:\.[a-zA-Z0-9\-]+)*\.[a-zA-Z]{2,}$/', $email)) {
        die("<h2>Error: correo electrónico no válido.</h2>");
    }
    if (strlen($nombre) > 120 || strlen($asunto) > 120 || strlen($mensaje) > 2000) {
        die("<h2>Error: uno de los datos es demasiado largo.</h2>");
    }

    require_once __DIR__ . '/php/respuestas.php';
    $guardado = registrar_contacto_consulta(
        html_entity_decode($nombre, ENT_QUOTES, 'UTF-8'),
        $email,
        html_entity_decode($asunto, ENT_QUOTES, 'UTF-8'),
        html_entity_decode($mensaje, ENT_QUOTES, 'UTF-8')
    );

    $smtp = sitraina_config_correo();
    $enviado = false;
    if ($smtp) {
        $mail = new PHPMailer(true);
        try {
            $de = trim((string) ($smtp['de'] ?? $smtp['usuario'] ?? ''));
            $deNombre = trim((string) ($smtp['de_nombre'] ?? 'Formulario Web - SITRAINA'));
            $mail->isSMTP();
            $mail->Host = (string) ($smtp['host'] ?? '');
            $mail->SMTPAuth = true;
            $mail->Username = (string) ($smtp['usuario'] ?? '');
            $mail->Password = (string) ($smtp['clave'] ?? '');
            $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
            $mail->Port = (int) ($smtp['puerto'] ?? 587);
            $mail->setFrom($de !== '' ? $de : $mail->Username, $deNombre !== '' ? $deNombre : 'Formulario Web - SITRAINA');
            $mail->addAddress($de !== '' ? $de : $mail->Username);
            $mail->addReplyTo($email, $nombre);
            $mail->isHTML(true);
            $mail->Subject = "Contacto web: " . ($asunto ?: "Sin asunto");
            $mail->Body = "
            <h3>Nuevo mensaje desde la web de SITRAINA</h3>
            <p><strong>Nombre:</strong> " . $nombre . "</p>
            <p><strong>Correo:</strong> " . $email . "</p>
            <p><strong>Asunto:</strong> " . $asunto . "</p>
            <p><strong>Mensaje:</strong><br>" . nl2br($mensaje) . "</p>
        ";
            $mail->send();
            $enviado = true;
        } catch (Exception $e) {
            $enviado = false;
        }
    }

    if ($enviado) {
        echo "<h2>Mensaje enviado correctamente</h2>";
        echo "<p>Gracias por contactarnos, <strong>" . $nombre . "</strong>. Te responderemos pronto.</p>";
        if (!$guardado) {
            echo "<p>El mensaje se envió, pero no quedó registrado en el panel. Revisá php/config.php y la tabla Consulta_Contacto.</p>";
        }
        echo '<p><a href="index.html">← Volver al inicio</a></p>';
    } elseif ($guardado) {
        echo "<h2>Mensaje registrado</h2>";
        echo "<p>Tu mensaje quedó en el panel de administración. El aviso por correo no se pudo enviar ahora.</p>";
        echo '<p><a href="index.html">← Volver al inicio</a></p>';
    } else {
        echo "<h2>Error al enviar el mensaje</h2>";
        echo "<p>Por favor, inténtalo más tarde o escribe directamente a <a href='mailto:sitraina@ina.ac.cr'>sitraina@ina.ac.cr</a>.</p>";
    }
}
