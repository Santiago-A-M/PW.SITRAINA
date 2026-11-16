-- Plazo para volver a agendar una cita cancelada por la persona.
-- cancelado_en guarda la fecha y la hora de la cancelación, en hora de Costa Rica.
-- El plazo es de 360 horas exactas desde ese momento.
-- No cierra el calendario ni borra filas.
-- Hay que ejecutarlo una vez en la base if0_43158097_Info_Consultas.

ALTER TABLE Consulta_Asesoria
  ADD COLUMN cancelado_en DATETIME NULL DEFAULT NULL;
