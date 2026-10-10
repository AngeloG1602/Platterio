// Escenas del video. Cada una arma su DOM una vez y devuelve update(lt) (lt = tiempo local).
/* global V, W, H, C, E, el, px, put, prog, clamp, lerp, inout, icon, sfx, chip, pop, escena,
   Titulo, Kicker, Telefono, Ventana, caja, iniciar, TIEMPOS */

/* ——— Ayudas de composición ——— */
function cabecera(
  root,
  kicker,
  titulo,
  { centrado = false, claro = false, ky, sizeH, sizeV } = {},
) {
  const color = claro ? "#f7f3ec" : C.ink;
  const kc = claro ? "#f6a27f" : C.accentStrong;
  let k, t;
  if (V) {
    k = new Kicker(root, kicker, { x: 0, y: 150, w: W, align: "center", size: 24, color: kc });
    t = new Titulo(root, titulo, {
      x: 50,
      y: 198,
      w: 980,
      size: sizeV ?? 84,
      align: "center",
      color,
    });
  } else if (centrado) {
    const y = ky ?? 92;
    k = new Kicker(root, kicker, { x: 0, y, w: W, align: "center", size: 22, color: kc });
    t = new Titulo(root, titulo, {
      x: 160,
      y: y + 44,
      w: 1600,
      size: sizeH ?? 80,
      align: "center",
      color,
    });
  } else {
    k = new Kicker(root, kicker, { x: 130, y: 300, w: 700, size: 22, color: kc });
    t = new Titulo(root, titulo, { x: 126, y: 344, w: 720, size: sizeH ?? 92, color });
  }
  if (!kicker) k.e.style.display = "none";
  return (lt) => {
    k.update(lt, 0.05);
    t.update(lt, 0.15);
  };
}
/** Entrada de un dispositivo: sube y se endereza. */
function entra(dev, lt, a, cx, cy, { dy = 180, r0 = 0, s = 1, dur = 0.9, extra = {} } = {}) {
  const p = E.outQuint(prog(lt, a, dur));
  dev.colocar(cx, cy + (1 - p) * dy, {
    o: clamp(p * 1.6),
    r: r0 * (1 - p) + (extra.r ?? 0),
    s: s * (0.94 + 0.06 * p),
    ...extra,
    ...(extra.r !== undefined ? { r: r0 * (1 - p) + extra.r } : {}),
  });
}
const lerpBox = (a, b, p) => ({
  x: lerp(a.x, b.x, p),
  y: lerp(a.y, b.y, p),
  width: lerp(a.width, b.width, p),
  height: lerp(a.height, b.height, p),
});
/** Recuadro que late sobre una caja de la captura. */
function resaltado(pant) {
  const g = el("div", "glow", pant.over, { visibility: "hidden" });
  return (box, o, color = C.accent) => {
    if (!box || o <= 0.01) {
      put(g, { o: 0 });
      return;
    }
    const a = pant.punto(box.x - 6, box.y - 6);
    const b = pant.punto(box.x + box.width + 6, box.y + box.height + 6);
    Object.assign(g.style, {
      left: 0,
      top: 0,
      width: px(b.x - a.x),
      height: px(b.y - a.y),
      borderColor: color,
      boxShadow: `0 0 0 ${6 + 4 * o}px ${color}33`,
    });
    put(g, { x: a.x, y: a.y, o });
  };
}
/** Cambio de capa con fundido: lista de [nombre, desde]. Devuelve {nombre: opacidad}. */
function secuencia(lt, pasos, fundido = 0.3, extra = {}) {
  const out = {};
  pasos.forEach(([n, a], i) => {
    const sig = pasos[i + 1];
    const o = i === 0 ? 1 : E.inOutCubic(prog(lt, a, fundido));
    const fuera = sig ? E.inOutCubic(prog(lt, sig[1] + fundido, 0.01)) : 0;
    if (o > 0 && fuera < 1) out[n] = extra[n] ? { ...extra[n], o } : o;
  });
  return out;
}
/** Paquete que viaja por una curva entre dos puntos del escenario. */
function paquete(root, texto, ic, size = 24) {
  const e = el(
    "div",
    "packet",
    root,
    { fontSize: px(size), padding: `${size * 0.5}px ${size * 0.9}px`, zIndex: 20 },
    `${icon(ic, size, 2.2)}<span>${texto}</span>`,
  );
  return (p, a, b, alto = -160) => {
    if (p <= 0 || p >= 1) {
      put(e, { o: 0 });
      return;
    }
    const q = E.inOutCubic(p);
    const mx = (a.x + b.x) / 2,
      my = Math.min(a.y, b.y) + alto;
    const x = (1 - q) * (1 - q) * a.x + 2 * (1 - q) * q * mx + q * q * b.x;
    const y = (1 - q) * (1 - q) * a.y + 2 * (1 - q) * q * my + q * q * b.y;
    const w = e.offsetWidth,
      h = e.offsetHeight;
    put(e, {
      x: x - w / 2,
      y: y - h / 2,
      s: 0.8 + 0.3 * Math.sin(Math.PI * q),
      o: Math.min(prog(p, 0, 0.12), 1 - prog(p, 0.88, 0.12)),
    });
  };
}
/** Punto del escenario que corresponde a una caja de la captura dentro de un dispositivo ya colocado. */
function enEscenario(dev, cx, cy, box) {
  const ox = cx - dev.ow / 2 + (dev.bez ?? 0);
  const oy = cy - dev.oh / 2 + (dev.bez ?? dev.bar ?? 0);
  const p = dev.centro(box);
  return { x: ox + p.x, y: oy + p.y };
}
/** Explosión de estrellas o chispas. */
function chispas(root, n = 10, color = "#f6b93b", tam = 30, forma = "star") {
  const ps = Array.from({ length: n }, (_, i) => ({
    e: el("div", "abs", root, { color, zIndex: 25 }, icon(forma, tam, 2)),
    ang: (i / n) * Math.PI * 2 + (i % 2) * 0.3,
    d: 120 + (i % 3) * 50,
  }));
  return (p, x, y) => {
    for (const s of ps) {
      if (p <= 0 || p >= 1) {
        put(s.e, { o: 0 });
        continue;
      }
      const q = E.outCubic(p);
      put(s.e, {
        x: x + Math.cos(s.ang) * s.d * q - tam / 2,
        y: y + Math.sin(s.ang) * s.d * q - tam / 2,
        s: 0.4 + 0.8 * (1 - p),
        r: p * 120,
        o: 1 - E.inCubic(p),
      });
    }
  };
}
function tiempoEnFrase(info, i, texto, fragmento) {
  const k = texto.indexOf(fragmento);
  return info.F[i] + (info.D[i] * Math.max(0, k)) / texto.length;
}

