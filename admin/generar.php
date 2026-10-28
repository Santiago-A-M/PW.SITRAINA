<?php
/* Cifra una clave y la muestra para copiarla en phpMyAdmin. No crea la cuenta.
   El primer hash, si aún no hay sesión, se genera en PHP CLI:
   php -r "echo password_hash('clave', PASSWORD_DEFAULT), PHP_EOL;" */
require __DIR__ . '/sesion.php';

if (empty($_SESSION['admin_usuario'])) {
    header('Location: index.php');
    exit;
}

$hash = '';
$aviso = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $token = (string) ($_POST['token'] ?? '');
    $clave = (string) ($_POST['clave'] ?? '');
    if (!hash_equals(token_admin(), $token)) {
        $aviso = 'Vuelve a enviar el formulario.';
    } elseif ($clave === '') {
        $aviso = 'Escribe la clave que quieres cifrar.';
    } else {
        $hash = password_hash($clave, PASSWORD_DEFAULT);
    }
}

vista('generar.html', [
    'token' => token_admin(),
    'aviso' => $aviso,
    'hash' => $hash,
]);
