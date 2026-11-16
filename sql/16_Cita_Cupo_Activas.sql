-- Cupo de las citas que ya tienen día y hora y siguen activas.
-- Base: if0_43158097_Info_Consultas (phpMyAdmin de InfinityFree).
-- No borra filas. Una cita cancelada o rechazada deja el horario libre.
-- Si un ALTER dice que la columna o el índice ya existen, omití esa línea y seguí.
-- La respuesta rechazada está en if0_43158097_Info_Respuestas.
-- Si ese nombre no coincide con el servidor, cambialo antes de ejecutar.

ALTER TABLE Consulta_Asesoria
  ADD COLUMN cupo_activo VARCHAR(16) NULL DEFAULT NULL;

ALTER TABLE Consulta_Asesoria
  ADD COLUMN cancelado_en DATETIME NULL DEFAULT NULL;

UPDATE Consulta_Asesoria
SET hora = CONCAT('0', hora)
WHERE hora REGEXP '^[0-9]:[0-5][0-9]$';

UPDATE Consulta_Asesoria
SET cupo_activo = NULL
WHERE cancelado_en IS NOT NULL
  AND cupo_activo IS NOT NULL;

UPDATE Consulta_Asesoria AS c
INNER JOIN if0_43158097_Info_Respuestas.Respuesta_Asesoria AS r
  ON r.origen_id = c.id AND r.estado = 'rechazada'
SET c.cupo_activo = NULL
WHERE c.cupo_activo IS NOT NULL;

DROP TEMPORARY TABLE IF EXISTS tmp_cupo_cita;

CREATE TEMPORARY TABLE tmp_cupo_cita (
  id INT UNSIGNED NOT NULL PRIMARY KEY,
  cupo VARCHAR(16) NOT NULL,
  UNIQUE KEY uk_tmp_cupo_cita (cupo)
);

INSERT INTO tmp_cupo_cita (id, cupo)
SELECT MIN(c.id), CONCAT(c.fecha, ' ', c.hora)
FROM Consulta_Asesoria AS c
WHERE c.cancelado_en IS NULL
  AND c.fecha REGEXP '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
  AND c.hora REGEXP '^[0-2][0-9]:[0-5][0-9]$'
  AND NOT EXISTS (
    SELECT 1
    FROM if0_43158097_Info_Respuestas.Respuesta_Asesoria AS r
    WHERE r.origen_id = c.id AND r.estado = 'rechazada'
  )
GROUP BY c.fecha, c.hora;

UPDATE Consulta_Asesoria AS c
LEFT JOIN tmp_cupo_cita AS t ON t.id = c.id
SET c.cupo_activo = NULL
WHERE t.id IS NULL
  AND c.cupo_activo IS NOT NULL;

UPDATE Consulta_Asesoria AS c
INNER JOIN tmp_cupo_cita AS t ON t.id = c.id
SET c.fecha = SUBSTRING(t.cupo, 1, 10),
    c.hora = SUBSTRING(t.cupo, 12, 5),
    c.cupo_activo = t.cupo;

DROP TEMPORARY TABLE IF EXISTS tmp_cupo_cita;

ALTER TABLE Consulta_Asesoria
  ADD UNIQUE KEY uk_consulta_asesoria_cupo (cupo_activo);

-- El índice viejo impedía guardar varias solicitudes sin fecha.
-- Si phpMyAdmin dice que no existe, omití esta línea.
ALTER TABLE Consulta_Asesoria
  DROP INDEX uk_consulta_asesoria_fecha_hora;
