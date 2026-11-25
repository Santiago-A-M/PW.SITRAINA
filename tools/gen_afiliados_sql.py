# -*- coding: utf-8 -*-
import csv
import re
from pathlib import Path

raiz = Path(__file__).resolve().parents[1]
src = raiz / "Base-de-datos-de-afiliados-al-nov-actual.csv"
out = raiz / "sql" / "20_Cuenta_Afiliados_Nov.sql"

rows = []
with src.open("r", encoding="utf-8-sig", newline="") as f:
    reader = csv.DictReader(f)
    for r in reader:
        ced = re.sub(r"\D", "", (r.get("Cédula (Sin guiones)") or r.get("Cedula (Sin guiones)") or ""))
        if len(ced) != 9:
            continue
        nom = (r.get("Nombre Completo") or "").strip()
        sede = (r.get("Sede / Regional") or "").strip()
        est = (r.get("Estado") or "").strip().upper()
        rows.append((ced, nom, sede, est))


def esc(s):
    return s.replace("\\", "\\\\").replace("'", "''")


chunks = []
for i in range(0, len(rows), 80):
    part = rows[i : i + 80]
    vals = ",\n".join(
        "('%s', '%s', NULL, '%s', '%s')" % (c, esc(n), esc(s), esc(e)) for c, n, s, e in part
    )
    chunks.append(
        "INSERT INTO Cuenta (cedula, nombre_completo, correo, sede_regional, estado) VALUES\n"
        + vals
        + "\nON DUPLICATE KEY UPDATE\n"
        + "  nombre_completo = VALUES(nombre_completo),\n"
        + "  sede_regional = VALUES(sede_regional),\n"
        + "  estado = VALUES(estado);"
    )

header = (
    "-- BASE: Info_Afiliados\n"
    "-- Ejecutar DESPUES de sql/19_Cuenta_Sede_Estado.sql\n"
    "-- Si hay triggers de solo-panel, en phpMyAdmin correr primero:\n"
    "-- SET @sitraina_panel = '1';\n"
    "-- Filas: %d\n\n" % len(rows)
)
out.write_text(header + "\n\n".join(chunks) + "\n", encoding="utf-8")
print("rows", len(rows), "file", out)