/* ——— 1. Gancho: la hora pico sin orden ——— */
escena({
  id: "gancho",
  fondo: C.dark,
  build(root, info) {
    const [F0, F1, F2] = info.F;
    const glow = el("div", "abs", root, {
      width: px(W * 1.4),
      height: px(W * 1.4),
      background: "radial-gradient(circle, rgba(228,87,46,0.28) 0%, rgba(18,15,13,0) 60%)",
    });
    // Comandas de papel que vuelan
    const tickets = [];
    const textos = [
      "Mesa 4 · 2× Hamb.",
      "Mesa 7 · Limonada",
      "Mesa 2 · sin cebolla",
      "Mesa 9 · ¿pedido?",
      "Mesa 1 · 3× Papas",
      "Mesa 5 · Postre",
      "Mesa 8 · Cuenta",
    ];
    textos.forEach((tx, i) => {
      const w = V ? 230 : 250;
      const e = el(
        "div",
        "ticket",
        root,
        { width: px(w), padding: "18px 20px", fontSize: px(26) },
        `<div style="font-weight:600">${tx}</div><div style="margin-top:12px;height:8px;background:#e8e0d4;border-radius:4px;width:80%"></div><div style="margin-top:9px;height:8px;background:#e8e0d4;border-radius:4px;width:60%"></div>`,
      );
      const lado =
        i % 2
          ? W * 0.68 + ((i * 0.37) % 1) * (W * 0.32 - w)
          : ((i * 0.37) % 1) * (W * 0.3 - w * 0.5);
      tickets.push({
        e,
        i,
        w,
        x: lado,
        y0: ((i * 0.53) % 1) * H * 0.7,
        r: (i % 2 ? 1 : -1) * (6 + i * 3),
        z: 0.6 + ((i * 0.29) % 0.4),
      });
    });
    const hora = new Titulo(root, "Hora *pico.*", {
      x: 0,
      y: V ? 700 : 330,
      w: W,
      size: V ? 170 : 200,
      align: "center",
      color: "#f7f3ec",
    });
    const lineas = [
      ["table", "Mesas llenas"],
      ["receipt", "Comandas en papel"],
      ["alert", "Pedidos que se pierden"],
    ].map(([ic, tx]) =>
      el(
        "div",
        "abs",
        root,
        {
          display: "flex",
          alignItems: "center",
          gap: "22px",
          color: "#f7f3ec",
          fontSize: px(V ? 54 : 58),
          fontWeight: 650,
          whiteSpace: "nowrap",
        },
        `<span style="display:flex;width:${V ? 84 : 88}px;height:${V ? 84 : 88}px;border-radius:50%;background:rgba(228,87,46,.18);color:#f6a27f;align-items:center;justify-content:center">${icon(ic, V ? 42 : 44, 2)}</span><span>${tx}</span>`,
      ),
    );
    const reloj = el("div", "abs", root, { color: "#f7f3ec", textAlign: "center", width: px(W) });
    reloj.innerHTML = `<div style="display:flex;justify-content:center;align-items:center;gap:24px;font-family:Fraunces;font-weight:600;font-size:${V ? 190 : 210}px;letter-spacing:-0.02em"><span style="color:#f6a27f">${icon("clock", V ? 120 : 130, 1.6)}</span><span class="cnt">00:00</span></div><div style="font-size:${V ? 46 : 50}px;font-weight:600;color:#d8cfc4;margin-top:6px">esperando para poder pedir…</div>`;
    const cnt = reloj.querySelector(".cnt");
    sfx(F0 - 0.05, "impact", 0.9);
    lineas.forEach((_, i) => sfx(F1 + i * (info.D[1] / 3), "pop", 0.5));
    for (let t = F2; t < F2 + 2.3; t += 0.5) sfx(t, "tick", 0.55);
    return (lt) => {
      put(glow, {
        x: W / 2 - W * 0.7,
        y: (V ? H * 0.45 : H * 0.5) - W * 0.7,
        s: 1 + 0.05 * Math.sin(lt * 2),
        o: 0.9,
      });
      // Hora pico: aparece grande, luego sube y se achica
      const sube = E.inOutCubic(prog(lt, F1 - 0.3, 0.7));
      hora.update(lt, F0 - 0.1);
      put(hora.e, { y: -sube * (V ? 420 : 250), s: 1 - 0.45 * sube, o: 1 - 0.0 * sube });
      // Comandas
      for (const k of tickets) {
        const aparece = E.outCubic(prog(lt, F1 + k.i * 0.18, 0.8));
        const caida = (lt - F1) * 60 * k.z;
        const perdido = k.i === 3 ? E.inCubic(prog(lt, F1 + 2.3, 1.1)) : 0;
        const se_va = E.inCubic(prog(lt, F2 - 0.2, 0.6));
        put(k.e, {
          x: k.x + Math.sin(lt * 0.8 + k.i) * 20 + perdido * 600,
          y: k.y0 + caida + (V ? 380 : 180) + perdido * 300,
          r: k.r + lt * 4 * (k.i % 2 ? 1 : -1) + perdido * 90,
          s: k.z,
          o: aparece * 0.55 * (1 - perdido) * (1 - se_va),
          blur: (1 - k.z) * 6,
        });
      }
      // Tres problemas
      lineas.forEach((e, i) => {
        const a = F1 + i * (info.D[1] / 3) - 0.05;
        const p = E.outQuint(prog(lt, a, 0.6));
        const q = E.inCubic(prog(lt, F2 - 0.25, 0.45));
        const w = e.offsetWidth;
        const y0 = V ? 760 + i * 150 : 470 + i * 130;
        put(e, { x: W / 2 - w / 2 + (1 - p) * 60, y: y0 - q * 40, o: p * (1 - q) });
      });
      // Reloj de espera
      const r = E.outQuint(prog(lt, F2 - 0.05, 0.6));
      const seg = Math.floor(lerp(0, 14 * 60 + 32, E.inCubic(prog(lt, F2, info.D[2] + 0.4))));
      cnt.textContent = `${String(Math.floor(seg / 60)).padStart(2, "0")}:${String(seg % 60).padStart(2, "0")}`;
      put(reloj, { y: (V ? 760 : 380) + (1 - r) * 40, o: r, s: 0.92 + 0.08 * r });
    };
  },
});

/* ——— 2. La pregunta: todo conectado ——— */
escena({
  id: "pregunta",
  fondo: C.dark,
  entrada: "zoom",
  build(root, info) {
    const t = new Titulo(root, "¿Y si todo tu restaurante trabajara *conectado?*", {
      x: V ? 60 : 210,
      y: V ? 330 : 150,
      w: V ? 960 : 1500,
      size: V ? 92 : 96,
      align: "center",
      color: "#f7f3ec",
      stagger: 0.09,
    });
    const nodos = [
      ["phone", "Cliente"],
      ["users", "Mesero"],
      ["chef", "Cocina"],
      ["card", "Caja"],
      ["chart", "Tú"],
    ];
    const cx = W / 2,
      cy = V ? 1210 : 700;
    const rx = V ? 360 : 560,
      ry = V ? 360 : 190;
    const pos = nodos.map((_, i) => {
      const a = -Math.PI / 2 + (i / nodos.length) * Math.PI * 2;
      return { x: cx + Math.cos(a) * rx, y: cy + Math.sin(a) * ry };
    });
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("width", W);
    svg.setAttribute("height", H);
    svg.style.position = "absolute";
    root.appendChild(svg);
    const lineas = [];
    pos.forEach((a, i) => {
      for (const b of [pos[(i + 1) % pos.length], { x: cx, y: cy }]) {
        const l = document.createElementNS("http://www.w3.org/2000/svg", "line");
        Object.entries({
          x1: a.x,
          y1: a.y,
          x2: b.x,
          y2: b.y,
          stroke: "#e4572e",
          "stroke-width": 3,
          "stroke-linecap": "round",
        }).forEach(([k, v]) => l.setAttribute(k, v));
        const len = Math.hypot(b.x - a.x, b.y - a.y);
        l.style.strokeDasharray = `${len}`;
        svg.appendChild(l);
        lineas.push({ l, len, i });
      }
    });
    const centro = el(
      "div",
      "abs",
      root,
      {
        width: px(120),
        height: px(120),
        borderRadius: "50%",
        background: C.accent,
        color: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "0 0 80px rgba(228,87,46,.6)",
      },
      icon("spark", 56, 2.2),
    );
    const ns = nodos.map(([ic, tx]) =>
      el(
        "div",
        "abs",
        root,
        {
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "12px",
          color: "#f7f3ec",
          fontWeight: 650,
          fontSize: px(V ? 32 : 30),
          width: px(200),
        },
        `<span style="display:flex;width:${V ? 110 : 104}px;height:${V ? 110 : 104}px;border-radius:50%;background:#24211e;border:2px solid #4a443d;align-items:center;justify-content:center;color:#f6a27f">${icon(ic, V ? 50 : 46, 2)}</span><span>${tx}</span>`,
      ),
    );
    const a0 = info.F[0] + 1.2;
    ns.forEach((_, i) => sfx(a0 + i * 0.18, "pop", 0.45));
    return (lt) => {
      t.update(lt, info.F[0] - 0.1);
      ns.forEach((e, i) => {
        const p = prog(lt, a0 + i * 0.18, 0.5);
        put(e, {
          x: pos[i].x - 100,
          y: pos[i].y - (V ? 55 : 52),
          s: p > 0 ? E.outBack(p, 2) : 0.001,
          o: clamp(p * 2),
        });
      });
      lineas.forEach(({ l, len, i }) => {
        const p = E.inOutCubic(prog(lt, a0 + 0.9 + i * 0.12, 0.8));
        l.style.strokeDashoffset = `${len * (1 - p)}`;
        l.style.opacity = 0.75;
      });
      const pc = prog(lt, a0 + 1.4, 0.6);
      put(centro, {
        x: cx - 60,
        y: cy - 60,
        s: pc > 0 ? E.outBack(pc, 2) * (1 + 0.06 * Math.sin(lt * 6)) : 0.001,
        o: clamp(pc * 2),
      });
    };
  },
});

