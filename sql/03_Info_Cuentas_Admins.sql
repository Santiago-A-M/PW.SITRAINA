-- BASE 3: Info_Cuentas_Admins
-- InfinityFree: crea la base Info_Cuentas_Admins → if0_XXXXX_Info_Cuentas_Admins
-- Pegá el nombre completo en admin/config.php
--
-- Admin_Info: quién puede entrar al panel (admin/index.php).
-- sitraina@ina.ac.cr: cedula NULL (no se pide cédula al entrar).
-- Otras cuentas: cedula obligatoria.
--
-- Agenda: horarios del panel (sección Horario). Necesaria para citas.

CREATE TABLE IF NOT EXISTS Admin_Info (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  cedula CHAR(9) NULL DEFAULT NULL,
  cuenta VARCHAR(120) NOT NULL,
  clave_hash VARCHAR(255) NOT NULL,
  activo TINYINT(1) NOT NULL DEFAULT 1,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_admin_info_cuenta (cuenta),
  UNIQUE KEY uk_admin_info_cedula (cedula)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Generá los hash con admin/generar.php y descomentá:
-- INSERT INTO Admin_Info (cedula, cuenta, clave_hash) VALUES
-- (NULL, 'sitraina@ina.ac.cr', 'HASH_SITRAINA'),
-- ('120360070', 'santiagoabarcamateo@gmail.com', 'HASH_SANTIAGO');

CREATE TABLE IF NOT EXISTS Agenda (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  tipo ENUM('fecha', 'mes', 'hora') NOT NULL,
  valor VARCHAR(10) NOT NULL,
  estado ENUM('abierta', 'bloqueada', 'ocupada') NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_agenda_tipo_valor (tipo, valor)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
