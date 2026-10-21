# Servidor local para Run and Debug (HTTP, no file://).
$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$port = 8765
$prefix = "http://127.0.0.1:$port/"

# Si el puerto ya esta en uso, se asume que el preview ya corre.
try {
    $probe = New-Object System.Net.Sockets.TcpClient
    $probe.Connect('127.0.0.1', $port)
    $probe.Close()
    Write-Output "LISTENING $root (already running)"
    while ($true) { Start-Sleep -Seconds 3600 }
} catch {
    # Puerto libre: se inicia el servidor.
}

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add($prefix)
$listener.Start()
Write-Output "LISTENING $root"

$types = @{
    '.html'  = 'text/html; charset=utf-8'
    '.css'   = 'text/css; charset=utf-8'
    '.js'    = 'application/javascript; charset=utf-8'
    '.pdf'   = 'application/pdf'
    '.png'   = 'image/png'
    '.jpg'   = 'image/jpeg'
    '.jpeg'  = 'image/jpeg'
    '.webp'  = 'image/webp'
    '.svg'   = 'image/svg+xml'
    '.ico'   = 'image/x-icon'
    '.woff2' = 'font/woff2'
    '.docx'  = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
}

while ($listener.IsListening) {
    $ctx = $listener.GetContext()
    $path = [Uri]::UnescapeDataString($ctx.Request.Url.LocalPath.TrimStart('/').Replace('/', '\'))
    if ([string]::IsNullOrEmpty($path)) { $path = 'index.html' }
    $full = Join-Path $root $path

    if (-not (Test-Path -LiteralPath $full) -or (Get-Item -LiteralPath $full).PSIsContainer) {
        $ctx.Response.StatusCode = 404
        $buf = [Text.Encoding]::UTF8.GetBytes('Not found')
        $ctx.Response.Headers.Add('Cache-Control', 'no-store')
        $ctx.Response.OutputStream.Write($buf, 0, $buf.Length)
        $ctx.Response.Close()
        continue
    }

    $ext = [IO.Path]::GetExtension($full).ToLowerInvariant()

    # En este preview no corre PHP: evitar descargas y simular redirecciones útiles.
    if ($ext -eq '.php') {
        $nombre = [IO.Path]::GetFileNameWithoutExtension($full).ToLowerInvariant()
        $dirUrl = ($ctx.Request.Url.AbsolutePath -replace '[^/]+$', '')
        if (-not $dirUrl.EndsWith('/')) { $dirUrl += '/' }

        if ($nombre -eq 'salir') {
            $ctx.Response.StatusCode = 302
            $ctx.Response.Headers.Add('Location', ($dirUrl + 'index.html'))
            $ctx.Response.Headers.Add('Cache-Control', 'no-store')
            $ctx.Response.Close()
            continue
        }

        $hermano = Join-Path (Split-Path -Parent $full) ($nombre + '.html')
        if (Test-Path -LiteralPath $hermano) {
            $full = $hermano
            $ext = '.html'
        } else {
            $msg = "<!DOCTYPE html><html lang=`"es`"><meta charset=`"utf-8`"><title>Solo en InfinityFree</title><body style=`"font-family:sans-serif;padding:2rem`"><p>Este archivo PHP (<code>$nombre.php</code>) necesita el servidor de InfinityFree. En la vista previa local no se ejecuta.</p><p><a href=`"$dirUrl`">Volver</a></p></body></html>"
            $buf = [Text.Encoding]::UTF8.GetBytes($msg)
            $ctx.Response.StatusCode = 200
            $ctx.Response.ContentType = 'text/html; charset=utf-8'
            $ctx.Response.Headers.Add('Cache-Control', 'no-store')
            $ctx.Response.ContentLength64 = $buf.Length
            $ctx.Response.OutputStream.Write($buf, 0, $buf.Length)
            $ctx.Response.Close()
            continue
        }
    }

    $bytes = [IO.File]::ReadAllBytes($full)
    $ctx.Response.StatusCode = 200
    $ctx.Response.ContentType = $(if ($types.ContainsKey($ext)) { $types[$ext] } else { 'text/plain; charset=utf-8' })
    # Evita que Edge/Chrome guarden CSS/JS viejos al depurar.
    if ($ext -eq '.html' -or $ext -eq '.css' -or $ext -eq '.js') {
        $ctx.Response.Headers.Add('Cache-Control', 'no-store, max-age=0')
    }
    $ctx.Response.ContentLength64 = $bytes.Length
    $ctx.Response.OutputStream.Write($bytes, 0, $bytes.Length)
    $ctx.Response.Close()
}