/* ——— 3. Logo ——— */
function marcaSVG(size, tinta, acento) {
  return `<svg viewBox="0 0 32 32" width="${size}" height="${size}" fill="none">
    <g class="arco"><circle cx="16" cy="16" r="14" stroke="${tinta}" stroke-width="2.2" stroke-dasharray="70 18" stroke-linecap="round" transform="rotate(-50 16 16)"/></g>
    <g class="plato"><circle cx="16" cy="16" r="8.5" fill="${tinta}" opacity="0.14"/><circle cx="16" cy="16" r="8.5" stroke="${tinta}" stroke-width="2.2"/></g>
    <g class="punto"><circle cx="24.6" cy="7.4" r="2.2" fill="${acento}"/></g></svg>`;
}
escena({
  id: "logo",
  entrada: "circulo",
  fondo: C.bg,
  build(root, info) {
    const size = V ? 260 : 230;
    const cy = V ? H * 0.4 : H * 0.4;
    const anillos = [0, 1, 2].map(() =>
      el("div", "abs", root, {
        width: px(size * 1.2),
        height: px(size * 1.2),
        borderRadius: "50%",
        border: `3px solid ${C.accent}`,
      }),
    );
    const marca = el(
      "div",
      "abs",
      root,
      { width: px(size), height: px(size) },
      marcaSVG(size, C.ink, C.accent),
    );
    const [arco, plato, punto] = ["arco", "plato", "punto"].map((c) =>
      marca.querySelector(`.${c}`),
    );
    [arco, plato, punto].forEach((g) => (g.style.transformOrigin = "16px 16px"));
    punto.style.transformOrigin = "24.6px 7.4px";
    const letras = "platterio".split("").map((ch) => ch);
    const palabra = el("div", "abs", root, {
      width: px(W),
      textAlign: "center",
      fontFamily: "Fraunces",
      fontWeight: 600,
      fontSize: px(V ? 150 : 150),
      letterSpacing: "-0.03em",
      color: C.ink,
    });
    const spans = letras.map((ch) => {
      const m = el("span", "wm", palabra);
      return el("span", "w", m, {}, ch);
    });
    const lema = new Titulo(root, "La plataforma que *moderniza* tu restaurante", {
      x: V ? 60 : 160,
      y: V ? cy + 380 : cy + 300,
      w: V ? 960 : 1600,
      size: V ? 62 : 58,
      align: "center",
      color: C.ink,
      stagger: 0.06,
    });
    sfx(0.25, "impact", 0.8);
    sfx(0.95, "pop", 0.6);
    return (lt) => {
      const p1 = E.outQuint(prog(lt, 0.15, 1.0));
      arco.style.transform = `rotate(${(1 - p1) * -160}deg) scale(${0.6 + 0.4 * p1})`;
      arco.style.opacity = p1;
      const p2 = prog(lt, 0.3, 0.6);
      plato.style.transform = `scale(${p2 > 0 ? E.outBack(p2, 2.4) : 0})`;
      const p3 = prog(lt, 0.95, 0.5);
      punto.style.transform = `scale(${p3 > 0 ? E.outBack(p3, 3) : 0})`;
      const flota = Math.sin(lt * 1.6) * 6;
      put(marca, { x: W / 2 - size / 2, y: cy - size / 2 - (V ? 120 : 110) + flota });
      anillos.forEach((a, i) => {
        const p = prog(lt, 0.3 + i * 0.35, 2.2);
        put(a, {
          x: W / 2 - size * 0.6,
          y: cy - size * 0.6 - (V ? 120 : 110),
          s: 0.8 + p * 2.2,
          o: p > 0 ? (1 - p) * 0.35 : 0,
        });
      });
      spans.forEach((s, i) => {
        const p = E.outQuint(prog(lt, 0.6 + i * 0.045, 0.8));
        s.style.transform = `translateY(${(1 - p) * 105}%)`;
        s.style.opacity = p;
      });
      put(palabra, { y: cy + (V ? 130 : 90) });
      lema.update(lt, info.F[1] - 0.15);
    };
  },
});

/* ——— Código QR de la mesa ——— */
function qrSVG(n = 25, size = 200) {
  let seed = 42;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const c = size / n;
  let r = "";
  const fin = (x, y) => (x < 7 && y < 7) || (x >= n - 7 && y < 7) || (x < 7 && y >= n - 7);
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++)
      if (!fin(x, y) && rnd() > 0.52)
        r += `<rect x="${x * c}" y="${y * c}" width="${c}" height="${c}"/>`;
  const f = (x, y) =>
    `<rect x="${x * c}" y="${y * c}" width="${7 * c}" height="${7 * c}" fill="none" stroke="#1c1917" stroke-width="${c}" transform="translate(${c / 2},${c / 2})" style="transform-box:fill-box"/><rect x="${(x + 2) * c}" y="${(y + 2) * c}" width="${3 * c}" height="${3 * c}"/>`;
  return `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" fill="#1c1917">${r}${f(0, 0)}${f(n - 7, 0)}${f(0, n - 7)}</svg>`;
}
function rectFinder() {
  return "";
}

/* ——— 4. QR: escanea, mira y pide ——— */
escena({
  id: "qr",
  build(root, info) {
    const head = cabecera(root, "01 · El cliente", "Escanea, mira y *pide.*");
    const pw = V ? 430 : 370;
    const ph = new Telefono(root, pw);
    const cx = V ? 640 : 1470,
      cy = V ? 1080 : 540;
    // Habladero de mesa con el QR
    const tw = V ? 280 : 300;
    const tent = el("div", "card", root, {
      width: px(tw),
      padding: px(tw * 0.1),
      textAlign: "center",
      borderRadius: px(22),
    });
    tent.innerHTML = `<div style="font-family:Fraunces;font-weight:600;font-size:${tw * 0.12}px">Fogón <span style="background:${C.accent};color:#fff;border-radius:8px;padding:0 6px;font-size:${tw * 0.08}px;vertical-align:middle">27</span></div><div style="margin:${tw * 0.06}px auto;width:${tw * 0.72}px">${qrSVG(25, tw * 0.72)}</div><div style="font-weight:700;font-size:${tw * 0.075}px">Mesa 3</div><div style="color:#716a64;font-size:${tw * 0.055}px;margin-top:4px">Escanea para ver la carta</div>`;
    const tx = V ? 250 : 1030,
      ty = V ? 1290 : 640;
    // Visor de la cámara dentro del teléfono
    const visor = el("div", "abs", ph.screen, {
      width: px(ph.w),
      height: px(ph.h),
      background: "#1b1917",
      zIndex: 3,
    });
    const vq = el(
      "div",
      "abs",
      visor,
      {
        left: px(ph.w * 0.2),
        top: px(ph.h * 0.3),
        width: px(ph.w * 0.6),
        height: px(ph.w * 0.6),
        background: "#f3eee6",
        borderRadius: "14px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        opacity: 0.85,
      },
      qrSVG(25, ph.w * 0.5),
    );
    const marco = el("div", "abs", visor, {
      left: px(ph.w * 0.15),
      top: px(ph.h * 0.3 - ph.w * 0.05),
      width: px(ph.w * 0.7),
      height: px(ph.w * 0.7),
      border: "4px solid #fff",
      borderRadius: "24px",
    });
    const laser = el("div", "abs", visor, {
      left: px(ph.w * 0.17),
      width: px(ph.w * 0.66),
      height: px(4),
      background: C.accent,
      boxShadow: `0 0 24px 6px ${C.accent}`,
    });
    el(
      "div",
      "abs",
      visor,
      {
        top: px(ph.h * 0.72),
        width: px(ph.w),
        textAlign: "center",
        color: "#f7f3ec",
        fontWeight: 600,
        fontSize: px(ph.w * 0.05),
      },
      "Apunta al código de la mesa",
    );
    void vq;
    const c1 = chip(root, "Sin descargar nada", "nodl", { size: V ? 30 : 28 });
    const c2 = chip(root, "Tu nombre y el PIN de la mesa", "users", { size: V ? 26 : 24 });
    const tapA = 2.55;
    sfx(1.85, "ding", 0.7);
    sfx(tapA + 0.4, "tap", 0.8);
    sfx(info.F[1], "pop", 0.6);
    return (lt) => {
      head(lt);
      const pt = E.outQuint(prog(lt, 0.15, 0.9));
      put(tent, {
        x: tx - tw / 2,
        y: ty - tw * 0.75 + (1 - pt) * 120,
        r: -6 + Math.sin(lt) * 0.6,
        o: pt,
      });
      entra(ph, lt, 0.3, cx, cy, { dy: 260, r0: 10 });
      const ve = 1 - E.inOutCubic(prog(lt, 1.9, 0.25));
      visor.style.opacity = ve;
      visor.style.visibility = ve > 0 ? "visible" : "hidden";
      const sp = prog(lt, 0.7, 1.15);
      laser.style.top = px(ph.h * 0.3 + Math.sin(sp * Math.PI * 1.5) * ph.w * 0.25 + ph.w * 0.25);
      marco.style.transform = `scale(${1 - 0.04 * Math.sin(lt * 8) * (sp < 1 ? 1 : 0)})`;
      ph.mostrar(
        secuencia(
          lt,
          [
            ["p-entrar", 0],
            ["p-carta", tapA + 0.55],
          ],
          0.35,
        ),
      );
      ph.camara(null, 0);
      ph.toque(caja("p-entrar", "boton"), prog(lt, tapA, 0.9));
      if (V) {
        pop(c2, lt, 2.0, { x: 540, y: 520, salida: tapA + 0.6 });
        pop(c1, lt, info.F[1] - 0.05, { x: 540, y: 520 });
      } else {
        pop(c2, lt, 2.0, { x: 130 + c2.offsetWidth / 2, y: 610, salida: tapA + 0.6 });
        pop(c1, lt, info.F[1] - 0.05, { x: 130 + c1.offsetWidth / 2, y: 610 });
      }
    };
  },
});

