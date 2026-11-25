-- BASE 1: Info_Afiliados
-- InfinityFree: crea la base con nombre Info_Afiliados
-- (quedará como if0_XXXXX_Info_Afiliados). Pegá ese nombre en php/config_afiliados.php
--
-- Tabla Cuenta: solo se escribe desde el panel de administración.
-- Los formularios públicos no insertan filas aquí.
-- Sirve para validar la puerta de Solicitar cita por cédula y antigüedad (estado).

CREATE TABLE IF NOT EXISTS Cuenta (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  cedula CHAR(9) NOT NULL,
  nombre_completo VARCHAR(120) NOT NULL,
  correo VARCHAR(120) NULL DEFAULT NULL,
  sede_regional VARCHAR(160) NULL DEFAULT NULL,
  estado VARCHAR(40) NULL DEFAULT NULL,
  foto VARCHAR(255) NULL DEFAULT NULL,
  creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_cuenta_cedula (cedula),
  UNIQUE KEY uk_cuenta_correo (correo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- El alta se hace en el panel, sección Usuarios (Añadir afiliado / Ver afiliados).
