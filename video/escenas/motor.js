// Motor de la composición: todo depende del tiempo `t` (segundos), nunca del reloj, para que
// cada cuadro se pueda grabar igual las veces que haga falta. `render(t)` dibuja el cuadro.
/* eslint-disable no-unused-vars */

const Q = new URLSearchParams(location.search);
const V = Q.get("f") === "v"; // vertical 9:16
const W = V ? 1080 : 1920;
const H = V ? 1920 : 1080;
const CAPTIONS = Q.get("subs") !== "0" && (V || Q.get("subs") === "1");
const TR = 0.6; // duración de las transiciones
const C = {
  bg: "#faf7f2",
  ink: "#1c1917",
  accent: "#e4572e",
  accentStrong: "#b24424",
  dark: "#120f0d",
  ok: "#2f855a",
};

const stage = document.getElementById("stage");
stage.style.width = `${W}px`;
stage.style.height = `${H}px`;

/* ——— Matemática ——— */
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, p) => a + (b - a) * p;
const prog = (t, a, d) => clamp((t - a) / d);
const E = {
  lin: (p) => p,
  outCubic: (p) => 1 - Math.pow(1 - p, 3),
  outQuint: (p) => 1 - Math.pow(1 - p, 5),
  outExpo: (p) => (p >= 1 ? 1 : 1 - Math.pow(2, -10 * p)),
  inCubic: (p) => p * p * p,
  inOutCubic: (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2),
  inOutSine: (p) => -(Math.cos(Math.PI * p) - 1) / 2,
  outBack: (p, s = 1.6) => 1 + (s + 1) * Math.pow(p - 1, 3) + s * Math.pow(p - 1, 2),
};
/** Entrada (0→1) y salida (1→0) en un mismo valor. */
const inout = (t, a, din, b, dout, e = E.outCubic) =>
  Math.min(e(prog(t, a, din)), 1 - E.inCubic(prog(t, b, dout)));

/* ——— DOM ——— */
function el(tag, cls, parent, css = {}, html) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  Object.assign(e.style, css);
  if (html !== undefined) e.innerHTML = html;
  if (parent) parent.appendChild(e);
  return e;
}
const px = (n) => `${n}px`;
function put(
  e,
  { x = 0, y = 0, s = 1, sx, sy, r = 0, o = 1, blur = 0, rx = 0, ry = 0, persp = 0 },
) {
  const sc = sx !== undefined ? `scale(${sx},${sy ?? sx})` : `scale(${s})`;
  const p = persp ? `perspective(${persp}px) rotateX(${rx}deg) rotateY(${ry}deg) ` : "";
  e.style.transform = `translate(${x}px,${y}px) ${p}rotate(${r}deg) ${sc}`;
  e.style.opacity = o;
  e.style.filter = blur > 0.1 ? `blur(${blur}px)` : "none";
  e.style.visibility = o <= 0.001 ? "hidden" : "visible";
}

