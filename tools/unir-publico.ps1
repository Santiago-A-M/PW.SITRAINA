$ErrorActionPreference = 'Stop'
$root = 'c:\Users\SITRAINA\Downloads\PW.SITRAINA'
Set-Location $root
$utf8 = New-Object System.Text.UTF8Encoding $false

function Read-Utf8([string]$rel) {
  return [IO.File]::ReadAllText((Join-Path $root $rel), $utf8)
}
function Extract-ById([string]$html, [string]$id) {
  $m = [regex]::Match($html, ('<div[^>]*id="' + [regex]::Escape($id) + '"[^>]*>'))
  if (-not $m.Success) { throw "no id $id" }
  $pos = $m.Index
  $i = $pos
  $depth = 0
  $len = $html.Length
  while ($i -lt $len) {
    $nextOpen = $html.IndexOf('<div', $i, [StringComparison]::OrdinalIgnoreCase)
    $nextClose = $html.IndexOf('</div>', $i, [StringComparison]::OrdinalIgnoreCase)
    if ($nextClose -lt 0) { throw "unclosed $id" }
    if ($nextOpen -ge 0 -and $nextOpen -lt $nextClose) {
      $depth++
      $i = $nextOpen + 4
    } else {
      $depth--
      $i = $nextClose + 6
      if ($depth -eq 0) {
        return $html.Substring($pos, $i - $pos)
      }
    }
  }
  throw "unclosed $id"
}
function Slice-Between([string]$text, [string]$startMark, [string]$endMark) {
  $i = $text.IndexOf($startMark)
  if ($i -lt 0) { throw "No start: $startMark" }
  $j = $text.IndexOf($endMark, $i)
  if ($j -lt 0) { throw "No end: $endMark" }
  return $text.Substring($i, ($j + $endMark.Length) - $i)
}

$atrasDoc = @'
<a class="btn-atras" href="#documentos" data-public-nav="documentos">
  <span class="btn-atras-icono" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M15 6l-6 6 6 6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></span>
  <span class="btn-atras-texto">Volver a documentos</span>
</a>
'@
$atrasAse = @'
<a class="btn-atras" href="#asesoria" data-public-nav="asesoria">
  <span class="btn-atras-icono" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M15 6l-6 6 6 6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></span>
  <span class="btn-atras-texto">Volver a asesoría</span>
</a>
'@

$quiensomos = Read-Utf8 'quiensomos.html'
$conocenos = Slice-Between $quiensomos '<main class="conocenos">' '</main>'
$conocenos = $conocenos.Replace('<main class="conocenos">', '<main class="conocenos vista-publica" id="vista-conocenos" data-vista-publica="conocenos" hidden>')

$afiliacion = Read-Utf8 'afiliacion.html'
$afiliSec = Slice-Between $afiliacion '<section class="afiliacion">' '</section>'
$afiliSec = $afiliSec.Replace('https://sitraina.free.je/afiliacion.html?enviada=1', 'https://sitraina.free.je/index.html?enviada=1#afiliacion')
$afiliSec = $afiliSec.Replace('name="Pagina" value="https://sitraina.free.je/afiliacion.html"', 'name="Pagina" value="https://sitraina.free.je/index.html#afiliacion"')
$afiliSec = $afiliSec.Replace('<form id="form-afiliacion"', '<form id="form-afiliacion" data-guia-formsubmit="afiliacion"')
$si = $afiliacion.IndexOf('/* Arma el PDF de la boleta')
$sj = $afiliacion.IndexOf('</script>', $si)
$afiliScript = $afiliacion.Substring($si, $sj - $si)
$afiliScript = $afiliScript.Replace("history.replaceState(null, '', location.pathname);", "history.replaceState(null, '', location.pathname + (location.hash || '#afiliacion'));")

$asesoria = Read-Utf8 'asesoria-legal.html'
$aseHero = Slice-Between $asesoria '<section class="hero-servicios">' '</section>'
$aseHero = $aseHero.Replace('href="solicitar-cita.html"', 'href="#cita" data-public-nav="cita"')
$aseLegal = Slice-Between $asesoria '<section class="asesoria-legal">' '</section>'
$asePopup = Extract-ById $asesoria 'asesoria-popup'

$contacto = Read-Utf8 'contacto.html'
$contMain = Slice-Between $contacto '<main class="contenedor pagina-contacto">' '</main>'
$contMain = $contMain.Replace('<main class="contenedor pagina-contacto">', '<main class="contenedor pagina-contacto vista-publica" id="vista-contacto" data-vista-publica="contacto" hidden>')
$contMain = $contMain.Replace('<form id="formulario-contacto-pagina"', '<form id="formulario-contacto-pagina" data-guia-formsubmit="contacto"')
$contMain = [regex]::Replace($contMain, '(?s)<script>.*?</script>', '')
$contScript = [regex]::Match($contacto, '(?s)\(function \(\) \{\s*var form = document.getElementById\(''formulario-contacto-pagina''\).*?\}\)\(\);').Value

