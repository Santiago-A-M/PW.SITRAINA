<?php
mysqli_report(MYSQLI_REPORT_OFF);

function h($texto) {
    return htmlspecialchars((string) $texto, ENT_QUOTES, 'UTF-8');
}

function pagina($titulo, $mensaje, $volver) {
    echo '<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">';
    echo '<meta name="viewport" content="width=device-width, initial-scale=1.0">';
    echo '<title>' . h($titulo) . '</title>';
    echo '<link rel="stylesheet" href="../css/estilo.css?v=2.37">';
    echo '</head><body><main class="contenedor" style="padding:120px 20px 60px">';
    echo '<h1>' . h($titulo) . '</h1><p>' . h($mensaje) . '</p>';
    echo '<p><a class="btn" href="' . h($volver) . '">Volver</a></p>';
    echo '</main></body></html>';
    exit;
}

function destino($accion) {
    if ($accion === 'verificar') {
        return '../solicitar-cita.html?enviada=1';
    }
    return '../afiliacion.html?enviada=1';
}

function volver($accion) {
    if ($accion === 'verificar') {
        return '../solicitar-cita.html';
    }
    return '../afiliacion.html';
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    pagina('Afiliados', 'Esta dirección solo recibe el formulario.', '../afiliacion.html');
}

$accion = $_POST['accion'] ?? '';
$cedula = preg_replace('/\D/', '', (string) ($_POST['cedula'] ?? ''));
$correo = strtolower(trim((string) ($_POST['correo'] ?? '')));
if ($correo === '') {
    $correo = strtolower(trim((string) ($_POST['correo_personal'] ?? '')));
}
if ($correo === '') {
    $correo = strtolower(trim((string) ($_POST['correo_ina'] ?? '')));
}
if ($correo === '') {
    $correo = strtolower(trim((string) ($_POST['email'] ?? '')));
}

if (!preg_match('/^[0-9]{9}$/', $cedula)) {
    pagina('Cédula', 'La cédula debe tener 9 dígitos.', volver($accion));
}
if (!preg_match('/^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9\-]+(?:\.[a-zA-Z0-9\-]+)*\.[a-zA-Z]{2,}$/', $correo)) {
    pagina('Correo', 'Escribe un correo válido.', volver($accion));
}

$configArchivo = __DIR__ . '/config.php';
if (!is_file($configArchivo)) {
    pagina('Base de datos', 'Falta php/config.php en el servidor.', volver($accion));
}

try {
    $config = require $configArchivo;
    $mysqli = new mysqli($config['host'], $config['usuario'], $config['clave'], $config['nombre']);
} catch (Throwable $e) {
    pagina('Base de datos', 'No se pudo conectar. Revisa el host, el nombre, el usuario y la clave en config.php.', volver($accion));
}
if ($mysqli->connect_errno) {
    pagina('Base de datos', 'No se pudo conectar: ' . $mysqli->connect_error, volver($accion));
}
$mysqli->set_charset('utf8mb4');

if ($accion === 'verificar') {
    $consulta = $mysqli->prepare('SELECT id FROM afiliados WHERE cedula = ? AND correo = ? AND activo = 1 LIMIT 1');
    if (!$consulta) {
        $error = $mysqli->error;
        $mysqli->close();
        pagina('Afiliación', 'No se pudo consultar la tabla afiliados. ' . $error, volver($accion));
    }
    $consulta->bind_param('ss', $cedula, $correo);
    $consulta->execute();
    $consulta->store_result();
    $encontrado = $consulta->num_rows === 1;
    $consulta->close();
    $mysqli->close();
    if (!$encontrado) {
        pagina('Solicitud no procedente', 'Esa cédula y ese correo no figuran como persona afiliada activa.', volver($accion));
    }
    if (!reenviarCorreo()) {
        pagina('Correo', 'La persona sí está afiliada, pero el correo de la cita no se pudo enviar.', volver($accion));
    }
    header('Location: ' . destino($accion));
    exit;
}

if ($accion === 'guardar') {
    $consulta = $mysqli->prepare('SELECT cedula, correo FROM afiliados WHERE cedula = ? OR correo = ?');
    if (!$consulta) {
        $error = $mysqli->error;
        $mysqli->close();
        pagina('Afiliación', 'No se pudo consultar la tabla afiliados. ' . $error, volver($accion));
    }
    $consulta->bind_param('ss', $cedula, $correo);
    $consulta->execute();
    $consulta->bind_result($cedulaFila, $correoFila);
    $existeCedula = false;
    $correoOcupado = false;
    while ($consulta->fetch()) {
        if ($cedulaFila === $cedula) {
            $existeCedula = true;
        } elseif ($correoFila === $correo) {
            $correoOcupado = true;
        }
    }
    $consulta->close();

    if ($correoOcupado) {
        $mysqli->close();
        pagina('Afiliación', 'Ese correo ya está registrado con otra cédula.', volver($accion));
    }

    if ($existeCedula) {
        $cambio = $mysqli->prepare('UPDATE afiliados SET correo = ?, activo = 1 WHERE cedula = ?');
        if ($cambio) {
            $cambio->bind_param('ss', $correo, $cedula);
        }
    } else {
        $cambio = $mysqli->prepare('INSERT INTO afiliados (cedula, correo, activo) VALUES (?, ?, 1)');
        if ($cambio) {
            $cambio->bind_param('ss', $cedula, $correo);
        }
    }
    if (!$cambio) {
        $error = $mysqli->error;
        $mysqli->close();
        pagina('Afiliación', 'No se pudo preparar el guardado. ' . $error, volver($accion));
    }
    $guardado = $cambio->execute();
    $error = $cambio->error;
    $cambio->close();
    $mysqli->close();
    if (!$guardado) {
        pagina('Afiliación', 'No se pudo guardar la afiliación. ' . $error, volver($accion));
    }
    if (!reenviarCorreo()) {
        pagina('Afiliación guardada', 'La cédula y el correo ya quedaron en la base. El correo con el PDF no se pudo enviar.', destino($accion));
    }
    header('Location: ' . destino($accion));
    exit;
}

$mysqli->close();
pagina('Afiliación', 'No se reconoció el formulario.', '../afiliacion.html');

function reenviarCorreo() {
    if (!function_exists('curl_init')) {
        return false;
    }
    $campos = $_POST;
    unset($campos['accion']);
    if (!empty($_FILES['attachment']['tmp_name']) && is_uploaded_file($_FILES['attachment']['tmp_name'])) {
        $campos['attachment'] = new CURLFile(
            $_FILES['attachment']['tmp_name'],
            'application/pdf',
            $_FILES['attachment']['name'] ?: 'afiliacion.pdf'
        );
    }
    $curl = curl_init('https://formsubmit.co/682fee38da5d55209efa8a7d240cf00f');
    curl_setopt_array($curl, [
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => $campos,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_TIMEOUT => 30,
    ]);
    curl_exec($curl);
    $codigo = (int) curl_getinfo($curl, CURLINFO_HTTP_CODE);
    curl_close($curl);
    return $codigo >= 200 && $codigo < 400;
}
