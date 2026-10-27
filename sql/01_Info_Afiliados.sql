-- BASE 1: Info_Afiliados
-- InfinityFree: crea la base con nombre Info_Afiliados
-- (quedará como if0_XXXXX_Info_Afiliados). Pegá ese nombre en php/config_afiliados.php
--
-- Tabla Cuenta: SOLO carga manual en phpMyAdmin (admins).
-- NO la llenan los formularios públicos.
-- Sirve para validar la puerta de Solicitar cita (cédula + nombre completo + correo).

CREATE TABLE IF NOT EXISTS Cuenta (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  cedula CHAR(9) NOT NULL,
  nombre_completo VARCHAR(120) NOT NULL,
  correo VARCHAR(120) NOT NULL,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_cuenta_cedula (cedula),
  UNIQUE KEY uk_cuenta_correo (correo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Ejemplo de carga manual:
-- INSERT INTO Cuenta (cedula, nombre_completo, correo) VALUES
-- ('123456789', 'Nombre Apellido', 'persona@correo.com');
