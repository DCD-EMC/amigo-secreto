/**
 * AMIGO SECRETO · Backend en Google Apps Script
 * ------------------------------------------------------------
 * Guarda los regalos en esta Google Sheet (hoja "Regalos")
 * y las fotos en una carpeta de Google Drive.
 *
 * Pasos (detalle en README.md):
 *  1. Cambie la CLAVE de abajo.
 *  2. Ejecute la función setup() una vez y autorice.
 *  3. Implementar → Nueva implementación → Aplicación web
 *     · Ejecutar como: Yo
 *     · Quién tiene acceso: Cualquier persona
 *  4. Copie la URL que termina en /exec y péguela en assets/js/config.js
 */

const CONFIG = {
  HOJA: 'Regalos',
  CARPETA_FOTOS: 'Amigo Secreto 2026 · Fotos',
  CLAVE: 'navidad2026', // ← cámbiela y compártala solo con el grupo
  PERSONAS: [
    'Dra. Dai', 'Dra. Megan', 'Dr. Luis Rubio', 'Juan Pablo', 'María José',
    'Mariela', 'Dennise', 'Sherry', 'Shirleny', 'Daniela', 'Miguel'
  ]
};

const COLUMNAS = ['id', 'persona', 'titulo', 'detalles', 'precio', 'lugares', 'links', 'fotoId', 'creado', 'actualizado'];

/* ===================== Configuración inicial ===================== */
function setup() {
  hoja_();
  carpeta_();
  Logger.log('Listo. Hoja "%s" y carpeta de fotos creadas.', CONFIG.HOJA);
}

/* ===================== Web app ===================== */
function doGet(e) {
  try {
    const accion = (e && e.parameter && e.parameter.action) || 'list';
    if (accion === 'list') return json_({ ok: true, gifts: listar_() });
    if (accion === 'ping') return json_({ ok: true, hora: new Date().toISOString() });
    return json_({ ok: false, error: 'Acción no válida' });
  } catch (err) {
    return json_({ ok: false, error: String(err && err.message || err) });
  }
}

function doPost(e) {
  let cuerpo;
  try {
    cuerpo = JSON.parse((e && e.postData && e.postData.contents) || '{}');
  } catch (err) {
    return json_({ ok: false, error: 'Solicitud inválida' });
  }
  if (String(cuerpo.clave || '') !== CONFIG.CLAVE) {
    return json_({ ok: false, code: 'CLAVE', error: 'Clave incorrecta' });
  }

  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(25000);
    if (cuerpo.action === 'save') return json_({ ok: true, gift: guardar_(cuerpo.gift || {}, cuerpo.foto) });
    if (cuerpo.action === 'delete') { eliminar_(String(cuerpo.id || '')); return json_({ ok: true }); }
    if (cuerpo.action === 'check') return json_({ ok: true });
    return json_({ ok: false, error: 'Acción no válida' });
  } catch (err) {
    return json_({ ok: false, error: String(err && err.message || err) });
  } finally {
    try { lock.releaseLock(); } catch (_) {}
  }
}

/* ===================== Lógica ===================== */
function listar_() {
  const sh = hoja_();
  const n = sh.getLastRow() - 1;
  if (n < 1) return [];
  const filas = sh.getRange(2, 1, n, COLUMNAS.length).getValues();
  return filas
    .filter(function (f) { return f[0]; })
    .map(function (f) { return aObjeto_(f); });
}

