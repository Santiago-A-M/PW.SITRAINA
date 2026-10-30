<?php
/* Envía un correo desde sitraina@ina.ac.cr por SMTP (PHPMailer).
   En InfinityFree el SMTP saliente a menudo falla: el panel debe guardar la respuesta
   igual (ver solicitudes.php / agenda.php). La persona ve la respuesta en Mis mensajes, leída desde Info_Respuestas. Este SMTP ya no se llama en el éxito de solicitudes.
   correos arbitrarios (hay que activar cada destino). */

function sitraina_config_correo() {
    $archivo = __DIR__ . '/config_correo.php';
    if (!is_file($archivo)) {
        return null;
    }
    $config = require $archivo;
    if (!is_array($config) || trim((string) ($config['clave'] ?? '')) === '') {
        return null;
    }
    return $config;
}

function enviar_correo_sitraina_con_respaldo($para, $nombrePara, $asunto, $cuerpoTexto) {
    return enviar_correo_sitraina($para, $nombrePara, $asunto, $cuerpoTexto);
}

function enviar_correo_sitraina($para, $nombrePara, $asunto, $cuerpoTexto) {
    $para = strtolower(trim((string) $para));
    $asunto = trim((string) $asunto);
    $cuerpoTexto = trim((string) $cuerpoTexto);
    if ($para === '' || $asunto === '' || $cuerpoTexto === '') {
        return false;
    }
    if (!preg_match('/^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9\-]+(?:\.[a-zA-Z0-9\-]+)*\.[a-zA-Z]{2,}$/', $para)) {
        return false;
    }

    $raiz = dirname(__DIR__);
    $exception = $raiz . '/phpmailer/src/exception.php';
    $phpmailer = $raiz . '/phpmailer/src/phpmailer.php';
    $smtp = $raiz . '/phpmailer/src/smtp.php';
    if (!is_file($exception) || !is_file($phpmailer) || !is_file($smtp)) {
        return false;
    }
    require_once $exception;
    require_once $phpmailer;
    require_once $smtp;

    $smtp = sitraina_config_correo();
    if (!$smtp) {
        return false;
    }
    $nombrePara = trim((string) $nombrePara);
    $de = trim((string) ($smtp['de'] ?? $smtp['usuario'] ?? ''));
    $deNombre = trim((string) ($smtp['de_nombre'] ?? 'SITRAINA'));
    try {
        $mail = new \PHPMailer\PHPMailer\PHPMailer(true);
        $mail->isSMTP();
        $mail->Host = (string) ($smtp['host'] ?? '');
        $mail->SMTPAuth = true;
        $mail->Username = (string) ($smtp['usuario'] ?? '');
        $mail->Password = (string) ($smtp['clave'] ?? '');
        $mail->SMTPSecure = \PHPMailer\PHPMailer\PHPMailer::ENCRYPTION_STARTTLS;
        $mail->Port = (int) ($smtp['puerto'] ?? 587);
        $mail->CharSet = 'UTF-8';
        $mail->setFrom($de !== '' ? $de : $mail->Username, $deNombre !== '' ? $deNombre : 'SITRAINA');
        $mail->addAddress($para, $nombrePara !== '' ? $nombrePara : $para);
        $mail->addReplyTo($de !== '' ? $de : $mail->Username, $deNombre !== '' ? $deNombre : 'SITRAINA');
        $mail->isHTML(true);
        $mail->Subject = $asunto;
        $mail->Body = nl2br(htmlspecialchars($cuerpoTexto, ENT_QUOTES, 'UTF-8'));
        $mail->AltBody = $cuerpoTexto;
        $mail->send();
        return true;
    } catch (\Throwable $e) {
        return false;
    }
}
