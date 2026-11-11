/*
 * Conexión con el backend (Google Apps Script + Google Sheets + Drive).
 * Si API_URL está vacía, usa un modo demostración guardado en el navegador.
 */
window.Api = (function () {
  "use strict";
  var cfg = window.APP_CONFIG || {};
  var URL_API = (cfg.API_URL || "").trim();
  var DEMO = !URL_API;
  var DEMO_KEY = "amigo-secreto-demo-v1";
  var memoria = null;

  /* ---------- Modo demostración ---------- */
  function demoSeed() {
    var now = Date.now(), h = 3600000;
    return [
      { id: "d1", persona: "Dra. Dai", titulo: "Taza térmica Stanley 20 oz", detalles: "Color verde salvia o crema.", precio: "₡18 000", lugares: ["Universal, Multiplaza Escazú"], links: ["https://www.stanley1913.com"], fotoId: "", creado: now - 50 * h },
      { id: "d2", persona: "Miguel", titulo: "Audífonos inalámbricos", detalles: "Que tengan cancelación de ruido. Negros.", precio: "₡25 000 – ₡35 000", lugares: ["Gollo", "Importadora Monge"], links: ["https://www.amazon.com"], fotoId: "", creado: now - 20 * h },
      { id: "d3", persona: "Mariela", titulo: "Set de velas aromáticas", detalles: "Aromas de vainilla o canela.", precio: "₡12 000", lugares: ["Bath & Body Works, City Mall"], links: [], fotoId: "", creado: now - 8 * h },
      { id: "d4", persona: "Sherry", titulo: "Libro: El infinito en un junco", detalles: "Edición de bolsillo.", precio: "₡14 500", lugares: ["Librería Internacional"], links: ["https://www.libreriainternacional.com"], fotoId: "", creado: now - 2 * h }
    ];
  }
  function demoLoad() {
    if (memoria) return memoria;
    try {
      var raw = localStorage.getItem(DEMO_KEY);
      memoria = raw ? JSON.parse(raw) : demoSeed();
    } catch (e) { memoria = demoSeed(); }
    return memoria;
  }
  function demoSave() {
    try { localStorage.setItem(DEMO_KEY, JSON.stringify(memoria)); } catch (e) { /* sin espacio: queda en memoria */ }
  }

  /* ---------- Llamadas reales ---------- */
  function error(msg, code) { var e = new Error(msg); e.code = code; return e; }

  function getJSON() {
    return fetch(URL_API + (URL_API.indexOf("?") < 0 ? "?" : "&") + "action=list&t=" + Date.now(), { method: "GET", redirect: "follow" })
      .then(function (r) { return r.json(); })
      .then(function (j) {
        if (!j || !j.ok) throw error((j && j.error) || "Respuesta inválida del servidor", j && j.code);
        return j;
      });
  }
  function postJSON(payload) {
    // text/plain evita el "preflight" CORS que Apps Script no soporta
    return fetch(URL_API, {
      method: "POST",
      redirect: "follow",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload)
    })
      .then(function (r) { return r.json(); })
      .then(function (j) {
        if (!j || !j.ok) throw error((j && j.error) || "No se pudo guardar", j && j.code);
        return j;
      });
  }

  /* ---------- API pública ---------- */
  function list() {
    if (DEMO) return Promise.resolve(demoLoad().slice());
    return getJSON().then(function (j) { return j.gifts || []; });
  }

  /** gift: {id?, persona, titulo, detalles, precio, lugares[], links[]}
   *  foto: null | {base64, mime, dataUrl} | {quitar:true} */
  function save(gift, foto, clave) {
    if (DEMO) {
      var lista = demoLoad();
      var now = Date.now();
      var g = Object.assign({}, gift);
      var prev = g.id ? lista.find(function (x) { return x.id === g.id; }) : null;
      if (!g.id) g.id = "d" + now.toString(36);
      g.creado = prev ? prev.creado : now;
      g.actualizado = now;
      g.fotoId = "";
      g.fotoData = prev ? prev.fotoData || "" : "";
      if (foto && foto.dataUrl) g.fotoData = foto.dataUrl;
      if (foto && foto.quitar) g.fotoData = "";
      if (prev) lista[lista.indexOf(prev)] = g; else lista.push(g);
      demoSave();
      return Promise.resolve(g);
    }
    return postJSON({ action: "save", clave: clave || "", gift: gift, foto: foto ? { base64: foto.base64 || "", mime: foto.mime || "", quitar: !!foto.quitar } : null })
      .then(function (j) { return j.gift; });
  }

  function remove(id, clave) {
    if (DEMO) {
      memoria = demoLoad().filter(function (x) { return x.id !== id; });
      demoSave();
      return Promise.resolve(true);
    }
    return postJSON({ action: "delete", clave: clave || "", id: id }).then(function () { return true; });
  }

  function photoUrl(g, ancho) {
    if (!g) return null;
    if (g.fotoId && /^[\w-]{10,}$/.test(g.fotoId)) return "https://lh3.googleusercontent.com/d/" + g.fotoId + "=w" + (ancho || 1000);
    if (typeof g.fotoData === "string" && /^data:image\//.test(g.fotoData)) return g.fotoData;
    return null;
  }
  function photoFallback(g, ancho) {
    if (g && g.fotoId) return "https://drive.google.com/thumbnail?id=" + g.fotoId + "&sz=w" + (ancho || 1000);
    return null;
  }

  return { DEMO: DEMO, list: list, save: save, remove: remove, photoUrl: photoUrl, photoFallback: photoFallback };
})();
