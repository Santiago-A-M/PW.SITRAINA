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

    $bytes = [IO.File]::ReadAllBytes($full)
    $ext = [IO.Path]::GetExtension($full).ToLowerInvariant()
    $ctx.Response.StatusCode = 200
    $ctx.Response.ContentType = $(if ($types.ContainsKey($ext)) { $types[$ext] } else { 'application/octet-stream' })
    # Evita que Edge/Chrome guarden CSS/JS viejos al depurar.
    if ($ext -eq '.html' -or $ext -eq '.css' -or $ext -eq '.js') {
        $ctx.Response.Headers.Add('Cache-Control', 'no-store, max-age=0')
    }
    $ctx.Response.ContentLength64 = $bytes.Length
    $ctx.Response.OutputStream.Write($bytes, 0, $bytes.Length)
    $ctx.Response.Close()
}
