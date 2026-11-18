-- Foto opcional de la persona afiliada (ruta relativa bajo la raíz del sitio).
-- Si la columna ya existe, omití esta sentencia.

ALTER TABLE Cuenta
  ADD COLUMN foto VARCHAR(255) NULL DEFAULT NULL AFTER correo;
