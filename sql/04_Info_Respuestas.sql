-- BASE 4: Info_Respuestas
-- InfinityFree: crea la base Info_Respuestas → if0_XXXXX_Info_Respuestas
-- Pegá el nombre completo en admin/config_respuestas.php
--
-- Solo respuestas del admin a consultas de Info_Consultas.
-- origen_id = id en Consulta_Contacto / Consulta_Afiliacion / Consulta_Asesoria.

CREATE TABLE IF NOT EXISTS Respuesta_Contacto (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  origen_id INT UNSIGNED NOT NULL,
  estado ENUM('aceptada', 'rechazada', 'neutral') NOT NULL,
  respuesta TEXT NOT NULL,
  admin_usuario VARCHAR(120) NULL,
  respondido_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_respuesta_contacto_origen (origen_id),
  KEY idx_respuesta_contacto_estado (estado)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS Respuesta_Afiliacion (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  origen_id INT UNSIGNED NOT NULL,
  estado ENUM('aceptada', 'rechazada', 'neutral') NOT NULL,
  respuesta TEXT NOT NULL,
  admin_usuario VARCHAR(120) NULL,
  respondido_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_respuesta_afiliacion_origen (origen_id),
  KEY idx_respuesta_afiliacion_estado (estado)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS Respuesta_Asesoria (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  origen_id INT UNSIGNED NOT NULL,
  estado ENUM('aceptada', 'rechazada', 'neutral') NOT NULL,
  respuesta TEXT NOT NULL,
  admin_usuario VARCHAR(120) NULL,
  respondido_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_respuesta_asesoria_origen (origen_id),
  KEY idx_respuesta_asesoria_estado (estado)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
