-- Lista de personas afiliadas a SITRAINA.
-- Sirve para comprobar si la cédula y el correo escritos en la cita
-- pertenecen a alguien afiliado y activo.
--
-- MySQL 8 o MariaDB 10.2 o posterior.
-- Ejecutar dentro de la base ya creada en el panel del hosting.

CREATE TABLE IF NOT EXISTS afiliados (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  cedula CHAR(9) NOT NULL,
  correo VARCHAR(120) NOT NULL,
  activo TINYINT(1) NOT NULL DEFAULT 1,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_afiliados_cedula (cedula),
  UNIQUE KEY uk_afiliados_correo (correo),
  CONSTRAINT chk_afiliados_cedula CHECK (cedula REGEXP '^[0-9]{9}$')
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Alta de una persona afiliada. Cédula: solo 9 dígitos. Correo: en minúsculas.
-- INSERT INTO afiliados (cedula, correo)
-- VALUES ('101110111', 'persona@ina.ac.cr');

-- La persona está afiliada solo si la cédula y el correo coinciden y sigue activa.
-- SELECT id
-- FROM afiliados
-- WHERE cedula = '101110111'
--   AND correo = LOWER('persona@ina.ac.cr')
--   AND activo = 1;

-- Dar de baja sin borrar el registro:
-- UPDATE afiliados SET activo = 0 WHERE cedula = '101110111';