function guardar_(g, foto) {
  const persona = texto_(g.persona, 60);
  if (CONFIG.PERSONAS.indexOf(persona) < 0) throw new Error('Persona no válida');
  const titulo = texto_(g.titulo, 120);
  if (!titulo) throw new Error('Falta el nombre del regalo');

  const sh = hoja_();
  const id = texto_(g.id, 60);
  const fila = id ? buscarFila_(sh, id) : 0;
  const ahora = new Date();
  let previo = null;
  if (fila) previo = aObjeto_(sh.getRange(fila, 1, 1, COLUMNAS.length).getValues()[0]);

  let fotoId = previo ? previo.fotoId : '';
  if (foto && foto.base64) {
    const mime = /^image\/(jpeg|png|webp|gif)$/.test(foto.mime) ? foto.mime : 'image/jpeg';
    const bytes = Utilities.base64Decode(foto.base64);
    if (bytes.length > 8 * 1024 * 1024) throw new Error('La foto es muy pesada');
    const nombre = persona + ' · ' + titulo + '.jpg';
    const archivo = carpeta_().createFile(Utilities.newBlob(bytes, mime, nombre));
    archivo.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    if (fotoId) papelera_(fotoId);
    fotoId = archivo.getId();
  } else if (foto && foto.quitar && fotoId) {
    papelera_(fotoId);
    fotoId = '';
  }

  const lugares = lista_(g.lugares, 8, 300);
  const links = lista_(g.links, 8, 600).filter(function (u) { return /^https?:\/\//i.test(u); });

  const registro = [
    fila ? id : Utilities.getUuid(),
    persona,
    celda_(titulo),
    celda_(texto_(g.detalles, 600)),
    celda_(texto_(g.precio, 40)),
    celda_(lugares.join('\n')),
    celda_(links.join('\n')),
    fotoId,
    previo && previo.creado ? new Date(previo.creado) : ahora,
    ahora
  ];

  if (fila) sh.getRange(fila, 1, 1, registro.length).setValues([registro]);
  else sh.appendRow(registro);

  const respuesta = aObjeto_(registro);
  respuesta.titulo = titulo;
  respuesta.detalles = texto_(g.detalles, 600);
  respuesta.precio = texto_(g.precio, 40);
  respuesta.lugares = lugares;
  respuesta.links = links;
  return respuesta;
}

function eliminar_(id) {
  if (!id) throw new Error('Falta el id');
  const sh = hoja_();
  const fila = buscarFila_(sh, id);
  if (!fila) return;
  const fotoId = sh.getRange(fila, COLUMNAS.indexOf('fotoId') + 1).getValue();
  if (fotoId) papelera_(fotoId);
  sh.deleteRow(fila);
}

/* ===================== Ayudantes ===================== */
function hoja_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(CONFIG.HOJA);
  if (!sh) sh = ss.insertSheet(CONFIG.HOJA);
  if (sh.getLastRow() === 0) {
    sh.appendRow(['ID', 'Persona', 'Regalo', 'Detalles', 'Precio', 'Lugares', 'Enlaces', 'Foto (ID de Drive)', 'Creado', 'Actualizado']);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, COLUMNAS.length).setFontWeight('bold').setBackground('#0f4c3a').setFontColor('#ffffff');
    sh.setColumnWidth(1, 90); sh.setColumnWidth(3, 240); sh.setColumnWidth(6, 240); sh.setColumnWidth(7, 280);
  }
  return sh;
}

function carpeta_() {
  const props = PropertiesService.getScriptProperties();
  const id = props.getProperty('CARPETA_ID');
  if (id) {
    try { return DriveApp.getFolderById(id); } catch (_) { /* fue borrada: se crea otra */ }
  }
  const carpeta = DriveApp.createFolder(CONFIG.CARPETA_FOTOS);
  props.setProperty('CARPETA_ID', carpeta.getId());
  return carpeta;
}

function buscarFila_(sh, id) {
  const n = sh.getLastRow() - 1;
  if (n < 1) return 0;
  const ids = sh.getRange(2, 1, n, 1).getValues();
  for (let i = 0; i < ids.length; i++) if (String(ids[i][0]) === id) return i + 2;
  return 0;
}

function aObjeto_(f) {
  const fecha = function (v) { return v instanceof Date ? v.getTime() : (Number(v) || 0); };
  const separar = function (v) { return String(v || '').split('\n').map(function (s) { return s.trim(); }).filter(String); };
  return {
    id: String(f[0]),
    persona: String(f[1]),
    titulo: String(f[2]),
    detalles: String(f[3] || ''),
    precio: String(f[4] || ''),
    lugares: separar(f[5]),
    links: separar(f[6]),
    fotoId: String(f[7] || ''),
    creado: fecha(f[8]),
    actualizado: fecha(f[9])
  };
}

function papelera_(fotoId) {
  try { DriveApp.getFileById(fotoId).setTrashed(true); } catch (_) {}
}

// Evita que un texto que empieza con = + - @ se interprete como fórmula en la hoja
function celda_(s) { return /^[=+\-@]/.test(s) ? "'" + s : s; }
function texto_(v, max) { return String(v == null ? '' : v).replace(/[\r\t]/g, ' ').trim().slice(0, max); }
function lista_(v, max, largo) {
  return (Array.isArray(v) ? v : []).map(function (s) { return texto_(s, largo).replace(/\n/g, ' '); }).filter(String).slice(0, max);
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
