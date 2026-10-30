-- BASE: if0_43158097_Info_Afiliados
-- Ejecutalo una vez en phpMyAdmin, sobre Info_Afiliados.
-- creado_en era TIMESTAMP: phpMyAdmin lo muestra en la zona del servidor
-- y queda una hora atrás de Costa Rica. DATETIME guarda la hora tal cual.

SET time_zone = '-06:00';

ALTER TABLE Cuenta
  MODIFY creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP;