/* ——— Íconos (trazos simples) ——— */
const ICONOS = {
  check: '<path d="M20 6 9 17l-5-5"/>',
  star: '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" fill="currentColor"/>',
  chat: '<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>',
  clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
  globe:
    '<circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/>',
  phone: '<rect x="5" y="2" width="14" height="20" rx="2"/><path d="M12 18h.01"/>',
  store:
    '<path d="m2 7 2-4h16l2 4"/><path d="M4 7v13h16V7"/><path d="M9 20v-6h6v6"/><path d="M2 7h20"/>',
  calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  chart: '<path d="M3 3v18h18"/><path d="M8 16v-4M13 16V8M18 16v-7"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  trend: '<path d="m22 7-8.5 8.5-5-5L2 17"/><path d="M16 7h6v6"/>',
  alert:
    '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4M12 17h.01"/>',
  card: '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/>',
  users:
    '<circle cx="9" cy="7" r="4"/><path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/><path d="M16 3.1a4 4 0 0 1 0 7.8M21 21v-2a4 4 0 0 0-3-3.9"/>',
  truck:
    '<path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.7l-3.7-4.6A1 1 0 0 0 17.5 8H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/>',
  cube: '<path d="M21 8 12 3 3 8v8l9 5 9-5Z"/><path d="m3 8 9 5 9-5M12 13v8"/>',
  nodl: '<path d="M12 15V3"/><path d="m7 10 5 5 5-5"/><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M3 3l18 18"/>',
  bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.9 1.9 0 0 0 3.4 0"/>',
  flame:
    '<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.4-.5-2-1-3-1.1-2.1-.2-4 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.2.4-2.3 1-3.3.3 1.6 1.2 2.8 2.5 2.8"/>',
  palette:
    '<circle cx="13.5" cy="6.5" r="1.5" fill="currentColor"/><circle cx="17.5" cy="10.5" r="1.5" fill="currentColor"/><circle cx="8.5" cy="7.5" r="1.5" fill="currentColor"/><circle cx="6.5" cy="12.5" r="1.5" fill="currentColor"/><path d="M12 2a10 10 0 0 0 0 20c1 0 1.7-.7 1.7-1.7 0-.4-.2-.8-.4-1.1-.3-.3-.4-.7-.4-1.1 0-1 .8-1.7 1.7-1.7H17a5 5 0 0 0 5-5c0-4.9-4.5-8.4-10-8.4Z"/>',
  layers: '<path d="m12 2 10 5-10 5L2 7Z"/><path d="m2 17 10 5 10-5"/><path d="m2 12 10 5 10-5"/>',
  receipt:
    '<path d="M4 2v20l3-2 3 2 3-2 3 2 3-2 1 .7V2l-3 2-3-2-3 2-3-2-3 2Z"/><path d="M8 8h8M8 12h8M8 16h5"/>',
  spark:
    '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8"/>',
  table: '<path d="M3 10h18M5 10v10M19 10v10M8 6h8"/>',
  chef: '<path d="M17 21a1 1 0 0 0 1-1v-5.4a4 4 0 1 0-1.5-7.6 5 5 0 0 0-9 0A4 4 0 1 0 6 14.6V20a1 1 0 0 0 1 1Z"/><path d="M6 17h12"/>',
};
function icon(name, size = 24, stroke = 2) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round">${ICONOS[name] ?? ""}</svg>`;
}

/* ——— Sonidos: cada escena los registra al construirse ——— */
const SFX = [];
function sfx(t, tipo, vol = 1) {
  SFX.push({ t: Math.max(0, +t.toFixed(3)), tipo, vol });
}

/* ——— Datos ——— */
let TIEMPOS, CAJAS;
const SHOT = (n) => `../captura/png/${n}.png`;
const IMGS = new Map();
function precargar(nombres) {
  return Promise.all(
    nombres.map(
      (n) =>
        new Promise((ok) => {
          const i = new Image();
          i.onload = () => {
            IMGS.set(n, { w: i.naturalWidth / 2, h: i.naturalHeight / 2 });
            ok();
          };
          i.onerror = () => {
            console.error("Falta la imagen", n);
            ok();
          };
          i.src = SHOT(n);
        }),
    ),
  );
}
const caja = (shot, k) => CAJAS[shot]?.boxes?.[k];

/* ——— Pantalla (teléfono o ventana) con cámara, toques y resaltados ——— */
class Pantalla {
  constructor(screen, w, h, cssW) {
    this.screen = screen;
    this.w = w;
    this.h = h;
    this.k = w / cssW; // píxeles de pantalla por píxel CSS de la captura
    this.cam = el("div", "cam", screen);
    this.capas = {};
    this.over = el("div", "abs", screen, { width: px(w), height: px(h), zIndex: 4 });
    this.view = { s: 1, tx: 0, ty: 0 };
  }
  capa(nombre) {
    if (!this.capas[nombre]) {
      const img = el("img", "shot", this.cam, { width: px(this.w), visibility: "hidden" });
      img.src = SHOT(nombre);
      this.capas[nombre] = img;
    }
    return this.capas[nombre];
  }
  /** estados: { nombre: opacidad } o { nombre: { o, y (scroll en px CSS), x } } */
  mostrar(estados) {
    for (const [n, img] of Object.entries(this.capas)) if (!(n in estados)) put(img, { o: 0 });
    let z = 1;
    for (const [n, v] of Object.entries(estados)) {
      const st = typeof v === "number" ? { o: v } : v;
      this.capa(n).style.zIndex = z++;
      put(this.capa(n), {
        o: st.o ?? 1,
        y: -(st.y ?? 0) * this.k,
        x: (st.x ?? 0) * this.k,
        s: st.s ?? 1,
      });
    }
  }
  /** Acerca la cámara a una caja (px CSS de la captura). `a` 0→1 es cuánto. */
  camara(box, a, zoomMax = 2.2, alto = null) {
    const imgH = (alto ?? this.h / this.k) * this.k;
    let s = 1,
      tx = 0,
      ty = 0;
    if (box && a > 0) {
      const sT = Math.min(
        zoomMax,
        (this.w * 0.86) / (box.width * this.k),
        (this.h * 0.8) / (box.height * this.k),
      );
      const sF = Math.max(1, sT);
      const cx = (box.x + box.width / 2) * this.k;
      const cy = (box.y + box.height / 2) * this.k;
      let txT = this.w / 2 - cx * sF;
      let tyT = this.h / 2 - cy * sF;
      txT = clamp(txT, this.w - this.w * sF, 0);
      tyT = clamp(tyT, this.h - imgH * sF, 0);
      s = lerp(1, sF, a);
      tx = lerp(0, txT, a);
      ty = lerp(0, tyT, a);
    }
    this.view = { s, tx, ty };
    this.cam.style.transform = `translate(${tx}px,${ty}px) scale(${s})`;
  }
  /** Punto de la captura (px CSS) en coordenadas de la pantalla, con la cámara actual. */
  punto(xc, yc) {
    const { s, tx, ty } = this.view;
    return { x: xc * this.k * s + tx, y: yc * this.k * s + ty };
  }
  centro(box) {
    return this.punto(box.x + box.width / 2, box.y + box.height / 2);
  }
}

