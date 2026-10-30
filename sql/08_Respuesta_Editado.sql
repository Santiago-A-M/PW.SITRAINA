-- Marca las respuestas que el admin volvió a enviar.
-- Ejecutalo en phpMyAdmin, base if0_43158097_Info_Respuestas.
-- Si una sentencia falla porque la columna ya existe, omitila y seguí.

ALTER TABLE Respuesta_Contacto
  ADD COLUMN editado TINYINT(1) NOT NULL DEFAULT 0 AFTER respuesta;

ALTER TABLE Respuesta_Afiliacion
  ADD COLUMN editado TINYINT(1) NOT NULL DEFAULT 0 AFTER respuesta;

ALTER TABLE Respuesta_Asesoria
  ADD COLUMN editado TINYINT(1) NOT NULL DEFAULT 0 AFTER respuesta;
