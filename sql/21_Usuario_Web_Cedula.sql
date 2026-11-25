-- Usuarios_Web / Usuario_Web
-- La cédula pasa a ser la clave de ingreso; el correo queda opcional.
-- Ejecutar en phpMyAdmin sobre la base Usuarios_Web.

ALTER TABLE Usuario_Web
  MODIFY correo VARCHAR(120) NULL DEFAULT NULL;

-- Completá cédulas faltantes solo si ya tenés un valor confiable; si no, revisá esas filas a mano.
-- Luego hacé la cédula obligatoria y única:

ALTER TABLE Usuario_Web
  MODIFY cedula CHAR(9) NOT NULL;

ALTER TABLE Usuario_Web
  ADD UNIQUE KEY uk_usuario_web_cedula (cedula);
