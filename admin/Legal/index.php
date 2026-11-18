<?php
/* Ingreso propio de Legal y, si la cuenta es de abogado, la consulta de citas. */
require dirname(__DIR__) . '/sesion.php';

function legal_mostrar_ingreso($error) {
    $html = file_get_contents(__DIR__ . '/ingreso.html');
    $errorSeguro = h($error);
    if ($errorSeguro !== '') {
        $html = str_replace('hidden>{{error}}', '>' . $errorSeguro, $html);
    }
    $html = str_replace('{{token}}', h(token_admin()), $html);
    $html = str_replace('{{error}}', $errorSeguro, $html);
    echo $html;
    exit;
}

$error = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $token = (string) ($_POST['token'] ?? '');
    $cuenta = strtolower(trim((string) ($_POST['cuenta'] ?? '')));
    $cedula = preg_replace('/\D/', '', (string) ($_POST['cedula'] ?? ''));
    $fallos = (int) ($_SESSION['legal_fallos'] ?? 0);
    $correoOk = (bool) preg_match('/^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9\-]+(?:\.[a-zA-Z0-9\-]+)*\.[a-zA-Z]{2,}$/', $cuenta);

    if (!hash_equals(token_admin(), $token)) {
        $error = 'Volvé a intentarlo desde esta página.';
    } elseif ($fallos >= 8) {
        $error = 'Demasiados intentos. Esperá un momento y volvé a probar.';
    } elseif (!$correoOk || strlen($cuenta) > 120 || strlen($cedula) !== 9) {
        $_SESSION['legal_fallos'] = $fallos + 1;
        $error = 'Correo o cédula incorrectos.';
    } else {
        $legal = abogado_activo($cuenta, $cedula);
        if ($legal === true) {
            $_SESSION['admin_usuario'] = $cedula;
            $_SESSION['admin_cuenta'] = $cuenta;
            $_SESSION['admin_cedula'] = $cedula;
            $_SESSION['admin_rol'] = 'abogado';
            $_SESSION['legal_ingreso'] = '1';
            $_SESSION['legal_fallos'] = 0;
            $_SESSION['admin_token'] = bin2hex(random_bytes(16));
            session_regenerate_id(true);
            session_write_close();
            header('Location: index.php');
            exit;
        }
        if ($legal === null) {
            $error = 'No pudimos conectar en este momento. Intentá más tarde.';
        } else {
            $_SESSION['legal_fallos'] = $fallos + 1;
            $error = 'Correo o cédula incorrectos.';
        }
    }
}

if (!personal_es_abogado()) {
    legal_mostrar_ingreso($error);
}

$sesionTexto = !empty($_SESSION['admin_cuenta']) ? (string) $_SESSION['admin_cuenta'] : (string) $_SESSION['admin_usuario'];
?>
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="robots" content="noindex, nofollow">
  <title>Legal | SITRAINA</title>
  <link rel="icon" type="image/png" href="../../img/ley.png">
  <script>
    (function () {
      try {
        if (localStorage.getItem('modoOscuro') === 'true') {
          document.documentElement.classList.add('dark-mode');
        }
        if (localStorage.getItem('modoDaltonico') === 'true') {
          document.documentElement.classList.add('daltonico');
        }
      } catch (e) {}
    })();
  </script>
  <link href="https://fonts.googleapis.com/css2?family=Public+Sans:wght@400;600;700&amp;display=swap" rel="stylesheet">
  <link rel="stylesheet" href="../admin.css?v=6.95">
  <link rel="stylesheet" href="legal.css?v=10">
  <script>
    (function () {
      try {
        if (!document.documentElement.classList.contains('daltonico')) return;
        var link = document.createElement('link');
        link.id = 'daltonico-css';
        link.rel = 'stylesheet';
        link.href = '../daltonico-admin.css?v=1.62';
        document.head.appendChild(link);
      } catch (e) {}
    })();
  </script>
