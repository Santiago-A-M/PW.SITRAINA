<?php
/* Envío SMTP único del sitio. Gmail: smtp.gmail.com, puerto 587, STARTTLS.
   Primero lee las variables de entorno. Si faltan, usa config_correo.php.
   Si el envío falla, se anota el error sin la contraseña y la función devuelve false. */

function sitraina_entorno($nombre) {
    $valor = getenv($nombre);
    if ($valor === false || trim((string) $valor) === '') {
        if (isset($_ENV[$nombre]) && trim((string) $_ENV[$nombre]) !== '') {
            $valor = $_ENV[$nombre];
        } elseif (isset($_SERVER[$nombre]) && trim((string) $_SERVER[$nombre]) !== '') {
            $valor = $_SERVER[$nombre];
        } else {
            $valor = '';
        }
    }
    return trim((string) $valor);
}

function sitraina_config_correo() {
    static $leido = false;
    static $cache = null;
    if ($leido) {
        return $cache;
    }
    $leido = true;
    $config = [];
    $archivo = __DIR__ . '/config_correo.php';
    if (is_file($archivo)) {
        $desdeArchivo = require $archivo;
        if (is_array($desdeArchivo)) {
            $config = $desdeArchivo;
        }
    }
    $usuario = strtolower(sitraina_entorno('SMTP_USUARIO'));
    $clave = sitraina_entorno('SMTP_CLAVE');
    $de = strtolower(sitraina_entorno('SMTP_DE'));
    if ($usuario === '' || $clave === '' || $de === '') {
        $usuario = strtolower(trim((string) ($config['usuario'] ?? '')));
        $clave = trim((string) ($config['clave'] ?? ''));
        $de = strtolower(trim((string) ($config['de'] ?? $usuario)));
    }
    if ($usuario === '' || $clave === '' || $de === '') {
        return null;
    }
    if (!filter_var($usuario, FILTER_VALIDATE_EMAIL) || !filter_var($de, FILTER_VALIDATE_EMAIL)) {
        return null;
    }
    $host = sitraina_entorno('SMTP_HOST');
    if ($host === '') {
        $host = trim((string) ($config['host'] ?? ''));
    }
    $cifrado = strtolower(sitraina_entorno('SMTP_CIFRADO'));
    if ($cifrado === '') {
        $cifrado = strtolower(trim((string) ($config['cifrado'] ?? 'tls')));
    }
    if ($cifrado !== 'tls' && $cifrado !== 'ssl') {
        $cifrado = 'tls';
    }
    $puerto = (int) sitraina_entorno('SMTP_PUERTO');
    if ($puerto < 1) {
        $puerto = (int) ($config['puerto'] ?? ($cifrado === 'ssl' ? 465 : 587));
    }
    if ($puerto < 1) {
        $puerto = 587;
    }
    $deNombre = sitraina_entorno('SMTP_DE_NOMBRE');
    if ($deNombre === '') {
        $deNombre = trim((string) ($config['de_nombre'] ?? ''));
    }
    $cache = [
        'host' => $host !== '' ? $host : 'smtp.gmail.com',
        'puerto' => $puerto,
        'cifrado' => $cifrado,
        'usuario' => $usuario,
        'clave' => $clave,
        'de' => $de,
        'de_nombre' => $deNombre !== '' ? $deNombre : 'SITRAINA',
    ];
    return $cache;
}

function sitraina_cargar_phpmailer() {
    static $listo = false;
    if ($listo) {
        return true;
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
    $listo = true;
    return true;
}

function sitraina_limpiar_texto_correo($texto, $clave) {
    $texto = str_replace(["\r", "\n"], ' ', (string) $texto);
    if ($clave !== '') {
        $texto = str_replace($clave, '[oculto]', $texto);
    }
    if (strlen($texto) > 500) {
        $texto = substr($texto, 0, 500);
    }
    return $texto;
}

function sitraina_registrar_correo($para, $ok, $detalle, $clave = '') {
    $carpeta = __DIR__ . '/logs';
    if (!is_dir($carpeta)) {
        @mkdir($carpeta, 0755, true);
    }
    $linea = date('Y-m-d H:i:s')
        . ' resultado=' . ($ok ? 'enviado' : 'fallo')
        . ' destino=' . strtolower(trim((string) $para))
        . ' detalle=' . sitraina_limpiar_texto_correo($detalle, $clave)
        . PHP_EOL;
    @file_put_contents($carpeta . '/correo.log', $linea, FILE_APPEND | LOCK_EX);
}

function sitraina_correo_nuevo() {
    $smtp = sitraina_config_correo();
    if (!$smtp || !sitraina_cargar_phpmailer()) {
        return null;
    }
    $mail = new \PHPMailer\PHPMailer\PHPMailer(true);
    $mail->isSMTP();
    $mail->Host = $smtp['host'];
    $mail->SMTPAuth = true;
    $mail->Username = $smtp['usuario'];
    $mail->Password = $smtp['clave'];
    $mail->SMTPSecure = $smtp['cifrado'] === 'ssl'
        ? \PHPMailer\PHPMailer\PHPMailer::ENCRYPTION_SMTPS
        : \PHPMailer\PHPMailer\PHPMailer::ENCRYPTION_STARTTLS;
    $mail->Port = $smtp['puerto'];
    $mail->CharSet = 'UTF-8';
    $mail->Timeout = 15;
    $mail->SMTPDebug = 0;
    $mail->setFrom($smtp['de'], $smtp['de_nombre']);
    return $mail;
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
        sitraina_registrar_correo($para, false, 'destino no válido');
        return false;
    }

    $smtp = sitraina_config_correo();
    if (!$smtp) {
        sitraina_registrar_correo($para, false, 'faltan credenciales SMTP en el entorno o en config_correo.php');
        return false;
    }
    $nombrePara = trim((string) $nombrePara);
    try {
        $mail = sitraina_correo_nuevo();
        if (!$mail) {
            sitraina_registrar_correo($para, false, 'no se pudo cargar PHPMailer', $smtp['clave']);
            return false;
        }
        $mail->addAddress($para, $nombrePara !== '' ? $nombrePara : $para);
        $mail->addReplyTo($smtp['de'], $smtp['de_nombre']);
        $mail->isHTML(true);
        $mail->Subject = $asunto;
        $mail->Body = nl2br(htmlspecialchars($cuerpoTexto, ENT_QUOTES, 'UTF-8'));
        $mail->AltBody = $cuerpoTexto;
        $mail->send();
        sitraina_registrar_correo($para, true, 'aceptado por ' . $smtp['host'] . ':' . $smtp['puerto'], $smtp['clave']);
        return true;
    } catch (\Throwable $e) {
        sitraina_registrar_correo($para, false, $e->getMessage(), $smtp['clave']);
        return false;
    }
}