/* ——— 5. Carta: fotos, precios, alérgenos, idiomas ——— */
escena({
  id: "carta",
  build(root, info) {
    const [F0, F1] = info.F;
    const head = cabecera(root, "02 · La carta", "Clara, bonita y *segura.*");
    const pw = V ? 430 : 370;
    const en = new Telefono(root, pw * 0.86);
    const ph = new Telefono(root, pw);
    en.mostrar({ "p-ingles": 1 });
    const cx = V ? 600 : 1500,
      cy = V ? 1080 : 540;
    const glow = resaltado(ph);
    const chips = [
      chip(root, "Fotos y precios", "layers", { size: V ? 28 : 26 }),
      chip(root, "Alérgenos a la vista", "alert", { size: V ? 28 : 26 }),
      chip(root, "Español · English", "globe", { size: V ? 28 : 26 }),
    ];
    const tc = [F0 + 0.2, F0 + 1.3, F0 + 2.4];
    tc.forEach((t) => sfx(t, "pop", 0.5));
    sfx(F1 + 0.9, "alert", 0.6);
    const alerta = caja("p-ficha-lacteos", "alerta");
    return (lt) => {
      head(lt);
      entra(ph, lt, 0.2, cx, cy, { dy: 200 });
      // El teléfono en inglés asoma detrás
      const pe = E.outQuint(prog(lt, tc[2] - 0.1, 0.8)) * (1 - E.inCubic(prog(lt, F1 - 0.2, 0.5)));
      en.colocar(cx + (V ? -250 : -260) * pe, cy + 30, { r: -8 * pe, o: pe, s: 0.95 });
      const scroll = lerp(0, 1650, E.inOutSine(prog(lt, 0.6, F1 - 0.9)));
      ph.mostrar(
        secuencia(
          lt,
          [
            ["p-carta-larga", 0],
            ["p-ficha-lacteos", F1],
          ],
          0.3,
          { "p-carta-larga": { y: scroll } },
        ),
      );
      const z = E.inOutCubic(prog(lt, F1 + 0.35, 0.8));
      ph.camara(alerta, z, 1.7);
      glow(alerta, z * (0.75 + 0.25 * Math.sin(lt * 7)), "#c53030");
      chips.forEach((c, i) => {
        const pos = V
          ? [
              { x: 250, y: 600 },
              { x: 830, y: 860 },
              { x: 260, y: 1520 },
            ][i]
          : { x: 130 + c.offsetWidth / 2, y: 600 + i * 92 };
        pop(c, lt, tc[i], { ...pos, salida: F1 - 0.1 });
      });
    };
  },
});

/* ——— 6. Vista 3D ——— */
escena({
  id: "tresde",
  entrada: "zoom",
  build(root, info) {
    const head = cabecera(root, "03 · Vista 3D", "Míralo antes de *pedirlo.*");
    const pw = V ? 440 : 380;
    const ph = new Telefono(root, pw);
    const cx = V ? 540 : 1430,
      cy = V ? 1080 : 540;
    ph.mostrar({ "p-3d": 1 });
    const visor = caja("p-3d", "visor");
    const c1 = chip(root, "Gíralo y acércalo", "cube", { size: V ? 28 : 26 });
    const c2 = chip(root, "Personalízalo a su gusto", "spark", { size: V ? 28 : 26 });
    const brillo = chispas(root, 8, "#f6b93b", 26, "spark");
    sfx(1.3, "pop", 0.5);
    sfx(2.3, "pop", 0.5);
    sfx(0.9, "shimmer", 0.5);
    return (lt) => {
      head(lt);
      const gira = Math.sin(lt * 0.9) * 10;
      entra(ph, lt, 0.1, cx, cy, { dy: 140, extra: { persp: 1600, ry: -14 + gira, rx: 4 } });
      ph.camara(visor, E.inOutCubic(prog(lt, 0.6, 1.4)) * 0.8, 1.6);
      brillo(prog(lt, 0.9, 1.2), cx + (V ? 10 : 0), cy - (V ? 220 : 170));
      if (V) {
        pop(c1, lt, 1.3, { x: 290, y: 580 });
        pop(c2, lt, 2.3, { x: 760, y: 1530 });
      } else {
        pop(c1, lt, 1.3, { x: 130 + c1.offsetWidth / 2, y: 610 });
        pop(c2, lt, 2.3, { x: 130 + c2.offsetWidth / 2, y: 702 });
      }
    };
  },
});

/* ——— 7. Carrito compartido ——— */
escena({
  id: "carrito",
  build(root, info) {
    const head = cabecera(root, "04 · La mesa", "Un carrito para *todos.*");
    const pw = V ? 380 : 330;
    const a = new Telefono(root, pw);
    const b = new Telefono(root, pw);
    const pa = V ? { x: 320, y: 1110, r: -5 } : { x: 1150, y: 570, r: -5 };
    const pb = V ? { x: 770, y: 1070, r: 5 } : { x: 1560, y: 530, r: 5 };
    const etiqueta = (n, c) =>
      el(
        "div",
        "chip",
        root,
        { fontSize: px(26), padding: "8px 20px 8px 8px", zIndex: 6 },
        `<span style="display:flex;width:44px;height:44px;border-radius:50%;background:${c};color:#fff;align-items:center;justify-content:center;font-weight:700">${n[0]}</span><span>${n}</span>`,
      );
    const ea = etiqueta("Ana", "#e4572e");
    const eb = etiqueta("Luis", "#2f855a");
    const vivo = el(
      "div",
      "chip ok",
      root,
      { fontSize: px(26), padding: "10px 22px", zIndex: 6 },
      `<span style="width:14px;height:14px;border-radius:50%;background:#2f855a;display:inline-block" class="pulso"></span><span>En vivo</span>`,
    );
    const dot = vivo.querySelector(".pulso");
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("width", W);
    svg.setAttribute("height", H);
    svg.style.position = "absolute";
    svg.style.zIndex = 5;
    root.appendChild(svg);
    const line = document.createElementNS("http://www.w3.org/2000/svg", "path");
    const ya = pa.y - (V ? 120 : 80);
    line.setAttribute(
      "d",
      `M ${pa.x + 60} ${ya} Q ${(pa.x + pb.x) / 2} ${ya - 120} ${pb.x - 60} ${pb.y - (V ? 120 : 80)}`,
    );
    Object.entries({
      fill: "none",
      stroke: C.ok,
      "stroke-width": 4,
      "stroke-dasharray": "10 12",
      "stroke-linecap": "round",
    }).forEach(([k, v]) => line.setAttribute(k, v));
    svg.appendChild(line);
    const item = paquete(root, "Clásica 27 · Luis", "receipt", V ? 24 : 22);
    const tapT = info.F[0] + 3.3;
    sfx(1.2, "pop", 0.5);
    sfx(2.6, "pop", 0.5);
    sfx(tapT + 0.4, "tap", 0.8);
    return (lt) => {
      head(lt);
      entra(a, lt, 0.15, pa.x, pa.y, { dy: 220, extra: { r: pa.r } });
      entra(b, lt, 0.35, pb.x, pb.y, { dy: 220, extra: { r: pb.r } });
      a.mostrar({ "p-carrito": 1 });
      b.mostrar(
        secuencia(
          lt,
          [
            ["p-carrito", 0],
            ["p-enviar", tapT - 0.6],
          ],
          0.3,
        ),
      );
      b.toque(caja("p-enviar", "si"), prog(lt, tapT, 0.9));
      const pe = prog(lt, 1.0, 0.5);
      put(ea, {
        x: pa.x - 60,
        y: pa.y - (V ? 480 : 440),
        s: pe > 0 ? E.outBack(pe) : 0.001,
        o: clamp(pe * 2),
      });
      const pf = prog(lt, 1.2, 0.5);
      put(eb, {
        x: pb.x - 60,
        y: pb.y - (V ? 480 : 440),
        s: pf > 0 ? E.outBack(pf) : 0.001,
        o: clamp(pf * 2),
      });
      const pl = E.inOutCubic(prog(lt, 1.4, 0.8));
      line.style.opacity = pl;
      line.setAttribute("stroke-dashoffset", `${-lt * 40}`);
      const pv = prog(lt, 1.9, 0.5);
      put(vivo, {
        x: (pa.x + pb.x) / 2 - vivo.offsetWidth / 2,
        y: ya - (V ? 110 : 100),
        s: pv > 0 ? E.outBack(pv) : 0.001,
        o: clamp(pv * 2),
      });
      dot.style.opacity = 0.5 + 0.5 * Math.sin(lt * 8);
      item(prog(lt, 2.4, 1.1), { x: pb.x, y: pb.y - 100 }, { x: pa.x, y: pa.y + 40 }, -120);
    };
  },
});

