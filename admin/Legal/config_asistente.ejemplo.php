<?php
/* Copiá este archivo como config_asistente.php y pegá la clave ahí.
   No la pongas en JavaScript ni en el HTML.
   También podés definir la variable de entorno SITRAINA_ASISTENTE_CLAVE.

   El panel llama a una API compatible con el formato de chat de OpenAI.
   Opción prevista: Groq, en https://console.groq.com/ , modelo llama-3.3-70b-versatile.
   La dirección tiene que ser HTTPS. InfinityFree tiene que permitir esa salida.
   Si preferís otro proveedor, cambiá url y modelo. La clave viaja solo de PHP al proveedor. */

if (isset($_SERVER['SCRIPT_FILENAME']) && realpath((string) $_SERVER['SCRIPT_FILENAME']) === realpath(__FILE__)) {
    http_response_code(404);
    exit;
}

return [
    'url' => 'https://api.groq.com/openai/v1/chat/completions',
    'modelo' => 'llama-3.3-70b-versatile',
    'clave' => '',
];
