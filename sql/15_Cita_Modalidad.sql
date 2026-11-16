-- Modalidad de la cita de asesoría: presencial o virtual.
-- Hay que ejecutarlo una vez en la base if0_43158097_Info_Consultas.
-- No borra filas. Las citas anteriores quedan con modalidad vacía.

ALTER TABLE Consulta_Asesoria
  ADD COLUMN modalidad ENUM('presencial', 'virtual') NULL DEFAULT NULL;
