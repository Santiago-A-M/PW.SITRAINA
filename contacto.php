<?php
use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

require 'phpmailer/src/exception.php';
require 'phpmailer/src/phpmailer.php';
require 'phpmailer/src/smpt.php';

if ($_SERVER["REQUEST_METHOD"] == "POST") {
    // Sanitización básica
    $nombre = htmlspecialchars(trim($_POST['nombre'] ?? ''), ENT_QUOTES, 'UTF-8');
    $email = filter_var($_POST['email'] ?? '', FILTER_SANITIZE_EMAIL);
    $asunto = htmlspecialchars(trim($_POST['asunto'] ?? ''), ENT_QUOTES, 'UTF-8');
    $mensaje = htmlspecialchars(trim($_POST['mensaje'] ?? ''), ENT_QUOTES, 'UTF-8');

    // Validación mínima
    if (empty($nombre) || empty($email) || empty($mensaje)) {
        die("<h2>❌ Error: Todos los campos obligatorios deben estar completos.</h2>");
    }

    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        die("<h2>❌ Error: Correo electrónico no válido.</h2>");
    }

    $mail = new PHPMailer(true);

    try {
        // Configuración SMTP (¡asegúrate de usar variables de entorno en producción!)
        $mail->isSMTP();
        $mail->Host = "smtp.ina.ac.cr";
        $mail->SMTPAuth = true;
        $mail->Username = "sitraina@ina.ac.cr";
        $mail->Password = "TU_CONTRASEÑA"; // ⚠️ Reemplaza o usa $_ENV
        $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
        $mail->Port = 587;

        // Remitente y destinatario
        $mail->setFrom("sitraina@ina.ac.cr", "Formulario Web - SITRAINA");
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