$docs = Read-Utf8 'documentos.html'
$docsHub = [regex]::Match($docs, '(?s)<div class="documentos-panel">.*?</div>\s*</div>').Value
$docsHub = $docsHub.Replace('href="efemerides.html"', 'href="#efemerides" data-public-nav="efemerides"')
$docsHub = $docsHub.Replace('href="hojamier/galeria.html"', 'href="#hoja" data-public-nav="hoja"')
$docsHub = $docsHub.Replace('href="convenios/convenios.html"', 'href="#convenios" data-public-nav="convenios"')
$docsHub = $docsHub.Replace('href="#legales"', 'href="#legales" data-public-nav="legales"')
$docsHub = $docsHub.Replace('href="#informes"', 'href="#informes" data-public-nav="informes"')
$docsHub = $docsHub.Replace('href="#actas"', 'href="#actas" data-public-nav="actas"')

function Get-SeccionArchivos([string]$html, [string]$id) {
  $m = [regex]::Match($html, ('(?s)<section class="seccion-archivos" id="' + $id + '">.*?</section>'))
  if (-not $m.Success) { throw "missing $id" }
  return $m.Value.Replace('href="documentos.html"', 'href="#documentos" data-public-nav="documentos"')
}
$legales = Get-SeccionArchivos $docs 'legales'
$informes = Get-SeccionArchivos $docs 'informes'
$actas = Get-SeccionArchivos $docs 'actas'
$legales = $legales.Replace('<section class="seccion-archivos" id="legales">', '').Replace('</section>', '').Trim()
$informes = $informes.Replace('<section class="seccion-archivos" id="informes">', '').Replace('</section>', '').Trim()
$actas = $actas.Replace('<section class="seccion-archivos" id="actas">', '').Replace('</section>', '').Trim()

$cita = Read-Utf8 'solicitar-cita.html'
$citaMain = Slice-Between $cita '<main class="pagina-cita">' '</main>'
$citaMain = $citaMain.Replace('<main class="pagina-cita">', '<main class="pagina-cita">')
$citaMain = $citaMain.Replace('https://sitraina.free.je/solicitar-cita.html?enviada=1', 'https://sitraina.free.je/index.html?enviada=1#cita')
$citaMain = $citaMain.Replace('name="Pagina" value="https://sitraina.free.je/solicitar-cita.html"', 'name="Pagina" value="https://sitraina.free.je/index.html#cita"')
$citaMain = $citaMain.Replace('<form class="form-cita" id="form-cita"', '<form class="form-cita" id="form-cita" data-guia-formsubmit="cita"')
$citaPuerta = Extract-ById $cita 'cita-puerta'
$citaScript = [regex]::Match($cita, '(?s)/\* Pregunta si la persona está afiliada.*?\}\)\(\);').Value
$citaScript = $citaScript.Replace("var main = document.querySelector('main');", "var main = document.getElementById('vista-cita');")
$citaScript = $citaScript.Replace("location.href = 'afiliacion.html';", "if (window.mostrarVistaPublica) window.mostrarVistaPublica('afiliacion'); else location.hash = 'afiliacion';")
$citaScript = $citaScript.Replace("location.href = 'asesoria-legal.html';", "if (window.mostrarVistaPublica) window.mostrarVistaPublica('asesoria'); else location.hash = 'asesoria';")
$citaScript = $citaScript.Replace("if (enviada) return;`r`n`r`n      bloquear();", "/* arranque diferido en SPA */ bloquear();")

$efe = Read-Utf8 'efemerides.html'
$efeMain = Slice-Between $efe '<main class="contenedor-efemerides">' '</main>'

$hoja = Read-Utf8 'hojamier/galeria.html'
$hojaTitulo = [regex]::Match($hoja, '(?s)<div class="contenedor-titulo-galeria">.*?</div>\s*</div>').Value
$hojaTitulo = $hojaTitulo.Replace('../img/', 'img/')
$hojaMain = Slice-Between $hoja '<main class="contenedor-galeria">' '</main>'
$hojaMain = $hojaMain.Replace('data-src="Videos/', 'data-src="hojamier/Videos/')
$hojaMain = $hojaMain.Replace('data-pdf="../documentos/', 'data-pdf="documentos/')
$hojaPopup = Extract-ById $hoja 'hoja-popup'

$conve = Read-Utf8 'convenios/convenios.html'
$conveMain = Slice-Between $conve '<main class="contenedor-catalogo">' '</main>'
$conveMain = $conveMain.Replace('src="img-conv/', 'src="convenios/img-conv/')
$conveMain = [regex]::Replace($conveMain, '<img src="convenios/img-conv/([^"]+)"', '<img src="convenios/img-conv/$1" loading="lazy"')
$conveModal = Extract-ById $conve 'modal-imagen'

