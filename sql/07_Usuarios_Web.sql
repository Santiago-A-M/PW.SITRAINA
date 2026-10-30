-- BASE 5: Usuarios_Web
-- InfinityFree: if0_43158097_Usuario_Web
-- La conexión está en php/config_usuarios.php
--
-- Tabla: Usuario_Web (login).
-- Las respuestas que ve la persona salen de Info_Respuestas.
-- Solo si envió el formulario con la sesión iniciada y con el correo de Usuario_Web.
-- No reutiliza Info_Afiliados.Cuenta.
-- Bandeja_Mensaje ya no se usa.

CREATE TABLE IF NOT EXISTS Usuario_Web (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  nombre VARCHAR(120) NOT NULL,
  correo VARCHAR(120) NOT NULL,
  cedula CHAR(9) NULL,
  activo TINYINT(1) NOT NULL DEFAULT 1,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_usuario_web_correo (correo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Si la tabla vieja todavía tiene clave_hash, esta línea la quita.
ALTER TABLE Usuario_Web DROP COLUMN IF EXISTS clave_hash;

DROP TABLE IF EXISTS Bandeja_Mensaje;