</head>
<body class="pagina-panel legal-pagina" data-token="<?php echo h(token_admin()); ?>">
  <script>if (document.documentElement.classList.contains('dark-mode')) document.body.classList.add('dark-mode'); if (document.documentElement.classList.contains('daltonico')) document.body.classList.add('daltonico');</script>

  <header class="admin-header" role="banner">
    <div class="legal-header-inner">
      <a class="admin-logo" href="index.php" aria-label="SITRAINA Legal">
        <span class="admin-logo-marca" aria-hidden="true">
          <img class="admin-logo-img" src="../../img/logo.png" alt="" width="55" height="55" decoding="async">
        </span>
        <span class="admin-logo-texto">
          <span class="admin-logo-inicio">
            <strong>SITRAINA</strong>
            <span>Legal</span>
          </span>
        </span>
      </a>
      <div class="legal-header-acciones">
        <div class="legal-notas" id="legal-notas">
          <button type="button" class="legal-notas-btn" id="legal-notas-btn" aria-expanded="false" aria-controls="legal-notas-menu" title="Notificaciones" aria-label="Abrir notificaciones">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9a6 6 0 1 1 12 0c0 7 3 7 3 7H3s3 0 3-7" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M10 19a2 2 0 0 0 4 0" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
            <span class="legal-notas-cuenta" id="legal-notas-cuenta" hidden>0</span>
          </button>
          <div class="legal-notas-menu" id="legal-notas-menu" hidden>
            <p class="legal-notas-titulo">Notificaciones</p>
            <div id="legal-notas-lista"></div>
            <button type="button" class="legal-notas-ver-todas" id="legal-notas-ver-todas">Todas las notificaciones</button>
          </div>
        </div>
        <button id="toggle-oscuro" class="admin-tono btn-header" type="button" title="Cambiar tono" aria-label="Cambiar tono de la página">
          <svg class="icono-tono icono-luna" viewBox="0 0 24 24" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
          <svg class="icono-tono icono-sol" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3.5"/><path d="M12 2.2v5M12 16.8v5M2.2 12h5M16.8 12h5M5.2 5.2l3.4 3.4M15.4 15.4l3.4 3.4M18.8 5.2l-3.4 3.4M8.6 15.4l-3.4 3.4"/></svg>
        </button>
        <div class="admin-opciones" id="admin-opciones">
          <button type="button" class="admin-opciones-btn" id="admin-opciones-btn" aria-expanded="false" aria-haspopup="true" aria-controls="admin-opciones-menu" title="Opciones">
            <span class="admin-opciones-btn-icono" aria-hidden="true">
              <svg viewBox="0 0 24 24"><path d="M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4z" fill="none" stroke="currentColor" stroke-width="2"/><path d="M19.4 13a7.7 7.7 0 0 0 .05-2l2.05-1.6-2-3.46-2.45.98a7.9 7.9 0 0 0-1.73-1L14.9 2h-5.8L8.68 4.92a7.9 7.9 0 0 0-1.73 1L4.5 4.94l-2 3.46L4.55 11a7.7 7.7 0 0 0 0 2l-2.05 1.6 2 3.46 2.45-.98a7.9 7.9 0 0 0 1.73 1L9.1 22h5.8l.42-2.92a7.9 7.9 0 0 0 1.73-1l2.45.98 2-3.46L19.4 13z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>
            </span>
            <span class="admin-opciones-btn-texto">Opciones</span>
            <svg class="admin-opciones-chevron" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </button>
          <div class="admin-opciones-menu" id="admin-opciones-menu" role="menu" hidden>
            <button type="button" class="admin-opciones-item" id="admin-opcion-daltonico" role="menuitem" aria-pressed="false">
              <span class="admin-opciones-item-icono" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12z" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="2.6" fill="none" stroke="currentColor" stroke-width="2"/></svg></span>
              <span>Modo daltónico</span>
              <span class="admin-opciones-item-estado">Off</span>
            </button>
            <a class="admin-opciones-item admin-opciones-salir" href="salir.php" role="menuitem">
              <span class="admin-opciones-item-icono" aria-hidden="true">
                <svg viewBox="0 0 24 24"><path d="M10 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4M15 16l4-4-4-4M9 12h10" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
              </span>
              <span>Cerrar sesión</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  </header>

  <main class="legal-cuerpo">
    <header class="legal-cabeza">
      <h1>Asesoría legal</h1>
      <p>Cuando una persona manda el formulario, la cita te llega a vos, según tu cuenta de Usuarios legales. Si la fecha todavía no llega, se ve como próxima. Si ya pasó, queda en anteriores. Las que no querés van a la papelera, sin borrarse.</p>
      <p class="legal-sesion">Sesión de <?php echo h($sesionTexto); ?>.</p>
    </header>

    <div class="legal-filtros" role="tablist" aria-label="Organizar citas">
      <button type="button" class="legal-filtro activo" id="legal-tab-proxima" role="tab" aria-selected="true" aria-controls="legal-lista" data-grupo="proxima">Próximas <span id="legal-cuenta-proxima">0</span></button>
      <button type="button" class="legal-filtro" id="legal-tab-anterior" role="tab" aria-selected="false" aria-controls="legal-lista" data-grupo="anterior">Anteriores <span id="legal-cuenta-anterior">0</span></button>
      <button type="button" class="legal-filtro" id="legal-tab-cancelada" role="tab" aria-selected="false" aria-controls="legal-lista" data-grupo="cancelada">Canceladas <span id="legal-cuenta-cancelada">0</span></button>
      <button type="button" class="legal-filtro" id="legal-tab-papelera" role="tab" aria-selected="false" aria-controls="legal-lista" data-grupo="papelera">Papelera <span id="legal-cuenta-papelera">0</span></button>
    </div>
    <p class="legal-actualizado" id="legal-actualizado" aria-live="polite"></p>
    <div id="legal-lista" class="legal-lista" role="tabpanel"><p class="legal-vacio">Un momento, por favor.</p></div>
  </main>

  <div class="legal-popup" id="legal-popup" hidden>
    <div class="legal-popup-fondo" id="legal-popup-fondo"></div>
    <div class="legal-popup-caja" role="dialog" aria-modal="true" aria-labelledby="legal-popup-titulo">
      <button type="button" class="legal-popup-cerrar" id="legal-popup-cerrar" aria-label="Cerrar">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>
      </button>
      <h2 id="legal-popup-titulo"></h2>
      <div id="legal-popup-cuerpo"></div>
    </div>
  </div>

  <div id="legal-asistente" class="legal-asistente">
    <button type="button" class="legal-asistente-abrir" id="legal-asistente-abrir" aria-expanded="false" aria-controls="legal-asistente-panel" aria-label="Abrir asistente del panel">
      <img src="../../img/logo-bot.png" alt="" width="60" height="60">
    </button>
    <span class="legal-asistente-aviso">Ayuda del panel</span>
    <section id="legal-asistente-panel" class="legal-asistente-panel" aria-hidden="true" aria-labelledby="legal-asistente-titulo">
      <header class="legal-asistente-cabeza">
        <span class="legal-asistente-marca">
          <img src="../../img/logo-bot.png" alt="" width="42" height="42">
          <span class="legal-asistente-punto" id="legal-asistente-punto" aria-hidden="true"></span>
        </span>
        <span class="legal-asistente-titulos">
          <strong id="legal-asistente-titulo">Asistente del panel</strong>
          <span id="legal-asistente-estado">Sin conexión</span>
        </span>
        <span class="legal-asistente-herramientas">
          <button type="button" class="legal-asistente-herramienta" id="legal-asistente-nueva" title="Nueva conversación" aria-label="Iniciar una conversación nueva">Nueva</button>
          <button type="button" class="legal-asistente-icono" id="legal-asistente-min" aria-expanded="true" title="Minimizar" aria-label="Minimizar asistente">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 12h12" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>
          </button>
          <button type="button" class="legal-asistente-icono" id="legal-asistente-cerrar" title="Cerrar" aria-label="Cerrar asistente">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>
          </button>
        </span>
      </header>
      <div id="legal-asistente-mensajes" class="legal-asistente-mensajes" aria-live="polite"></div>
      <form id="legal-asistente-form" class="legal-asistente-form">
        <label class="legal-asistente-etiqueta" for="legal-asistente-texto">Escribí tu consulta</label>
        <input id="legal-asistente-texto" type="text" maxlength="600" autocomplete="off" placeholder="¿Cómo uso el panel?">
        <button type="submit" class="legal-asistente-enviar" aria-label="Enviar">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h12M13 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>
      </form>
    </section>
  </div>

  <div class="legal-notas-popup" id="legal-notas-popup" hidden>
    <button type="button" class="legal-notas-popup-fondo" id="legal-notas-popup-fondo" aria-label="Cerrar notificaciones"></button>
    <div class="legal-notas-popup-caja" role="dialog" aria-modal="true" aria-labelledby="legal-notas-popup-titulo">
      <button type="button" class="legal-notas-popup-cerrar" id="legal-notas-popup-cerrar" aria-label="Cerrar">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>
      </button>
      <h2 class="legal-notas-popup-titulo" id="legal-notas-popup-titulo">Todas las notificaciones</h2>
      <div class="legal-notas-popup-lista" id="legal-notas-popup-lista"></div>
      <button type="button" class="legal-notas-todas" id="legal-notas-todas">Marcar todas como leídas</button>
    </div>
  </div>

  <script src="../tono.js?v=3.15"></script>
  <script src="legal.js?v=5"></script>
  <script src="asistente.js?v=1"></script>
</body>
</html>
