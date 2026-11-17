const fs = require('fs');
const path = require('path');
const p = path.join(__dirname, '..', 'admin', 'panel.html');
let s = fs.readFileSync(p, 'utf8');
const start = s.indexOf('<main class="caja caja-panel admin-vista" id="vista-hoja"');
const end = s.indexOf('<div class="asistente" id="popup-afiliado"');
if (start < 0 || end < 0) {
    console.error('markers', start, end);
    process.exit(1);
}
const repl = `  <main class="caja caja-panel admin-vista" id="vista-documentacion" data-vista="documentacion" hidden>
    <header class="vista-cabeza">
      <h1>Documentación</h1>
      <p class="panel-intro">Acá administrás lo que la gente ve en Documentos: efemérides, Hoja del Miércoles, convenios, legales, informes y actas. Las personas solo pueden consultar; vos podés agregar, editar o quitar.</p>
    </header>
    <section class="docs-admin-landing" aria-labelledby="docs-admin-landing-titulo">
      <h2 id="docs-admin-landing-titulo">Cómo funciona</h2>
      <p class="guardadas-panel-ayuda">Abrí el administrador de documentos. A la izquierda elegís una de las seis categorías. A la derecha ves la lista (detalle o iconos, como un explorador) y desde ahí publicás, editás o quitás un elemento. Los cambios se reflejan en la sección Documentos del sitio.</p>
      <div class="panel-acciones">
        <button type="button" class="btn-abrir-asistente" id="docs-abrir-explorador">Administrar documentos</button>
      </div>
    </section>
  </main>

  <div class="asistente docs-explorador" id="popup-docs-explorador" hidden>
    <div class="asistente-fondo" id="docs-explorador-fondo" aria-hidden="true"></div>
    <div class="asistente-ventana asistente-ventana-ancha docs-explorador-ventana" role="dialog" aria-modal="true" aria-labelledby="docs-explorador-titulo">
      <button type="button" class="asistente-cerrar" id="docs-explorador-cerrar" aria-label="Cerrar">&times;</button>
      <div class="docs-explorador-cabeza">
        <div>
          <h2 class="asistente-titulo" id="docs-explorador-titulo">Administrar documentos</h2>
          <p class="asistente-ayuda docs-explorador-ayuda">Elegí una categoría a la izquierda. A la derecha aparecen sus documentos.</p>
        </div>
        <div class="docs-vista-toggle" role="group" aria-label="Tipo de lista">
          <button type="button" class="docs-vista-btn activo" id="docs-vista-detalle" aria-pressed="true" title="Lista detallada">Lista</button>
          <button type="button" class="docs-vista-btn" id="docs-vista-iconos" aria-pressed="false" title="Vista de iconos">Iconos</button>
        </div>
      </div>
      <div class="docs-explorador-cuerpo">
        <aside class="docs-explorador-cats" aria-label="Categorías de documentos">
          <button type="button" class="docs-cat-btn" data-docs-cat="efemerides">Efemérides</button>
          <button type="button" class="docs-cat-btn" data-docs-cat="hoja">Hoja del Miércoles</button>
          <button type="button" class="docs-cat-btn" data-docs-cat="convenios">Convenios</button>
          <button type="button" class="docs-cat-btn" data-docs-cat="legales">Documentos legales</button>
          <button type="button" class="docs-cat-btn" data-docs-cat="informes">Informes de labores</button>
          <button type="button" class="docs-cat-btn" data-docs-cat="actas">Actas de asamblea</button>
        </aside>
        <section class="docs-explorador-panel" aria-labelledby="docs-panel-titulo">
          <div class="docs-panel-toolbar">
            <h3 id="docs-panel-titulo">Efemérides</h3>
            <div class="docs-panel-acciones">
              <input type="search" id="docs-buscar" class="admin-buscar-input docs-buscar" placeholder="Buscar…" autocomplete="off" aria-label="Buscar en esta categoría">
              <button type="button" class="btn-atajo" id="docs-agregar">Agregar</button>
            </div>
          </div>
          <div id="docs-lista" class="docs-lista docs-lista-detalle" aria-live="polite">
            <p class="vacio-bloque">Elegí una categoría.</p>
          </div>
          <p class="hoja-admin-estado" id="docs-estado" role="status" aria-live="polite"></p>
        </section>
      </div>
    </div>
  </div>

  <div class="asistente" id="popup-docs-form" hidden>
    <div class="asistente-fondo" id="docs-form-fondo" aria-hidden="true"></div>
    <div class="asistente-ventana" role="dialog" aria-modal="true" aria-labelledby="docs-form-titulo">
      <button type="button" class="asistente-cerrar" id="docs-form-cerrar" aria-label="Cerrar">&times;</button>
      <h2 class="asistente-titulo" id="docs-form-titulo">Agregar documento</h2>
      <p class="asistente-ayuda" id="docs-form-ayuda">Completá los datos y guardá.</p>
      <form id="form-docs" enctype="multipart/form-data">
        <input type="hidden" id="docs-form-id" name="id" value="">
        <input type="hidden" id="docs-form-accion" name="accion" value="agregar">
        <input type="hidden" id="docs-form-categoria" name="categoria" value="">
        <div id="docs-form-campos"></div>
        <p class="hoja-admin-estado" id="docs-form-estado" role="status" aria-live="polite"></p>
        <div class="asistente-acciones">
          <button type="button" class="btn-atajo btn-atajo-secundario" id="docs-form-cancelar">Cancelar</button>
          <button type="submit" class="btn-atajo" id="docs-form-guardar">Guardar</button>
        </div>
      </form>
    </div>
  </div>

`;
s = s.slice(0, start) + repl + s.slice(end);
s = s.replace('hoja.js?v=1.3', 'documentacion.js?v=1.0');
fs.writeFileSync(p, s);
console.log('panel patched');
