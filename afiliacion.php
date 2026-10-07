<?php
require('fpdf/fpdf.php'); // Asegúrate de tener la librería FPDF

if($_SERVER["REQUEST_METHOD"] == "POST"){
    // Capturar datos del formulario
    $nombre = htmlspecialchars(trim($_POST['nombre'] ?? ''), ENT_QUOTES, 'UTF-8');
    $cedula = htmlspecialchars(trim($_POST['cedula'] ?? ''), ENT_QUOTES, 'UTF-8');
    $correo_ina = htmlspecialchars(trim($_POST['correo_ina'] ?? ''), ENT_QUOTES, 'UTF-8');
    $correo_personal = htmlspecialchars(trim($_POST['correo_personal'] ?? ''), ENT_QUOTES, 'UTF-8');
    $fecha_nacimiento = htmlspecialchars(trim($_POST['fecha_nacimiento'] ?? ''), ENT_QUOTES, 'UTF-8');
    $nombramiento = htmlspecialchars(trim($_POST['nombramiento'] ?? ''), ENT_QUOTES, 'UTF-8');
    $unidad = htmlspecialchars(trim($_POST['unidad'] ?? ''), ENT_QUOTES, 'UTF-8');
    $centro = htmlspecialchars(trim($_POST['centro'] ?? ''), ENT_QUOTES, 'UTF-8');
    $puesto = htmlspecialchars(trim($_POST['puesto'] ?? ''), ENT_QUOTES, 'UTF-8');
    $telefono_trabajo = htmlspecialchars(trim($_POST['telefono_trabajo'] ?? ''), ENT_QUOTES, 'UTF-8');
    $telefono_domicilio = htmlspecialchars(trim($_POST['telefono_domicilio'] ?? ''), ENT_QUOTES, 'UTF-8');
    $telefono_celular = htmlspecialchars(trim($_POST['telefono_celular'] ?? ''), ENT_QUOTES, 'UTF-8');

    // Crear PDF
    $pdf = new FPDF();
    $pdf->AddPage();
    $pdf->SetFont('Arial','B',16);
    $pdf->Cell(0,10,utf8_decode("Boleta de Afiliación SITRAINA"),0,1,'C');
    $pdf->Ln(10);

    $pdf->SetFont('Arial','',12);
    $pdf->Cell(0,10,"Nombre: $nombre",0,1);
    $pdf->Cell(0,10,"Cedula: $cedula",0,1);
    $pdf->Cell(0,10,"Correo INA: $correo_ina",0,1);
    $pdf->Cell(0,10,"Correo personal: $correo_personal",0,1);
    $pdf->Cell(0,10,"Fecha de nacimiento: $fecha_nacimiento",0,1);
    $pdf->Cell(0,10,"Nombramiento: $nombramiento",0,1);
    $pdf->Cell(0,10,"Unidad regional: $unidad",0,1);
    $pdf->Cell(0,10,"Centro o nucleo: $centro",0,1);
    $pdf->Cell(0,10,"Puesto: $puesto",0,1);
    $pdf->Cell(0,10,"Telefono trabajo: $telefono_trabajo",0,1);
    $pdf->Cell(0,10,"Telefono domicilio: $telefono_domicilio",0,1);
    $pdf->Cell(0,10,"Telefono celular: $telefono_celular",0,1);

    $pdf->Ln(15);
    $pdf->MultiCell(0,10,utf8_decode("Autorizo a la Unidad de Recursos Humanos del INA..."));

    // Guardar PDF temporalmente en el servidor
    $pdfFile = "Afiliacion_SITRAINA_" . time() . ".pdf";
    $pdf->Output('F', $pdfFile);

    // Mostrar mensaje en la web
    echo "<h2>✅ Afiliación registrada</h2>";
    echo "<p>Tu boleta de afiliación se ha generado en PDF y está lista para descargar.</p>";
    echo "<p><strong>Por favor, descárgala y fírmala con la aplicación Gaudi usando tu certificado digital.</strong></p>";
    echo "<a href='$pdfFile' download>📥 Descargar PDF de Afiliación</a>";
}
?>

