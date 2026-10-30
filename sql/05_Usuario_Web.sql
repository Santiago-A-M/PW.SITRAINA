-- Info_Consultas: vincular solicitudes a una cuenta de Usuarios_Web.
-- Ejecutar en phpMyAdmin sobre Info_Consultas (if0_XXXXX_Info_Consultas).
-- La tabla de cuentas es Usuario_Web en Usuarios_Web (sql/07_Usuarios_Web.sql).
-- Si un ALTER falla porque la columna ya existe, omití esa sentencia y seguí.

ALTER TABLE Consulta_Contacto
  ADD COLUMN usuario_id INT UNSIGNED NULL AFTER mensaje,
  ADD KEY idx_consulta_contacto_usuario (usuario_id);

ALTER TABLE Consulta_Afiliacion
  ADD COLUMN usuario_id INT UNSIGNED NULL AFTER telefono_celular,
  ADD KEY idx_consulta_afiliacion_usuario (usuario_id);

ALTER TABLE Consulta_Asesoria
  ADD COLUMN usuario_id INT UNSIGNED NULL AFTER notas,
  ADD KEY idx_consulta_asesoria_usuario (usuario_id);