class Telefono extends Pantalla {
  constructor(parent, w) {
    const h = (w * 844) / 390;
    const bez = Math.round(w * 0.035);
    const root = el("div", "phone", parent, {
      width: px(w + bez * 2),
      height: px(h + bez * 2),
      borderRadius: px(w * 0.14),
    });
    const screen = el("div", "screen", root, {
      left: px(bez),
      top: px(bez),
      width: px(w),
      height: px(h),
      borderRadius: px(w * 0.11),
    });
    el("div", "island", root, {
      width: px(w * 0.3),
      height: px(w * 0.075),
      left: px(bez + w * 0.35),
      top: px(bez + w * 0.025),
    });
    super(screen, w, h, 390);
    this.root = root;
    this.bez = bez;
    this.ow = w + bez * 2;
    this.oh = h + bez * 2;
    this.finger = el("div", "finger", this.over, {
      width: px(46),
      height: px(46),
      visibility: "hidden",
    });
    this.rip = el("div", "ripple", this.over, {
      width: px(80),
      height: px(80),
      visibility: "hidden",
    });
  }
  /** Toque con el dedo sobre la caja: p 0→1 (0.4 llega, 0.5 toca). */
  toque(box, p) {
    if (!box || p <= 0 || p >= 1) {
      put(this.finger, { o: 0 });
      put(this.rip, { o: 0 });
      return;
    }
    const c = this.centro(box);
    const llega = E.outCubic(prog(p, 0, 0.4));
    const presiona = prog(p, 0.4, 0.15);
    const fs = 1 - 0.25 * Math.sin(Math.PI * presiona);
    put(this.finger, {
      x: c.x - 23 + (1 - llega) * 70,
      y: c.y - 23 + (1 - llega) * 120,
      s: fs,
      o: Math.min(llega, 1 - prog(p, 0.75, 0.25)) * 0.95,
    });
    const r = prog(p, 0.45, 0.5);
    put(this.rip, { x: c.x - 40, y: c.y - 40, s: 0.3 + r * 1.6, o: r > 0 ? (1 - r) * 0.9 : 0 });
  }
  colocar(x, y, extra = {}) {
    put(this.root, { x: x - this.ow / 2, y: y - this.oh / 2, ...extra });
  }
}