/* ——— 8. Mesero ——— */
escena({
  id: "mesero",
  build(root, info) {
    const [, F1] = info.F;
    const head = cabecera(root, "05 · El mesero", "Directo a su *tableta.*");
    const ww = V ? 1000 : 1000;
    const win = new Ventana(root, ww, { cssW: 1280, cssH: 800, url: "platterio.app/mesero" });
    const ph = new Telefono(root, V ? 250 : 210);
    ph.mostrar({ "p-pedido-enviado": 1 });
    const wc = V ? { x: 540, y: 960 } : { x: 1380, y: 560 };
    const pc = V ? { x: 200, y: 1390 } : { x: 860, y: 790 };
    const glow = resaltado(win);
    const ticket = caja("w-mesero", "ticket");
    const pk = paquete(root, "Mesa 3 · 4 platos", "receipt", V ? 26 : 24);
    const ok = chip(root, "Enviado a la cocina", "check", { size: V ? 28 : 26, cls: "ok" });
    const clicT = F1 + 0.1;
    sfx(1.75, "ding", 0.8);
    sfx(clicT + 0.6, "click", 0.8);
    sfx(clicT + 0.75, "success", 0.6);
    return (lt) => {
      head(lt);
      entra(win, lt, 0.1, wc.x, wc.y, { dy: 160 });
      entra(ph, lt, 0.3, pc.x, pc.y, { dy: 200, extra: { r: -6 } });
      const swap = clicT + 0.62;
      win.mostrar(
        secuencia(
          lt,
          [
            ["w-mesero", 0],
            ["w-mesero-confirmado", swap],
          ],
          0.25,
        ),
      );
      const z = E.inOutCubic(prog(lt, 1.9, 0.9)) * (1 - E.inOutCubic(prog(lt, swap + 0.2, 0.8)));
      win.camara(ticket, z * 0.85, 1.5);
      const a = enEscenario(ph, pc.x, pc.y, { x: 100, y: 300, width: 190, height: 40 });
      const b = enEscenario(win, wc.x, wc.y, ticket);
      pk(prog(lt, 0.75, 1.0), a, b, V ? -260 : -200);
      glow(ticket, inout(lt, 1.75, 0.3, swap - 0.1, 0.2) * (0.8 + 0.2 * Math.sin(lt * 8)));
      win.clic(caja("w-mesero", "confirmar"), prog(lt, clicT, 1.1));
      pop(ok, lt, swap + 0.1, V ? { x: 540, y: 1520 } : { x: 130 + ok.offsetWidth / 2, y: 610 });
    };
  },
});

/* ——— 9. Cocina ——— */
escena({
  id: "cocina",
  fondo: C.dark,
  build(root, info) {
    const [, F1] = info.F;
    const head = cabecera(root, "06 · La cocina", "Todo en *orden.*", { claro: true });
    const ww = V ? 1000 : 1000;
    const win = new Ventana(root, ww, {
      cssW: 1280,
      cssH: 800,
      dark: true,
      url: "platterio.app/cocina",
    });
    const wc = V ? { x: 540, y: 940 } : { x: 1370, y: 540 };
    const glow = resaltado(win);
    const notas = chip(root, "Notas y alergias a la vista", "receipt", {
      size: V ? 28 : 26,
      cls: "dark",
    });
    const menos = el(
      "div",
      "abs",
      root,
      {
        fontFamily: "Fraunces",
        fontWeight: 600,
        color: "#f7f3ec",
        fontSize: px(V ? 70 : 64),
        lineHeight: 1.1,
        width: px(V ? W : 760),
        textAlign: V ? "center" : "left",
      },
      `<div class="m1">Menos gritos.</div><div class="m2" style="color:#f6a27f;font-style:italic">Menos errores.</div>`,
    );
    const m1 = menos.querySelector(".m1"),
      m2 = menos.querySelector(".m2");
    const c1 = 1.5,
      c2 = 3.1;
    const t1 = caja("w-cocina", "tarjeta"),
      t2 = caja("w-cocina-preparando", "tarjeta"),
      t3 = caja("w-cocina-listo", "tarjeta");
    sfx(c1 + 0.6, "click", 0.8);
    sfx(c2 + 0.6, "click", 0.8);
    sfx(c2 + 0.75, "ding", 0.8);
    sfx(1.0, "pop", 0.5);
    sfx(F1, "impact", 0.35);
    return (lt) => {
      head(lt);
      entra(win, lt, 0.1, wc.x, wc.y, { dy: 160 });
      const s1 = c1 + 0.62,
        s2 = c2 + 0.62;
      win.mostrar(
        secuencia(
          lt,
          [
            ["w-cocina", 0],
            ["w-cocina-preparando", s1],
            ["w-cocina-listo", s2],
          ],
          0.2,
        ),
      );
      let box = t1;
      if (lt > s1) box = lerpBox(t1, t2, E.inOutCubic(prog(lt, s1, 0.6)));
      if (lt > s2) box = lerpBox(t2, t3, E.inOutCubic(prog(lt, s2, 0.6)));
      const z = E.inOutCubic(prog(lt, 0.5, 0.8)) * (1 - E.inOutCubic(prog(lt, F1 - 0.2, 0.8)));
      win.camara(box, z * 0.9, 1.7);
      win.clic(
        lt < s1 + 0.3 ? caja("w-cocina", "empezar") : caja("w-cocina-preparando", "listo"),
        lt < s1 + 0.3 ? prog(lt, c1, 1.1) : prog(lt, c2, 1.1),
      );
      glow(t3, inout(lt, s2 + 0.1, 0.3, F1 - 0.3, 0.3) * 0.9, "#48bb78");
      pop(
        notas,
        lt,
        1.0,
        V
          ? { x: 540, y: 1430, salida: c2 }
          : { x: 130 + notas.offsetWidth / 2, y: 520, salida: c2 },
      );
      const p1 = E.outQuint(prog(lt, F1 - 0.05, 0.6)),
        p2 = E.outQuint(prog(lt, F1 + info.D[1] * 0.45, 0.6));
      put(menos, { x: V ? 0 : 130, y: V ? 1400 : 620 });
      put(m1, { y: (1 - p1) * 40, o: p1 });
      put(m2, { y: (1 - p2) * 40, o: p2 });
    };
  },
});

/* ——— 10. Seguimiento y calificación ——— */
escena({
  id: "seguimiento",
  build(root, info) {
    const [F0, F1] = info.F;
    const head = cabecera(root, "07 · El cliente", "Siempre *informado.*");
    const pw = V ? 430 : 370;
    const ph = new Telefono(root, pw);
    const cx = V ? 540 : 1430,
      cy = V ? 1080 : 540;
    const est = [
      ["Confirmado", "check", 0.5],
      ["En preparación", "flame", 1.6],
      ["Entregado", "bell", 2.8],
    ];
    const chips = est.map(([t, ic]) => chip(root, t, ic, { size: V ? 28 : 26, cls: "ok" }));
    const estrellas = chispas(root, 10, "#f6b93b", 34, "star");
    const tapS = F1 + 0.6;
    est.forEach(([, , t]) => sfx(F0 + t - 0.45 + 0.1, "ding", 0.55));
    sfx(tapS + 0.4, "tap", 0.7);
    sfx(tapS + 0.45, "shimmer", 0.6);
    const est5 = caja("p-calificar", "estrellas");
    const b5 = est5 && {
      x: est5.x + est5.width * 0.84,
      y: est5.y,
      width: est5.width * 0.16,
      height: est5.height,
    };
    return (lt) => {
      head(lt);
      entra(ph, lt, 0.15, cx, cy, { dy: 200 });
      ph.mostrar(
        secuencia(lt, [
          ["p-pedido-confirmado", 0],
          ["p-pedido-preparando", F0 + est[1][2] - 0.45],
          ["p-pedido-entregado", F0 + est[2][2] - 0.45],
          ["p-calificar", F1],
        ]),
      );
      ph.toque(b5, prog(lt, tapS, 0.9));
      if (b5) {
        const c = ph.centro(b5);
        estrellas(
          prog(lt, tapS + 0.45, 1.1),
          cx - ph.ow / 2 + ph.bez + c.x,
          cy - ph.oh / 2 + ph.bez + c.y,
        );
      }
      chips.forEach((c, i) => {
        const pos = V
          ? [
              { x: 250, y: 590 },
              { x: 820, y: 860 },
              { x: 260, y: 1500 },
            ][i]
          : { x: 130 + c.offsetWidth / 2, y: 600 + i * 92 };
        pop(c, lt, F0 + est[i][2] - 0.45, { ...pos, salida: F1 + 1.2 });
      });
    };
  },
});

