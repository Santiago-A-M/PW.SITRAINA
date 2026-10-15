-- Boletas enviadas desde el formulario de afiliación.
-- Es otra tabla, dentro de la misma base que afiliaciones.
-- afiliaciones sigue siendo la lista para comprobar la cita.
-- Aquí se guarda lo que la persona escribe. La fecha de envío se llena sola.
-- Una cédula no puede enviar la boleta otra vez.
--
-- Ejecutar en la base if0_43158097_afiliaciones, pestaña SQL.

CREATE TABLE IF NOT EXISTS boletas (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  nombre VARCHAR(120) NOT NULL,
  cedula CHAR(9) NOT NULL,
  correo_ina VARCHAR(120) NULL,
  correo_personal VARCHAR(120) NULL,
  fecha_nacimiento DATE NULL,
  nombramiento VARCHAR(80) NULL,
  unidad VARCHAR(120) NULL,
  centro VARCHAR(120) NULL,
  puesto VARCHAR(120) NULL,
  telefono_trabajo VARCHAR(20) NULL,
  telefono_domicilio VARCHAR(20) NULL,
  telefono_celular VARCHAR(20) NULL,
  enviado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_boletas_cedula (cedula),
  CONSTRAINT chk_boletas_cedula CHECK (cedula REGEXP '^[0-9]{9}$')
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
