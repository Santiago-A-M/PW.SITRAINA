-- Info_Consultas: quién ya vio un aviso.
-- No copia consultas ni respuestas. La marca identifica el hecho
-- (nuevo, estado, cancelado u horario) de un registro que ya existe.
-- Si el CREATE falla porque la tabla ya existe, no hace falta repetirlo.

CREATE TABLE IF NOT EXISTS Notificacion_Leida (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  audiencia ENUM('admin', 'abogado', 'usuario') NOT NULL,
  cuenta VARCHAR(120) NOT NULL,
  tipo VARCHAR(32) NOT NULL,
  origen_id INT UNSIGNED NOT NULL,
  marca VARCHAR(80) NOT NULL,
  leido_en DATETIME NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_notificacion_leida (audiencia, cuenta, tipo, origen_id, marca),
  KEY idx_notificacion_leida_quien (audiencia, cuenta, leido_en)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