/* ——— 11. Caja ——— */
escena({
  id: "caja",
  build(root, info) {
    const [, F1] = info.F;
    const head = cabecera(root, "08 · La caja", "Cobros y cierres *claros.*");
    const ww = V ? 1000 : 1000;
    const win = new Ventana(root, ww, { url: "platterio.app/caja" });
    const wc = V ? { x: 540, y: 960 } : { x: 1370, y: 540 };
    const c1 = chip(root, "Efectivo · Tarjeta · Transferencia", "card", { size: V ? 28 : 26 });
    const c2 = chip(root, "Pagos en partes", "layers", { size: V ? 28 : 26 });
    const c3 = chip(root, "Turno cerrado y registrado", "check", { size: V ? 28 : 26, cls: "ok" });
    const clicT = 0.55;
    sfx(clicT + 0.6, "click", 0.8);
    sfx(1.9, "pop", 0.5);
    sfx(2.8, "pop", 0.5);
    sfx(F1 + 0.1, "cash", 0.6);
    sfx(F1 + 1.0, "success", 0.6);
    return (lt) => {
      head(lt);
      entra(win, lt, 0.1, wc.x, wc.y, { dy: 160 });
      const s1 = clicT + 0.62;
      win.mostrar(
        secuencia(
          lt,
          [
            ["w-caja-abierta", 0],
            ["w-caja-cobro", s1],
            ["w-caja-cierre", F1],
          ],
          0.25,
        ),
      );
      const d1 = caja("w-caja-cobro", "dialogo"),
        d2 = caja("w-caja-cierre", "dialogo");
      let box = d1,
        z = E.inOutCubic(prog(lt, s1 + 0.1, 0.8));
      if (lt > F1) box = lerpBox(d1, d2, E.inOutCubic(prog(lt, F1, 0.5)));
      win.camara(box, z * 0.9, 1.7);
      win.clic(caja("w-caja-abierta", "cobrar"), prog(lt, clicT, 1.1));
      const sal = F1 - 0.1;
      if (V) {
        pop(c1, lt, 1.9, { x: 540, y: 1400, salida: sal });
        pop(c2, lt, 2.8, { x: 540, y: 1490, salida: sal });
        pop(c3, lt, F1 + 1.0, { x: 540, y: 1430 });
      } else {
        pop(c1, lt, 1.9, { x: 130 + c1.offsetWidth / 2, y: 610, salida: sal });
        pop(c2, lt, 2.8, { x: 130 + c2.offsetWidth / 2, y: 702, salida: sal });
        pop(c3, lt, F1 + 1.0, { x: 130 + c3.offsetWidth / 2, y: 610 });
      }
    };
  },
});

/* ——— 12. Panel del dueño ——— */
escena({
  id: "dueno",
  entrada: "zoom",
  build(root, info) {
    const [, F1] = info.F;
    const texto = TIEMPOS.escenas.find((e) => e.id === "dueno").frases[1].texto;
    const head = cabecera(root, "09 · Tú", "Todo bajo *control.*");
    const ww = V ? 1000 : 1000;
    const win = new Ventana(root, ww, { url: "platterio.app/admin" });
    const wc = V ? { x: 540, y: 900 } : { x: 1370, y: 560 };
    const items = [
      ["chart", "Ventas del día", "ventas del día", "w-admin-ventas", 0],
      ["trend", "Platos más pedidos", "platos más", "w-admin-ventas", 520],
      ["users", "Desempeño del equipo", "el desempeño", "w-admin-reportes", 0],
      ["star", "Opinión de tus clientes", "lo que opinan", "w-admin-calificaciones", 0],
    ].map(([ic, label, frag, shot, y]) => ({
      ic,
      label,
      shot,
      y,
      t: tiempoEnFrase(info, 1, texto, frag) - 0.1,
    }));
    const filas = items.map((it) => chip(root, it.label, it.ic, { size: V ? 26 : 26 }));
    items.forEach((it) => sfx(it.t + 0.05, "pop", 0.5));
    return (lt) => {
      head(lt);
      entra(win, lt, 0.1, wc.x, wc.y, { dy: 160 });
      const pasos = [["w-admin", 0], ...items.map((it, i) => [`${it.shot}#${i}`, it.t])];
      const capas = secuencia(lt, pasos, 0.35);
      const est = {};
      for (const [k, o] of Object.entries(capas)) {
        const [shot, idx] = k.split("#");
        const it = items[+idx];
        const y = it
          ? lerp(it.y * 0.6, it.y, E.inOutSine(prog(lt, it.t, 2)))
          : lerp(0, 120, prog(lt, 0, F1));
        est[shot] = {
          o: Math.max(o, est[shot]?.o ?? 0),
          y: est[shot] && est[shot].o > o ? est[shot].y : y,
        };
      }
      win.mostrar(est);
      const push = (V ? 1.32 : 1) + 0.06 * E.inOutSine(prog(lt, 0, info.dur));
      win.cam.style.transform = V
        ? `translate(${-288 * win.k * push + 10}px,0) scale(${push})`
        : `scale(${push})`;
      filas.forEach((c, i) => {
        const pos = V
          ? { x: i % 2 ? 790 : 290, y: 1340 + Math.floor(i / 2) * 92 }
          : { x: 130 + c.offsetWidth / 2, y: 560 + i * 88 };
        pop(c, lt, items[i].t, pos);
      });
    };
  },
});

/* ——— 13. Domicilios ——— */
escena({
  id: "domicilios",
  entrada: "barrido",
  build(root, info) {
    const [F0, F1] = info.F;
    const head = cabecera(root, "10 · Domicilios", "Pedidos a *domicilio.*");
    const ww = V ? 960 : 820;
    const win = new Ventana(root, ww, { url: "platterio.app/caja" });
    const ph = new Telefono(root, V ? 380 : 340);
    const wc = V ? { x: 560, y: 780 } : { x: 1450, y: 450 };
    const pc = V ? { x: 300, y: 1230 } : { x: 1060, y: 600 };
    const gw = resaltado(win);
    const gp = resaltado(ph);
    const wa = chip(root, "Aviso por WhatsApp", "chat", { size: V ? 28 : 26, cls: "wa" });
    const dom = chip(root, "Contacto del domiciliario", "truck", { size: V ? 28 : 26 });
    sfx(F0 + 0.8, "ding", 0.6);
    sfx(F0 + 1.6, "pop", 0.5);
    sfx(F1 + 0.6, "pop", 0.5);
    return (lt) => {
      head(lt);
      entra(win, lt, 0.05, wc.x, wc.y, { dy: 140 });
      entra(ph, lt, 0.3, pc.x, pc.y, { dy: 220, extra: { r: -4 } });
      ph.mostrar(
        secuencia(
          lt,
          [
            ["p-domicilio", 0],
            ["p-domicilio-recibido", F0 + 0.7],
            ["p-domicilio-camino", F1],
          ],
          0.3,
        ),
      );
      const wb = caja("p-domicilio-recibido", "whatsapp"),
        db = caja("p-domicilio-camino", "domiciliario");
      const box = lt < F1 ? wb : lerpBox(wb, db, E.inOutCubic(prog(lt, F1, 0.5)));
      ph.camara(box, E.inOutCubic(prog(lt, F0 + 1.2, 0.7)) * 0.7, 1.6);
      gp(box, inout(lt, F0 + 1.5, 0.3, info.dur, 0.2) * 0.9, lt < F1 ? "#25a35a" : C.accent);
      win.mostrar(
        secuencia(
          lt,
          [
            ["w-caja-domicilios", 0],
            ["w-caja-despachado", F1],
          ],
          0.3,
        ),
      );
      win.camara(null, 0);
      gw(caja("w-caja-domicilios", "pedido"), inout(lt, F0 + 0.8, 0.3, F1 - 0.2, 0.2) * 0.9);
      if (V) {
        pop(wa, lt, F0 + 1.6, { x: 760, y: 1360, salida: F1 - 0.1 });
        pop(dom, lt, F1 + 0.6, { x: 740, y: 1360 });
      } else {
        pop(wa, lt, F0 + 1.6, { x: 130 + wa.offsetWidth / 2, y: 610, salida: F1 - 0.1 });
        pop(dom, lt, F1 + 0.6, { x: 130 + dom.offsetWidth / 2, y: 610 });
      }
    };
  },
});