class Ventana extends Pantalla {
  constructor(parent, w, { cssW = 1440, cssH = 900, dark = false, url = "platterio.app" } = {}) {
    const h = (w * cssH) / cssW;
    const bar = Math.round(w * 0.034);
    const root = el("div", `win${dark ? " dark" : ""}`, parent, {
      width: px(w),
      height: px(h + bar),
    });
    const b = el("div", "bar", root, { height: px(bar), padding: `0 ${bar * 0.5}px` });
    for (const c of ["#ff5f57", "#febc2e", "#28c840"])
      el("div", "dot", b, { width: px(bar * 0.3), height: px(bar * 0.3), background: c });
    el(
      "div",
      "url",
      b,
      {
        height: px(bar * 0.62),
        width: px(w * 0.36),
        fontSize: px(bar * 0.36),
        marginLeft: px(w * 0.25),
      },
      url,
    );
    const screen = el("div", "screen", root, {
      left: 0,
      top: px(bar),
      width: px(w),
      height: px(h),
      borderRadius: 0,
      background: dark ? "#0e0d0c" : "#faf7f2",
    });
    super(screen, w, h, cssW);
    this.root = root;
    this.ow = w;
    this.oh = h + bar;
    this.bar = bar;
    this.cursor = el(
      "div",
      "cursor",
      this.over,
      {},
      `<svg viewBox="0 0 24 24" width="34" height="34"><path d="M4 2l16 9.5-7 1.6-3.6 6.9Z" fill="#111" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg>`,
    );
    this.rip = el("div", "ripple", this.over, {
      width: px(70),
      height: px(70),
      visibility: "hidden",
    });
  }
  /** Cursor que llega y hace clic: p 0→1 (clic en 0.55). */
  clic(box, p, desde = { x: 0.95, y: 1.05 }) {
    if (!box || p <= 0 || p >= 1) {
      put(this.cursor, { o: 0 });
      put(this.rip, { o: 0 });
      return;
    }
    const c = this.centro(box);
    const llega = E.inOutCubic(prog(p, 0, 0.5));
    const x = lerp(this.w * desde.x, c.x, llega);
    const y = lerp(this.h * desde.y, c.y, llega);
    const pr = prog(p, 0.52, 0.12);
    put(this.cursor, {
      x: x - 6,
      y: y - 4,
      s: 1 - 0.18 * Math.sin(Math.PI * pr),
      o: Math.min(prog(p, 0, 0.12), 1 - prog(p, 0.85, 0.15)),
    });
    const r = prog(p, 0.55, 0.45);
    put(this.rip, { x: c.x - 35, y: c.y - 35, s: 0.3 + r * 1.5, o: r > 0 ? (1 - r) * 0.9 : 0 });
  }
  colocar(x, y, extra = {}) {
    put(this.root, { x: x - this.ow / 2, y: y - this.oh / 2, ...extra });
  }
}

/* ——— Texto ——— */
class Titulo {
  /** `texto` admite *palabra* para resaltarla. */
  constructor(parent, texto, { x, y, w, size, align = "left", color = C.ink, stagger = 0.07 }) {
    this.e = el("div", "title", parent, {
      left: px(x),
      top: px(y),
      width: px(w),
      fontSize: px(size),
      textAlign: align,
      color,
    });
    this.words = [];
    for (const raw of texto.split(" ")) {
      const acc = raw.startsWith("*");
      const word = raw.replace(/\*/g, "");
      const m = el("span", "wm", this.e);
      const s = el("span", `w${acc ? " acc" : ""}`, m, {}, word);
      this.e.appendChild(document.createTextNode(" "));
      this.words.push(s);
    }
    this.stagger = stagger;
  }
  update(lt, inicio = 0.15, salida = Infinity) {
    this.words.forEach((s, i) => {
      const p = E.outQuint(prog(lt, inicio + i * this.stagger, 0.7));
      const q = E.inCubic(prog(lt, salida, 0.4));
      s.style.transform = `translateY(${(1 - p) * 105 - q * 40}%)`;
      s.style.opacity = Math.min(p * 1.2, 1 - q);
    });
  }
}
class Kicker {
  constructor(parent, texto, { x, y, size = 22, align = "left", w = 600, color }) {
    this.e = el("div", "kicker", parent, {
      left: px(x),
      top: px(y),
      fontSize: px(size),
      width: px(w),
      justifyContent: align === "center" ? "center" : "flex-start",
      color: color ?? C.accentStrong,
    });
    this.line = el("i", "", this.e, { width: px(46) });
    this.t = el("span", "", this.e, {}, texto);
  }
  update(lt, inicio = 0.05, salida = Infinity) {
    const p = E.outCubic(prog(lt, inicio, 0.6));
    const q = prog(lt, salida, 0.35);
    this.line.style.transform = `scaleX(${p})`;
    this.line.style.transformOrigin = "left";
    put(this.t, { x: (1 - p) * -16, o: p * (1 - q) });
    this.e.style.opacity = 1 - q;
  }
}
function chip(parent, texto, ic, { size = 26, cls = "" } = {}) {
  const e = el("div", `chip ${cls}`, parent, {
    fontSize: px(size),
    padding: `${size * 0.42}px ${size * 0.9}px ${size * 0.42}px ${size * 0.42}px`,
  });
  if (ic)
    el(
      "span",
      "ic",
      e,
      { width: px(size * 1.7), height: px(size * 1.7) },
      icon(ic, size * 0.95, 2.2),
    );
  el("span", "", e, {}, texto);
  return e;
}
/** Hace aparecer un chip con rebote en (x, y) — el centro del chip. */
function pop(e, lt, a, { x, y, salida = Infinity, from = 0 } = {}) {
  const p = prog(lt, a, 0.55);
  const s = p <= 0 ? 0 : E.outBack(p, 2.2);
  const q = E.inCubic(prog(lt, salida, 0.35));
  const w = e.offsetWidth,
    h = e.offsetHeight;
  put(e, {
    x: x - w / 2,
    y: y - h / 2 + (1 - Math.min(p * 1.4, 1)) * 24 - q * 20,
    s: Math.max(0.0001, s * (1 - q * 0.2)),
    o: Math.min(1, p * 2) * (1 - q),
    r: from * (1 - p),
  });
}

