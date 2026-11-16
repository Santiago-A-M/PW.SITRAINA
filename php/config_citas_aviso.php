<?php
/* Correos que reciben el aviso cuando un afiliado reserva una cita.
   Si existen CITA_CORREO_ABOGADO y CITA_CORREO_SECRETARIA, esas tienen prioridad.
   El afiliado se avisa a su propio correo. Dejá vacío el que todavía no corresponda. */

return [
    'abogado' => '',
    'secretaria' => '',
];
