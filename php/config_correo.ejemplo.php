<?php
/* Ejemplo sin claves. En el servidor, copiá este archivo como config_correo.php
   o definí estas variables de entorno: SMTP_HOST, SMTP_PUERTO, SMTP_CIFRADO,
   SMTP_USUARIO, SMTP_CLAVE, SMTP_DE y SMTP_DE_NOMBRE.
   Las variables de entorno tienen prioridad. No pongas la contraseña en el código. */

return [
    'host' => 'smtp.gmail.com',
    'puerto' => 587,
    'cifrado' => 'tls',
    'usuario' => '',
    'clave' => '',
    'de' => '',
    'de_nombre' => 'SITRAINA',
];
