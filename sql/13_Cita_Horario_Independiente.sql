-- Cada cita aprobada ocupa una hora, no el día completo.
-- cupo_activo guarda "YYYY-MM-DD HH:MM" mientras el horario está tomado.
-- Queda NULL si la solicitud está pendiente, rechazada o cancelada.
-- La fecha y la hora de la cita se conservan en el historial.
-- Hay que ejecutarlo una vez en la base if0_43158097_Info_Consultas.
-- No borra filas.

ALTER TABLE Consulta_Asesoria
  ADD COLUMN cupo_activo VARCHAR(16) NULL DEFAULT NULL;

-- No se rellenan aquí las citas viejas: una solicitud pendiente no debe ocupar horario.
-- El panel marca el cupo solo en las citas cuya respuesta ya está aceptada.

ALTER TABLE Consulta_Asesoria
  ADD UNIQUE KEY uk_consulta_asesoria_cupo (cupo_activo);

ALTER TABLE Consulta_Asesoria
  DROP INDEX uk_consulta_asesoria_fecha_hora;