/* ——— 14. Reservas y reseñas ——— */
escena({
  id: "reservas",
  build(root, info) {
    const [F0, F1] = info.F;
    const head = cabecera(root, "11 · Reservas y reseñas", "Mesas reservadas, *reseñas* nuevas.", {
      sizeH: 80,
      sizeV: 76,
    });
    const ww = V ? 960 : 820;
    const win = new Ventana(root, ww, { url: "platterio.app/caja" });
    const ph = new Telefono(root, V ? 380 : 340);
    const wc = V ? { x: 560, y: 780 } : { x: 1450, y: 450 };
    const pc = V ? { x: 300, y: 1230 } : { x: 1060, y: 600 };
    const gw = resaltado(win);
    const gp = resaltado(ph);
    const ch = chip(root, "Reseñas en Google", "star", { size: V ? 28 : 26 });
    const ev = chip(root, "Reservas y eventos", "calendar", { size: V ? 28 : 26 });
    const tapR = 0.6;
    sfx(tapR + 0.4, "tap", 0.7);
    sfx(1.6, "ding", 0.6);
    sfx(F1 + 0.8, "shimmer", 0.6);
    const est = chispas(root, 10, "#f6b93b", 32, "star");
    return (lt) => {
      head(lt);
      entra(win, lt, 0.05, wc.x, wc.y, { dy: 140 });
      entra(ph, lt, 0.25, pc.x, pc.y, { dy: 220, extra: { r: -4 } });
      ph.mostrar(
        secuencia(
          lt,
          [
            ["p-reserva", 0],
            ["p-reserva-enviada", tapR + 0.55],
            ["p-resena-google", F1],
          ],
          0.3,
        ),
      );
      ph.toque(caja("p-reserva", "reservar"), prog(lt, tapR, 0.9));
      const rb = caja("p-resena-google", "resena");
      ph.camara(rb, E.inOutCubic(prog(lt, F1 + 0.3, 0.7)) * 0.8, 1.7);
      gp(rb, inout(lt, F1 + 0.8, 0.3, info.dur, 0.2) * 0.9, "#f6b93b");
      win.mostrar({ "w-caja-reservas": 1 });
      gw(caja("w-caja-reservas", "confirmar"), inout(lt, 1.5, 0.3, F1, 0.3) * 0.9);
      if (rb) {
        const c = ph.centro(rb);
        est(
          prog(lt, F1 + 0.85, 1.2),
          pc.x - ph.ow / 2 + ph.bez + c.x,
          pc.y - ph.oh / 2 + ph.bez + c.y,
        );
      }
      if (V) {
        pop(ev, lt, F0 + 0.3, { x: 760, y: 1330, salida: F1 - 0.1 });
        pop(ch, lt, F1 + 0.8, { x: 760, y: 1330 });
      } else {
        pop(ev, lt, F0 + 0.3, { x: 130 + ev.offsetWidth / 2, y: 610 + 88, salida: F1 - 0.1 });
        pop(ch, lt, F1 + 0.8, { x: 130 + ch.offsetWidth / 2, y: 610 + 88 });
      }
    };
  },
});

/* ——— 15. Tu marca: estilos de carta ——— */
escena({
  id: "marca",
  entrada: "zoom",
  build(root, info) {
    const head = cabecera(root, "12 · Tu marca", "Tu logo, tus colores, tu *estilo.*", {
      centrado: true,
    });
    const estilos = [
      "p-estilo-clasico",
      "p-estilo-bistro-oscuro",
      "p-estilo-mediterraneo",
      "p-estilo-urbano-colorido",
      "p-estilo-cafe-minimal",
      "p-estilo-neon-nocturno",
      "p-estilo-gourmet-editorial",
    ];
    const pw = V ? 330 : 290;
    const tels = estilos.map((n) => {
      const t = new Telefono(root, pw);
      t.mostrar({ [n]: 1 });
      return t;
    });
    const cx = W / 2,
      cy = V ? 1060 : 640;
    const R = V ? 360 : 600;
    const c1 = chip(root, "9 estilos de carta", "palette", { size: V ? 28 : 26 });
    const c2 = chip(root, "Con tu logo y tus colores", "spark", { size: V ? 28 : 26 });
    sfx(1.2, "pop", 0.5);
    sfx(2.2, "pop", 0.5);
    sfx(0.4, "shimmer", 0.4);
    return (lt) => {
      head(lt);
      const giro = lerp(-1.4, 1.4, E.inOutSine(prog(lt, 0, info.dur + 0.6)));
      const ab = E.outQuint(prog(lt, 0.1, 1.2));
      tels.forEach((t, i) => {
        const th = (i - 3 + giro) * 0.5 * ab;
        const z = Math.cos(th);
        const x = cx + Math.sin(th) * R;
        const s = 0.55 + 0.45 * z;
        t.root.style.zIndex = Math.round(z * 100);
        t.colocar(x, cy + (1 - z) * -30, {
          s,
          o: clamp(ab * 2) * (0.35 + 0.65 * z),
          persp: 1400,
          ry: -Math.sin(th) * 35,
          blur: (1 - z) * 4,
        });
      });
      if (V) {
        pop(c1, lt, 1.2, { x: 300, y: 1530 });
        pop(c2, lt, 2.2, { x: 760, y: 1530 });
      } else {
        pop(c1, lt, 1.2, { x: 700, y: 1000 });
        pop(c2, lt, 2.2, { x: 1220, y: 1000 });
      }
    };
  },
});

/* ——— 16. Beneficios en el tiempo ——— */
escena({
  id: "tiempo",
  build(root, info) {
    const head = cabecera(root, "", "Lo notas en el *día a día.*", { centrado: true, ky: 120 });
    const datos = [
      ["sun", "Hoy", "Un servicio más ágil.", "p-pedido-entregado", "50% 18%", "115%"],
      [
        "calendar",
        "Cada semana",
        "Reportes claros para decidir.",
        "w-admin-reportes",
        "40% 8%",
        "165%",
      ],
      [
        "trend",
        "Mes a mes",
        "Un restaurante que conoce a sus clientes y mejora cada día.",
        "w-admin-calificaciones",
        "40% 8%",
        "165%",
      ],
    ];
    const cw = V ? 940 : 500,
      ch = V ? 300 : 520;
    const cards = datos.map(([ic, et, tx, img, pos, tam]) => {
      const c = el("div", "card", root, {
        width: px(cw),
        height: px(ch),
        display: "flex",
        flexDirection: V ? "row" : "column",
      });
      const body = el("div", "", c, { padding: px(V ? 34 : 36), flex: V ? "1" : "none" });
      body.innerHTML = `<div style="display:flex;align-items:center;gap:16px"><span style="display:flex;width:64px;height:64px;border-radius:50%;background:#fbe3d9;color:${C.accentStrong};align-items:center;justify-content:center">${icon(ic, 32, 2)}</span><span style="font-family:Fraunces;font-weight:600;font-size:${V ? 46 : 46}px">${et}</span></div><div style="margin-top:18px;font-size:${V ? 32 : 30}px;line-height:1.3;color:#44403c;font-weight:500">${tx}</div>`;
      el("div", "", c, {
        flex: "1",
        minWidth: V ? px(300) : "auto",
        backgroundImage: `url(../captura/png/${img}.png)`,
        backgroundSize: tam,
        backgroundPosition: pos,
        borderTop: V ? "none" : "1px solid #eee",
        borderLeft: V ? "1px solid #eee" : "none",
      });
      return c;
    });
    const linea = el("div", "abs", root, {
      background: C.accent,
      height: px(V ? 0 : 6),
      width: px(V ? 6 : 0),
      borderRadius: "3px",
    });
    info.F.forEach((t) => sfx(t - 0.1, "pop", 0.55));
    sfx(info.F[2] + 1.2, "shimmer", 0.5);
    return (lt) => {
      head(lt);
      cards.forEach((c, i) => {
        const a = info.F[i] - 0.15;
        const p = prog(lt, a, 0.7);
        const x = V ? W / 2 - cw / 2 : 210 + i * 520 + (500 - cw) / 2 - 10;
        const y = V ? 420 + i * 340 : 330;
        const activo = lt >= a && (i === 2 || lt < info.F[i + 1] - 0.15);
        put(c, {
          x,
          y: y + (1 - E.outQuint(p)) * 80,
          s: p > 0 ? 0.9 + 0.1 * E.outBack(p) : 0.9,
          o: clamp(p * 2),
        });
        c.style.boxShadow = activo
          ? `0 0 0 3px ${C.accent}, 0 40px 80px -30px rgba(28,25,23,.45)`
          : "";
      });
      const pl = E.inOutCubic(prog(lt, info.F[0], info.F[2] + 1 - info.F[0]));
      if (V) {
        linea.style.height = px(pl * 700);
        put(linea, { x: 40, y: 420 });
      } else {
        linea.style.width = px(pl * 1500);
        put(linea, { x: 210, y: 900 });
      }
    };
  },
});

