-- BASE: Info_Afiliados (if0_XXXXX_Info_Afiliados)
-- Ejecutá esto UNA vez en phpMyAdmin, sobre Info_Afiliados, ANTES del import del CSV.
-- Agrega sede/regional y estado; el correo pasa a opcional (el padrón no trae correo).

ALTER TABLE Cuenta
  MODIFY correo VARCHAR(120) NULL DEFAULT NULL,
  ADD COLUMN sede_regional VARCHAR(160) NULL DEFAULT NULL AFTER correo,
  ADD COLUMN estado VARCHAR(40) NULL DEFAULT NULL AFTER sede_regional;
