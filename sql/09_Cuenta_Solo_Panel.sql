-- BASE: if0_43158097_Info_Afiliados
-- Ejecutá esto una vez en phpMyAdmin, sobre Info_Afiliados.
-- En la casilla Delimiter poné // y ejecutá el archivo completo.
-- Después de esto, INSERT, UPDATE y DELETE en Cuenta se rechazan
-- si no vienen del panel de administración.

DROP TRIGGER IF EXISTS cuenta_solo_panel_insert //
CREATE TRIGGER cuenta_solo_panel_insert
BEFORE INSERT ON Cuenta
FOR EACH ROW
BEGIN
  IF IFNULL(@sitraina_panel, '') <> '1' THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Cuenta solo se modifica desde el panel de administracion.';
  END IF;
END //

DROP TRIGGER IF EXISTS cuenta_solo_panel_update //
CREATE TRIGGER cuenta_solo_panel_update
BEFORE UPDATE ON Cuenta
FOR EACH ROW
BEGIN
  IF IFNULL(@sitraina_panel, '') <> '1' THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Cuenta solo se modifica desde el panel de administracion.';
  END IF;
END //

DROP TRIGGER IF EXISTS cuenta_solo_panel_delete //
CREATE TRIGGER cuenta_solo_panel_delete
BEFORE DELETE ON Cuenta
FOR EACH ROW
BEGIN
  IF IFNULL(@sitraina_panel, '') <> '1' THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Cuenta solo se modifica desde el panel de administracion.';
  END IF;
END //