/* ——— 17. Planes ——— */
escena({
  id: "planes",
  build(root, info) {
    const [, F1] = info.F;
    const texto = TIEMPOS.escenas.find((e) => e.id === "planes").frases[1].texto;
    const head = cabecera(root, "Planes", "Dos planes, según tu *negocio.*", {
      centrado: true,
      ky: 110,
    });
    const planes = [
      [
        "phone",
        "Digital",
        "Carta digital y pedidos a domicilio o para recoger.",
        ["Carta con tu marca", "Domicilios con WhatsApp", "Reservas"],
        false,
      ],
      [
        "store",
        "Completo",
        "Todo el salón: pedidos desde la mesa, mesero, cocina y caja.",
        ["Todo lo del Digital", "QR en cada mesa", "Reportes y calificaciones"],
        true,
      ],
    ];
    const cw = V ? 940 : 600,
      ch = V ? 470 : 560;
    const cards = planes.map(([ic, nom, desc, lista, dest]) => {
      const c = el("div", "card", root, {
        width: px(cw),
        height: px(ch),
        padding: px(V ? 40 : 44),
        border: dest ? `3px solid ${C.accent}` : "none",
      });
      c.innerHTML = `${dest ? `<div style="position:absolute;right:30px;top:30px;background:${C.accent};color:#fff;font-weight:700;font-size:22px;border-radius:999px;padding:8px 18px">Todo incluido</div>` : ""}
      <span style="display:flex;width:76px;height:76px;border-radius:22px;background:#fbe3d9;color:${C.accentStrong};align-items:center;justify-content:center">${icon(ic, 40, 2)}</span>
      <div style="font-family:Fraunces;font-weight:600;font-size:${V ? 60 : 62}px;margin-top:20px">${nom}</div>
      <div style="font-size:${V ? 30 : 28}px;color:#44403c;margin-top:8px;line-height:1.35;font-weight:500">${desc}</div>
      <div style="margin-top:${V ? 18 : 26}px;display:${V ? "flex" : "block"};gap:18px;flex-wrap:wrap">${lista.map((l) => `<div style="display:flex;gap:10px;align-items:center;font-size:${V ? 26 : 26}px;font-weight:600;margin-top:10px;color:#1c1917"><span style="color:${C.ok}">${icon("check", 26, 3)}</span>${l}</div>`).join("")}</div>`;
      return c;
    });
    const tA = F1 - 0.1,
      tB = tiempoEnFrase(info, 1, texto, "y otro completo") - 0.1;
    sfx(tA, "pop", 0.6);
    sfx(tB, "pop", 0.6);
    return (lt) => {
      head(lt);
      cards.forEach((c, i) => {
        const a = i ? tB : tA;
        const p = prog(lt, a, 0.7);
        const x = V ? W / 2 - cw / 2 : [330, 990][i];
        const y = V ? [430, 950][i] : 330;
        put(c, {
          x,
          y: y + (1 - E.outQuint(p)) * 90,
          s: p > 0 ? 0.92 + 0.08 * E.outBack(p) : 0.9,
          o: clamp(p * 2),
        });
      });
    };
  },
});

/* ——— 18. Cierre ——— */
escena({
  id: "cierre",
  entrada: "circulo",
  fondo: `linear-gradient(150deg, #ef6a3f 0%, ${C.accent} 45%, ${C.accentStrong} 100%)`,
  build(root, info) {
    const [, F1] = info.F;
    const circ = [0, 1, 2, 3].map((i) =>
      el("div", "abs", root, {
        width: px(600 + i * 300),
        height: px(600 + i * 300),
        borderRadius: "50%",
        border: "2px solid rgba(255,255,255,.14)",
      }),
    );
    const t1 = new Titulo(root, "Pruébalo *7 días* gratis", {
      x: V ? 40 : 160,
      y: V ? 640 : 300,
      w: V ? 1000 : 1600,
      size: V ? 124 : 132,
      align: "center",
      color: "#fff",
    });
    t1.e.querySelectorAll(".acc").forEach((a) => (a.style.color = "#ffe1d3"));
    const sub = el(
      "div",
      "abs",
      root,
      {
        width: px(W),
        textAlign: "center",
        color: "rgba(255,255,255,.92)",
        fontSize: px(V ? 40 : 40),
        fontWeight: 550,
      },
      "Con todo incluido. Sin tarjeta para empezar.",
    );
    const marca = el(
      "div",
      "abs",
      root,
      {
        width: px(W),
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        gap: "26px",
        color: "#fff",
      },
      `${marcaSVG(V ? 150 : 140, "#ffffff", "#ffd2bf")}<span style="font-family:Fraunces;font-weight:600;font-size:${V ? 130 : 130}px;letter-spacing:-0.03em">platterio</span>`,
    );
    const lema = el(
      "div",
      "abs",
      root,
      {
        width: px(W),
        textAlign: "center",
        color: "#fff",
        fontFamily: "Fraunces",
        fontStyle: "italic",
        fontWeight: 500,
        fontSize: px(V ? 64 : 62),
      },
      "Tu restaurante, conectado.",
    );
    const url = el(
      "div",
      "abs",
      root,
      {
        background: "#fff",
        color: C.accentStrong,
        fontWeight: 700,
        borderRadius: "999px",
        fontSize: px(V ? 38 : 36),
        padding: V ? "22px 44px" : "20px 42px",
        whiteSpace: "nowrap",
        boxShadow: "0 30px 60px -20px rgba(0,0,0,.35)",
      },
      `Empieza hoy en ${TIEMPOS.sitio}`,
    );
    sfx(F1 - 0.05, "chime", 0.8);
    sfx(0.35, "impact", 0.5);
    return (lt) => {
      circ.forEach((c, i) => {
        const d = 600 + i * 300;
        put(c, {
          x: W / 2 - d / 2,
          y: (V ? H * 0.45 : H * 0.48) - d / 2,
          s: 1 + 0.04 * Math.sin(lt * 1.2 + i),
          o: E.outCubic(prog(lt, 0.2 + i * 0.12, 1)),
        });
      });
      const sube = E.inOutCubic(prog(lt, F1 - 0.35, 0.7));
      t1.update(lt, 0.25);
      put(t1.e, { y: -sube * (V ? 360 : 230), s: 1 - 0.3 * sube, o: 1 - 0.0 * sube });
      const ps = E.outCubic(prog(lt, 1.2, 0.6)) * (1 - E.inCubic(prog(lt, F1 - 0.35, 0.4)));
      put(sub, { y: (V ? 960 : 520) + (1 - ps) * 20, o: ps });
      const pm = prog(lt, F1 - 0.05, 0.7);
      put(marca, {
        y: V ? 760 : 380,
        s: pm > 0 ? 0.7 + 0.3 * E.outBack(pm, 1.8) : 0.7,
        o: clamp(pm * 2),
      });
      const pl = E.outQuint(prog(lt, F1 + 0.8, 0.7));
      put(lema, { y: (V ? 960 : 570) + (1 - pl) * 30, o: pl });
      const pu = prog(lt, 1.6, 0.6);
      const w = url.offsetWidth;
      put(url, {
        x: W / 2 - w / 2,
        y: V ? 1380 : 800,
        s: pu > 0 ? E.outBack(pu, 1.8) * (1 + 0.02 * Math.sin(lt * 4)) : 0.001,
        o: clamp(pu * 2),
      });
    };
  },
});

iniciar().catch((e) => {
  console.error(e);
  window.ERROR = String(e);
});
