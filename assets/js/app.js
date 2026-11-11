/* Amigo Secreto · lógica de la página */
(function () {
  "use strict";

  var cfg = window.APP_CONFIG;
  var Api = window.Api;
  var PERSONAS = cfg.PERSONAS.slice();
  var PALETAS = [
    ["#0f4c3a", "#3f8a6c"], ["#a51c35", "#d9677a"], ["#b88a35", "#e3c27a"], ["#1e3a5f", "#5b86b8"],
    ["#5b2a86", "#9b72c6"], ["#8a4b1f", "#cc8c55"], ["#0f6e6e", "#55aeae"], ["#7a1f4f", "#c06a95"],
    ["#3d5a1e", "#86a656"], ["#2d2d6b", "#6c6cc0"], ["#6b3b12", "#b5813f"]
  ];

  var state = {
    gifts: [], loaded: false, firma: "",
    persona: null, q: "", sort: "recientes", cols: leer("as-cols", "3"),
    slide: 0, slides: [],
    editing: null, foto: null, deleting: null
  };

  /* ---------- Utilidades ---------- */
  function $(s, root) { return (root || document).querySelector(s); }
  function el(tag, attrs, kids) {
    var n = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      var v = attrs[k];
      if (v == null || v === false) return;
      if (k === "class") n.className = v;
      else if (k === "text") n.textContent = v;
      else if (k === "html") n.innerHTML = v; // solo para íconos propios
      else if (k === "style") n.setAttribute("style", v);
      else if (k.slice(0, 2) === "on") n.addEventListener(k.slice(2), v);
      else n.setAttribute(k, v === true ? "" : v);
    });
    (kids || []).forEach(function (c) { if (c != null && c !== false) n.appendChild(typeof c === "string" ? document.createTextNode(c) : c); });
    return n;
  }
  var ICON = {
    pin: '<svg viewBox="0 0 24 24"><path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></svg>',
    arrow: '<svg viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
    left: '<svg viewBox="0 0 24 24"><path d="M19 12H5M11 6l-6 6 6 6"/></svg>',
    ext: '<svg viewBox="0 0 24 24"><path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/></svg>',
    x: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    gift: '<svg viewBox="0 0 24 24"><rect x="3" y="8" width="18" height="13" rx="1.5"/><path d="M3 12h18M12 8v13M12 8S10.5 3 7.5 3.5C5 4 6 8 12 8zM12 8s1.5-5 4.5-4.5C19 4 18 8 12 8z"/></svg>',
    share: '<svg viewBox="0 0 24 24"><path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7M16 6l-4-4-4 4M12 2v13"/></svg>',
    wa: '<svg viewBox="0 0 24 24"><path d="M3.5 20.5l1.3-4.2A8.5 8.5 0 1 1 8 19.3z"/><path d="M9 8.5c0 3.5 3 6.5 6.5 6.5l1.2-1.6-2-1-1 .8a5 5 0 0 1-2.4-2.4l.8-1-1-2z"/></svg>',
    plus: '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
    photo: '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="10" r="1.8"/><path d="M21 16l-5-5-8 8"/></svg>',
    tree: '<svg viewBox="0 0 64 64"><path d="M32 6l-12 16h7L15 38h9L10 54h44L40 38h9L37 22h7z"/><path d="M32 54v6"/><circle cx="32" cy="6" r="1.5"/></svg>'
  };
  function icon(name) { var s = document.createElement("span"); s.innerHTML = ICON[name]; return s.firstChild; }

  function leer(k, def) { try { var v = localStorage.getItem(k); return v == null ? def : v; } catch (e) { return def; } }
  function guardar(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function borrar(k) { try { localStorage.removeItem(k); } catch (e) {} }

  function slug(s) { return String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }
  function norm(s) { return String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase(); }
  function iniciales(n) {
    var p = String(n).replace(/^(Dra?\.)\s*/i, "").split(/\s+/).filter(Boolean);
    return ((p[0] || "?")[0] + (p[1] ? p[1][0] : "")).toUpperCase();
  }
  function paleta(n) { var i = PERSONAS.indexOf(n); return PALETAS[(i < 0 ? 0 : i) % PALETAS.length]; }
  function grad(n) { var p = paleta(n); return "background:linear-gradient(135deg," + p[0] + "," + p[1] + ")"; }
  function avatar(n, cls) { return el("span", { class: cls || "mini-av", style: grad(n), "aria-hidden": "true", text: iniciales(n) }); }

  function urlSegura(raw) {
    var s = String(raw || "").trim();
    if (!s) return null;
    if (!/^[a-z][a-z0-9+.-]*:/i.test(s)) s = "https://" + s;
    try { var u = new URL(s); return (u.protocol === "https:" || u.protocol === "http:") ? u.href : null; } catch (e) { return null; }
  }
  function dominio(h) { try { return new URL(h).hostname.replace(/^www\./, ""); } catch (e) { return h; } }
  function mapa(lugar) { return "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(lugar); }
  function listaStr(v) { return Array.isArray(v) ? v.filter(function (x) { return typeof x === "string" && x.trim(); }) : (typeof v === "string" && v.trim() ? v.split(/\n+/).filter(Boolean) : []); }
  function precioNum(p) { var m = String(p || "").match(/\d[\d.,\s]*/); if (!m) return NaN; return parseInt(m[0].replace(/[^\d]/g, ""), 10); }
  function esNuevo(g) { return typeof g.creado === "number" && Date.now() - g.creado < 3 * 86400000; }

  function normalizar(raw) {
    return {
      id: String(raw.id || ""),
      persona: String(raw.persona || ""),
      titulo: String(raw.titulo || "").slice(0, 120),
      detalles: String(raw.detalles || "").slice(0, 600),
      precio: String(raw.precio || "").slice(0, 40),
      lugares: listaStr(raw.lugares).slice(0, 8),
      links: listaStr(raw.links).map(urlSegura).filter(Boolean).slice(0, 8),
      fotoId: String(raw.fotoId || ""),
      fotoData: raw.fotoData || "",
      creado: Number(raw.creado) || 0
    };
  }

  var toastTimer;
  function toast(msg) {
    var t = $("#toast"); t.textContent = msg; t.hidden = false;
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { t.hidden = true; }, 3200);
  }

  function imagen(g, ancho, alt) {
    var src = Api.photoUrl(g, ancho);
    if (!src) return null;
    var img = el("img", { src: src, alt: alt || g.titulo || "", loading: "lazy", decoding: "async", referrerpolicy: "no-referrer" });
    var fb = Api.photoFallback(g, ancho);
    img.addEventListener("error", function () {
      if (fb && img.src !== fb) img.src = fb;
      else img.replaceWith(placeholder(g));
    });
    return img;
  }
  function placeholder(g) {
    return el("span", { class: "ph", style: grad(g.persona), "aria-hidden": "true" }, [
      el("span", { class: "ph-initials", text: iniciales(g.persona) }),
      (function () { var i = icon("gift"); i.setAttribute("class", "ph-gift"); return i; })()
    ]);
  }

  /* ---------- Cuenta regresiva ---------- */
  var objetivo = new Date(cfg.FECHA_INTERCAMBIO);
  var fechaTxt = "";
  try {
    fechaTxt = new Intl.DateTimeFormat("es-CR", { weekday: "long", day: "numeric", month: "long", timeZone: "America/Costa_Rica" }).format(objetivo).replace(",", "");
  } catch (e) { fechaTxt = objetivo.toLocaleDateString(); }

  function tick() {
    var ms = objetivo - Date.now();
    var d = 0, h = 0, m = 0, s = 0;
    if (ms > 0) { d = Math.floor(ms / 86400000); h = Math.floor(ms / 3600000) % 24; m = Math.floor(ms / 60000) % 60; s = Math.floor(ms / 1000) % 60; }
    var pad = function (n) { return n < 10 ? "0" + n : String(n); };
    document.querySelectorAll("[data-cd]").forEach(function (b) {
      var k = b.getAttribute("data-cd");
      b.textContent = k === "d" ? String(d) : pad(k === "h" ? h : k === "m" ? m : s);
    });
    var a = $("#announceText");
    a.textContent = "";
    if (ms > 0) {
      a.append("Intercambio de regalos · " + fechaTxt + " · faltan ");
      a.append(el("b", { text: d === 1 ? "1 día" : d + " días" }));
    } else if (ms > -86400000) {
      a.append("¡Hoy es el intercambio de regalos!");
    } else {
      a.append("¡Feliz Navidad! Gracias por participar en el amigo secreto.");
    }
  }

  /* ---------- Render ---------- */
  function conteos() {
    var c = {}; PERSONAS.forEach(function (p) { c[p] = 0; });
    state.gifts.forEach(function (g) { if (c[g.persona] != null) c[g.persona]++; });
    return c;
  }

  function renderNav() {
    var box = $("#navPeople"); box.textContent = "";
    PERSONAS.forEach(function (p) {
      box.appendChild(el("a", { href: "#lista-" + slug(p), onclick: function () { $("#navDropdown").open = false; } }, [avatar(p), p]));
    });
  }

  function renderHero() {
    var hero = $("#hero");
    var conFoto = state.gifts.filter(function (g) { return Api.photoUrl(g); });
    var base = (conFoto.length >= 2 ? conFoto : state.gifts).slice().sort(function (a, b) { return b.creado - a.creado; }).slice(0, 5);
    var slides = [{ tipo: "bienvenida" }].concat(base.map(function (g) { return { tipo: "regalo", g: g }; }));
    state.slides = slides;
    if (state.slide >= slides.length) state.slide = 0;

    hero.textContent = "";
    slides.forEach(function (s, i) {
      var activo = i === state.slide;
      var sl = el("div", { class: "slide" + (activo ? " is-active" : ""), role: "group", "aria-roledescription": "diapositiva", "aria-label": (i + 1) + " de " + slides.length, "aria-hidden": activo ? "false" : "true" });
      sl.appendChild(el("div", { class: "slide-bg p" + (i % 3) }));
      if (s.tipo === "bienvenida") {
        sl.appendChild(el("div", { class: "slide-text" }, [
          el("span", { class: "slide-kicker", text: cfg.SUBTITULO + " · " + PERSONAS.length + " participantes" }),
          el("h1", { class: "slide-title", html: "Tu regalo ideal,<br><em>a un clic</em> de distancia." }),
          el("p", { class: "slide-desc", text: "Poné aquí lo que te gustaría recibir con foto, tienda y enlace. Quien te sacó en el amigo secreto va a saber exactamente qué buscar." }),
          el("div", { class: "slide-cta" }, [
            el("button", { type: "button", class: "btn btn-dark", tabindex: activo ? null : "-1", onclick: function () { abrirForm(null); } }, [icon("plus"), "Agregar mi deseo"]),
            el("a", { class: "text-link", href: "#colecciones", tabindex: activo ? null : "-1" }, ["Ver las listas", icon("arrow")])
          ])
        ]));
        var art = el("div", { class: "slide-media" }, [el("div", { class: "slide-art", "aria-hidden": "true" }, [icon("tree")])]);
        sl.appendChild(art);
      } else {
        var g = s.g;
        var img = imagen(g, 1100, g.titulo);
        sl.appendChild(el("div", { class: "slide-text" }, [
          el("span", { class: "slide-kicker" }, [avatar(g.persona), "Deseo de " + g.persona]),
          el("h2", { class: "slide-title", text: g.titulo }),
          g.detalles ? el("p", { class: "slide-desc", text: g.detalles }) : null,
          g.precio ? el("span", { class: "slide-price", text: g.precio }) : null,
          el("div", { class: "slide-cta" }, [
            el("button", { type: "button", class: "btn btn-dark", tabindex: activo ? null : "-1", onclick: function () { abrirQuick(g); } }, ["Ver detalles"]),
            el("a", { class: "text-link", href: "#lista-" + slug(g.persona), tabindex: activo ? null : "-1" }, ["Ver su lista", icon("arrow")])
          ])
        ]));
        sl.appendChild(el("div", { class: "slide-media" }, [
          img ? el("div", { class: "slide-photo" }, [img]) : el("div", { class: "slide-photo", style: "position:relative" }, [placeholder(g)])
        ]));
      }
      hero.appendChild(sl);
    });

    if (slides.length > 1) {
      var dots = el("div", { class: "hero-dots", role: "tablist", "aria-label": "Diapositivas" });
      slides.forEach(function (_, i) {
        dots.appendChild(el("button", { type: "button", "aria-label": "Ir a la diapositiva " + (i + 1), "aria-current": String(i === state.slide), onclick: function () { irA(i); } }));
      });
      hero.appendChild(dots);
      hero.appendChild(el("div", { class: "hero-arrows" }, [
        el("button", { type: "button", "aria-label": "Anterior", onclick: function () { irA(state.slide - 1); } }, [icon("left")]),
        el("button", { type: "button", "aria-label": "Siguiente", onclick: function () { irA(state.slide + 1); } }, [icon("arrow")])
      ]));
    }
  }
  function irA(i) {
    var n = state.slides.length; if (n < 2) return;
    state.slide = (i + n) % n;
    var slides = document.querySelectorAll("#hero .slide");
    slides.forEach(function (s, k) {
      var on = k === state.slide;
      s.classList.toggle("is-active", on);
      s.setAttribute("aria-hidden", on ? "false" : "true");
      s.querySelectorAll("a,button").forEach(function (b) { if (on) b.removeAttribute("tabindex"); else b.setAttribute("tabindex", "-1"); });
    });
    document.querySelectorAll("#hero .hero-dots button").forEach(function (b, k) { b.setAttribute("aria-current", String(k === state.slide)); });
  }

  function renderPeople() {
    var c = conteos();
    var box = $("#people"); box.textContent = "";
    PERSONAS.forEach(function (p) {
      var n = c[p];
      box.appendChild(el("a", { class: "person" + (n ? " has" : ""), href: "#lista-" + slug(p), "aria-current": String(state.persona === p) }, [
        avatar(p, "av"),
        el("span", { class: "person-name", text: p }),
        el("span", { class: "person-count" + (n ? " ok" : ""), text: !state.loaded ? "…" : n ? (n === 1 ? "1 deseo" : n + " deseos") : "Sin lista aún" })
      ]));
    });
    var listos = PERSONAS.filter(function (p) { return c[p] > 0; }).length;
    $("#progressNote").textContent = state.loaded ? listos + " de " + PERSONAS.length + " personas ya armaron su lista" : "";
  }

  function filtrados() {
    var q = norm(state.q).trim();
    var lista = state.gifts.filter(function (g) { return PERSONAS.indexOf(g.persona) >= 0; });
    if (state.persona) lista = lista.filter(function (g) { return g.persona === state.persona; });
    if (q) lista = lista.filter(function (g) { return norm([g.titulo, g.detalles, g.persona, g.precio].concat(g.lugares).concat(g.links.map(dominio)).join(" ")).indexOf(q) >= 0; });
    var s = state.sort;
    lista.sort(function (a, b) {
      if (s === "az") return a.titulo.localeCompare(b.titulo, "es");
      if (s === "precio-asc" || s === "precio-desc") {
        var pa = precioNum(a.precio), pb = precioNum(b.precio);
        if (isNaN(pa) && isNaN(pb)) return b.creado - a.creado;
        if (isNaN(pa)) return 1; if (isNaN(pb)) return -1;
        return s === "precio-asc" ? pa - pb : pb - pa;
      }
      return b.creado - a.creado;
    });
    return lista;
  }

  function renderCatalog() {
    var p = state.persona;
    $("#catEyebrow").textContent = p ? "Colección" : "Todos los deseos";
    $("#catTitle").textContent = p ? "La lista de " + p : "Lo más reciente";
    var acts = $("#catActions"); acts.textContent = "";
    if (p) {
      var enlace = location.origin + location.pathname + "#lista-" + slug(p);
      acts.appendChild(el("a", { class: "btn btn-light btn-sm", href: "https://wa.me/?text=" + encodeURIComponent("Mirá la lista de deseos de " + p + " para el amigo secreto: " + enlace), target: "_blank", rel: "noopener" }, [icon("wa"), "WhatsApp"]));
      acts.appendChild(el("button", { type: "button", class: "btn btn-light btn-sm", onclick: function () { copiar(enlace); } }, [icon("share"), "Copiar enlace"]));
      acts.appendChild(el("button", { type: "button", class: "btn btn-dark btn-sm", onclick: function () { abrirForm(null, p); } }, [icon("plus"), "Agregar a esta lista"]));
      acts.appendChild(el("a", { class: "btn btn-light btn-sm", href: "#todos" }, ["Ver todos"]));
    }

    var grid = $("#grid");
    grid.style.setProperty("--cols", state.cols);
    document.querySelectorAll(".cols button").forEach(function (b) { b.setAttribute("aria-pressed", String(b.getAttribute("data-cols") === state.cols)); });
    grid.textContent = "";

    if (!state.loaded) {
      for (var i = 0; i < 6; i++) {
        grid.appendChild(el("div", { class: "card skeleton", "aria-hidden": "true" }, [el("div", { class: "card-media" }), el("div", { class: "line", style: "width:40%" }), el("div", { class: "line", style: "width:75%" })]));
      }
      $("#catNote").textContent = "";
      return;
    }

    var lista = filtrados();
    $("#catNote").textContent = lista.length === 1 ? "1 deseo" : lista.length + " deseos";
    if (!lista.length) {
      var vacio = state.q ? ["Sin resultados", "No encontramos regalos con “" + state.q + "”. Probá con otra palabra."]
        : p ? ["Todavía no hay deseos", p + " aún no ha puesto ideas. Si sos " + p + ", ¡empezá ahora!"]
        : ["El tablón está listo", "Sé la primera persona en agregar lo que te gustaría recibir."];
      grid.appendChild(el("div", { class: "empty-state" }, [
        el("h3", { text: vacio[0] }), el("p", { text: vacio[1] }),
        state.q ? null : el("button", { type: "button", class: "btn btn-dark", onclick: function () { abrirForm(null, p); } }, [icon("plus"), "Agregar deseo"])
      ]));
      return;
    }
    lista.forEach(function (g) { grid.appendChild(tarjeta(g)); });
  }

  function tarjeta(g) {
    var img = imagen(g, 800, "");
    var badges = el("span", { class: "card-badges" }, [
      esNuevo(g) ? el("span", { class: "badge new", text: "Nuevo" }) : null,
      g.links.length ? el("span", { class: "badge", text: "En línea" }) : null
    ]);
    var tienda = g.lugares[0] || (g.links[0] ? dominio(g.links[0]) : "");
    return el("button", { type: "button", class: "card", "aria-label": g.titulo + ", deseo de " + g.persona, onclick: function () { abrirQuick(g); } }, [
      el("span", { class: "card-media" }, [img || placeholder(g), badges, el("span", { class: "card-quick", text: "Vista rápida" })]),
      el("span", { class: "card-info" }, [
        el("span", { class: "card-person" }, [avatar(g.persona), g.persona]),
        el("span", { class: "card-title", text: g.titulo }),
        el("span", { class: "card-row" }, [
          g.precio ? el("span", { class: "card-price", text: g.precio }) : el("span"),
          tienda ? el("span", { class: "card-store" }, [icon("pin"), el("span", { text: tienda })]) : null
        ])
      ])
    ]);
  }

  function renderAll() {
    renderHero();
    renderPeople();
    renderCatalog();
    $("#addBtn").disabled = false;
  }

  function copiar(texto) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(texto).then(function () { toast("Enlace copiado"); }, function () { toast(texto); });
    } else toast(texto);
  }

  /* ---------- Modales ---------- */
  var ultimoFoco = null;
  function abrirOverlay(id) { ultimoFoco = document.activeElement; $(id).hidden = false; document.body.style.overflow = "hidden"; }
  function cerrarOverlay(id) {
    $(id).hidden = true;
    if (!document.querySelector(".overlay:not([hidden])")) document.body.style.overflow = "";
    if (ultimoFoco && ultimoFoco.focus && document.body.contains(ultimoFoco)) ultimoFoco.focus();
  }

  function abrirQuick(g) {
    var box = $("#quick"); box.textContent = "";
    var img = imagen(g, 1400, g.titulo);
    var body = el("div", { class: "quick-body" }, [
      el("button", { type: "button", class: "icon-btn quick-close", "aria-label": "Cerrar", onclick: function () { cerrarOverlay("#quickOverlay"); } }, [icon("x")]),
      el("span", { class: "quick-person" }, [avatar(g.persona), "Deseo de " + g.persona]),
      el("h2", { class: "quick-title", id: "quickTitle", text: g.titulo }),
      g.precio ? el("span", { class: "quick-price", text: g.precio }) : null,
      g.detalles ? el("p", { class: "quick-details", text: g.detalles }) : null
    ]);
    if (g.lugares.length) {
      var ul = el("ul", { class: "quick-list" });
      g.lugares.forEach(function (l) {
        var directo = /^https?:\/\//i.test(l) ? urlSegura(l) : null;
        ul.appendChild(el("li", null, [
          el("span", null, [icon("pin"), directo ? "Ubicación en " + dominio(directo) : l]),
          el("a", { class: "small", href: directo || mapa(l), target: "_blank", rel: "noopener noreferrer", text: "Ver en mapa" })
        ]));
      });
      body.appendChild(el("div", { class: "quick-block" }, [el("h3", { text: "Dónde conseguirlo" }), ul]));
    }
    if (g.links.length) {
      var buy = el("div", { class: "quick-buy" });
      g.links.forEach(function (u, i) {
        buy.appendChild(el("a", { class: "btn " + (i === 0 ? "btn-dark" : "btn-light"), href: u, target: "_blank", rel: "noopener noreferrer" }, ["Comprar en " + dominio(u), icon("ext")]));
      });
      body.appendChild(el("div", { class: "quick-block" }, [el("h3", { text: "Comprar en línea" }), buy]));
    }
    body.appendChild(el("div", { class: "quick-actions" }, [
      el("button", { type: "button", onclick: function () { cerrarOverlay("#quickOverlay"); abrirForm(g); } }, ["Editar"]),
      el("button", { type: "button", class: "del", onclick: function () { cerrarOverlay("#quickOverlay"); pedirBorrar(g); } }, ["Eliminar"])
    ]));
    box.appendChild(el("div", { class: "quick" }, [el("div", { class: "quick-media" }, [img || placeholder(g)]), body]));
    abrirOverlay("#quickOverlay");
    $(".quick-close", box).focus();
  }

  /* Formulario */
  var sel = $("#fPersona");
  PERSONAS.forEach(function (p) { sel.appendChild(el("option", { value: p, text: p })); });

  function filaMulti(cont, valor, ph, tipo) {
    var box = $(cont);
    var inp = el("input", { type: tipo, placeholder: ph, maxlength: "400", "aria-label": ph, id: cont.slice(1) + "-" + box.children.length + "-" + Date.now() });
    inp.value = valor || "";
    var fila = el("div", { class: "multi-item" }, [inp, el("button", { type: "button", class: "icon-btn", "aria-label": "Quitar", onclick: function () { if (box.children.length > 1) fila.remove(); else inp.value = ""; } }, [icon("x")])]);
    box.appendChild(fila);
    return inp;
  }
  function leerMulti(cont) { return Array.prototype.map.call(document.querySelectorAll(cont + " input"), function (i) { return i.value.trim(); }).filter(Boolean); }

  function ponerFoto(dataUrl, cambiado) {
    var pv = $("#dropPreview"); pv.textContent = "";
    if (dataUrl) {
      pv.appendChild(el("img", { src: dataUrl, alt: "Vista previa" }));
      state.foto = { dataUrl: dataUrl, cambiado: !!cambiado };
    } else {
      pv.appendChild(icon("photo"));
      state.foto = null;
    }
    $("#removeFoto").hidden = !dataUrl;
  }

  function abrirForm(g, persona) {
    state.editing = g || null;
    $("#formEyebrow").textContent = g ? "Editar deseo" : "Nuevo deseo";
    $("#formTitle").textContent = g ? g.titulo : "Agregar a la lista";
    $("#formError").textContent = "";
    sel.value = g ? g.persona : (persona || leer("as-persona", PERSONAS[0]));
    if (PERSONAS.indexOf(sel.value) < 0) sel.value = PERSONAS[0];
    $("#fTitulo").value = g ? g.titulo : "";
    $("#fPrecio").value = g ? g.precio : "";
    $("#fDetalles").value = g ? g.detalles : "";
    $("#lugares").textContent = ""; $("#links").textContent = "";
    ((g && g.lugares.length) ? g.lugares : [""]).forEach(function (v) { filaMulti("#lugares", v, "Ej.: Universal, Multiplaza Escazú", "text"); });
    ((g && g.links.length) ? g.links : [""]).forEach(function (v) { filaMulti("#links", v, "https://…", "url"); });
    state.quitarFoto = false;
    var actual = g ? Api.photoUrl(g, 400) : null;
    ponerFoto(actual, false);
    $("#fFoto").value = "";
    $("#claveField").hidden = Api.DEMO || !!leer("as-clave", "");
    $("#fClave").value = "";
    abrirOverlay("#formOverlay");
    setTimeout(function () { $("#fTitulo").focus(); }, 40);
  }

  function comprimir(file) {
    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(file);
      var img = new Image();
      img.onload = function () {
        try {
          var max = 1400, q = 0.84, out = "";
          for (var t = 0; t < 6; t++) {
            var w = img.naturalWidth, h = img.naturalHeight, k = Math.min(1, max / Math.max(w, h));
            var c = document.createElement("canvas");
            c.width = Math.max(1, Math.round(w * k)); c.height = Math.max(1, Math.round(h * k));
            var ctx = c.getContext("2d");
            ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, c.width, c.height);
            ctx.drawImage(img, 0, 0, c.width, c.height);
            out = c.toDataURL("image/jpeg", q);
            if (out.length < (Api.DEMO ? 450000 : 1600000)) break;
            max = Math.round(max * 0.8); q = Math.max(0.55, q - 0.07);
          }
          URL.revokeObjectURL(url); resolve(out);
        } catch (e) { URL.revokeObjectURL(url); reject(e); }
      };
      img.onerror = function () { URL.revokeObjectURL(url); reject(new Error("decode")); };
      img.src = url;
    });
  }
  function tomarArchivo(f) {
    if (!f) return;
    if (!/^image\//.test(f.type || "") && !/\.(jpe?g|png|webp|gif|heic|heif)$/i.test(f.name || "")) {
      $("#formError").textContent = "Ese archivo no es una imagen. Elegí una foto JPG, PNG o WebP."; return;
    }
    $("#formError").textContent = "Optimizando foto…";
    comprimir(f).then(function (d) { $("#formError").textContent = ""; ponerFoto(d, true); }, function () {
      $("#formError").textContent = "No se pudo leer esa foto. Si es de iPhone (HEIC), tomale una captura de pantalla y subí la captura.";
    });
  }

  $("#fFoto").addEventListener("change", function () { tomarArchivo(this.files && this.files[0]); });
  var drop = $("#drop");
  ["dragenter", "dragover"].forEach(function (ev) { drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.add("over"); }); });
  ["dragleave", "drop"].forEach(function (ev) { drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.remove("over"); }); });
  drop.addEventListener("drop", function (e) { tomarArchivo(e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]); });
  document.addEventListener("paste", function (e) {
    if ($("#formOverlay").hidden) return;
    var items = (e.clipboardData && e.clipboardData.items) || [];
    for (var i = 0; i < items.length; i++) if (items[i].kind === "file" && /^image\//.test(items[i].type)) { e.preventDefault(); tomarArchivo(items[i].getAsFile()); return; }
  });
  $("#removeFoto").addEventListener("click", function () { ponerFoto(null); state.quitarFoto = true; $("#fFoto").value = ""; });
  $("#addLugar").addEventListener("click", function () { filaMulti("#lugares", "", "Otro lugar", "text").focus(); });
  $("#addLink").addEventListener("click", function () { filaMulti("#links", "", "https://…", "url").focus(); });

  $("#giftForm").addEventListener("submit", function (e) {
    e.preventDefault();
    var err = $("#formError");
    var titulo = $("#fTitulo").value.trim();
    if (!titulo) { err.textContent = "Escribí qué te gustaría recibir."; $("#fTitulo").focus(); return; }
    var links = leerMulti("#links");
    var malo = links.filter(function (l) { return !urlSegura(l); })[0];
    if (malo) { err.textContent = "Este enlace no es válido: " + malo; return; }
    var clave = $("#fClave").value.trim() || leer("as-clave", "");
    if (!Api.DEMO && !clave) { $("#claveField").hidden = false; err.textContent = "Escribí la clave del grupo para guardar."; $("#fClave").focus(); return; }

    var persona = sel.value;
    guardar("as-persona", persona);
    var gift = {
      id: state.editing ? state.editing.id : "",
      persona: persona, titulo: titulo,
      precio: $("#fPrecio").value.trim(), detalles: $("#fDetalles").value.trim(),
      lugares: leerMulti("#lugares"), links: links.map(urlSegura)
    };
    var foto = null;
    if (state.foto && state.foto.cambiado) foto = { base64: state.foto.dataUrl.split(",")[1], mime: "image/jpeg", dataUrl: state.foto.dataUrl };
    else if (state.quitarFoto) foto = { quitar: true };

    var btn = $("#saveBtn"); btn.disabled = true; btn.textContent = foto && foto.base64 ? "Subiendo foto…" : "Guardando…";
    err.textContent = "";
    Api.save(gift, foto, clave).then(function (saved) {
      if (!Api.DEMO) guardar("as-clave", clave);
      var g = normalizar(saved || gift);
      var i = state.gifts.findIndex(function (x) { return x.id === g.id; });
      if (i >= 0) state.gifts[i] = g; else state.gifts.push(g);
      guardarCache();
      renderAll();
      cerrarOverlay("#formOverlay");
      toast(state.editing ? "Cambios guardados" : "¡Listo! Tu deseo ya está en el tablón");
      state.editing = null;
    }, function (e2) {
      if (e2 && e2.code === "CLAVE") {
        borrar("as-clave"); $("#claveField").hidden = false; $("#fClave").value = "";
        err.textContent = "La clave del grupo no es correcta."; $("#fClave").focus();
      } else {
        err.textContent = "No se pudo guardar: " + ((e2 && e2.message) || "revisá tu conexión e intentá de nuevo.");
      }
    }).then(function () { btn.disabled = false; btn.textContent = "Guardar deseo"; });
  });

  /* Eliminar */
  function pedirBorrar(g) {
    state.deleting = g;
    $("#confirmText").textContent = "Se quitará “" + g.titulo + "” de la lista de " + g.persona + ". Esta acción no se puede deshacer.";
    $("#confirmError").textContent = "";
    $("#confirmClaveField").hidden = Api.DEMO || !!leer("as-clave", "");
    $("#confirmClave").value = "";
    abrirOverlay("#confirmOverlay");
  }
  $("#confirmYes").addEventListener("click", function () {
    var g = state.deleting; if (!g) return;
    var clave = $("#confirmClave").value.trim() || leer("as-clave", "");
    if (!Api.DEMO && !clave) { $("#confirmClaveField").hidden = false; $("#confirmError").textContent = "Escribí la clave del grupo."; return; }
    var b = this; b.disabled = true;
    Api.remove(g.id, clave).then(function () {
      if (!Api.DEMO) guardar("as-clave", clave);
      state.gifts = state.gifts.filter(function (x) { return x.id !== g.id; });
      guardarCache(); renderAll(); cerrarOverlay("#confirmOverlay"); toast("Deseo eliminado");
    }, function (e) {
      if (e && e.code === "CLAVE") { borrar("as-clave"); $("#confirmClaveField").hidden = false; $("#confirmError").textContent = "La clave del grupo no es correcta."; }
      else $("#confirmError").textContent = "No se pudo eliminar. Intentá de nuevo.";
    }).then(function () { b.disabled = false; });
  });

  /* Cierres comunes */
  document.addEventListener("click", function (e) {
    var c = e.target.closest("[data-close]");
    if (c) cerrarOverlay(c.getAttribute("data-close") === "form" ? "#formOverlay" : "#confirmOverlay");
  });
  document.querySelectorAll(".overlay").forEach(function (o) {
    o.addEventListener("mousedown", function (e) { if (e.target === o) cerrarOverlay("#" + o.id); });
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      var abiertos = document.querySelectorAll(".overlay:not([hidden])");
      if (abiertos.length) cerrarOverlay("#" + abiertos[abiertos.length - 1].id);
      else if ($("#navDropdown").open) $("#navDropdown").open = false;
    }
  });
  document.addEventListener("click", function (e) { var d = $("#navDropdown"); if (d.open && !d.contains(e.target)) d.open = false; });

  /* ---------- Controles ---------- */
  $("#addBtn").addEventListener("click", function () { abrirForm(null, state.persona); });
  $("#searchBtn").addEventListener("click", function () { $("#catalogo").scrollIntoView({ behavior: "smooth" }); setTimeout(function () { $("#q").focus(); }, 400); });
  var qTimer;
  $("#q").addEventListener("input", function () { var v = this.value; clearTimeout(qTimer); qTimer = setTimeout(function () { state.q = v; renderCatalog(); }, 160); });
  $("#sort").addEventListener("change", function () { state.sort = this.value; renderCatalog(); });
  document.querySelectorAll(".cols button").forEach(function (b) {
    b.addEventListener("click", function () { state.cols = b.getAttribute("data-cols"); guardar("as-cols", state.cols); renderCatalog(); });
  });

  /* Rutas: #lista-nombre muestra la colección de esa persona */
  function ruta(scroll) {
    var h = decodeURIComponent(location.hash.replace(/^#/, ""));
    if (h.indexOf("lista-") === 0) {
      var p = PERSONAS.filter(function (x) { return slug(x) === h.slice(6); })[0] || null;
      state.persona = p;
      renderPeople(); renderCatalog();
      if (scroll) $("#catalogo").scrollIntoView({ behavior: "smooth" });
    } else if (h === "todos" || h === "") {
      var cambio = state.persona !== null;
      state.persona = null;
      renderPeople(); renderCatalog();
      if (h === "todos" && scroll) window.scrollTo({ top: 0, behavior: "smooth" });
      else if (cambio && scroll) $("#catalogo").scrollIntoView({ behavior: "smooth" });
    }
  }
  window.addEventListener("hashchange", function () { ruta(true); });

  /* ---------- Datos ---------- */
  function firma(lista) { return JSON.stringify(lista.map(function (g) { return [g.id, g.titulo, g.precio, g.detalles, g.fotoId, g.lugares, g.links, g.persona, (g.fotoData || "").length]; })); }
  function guardarCache() { if (!Api.DEMO) try { localStorage.setItem("as-cache", JSON.stringify(state.gifts)); } catch (e) {} state.firma = firma(state.gifts); }

  function cargar(inicial) {
    return Api.list().then(function (lista) {
      var nueva = lista.map(normalizar).filter(function (g) { return g.id; });
      var f = firma(nueva);
      if (f !== state.firma || !state.loaded) {
        state.gifts = nueva; state.loaded = true; state.firma = f;
        if (!Api.DEMO) try { localStorage.setItem("as-cache", JSON.stringify(nueva)); } catch (e) {}
        renderAll();
      }
    }, function () {
      if (inicial && !state.loaded) {
        state.loaded = true; renderAll();
        toast("No se pudo conectar con el tablón. Revisá tu conexión.");
      }
    });
  }

  // Arranque
  $("#brandTitle").textContent = cfg.TITULO;
  $("#brandSub").textContent = cfg.SUBTITULO;
  $("#cdDate").innerHTML = "";
  $("#cdDate").append("Intercambio · ", el("em", { text: fechaTxt }));
  $("#footerDate").textContent = "Intercambio de regalos · " + fechaTxt;
  if (Api.DEMO) $("#demoBar").hidden = false;
  renderNav();
  tick(); setInterval(tick, 1000);

  if (!Api.DEMO) {
    try {
      var cache = JSON.parse(localStorage.getItem("as-cache") || "null");
      if (Array.isArray(cache) && cache.length) { state.gifts = cache.map(normalizar); state.loaded = true; state.firma = firma(state.gifts); }
    } catch (e) {}
  }
  renderAll();
  ruta(!!location.hash && location.hash.indexOf("#lista-") === 0);
  cargar(true);

  setInterval(function () { if (document.visibilityState === "visible" && $("#formOverlay").hidden) cargar(false); }, Math.max(10, cfg.REFRESCO_SEGUNDOS || 30) * 1000);

  // Carrusel automático
  var pausa = false;
  var hero = $("#hero");
  hero.addEventListener("mouseenter", function () { pausa = true; });
  hero.addEventListener("mouseleave", function () { pausa = false; });
  hero.addEventListener("focusin", function () { pausa = true; });
  hero.addEventListener("focusout", function () { pausa = false; });
  var reducido = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!reducido) setInterval(function () { if (!pausa && document.visibilityState === "visible") irA(state.slide + 1); }, 6500);
})();
