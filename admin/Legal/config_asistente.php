<?php
/* Clave del asistente del panel de abogados. Dejala vacía hasta pegar la del proveedor.
   No la subas a un repositorio público. Ver config_asistente.ejemplo.php. */

if (isset($_SERVER['SCRIPT_FILENAME']) && realpath((string) $_SERVER['SCRIPT_FILENAME']) === realpath(__FILE__)) {
    http_response_code(404);
    exit;
}

return [
    'url' => 'https://api.groq.com/openai/v1/chat/completions',
    'modelo' => 'llama-3.3-70b-versatile',
    'clave' => '',
];