/* ——— Fondo vivo ——— */
function fondo() {
  const root = el("div", "abs", stage, { width: px(W), height: px(H), background: C.bg });
  const blobs = [
    { c: "rgba(228,87,46,0.22)", r: 0.55, x: 0.82, y: 0.12 },
    { c: "rgba(246,185,92,0.22)", r: 0.5, x: 0.1, y: 0.85 },
    { c: "rgba(228,87,46,0.10)", r: 0.42, x: 0.25, y: 0.2 },
  ].map((b) => {
    const d = Math.max(W, H) * b.r * 2;
    const e = el("div", "blob", root, {
      width: px(d),
      height: px(d),
      background: `radial-gradient(circle, ${b.c} 0%, rgba(250,247,242,0) 68%)`,
    });
    return { ...b, d, e };
  });
  const cv = document.createElement("canvas");
  cv.width = cv.height = 256;
  const g = cv.getContext("2d");
  const id = g.createImageData(256, 256);
  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < id.data.length; i += 4) {
    const v = 128 + (rnd() - 0.5) * 255;
    id.data[i] = id.data[i + 1] = id.data[i + 2] = v;
    id.data[i + 3] = 255;
  }
  g.putImageData(id, 0, 0);
  el("div", "grain", stage, { backgroundImage: `url(${cv.toDataURL()})`, zIndex: 40 });
  return (t) => {
    blobs.forEach((b, i) => {
      const x = (b.x + 0.06 * Math.sin(t * 0.21 + i * 2)) * W - b.d / 2;
      const y = (b.y + 0.05 * Math.cos(t * 0.17 + i)) * H - b.d / 2;
      b.e.style.transform = `translate(${x}px,${y}px)`;
    });
  };
}

/* ——— Subtítulos ——— */
function subtitulos() {
  if (!CAPTIONS) return () => {};
  const cues = [];
  for (const e of TIEMPOS.escenas)
    for (const f of e.frases) {
      const trozos = partir(f.texto);
      const total = trozos.reduce((a, b) => a + b.length, 0);
      let t0 = f.inicio;
      for (const tr of trozos) {
        const d = (f.dur * tr.length) / total;
        cues.push({ a: t0, b: t0 + d, t: tr });
        t0 += d;
      }
    }
  const box = el("div", "cap", stage, { top: px(V ? 1655 : 940) });
  const span = el("span", "", box, {
    fontSize: px(V ? 44 : 38),
    padding: V ? "14px 26px" : "10px 22px",
    maxWidth: px(V ? 960 : 1400),
    lineHeight: 1.25,
  });
  return (t) => {
    const c = cues.find((c) => t >= c.a - 0.05 && t < c.b + 0.12);
    if (!c) {
      box.style.opacity = 0;
      return;
    }
    if (span.textContent !== c.t) span.textContent = c.t;
    box.style.opacity = 1;
  };
}
function partir(texto) {
  const max = V ? 34 : 60;
  if (texto.length <= max + 4) return [texto];
  const out = [];
  let cur = "";
  for (const p of texto.split(" ")) {
    if (cur && cur.length + 1 + p.length > max) {
      out.push(cur);
      cur = p;
    } else cur = `${cur} ${p}`.trim();
  }
  out.push(cur);
  return out;
}

