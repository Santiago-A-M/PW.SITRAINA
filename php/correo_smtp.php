<?php
/* Envía un correo desde sitraina@ina.ac.cr por SMTP (PHPMailer).
   En InfinityFree el SMTP saliente a menudo falla: el panel debe guardar la respuesta
   igual (ver solicitudes.php / agenda.php). FormSubmit no sirve para responder a
   correos arbitrarios (hay que activar cada destino). */

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

    $nombrePara = trim((string) $nombrePara);
    try {
        $mail = new \PHPMailer\PHPMailer\PHPMailer(true);
        $mail->isSMTP();
        $mail->Host = 'smtp.ina.ac.cr';
        $mail->SMTPAuth = true;
        $mail->Username = 'sitraina@ina.ac.cr';
        $mail->Password = 'Prueb@2026';
        $mail->SMTPSecure = \PHPMailer\PHPMailer\PHPMailer::ENCRYPTION_STARTTLS;
        $mail->Port = 587;
        $mail->CharSet = 'UTF-8';
        $mail->setFrom('sitraina@ina.ac.cr', 'SITRAINA');
        $mail->addAddress($para, $nombrePara !== '' ? $nombrePara : $para);
        $mail->addReplyTo('sitraina@ina.ac.cr', 'SITRAINA');
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