$index = Read-Utf8 'index.html'
if ($index.Contains('<!-- Portada: logo, título y botón hacia Conócenos. -->') -and $index.Contains('<!-- Pie: mapa, correo, teléfonos y redes. -->')) {
  $homeInner = Slice-Between $index '  <!-- Portada: logo, título y botón hacia Conócenos. -->' '<!-- Pie: mapa, correo, teléfonos y redes. -->'
} else {
  $hs = $index.IndexOf('<div class="vista-publica" id="vista-inicio"')
  $he = $index.IndexOf('<main class="conocenos vista-publica"')
  $chunk = $index.Substring($hs, $he - $hs)
  $gt = $chunk.IndexOf('>')
  $homeInner = $chunk.Substring($gt + 1)
  $homeInner = $homeInner.TrimEnd()
  if ($homeInner.EndsWith('</div>')) { $homeInner = $homeInner.Substring(0, $homeInner.Length - 6).TrimEnd() }
}
$homeInner = $homeInner.Replace('href="quiensomos.html"', 'href="#conocenos" data-public-nav="conocenos"')
$footerSrc = Read-Utf8 'quiensomos.html'
$footerFull = [regex]::Match($footerSrc, '(?s)<footer class="footer-franja">.*?</footer>').Value
$footer = $footerFull.Replace('<footer class="footer-franja">', '').Replace('</footer>', '')
$popDirectiva = Extract-ById $index 'directiva-popup'
$popLabor = Extract-ById $index 'labor-popup'

$headPath = Join-Path $root 'tools\index-head.html'
$head = [IO.File]::ReadAllText($headPath, $utf8)

$parts = New-Object System.Collections.Generic.List[string]
$parts.Add($head)
$parts.Add('<div class="vista-publica" id="vista-inicio" data-vista-publica="inicio">')
$parts.Add($homeInner)
$parts.Add('</div>')
$parts.Add($conocenos)
$parts.Add('<div class="vista-publica" id="vista-afiliacion" data-vista-publica="afiliacion" hidden>')
$parts.Add($afiliSec)
$parts.Add('</div>')
$parts.Add('<div class="vista-publica" id="vista-asesoria" data-vista-publica="asesoria" hidden>')
$parts.Add($aseHero)
$parts.Add($aseLegal)
$parts.Add('</div>')
$parts.Add('<div class="vista-publica" id="vista-cita" data-vista-publica="cita" hidden>')
$parts.Add($atrasAse)
$parts.Add($citaMain)
$parts.Add('</div>')
$parts.Add('<main class="contenedor pagina-documentos vista-publica" id="vista-documentos" data-vista-publica="documentos" hidden>')
$parts.Add($docsHub)
$parts.Add('</main>')
$parts.Add('<main class="contenedor pagina-documentos seccion-archivos vista-publica" id="vista-legales" data-vista-publica="legales" hidden>')
$parts.Add($legales)
$parts.Add('</main>')
$parts.Add('<main class="contenedor pagina-documentos seccion-archivos vista-publica" id="vista-informes" data-vista-publica="informes" hidden>')
$parts.Add($informes)
$parts.Add('</main>')
$parts.Add('<main class="contenedor pagina-documentos seccion-archivos vista-publica" id="vista-actas" data-vista-publica="actas" hidden>')
$parts.Add($actas)
$parts.Add('</main>')
$parts.Add('<div class="vista-publica" id="vista-efemerides" data-vista-publica="efemerides" hidden>')
$parts.Add($atrasDoc)
$parts.Add($efeMain)
$parts.Add('</div>')
$parts.Add('<div class="vista-publica" id="vista-hoja" data-vista-publica="hoja" hidden>')
$parts.Add($atrasDoc)
$parts.Add($hojaTitulo)
$parts.Add($hojaMain)
$parts.Add('</div>')
$parts.Add('<div class="vista-publica" id="vista-convenios" data-vista-publica="convenios" hidden>')
$parts.Add($atrasDoc)
$parts.Add($conveMain)
$parts.Add('</div>')
$parts.Add($contMain)
$parts.Add('<footer class="footer-franja">')
$parts.Add($footer)
$parts.Add('</footer>')
$parts.Add($popDirectiva)
$parts.Add($popLabor)
$parts.Add($asePopup)
$parts.Add($citaPuerta)
$parts.Add($hojaPopup)
$parts.Add($conveModal)
$parts.Add('<script src="js/script.js?v=3.01"></script>')
$parts.Add('<script src="js/vistas-publicas.js?v=1.0"></script>')
$parts.Add('<script src="js/guia-formsubmit.js?v=1.2"></script>')
$parts.Add('<script src="js/script-conve.js"></script>')
$parts.Add('<script src="js/script-hoja.js?v=1.1"></script>')
$parts.Add('<script>')
$parts.Add($afiliScript)
$parts.Add('</script>')
$parts.Add('<script>')
$parts.Add($contScript)
$parts.Add('</script>')
$parts.Add('<script>')
$parts.Add($citaScript)
$parts.Add('</script>')
$parts.Add('</body></html>')

$out = [string]::Join("`r`n", $parts.ToArray())
[IO.File]::WriteAllText((Join-Path $root 'index.html'), $out, $utf8)
Write-Output ('wrote index.html chars=' + $out.Length)
Write-Output ('hub=' + $docsHub.Length + ' conve=' + $conveMain.Length + ' hoja=' + $hojaMain.Length)
Write-Output ('citaScript=' + $citaScript.Length + ' afiliScript=' + $afiliScript.Length)