/* ——— Escenas y transiciones ——— */
const ESCENAS = [];
/** def: { id, entrada: 'sube'|'zoom'|'barrido'|'circulo'|'corte', fondo, build(root, info) → update(lt, info) } */
function escena(def) {
  ESCENAS.push(def);
}

function aplicarTransicion(root, tipo, p, entrando) {
  // p: 0→1 a lo largo de la transición
  if (entrando) {
    const e = E.outCubic(p);
    if (tipo === "zoom") put(root, { s: lerp(1.18, 1, e), o: clamp(p * 1.6), blur: (1 - e) * 10 });
    else if (tipo === "barrido")
      put(root, { x: (1 - E.outExpo(p)) * W * 0.35, o: clamp(p * 2), blur: (1 - e) * 14 });
    else if (tipo === "circulo") {
      put(root, {});
      root.style.clipPath = `circle(${lerp(0, 120, E.inOutCubic(p))}% at 50% 50%)`;
    } else if (tipo === "corte") put(root, {});
    else put(root, { y: (1 - e) * 70, o: clamp((p - 0.15) * 1.8), blur: (1 - e) * 8 });
    if (tipo !== "circulo") root.style.clipPath = "none";
  } else {
    const e = E.inOutCubic(clamp(p / 0.5));
    if (tipo === "circulo" || tipo === "corte") put(root, { s: 1 + 0.05 * p });
    else if (tipo === "barrido") put(root, { x: -E.inCubic(p) * W * 0.3, o: 1 - e, blur: e * 14 });
    else put(root, { s: 1 - 0.05 * e, y: -30 * e, o: 1 - e, blur: e * 6 });
  }
}

let fondoUpdate, subsUpdate;
const montadas = [];

async function iniciar() {
  [TIEMPOS, CAJAS] = await Promise.all([
    fetch("../voz/tiempos.json").then((r) => r.json()),
    fetch("../captura/cajas.json").then((r) => r.json()),
  ]);
  await precargar(Object.keys(CAJAS));
  await document.fonts.load('600 80px "Fraunces"');
  await document.fonts.load('italic 600 80px "Fraunces"');
  await document.fonts.load('600 30px "Inter"');
  fondoUpdate = fondo();
  ESCENAS.forEach((def, i) => {
    const t = TIEMPOS.escenas.find((e) => e.id === def.id);
    if (!t) throw new Error(`Sin tiempos para ${def.id}`);
    const root = el("div", "scene", stage, { zIndex: 10 + i, display: "none" });
    if (def.fondo) root.style.background = def.fondo;
    const F = t.frases.map((f) => f.inicio - t.inicio);
    const D = t.frases.map((f) => f.dur);
    const info = { inicio: t.inicio, dur: t.dur, F, D };
    if (i > 0 && def.entrada !== "corte")
      sfx(t.inicio - 0.12, def.entrada === "circulo" ? "swell" : "whoosh", 0.8);
    const update = def.build(root, info);
    montadas.push({ def, root, info, update, i });
  });
  subsUpdate = subtitulos();
  await Promise.all(
    [...document.images].map((i) => (i.complete ? null : i.decode().catch(() => {}))),
  );
  window.DURACION = TIEMPOS.total;
  window.SFX = SFX.sort((a, b) => a.t - b.t);
  window.LISTO = true;
}

function render(t) {
  fondoUpdate(t);
  for (const m of montadas) {
    const { inicio, dur } = m.info;
    const next = montadas[m.i + 1];
    const fin = next ? inicio + dur + TR : Infinity;
    const lt = t - inicio;
    const visible = t >= inicio && t < fin;
    m.root.style.display = visible ? "block" : "none";
    if (!visible) continue;
    if (lt < TR && m.i > 0) aplicarTransicion(m.root, m.def.entrada ?? "sube", lt / TR, true);
    else if (next && lt > dur)
      aplicarTransicion(m.root, next.def.entrada ?? "sube", (lt - dur) / TR, false);
    else {
      put(m.root, {});
      m.root.style.clipPath = "none";
    }
    m.update(lt, m.info);
  }
  subsUpdate(t);
}
window.render = render;
