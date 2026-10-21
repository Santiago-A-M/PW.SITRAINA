<?php
/* Intento antiguo de enviar el contacto por SMTP. El formulario de contacto.html todavía apunta aquí. */
use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

require 'phpmailer/src/exception.php';
require 'phpmailer/src/phpmailer.php';
require 'phpmailer/src/smtp.php';

if ($_SERVER["REQUEST_METHOD"] == "POST") {
    // Sanitización básica
    $nombre = htmlspecialchars(trim($_POST['nombre'] ?? ''), ENT_QUOTES, 'UTF-8');
    $email = filter_var($_POST['email'] ?? '', FILTER_SANITIZE_EMAIL);
    $asunto = htmlspecialchars(trim($_POST['asunto'] ?? ''), ENT_QUOTES, 'UTF-8');
    $mensaje = htmlspecialchars(trim($_POST['mensaje'] ?? ''), ENT_QUOTES, 'UTF-8');

    // Validación mínima
    if ($nombre === '' || $email === '' || $mensaje === '') {
        die("<h2>Error: el nombre, el correo y el mensaje son obligatorios.</h2>");
    }

    if (!filter_var($email, FILTER_VALIDATE_EMAIL) || !preg_match('/^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9\-]+(?:\.[a-zA-Z0-9\-]+)*\.[a-zA-Z]{2,}$/', $email)) {
        die("<h2>Error: correo electrónico no válido.</h2>");
    }
    if (strlen($nombre) > 120 || strlen($asunto) > 120 || strlen($mensaje) > 2000) {
        die("<h2>Error: uno de los datos es demasiado largo.</h2>");
    }

    $mail = new PHPMailer(true);

    try {
        // Configuración SMTP (¡asegúrate de usar variables de entorno en producción!)
        $mail->isSMTP();
        $mail->Host = "smtp.ina.ac.cr";
        $mail->SMTPAuth = true;
        $mail->Username = "sitraina@ina.ac.cr";
        $mail->Password = "Prueb@2026"; // ⚠️ Reemplaza o usa $_ENV
        $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
        $mail->Port = 587;

        // Remitente (cuenta SMTP que envía)
        $mail->setFrom("sitraina@ina.ac.cr", "Formulario Web - SITRAINA");
        // >>> CORREO DESTINO (formulario de contacto): aquí llega el mensaje de contacto.html
        $mail->addAddress("sitraina@ina.ac.cr");
        $mail->addReplyTo($email, $nombre);

        // Contenido
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
        echo "<h2>✅ Mensaje enviado correctamente</h2>";
        echo "<p>Gracias por contactarnos, <strong>" . $nombre . "</strong>. Te responderemos pronto.</p>";
        echo '<p><a href="index.html">← Volver al inicio</a></p>';
    } catch (Exception $e) {
        echo "<h2>❌ Error al enviar el mensaje</h2>";
        echo "<p>Por favor, inténtalo más tarde o escribe directamente a <a href='mailto:sitraina@ina.ac.cr'>sitraina@ina.ac.cr</a>.</p>";
        // En producción, evita mostrar $mail->ErrorInfo
    }
}
?>