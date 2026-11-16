-- Separa al administrador general del abogado de asesoría.
-- Hay que ejecutarlo una vez en la base if0_43158097_Info_Cuentas_Admins.
-- Las cuentas que ya existen quedan como administrador general.
-- No borra filas.

ALTER TABLE Admin_Info
  ADD COLUMN rol ENUM('admin', 'abogado') NOT NULL DEFAULT 'admin';

-- Para convertir una cuenta en abogado, cambiá el correo y ejecutá solo esta línea:
-- UPDATE Admin_Info SET rol = 'abogado' WHERE cuenta = 'correo-del-abogado@ejemplo.com';
