-- Solicitudes de cita sin día elegido.
-- La fecha se escribe cuando un administrador acepta y elige un día hábil.
-- Hay que ejecutarlo una vez en la base if0_43158097_Info_Consultas.
-- No borra filas. Varias solicitudes sin fecha pueden convivir: en MySQL, UNIQUE permite varios NULL.

ALTER TABLE Consulta_Asesoria
  MODIFY fecha CHAR(10) NULL DEFAULT NULL,
  MODIFY hora CHAR(5) NULL DEFAULT NULL;
