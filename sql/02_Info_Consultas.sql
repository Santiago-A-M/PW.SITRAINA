-- BASE 2: Info_Consultas
-- InfinityFree: crea la base Info_Consultas → if0_XXXXX_Info_Consultas
-- Pegá el nombre completo en php/config.php
--
-- Guarda TODO lo que envían usuarios desde la página pública.
-- NO guarda afiliados manuales ni respuestas del admin.

CREATE TABLE IF NOT EXISTS Consulta_Contacto (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  nombre VARCHAR(120) NOT NULL,
  correo VARCHAR(120) NOT NULL,
  asunto VARCHAR(120) NOT NULL DEFAULT '',
  mensaje TEXT NOT NULL,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_consulta_contacto_creado (creado_en)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS Consulta_Afiliacion (
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
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_consulta_afiliacion_cedula (cedula)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS Consulta_Asesoria (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  fecha CHAR(10) NOT NULL,
  hora CHAR(5) NOT NULL,
  cedula CHAR(9) NOT NULL DEFAULT '',
  persona VARCHAR(120) NOT NULL DEFAULT '',
  correo VARCHAR(120) NOT NULL DEFAULT '',
  motivo VARCHAR(800) NOT NULL DEFAULT '',
  notas VARCHAR(800) NOT NULL DEFAULT '',
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_consulta_asesoria_fecha_hora (fecha, hora)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
