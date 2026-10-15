-- Cuentas fijas del área de administración.
-- Esta base es distinta de la de afiliados.
-- Créala en el panel de InfinityFree, en MySQL Databases,
-- y ejecuta este archivo dentro de esa base.
-- No agrega CREATE DATABASE ni USE.
--
-- Desde la página no se pueden crear cuentas.
-- El programador inserta cada usuario y la clave ya cifrada.

CREATE TABLE IF NOT EXISTS cuentas (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  usuario VARCHAR(60) NOT NULL,
  clave_hash VARCHAR(255) NOT NULL,
  activo TINYINT(1) NOT NULL DEFAULT 1,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_cuentas_usuario (usuario)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Alta de una cuenta. Cambia el usuario y pega el hash que genera admin/generar.php.
-- INSERT INTO cuentas (usuario, clave_hash)
-- VALUES ('nombre', 'EL_HASH');

-- Cerrar el acceso sin borrar la fila:
-- UPDATE cuentas SET activo = 0 WHERE usuario = 'nombre';

-- Meses, días y horas que el administrador deja disponibles.
-- La hora se guarda en 24 horas, con minutos: 09:30 o 14:05.
-- Si no hay filas, la cita sigue en días hábiles, de 07:00 a 14:00, por 3 meses.
-- Cuando hay un mes disponible, en la página solo se abren los días marcados de esos meses.
-- Una cita ya enviada queda en esta tabla. El reloj del panel sale de aquí.
-- fecha es AAAA-MM-DD y hora es HH:MM, en 24 horas.

CREATE TABLE IF NOT EXISTS citas (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  fecha CHAR(10) NOT NULL,
  hora CHAR(5) NOT NULL,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_citas_fecha_hora (fecha, hora)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS agenda (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  tipo ENUM('fecha', 'mes', 'hora') NOT NULL,
  valor VARCHAR(10) NOT NULL,
  estado ENUM('abierta', 'bloqueada', 'ocupada') NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_agenda_tipo_valor (tipo, valor)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Si agenda ya existía, esta línea permite marcar un día como ocupado.
ALTER TABLE agenda MODIFY estado ENUM('abierta', 'bloqueada', 'ocupada') NOT NULL;
