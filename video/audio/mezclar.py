"""Música, efectos y voz del video, generados aquí (sin pistas de terceros).

Uso: python3 video/audio/mezclar.py h|v
Lee video/voz/voz.wav y video/render/sfx-<f>.json (lo escribe render.mjs) y deja
video/render/mezcla-<f>.wav. La música es una progresión propia sintetizada con numpy.
"""
import json
import sys
from pathlib import Path

import numpy as np
import soundfile as sf

RAIZ = Path(__file__).resolve().parents[1]
SR = 48000
rng = np.random.default_rng(27)


def midi(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def env(n, a=0.01, r=0.2, d=None):
    t = np.arange(n) / SR
    e = np.minimum(1, t / max(a, 1e-4))
    if d is not None:
        e *= np.exp(-t / d)
    tail = int(r * SR)
    if tail and n > tail:
        e[-tail:] *= np.linspace(1, 0, tail)
    return e


def lp(x, fc):
    """Pasa bajos de un polo (fc puede ser un arreglo)."""
    fc = np.broadcast_to(np.asarray(fc, dtype=float), x.shape)
    a = 1 - np.exp(-2 * np.pi * fc / SR)
    y = np.empty_like(x)
    acc = 0.0
    for i in range(len(x)):
        acc += a[i] * (x[i] - acc)
        y[i] = acc
    return y


def lp_fast(x, fc):
    a = 1 - np.exp(-2 * np.pi * fc / SR)
    # filtro IIR de un polo con fc fijo, vectorizado por bloques vía lfilter casero
    y = np.empty_like(x)
    acc = 0.0
    for i in range(0, len(x), 4096):
        blk = x[i : i + 4096]
        out = np.empty_like(blk)
        for j, v in enumerate(blk):
            acc += a * (v - acc)
            out[j] = acc
        y[i : i + 4096] = out
    return y


def add(buf, t, sig, gain=1.0, pan=0.0):
    i = int(round(t * SR))
    if i >= buf.shape[0]:
        return
    if i < 0:
        sig = sig[-i:]
        i = 0
    n = min(len(sig), buf.shape[0] - i)
    l = np.cos((pan + 1) * np.pi / 4)
    r = np.sin((pan + 1) * np.pi / 4)
    buf[i : i + n, 0] += sig[:n] * gain * l * 1.414
    buf[i : i + n, 1] += sig[:n] * gain * r * 1.414


def tono(f, dur, parciales=((1, 1.0),), dec=None, a=0.005, r=0.05):
    n = int(dur * SR)
    t = np.arange(n) / SR
    s = sum(amp * np.sin(2 * np.pi * f * k * t + k) for k, amp in parciales)
    return s * env(n, a, r, dec)


# ——— Instrumentos ———
def pad(notas, dur):
    n = int(dur * SR)
    t = np.arange(n) / SR
    s = np.zeros(n)
    for m in notas:
        f = midi(m)
        for det in (-0.004, 0.004):
            for k in range(1, 7):
                s += np.sin(2 * np.pi * f * (1 + det) * k * t + k * 1.3) * (1 / k) * np.exp(-k / 2.2)
    s *= 0.6 + 0.4 * np.sin(2 * np.pi * 0.25 * t) ** 2
    return s / (len(notas) * 4) * env(n, 0.6, 0.8)


def pluck(m, dur=0.5):
    return tono(midi(m), dur, ((1, 1), (2, 0.35), (3, 0.12)), dec=0.18, a=0.002, r=0.05)


def bajo(m, dur):
    s = tono(midi(m), dur, ((1, 1), (2, 0.25)), dec=dur * 0.9, a=0.008, r=0.06)
    return np.tanh(1.6 * s) / 1.2


def kick():
    n = int(0.45 * SR)
    t = np.arange(n) / SR
    f = 45 + 75 * np.exp(-t / 0.035)
    ph = 2 * np.pi * np.cumsum(f) / SR
    return np.sin(ph) * np.exp(-t / 0.16)


def ruido(n):
    return rng.standard_normal(n)


def hat():
    n = int(0.06 * SR)
    x = np.diff(ruido(n + 1))
    return x * np.exp(-np.arange(n) / SR / 0.012) * 0.25


def clap():
    n = int(0.25 * SR)
    x = ruido(n)
    x = x - lp_fast(x, 900)
    e = np.zeros(n)
    for o in (0, 0.011, 0.022):
        i = int(o * SR)
        e[i:] += np.exp(-np.arange(n - i) / SR / (0.012 if o < 0.02 else 0.09))
    return x * e * 0.35


# ——— Efectos ———
def whoosh(dur=0.7):
    n = int(dur * SR)
    x = ruido(n)
    t = np.linspace(0, 1, n)
    fc = 300 + 5000 * np.sin(np.pi * t) ** 2
    y = lp(x, fc)
    y = y - lp_fast(y, 150)
    return y * np.sin(np.pi * t) ** 1.5 * 0.9


def swell(dur=1.4):
    n = int(dur * SR)
    t = np.linspace(0, 1, n)
    x = lp(ruido(n), 200 + 6000 * t**2)
    tonal = np.sin(2 * np.pi * np.cumsum(200 + 600 * t**2) / SR) * 0.25
    return (x * 0.7 + tonal) * t**2.2


def impact():
    n = int(1.6 * SR)
    t = np.arange(n) / SR
    boom = np.sin(2 * np.pi * np.cumsum(38 + 60 * np.exp(-t / 0.08)) / SR) * np.exp(-t / 0.5)
    hit = lp_fast(ruido(n), 2500) * np.exp(-t / 0.08) * 0.8
    return np.tanh(1.5 * (boom + hit)) * 0.9


def pop():
    n = int(0.12 * SR)
    t = np.arange(n) / SR
    f = 420 + 700 * (t / t[-1])
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.035) * 0.6


def tap():
    n = int(0.08 * SR)
    t = np.arange(n) / SR
    return (np.sin(2 * np.pi * 2600 * t) * np.exp(-t / 0.006) * 0.4 + np.sin(2 * np.pi * 180 * t) * np.exp(-t / 0.02) * 0.6) * 0.7


def click():
    a = tap() * 0.6
    out = np.zeros(int(0.14 * SR))
    out[: len(a)] += a
    out[int(0.045 * SR) : int(0.045 * SR) + len(a)] += a * 0.5
    return out


def campana(m, dur=1.2, amp=0.5):
    return tono(midi(m), dur, ((1, 1), (2.01, 0.4), (3.02, 0.15), (4.1, 0.08)), dec=0.35, a=0.002, r=0.2) * amp


def ding():
    return campana(88, 1.2, 0.45) + campana(95, 1.2, 0.25)


def success():
    a = campana(88, 1.2, 0.4)
    b = campana(95, 1.2, 0.4)
    out = np.zeros(int(1.4 * SR))
    out[: len(a)] += a
    i = int(0.12 * SR)
    out[i : i + len(b)] += b[: len(out) - i]
    return out


def alerta():
    a = campana(81, 0.9, 0.35)
    b = campana(77, 0.9, 0.35)
    out = np.zeros(int(1.2 * SR))
    out[: len(a)] += a
    i = int(0.16 * SR)
    out[i : i + len(b)] += b[: len(out) - i]
    return out


def shimmer():
    out = np.zeros(int(1.6 * SR))
    for k, m in enumerate([86, 90, 93, 98, 102, 105]):
        c = campana(m, 0.8, 0.18)
        i = int(k * 0.07 * SR)
        out[i : i + len(c)] += c[: len(out) - i]
    return out


def cash():
    out = np.zeros(int(1.3 * SR))
    c = click()
    out[: len(c)] += c
    b = campana(93, 1.1, 0.35) + campana(100, 1.1, 0.2)
    i = int(0.09 * SR)
    out[i : i + len(b)] += b[: len(out) - i]
    return out


def chime():
    out = np.zeros(int(2.5 * SR))
    for k, m in enumerate([74, 78, 81, 86]):
        c = campana(m, 2.0, 0.35)
        i = int(k * 0.11 * SR)
        out[i : i + len(c)] += c[: len(out) - i]
    return out


def tick():
    n = int(0.05 * SR)
    t = np.arange(n) / SR
    return np.sin(2 * np.pi * 1700 * t) * np.exp(-t / 0.008) * 0.5 + np.sin(2 * np.pi * 900 * t) * np.exp(-t / 0.012) * 0.3


EFECTOS = {
    "whoosh": (whoosh, 0.30, -0.35),
    "swell": (swell, 0.45, -1.3),
    "impact": (impact, 0.55, 0),
    "pop": (pop, 0.28, 0),
    "tap": (tap, 0.45, 0),
    "click": (click, 0.45, 0),
    "ding": (ding, 0.35, 0),
    "success": (success, 0.32, 0),
    "alert": (alerta, 0.32, 0),
    "shimmer": (shimmer, 0.3, 0),
    "cash": (cash, 0.35, 0),
    "chime": (chime, 0.45, 0),
    "tick": (tick, 0.4, 0),
}


def reverb(x, seg=2.2, mezcla=0.22):
    n = int(seg * SR)
    t = np.arange(n) / SR
    ir = rng.standard_normal((n, 2)) * np.exp(-t / 0.5)[:, None]
    ir[:, 0] = lp_fast(ir[:, 0], 6000)
    ir[:, 1] = lp_fast(ir[:, 1], 6000)
    ir /= np.sqrt((ir**2).sum(axis=0))
    L = 1 << int(np.ceil(np.log2(len(x) + n)))
    out = np.zeros_like(x)
    for c in range(2):
        y = np.fft.irfft(np.fft.rfft(x[:, c], L) * np.fft.rfft(ir[:, c], L), L)[: len(x)]
        out[:, c] = y
    return x * (1 - mezcla) + out * mezcla * 2.5


def musica(total, logo, cierre):
    n = int((total + 3) * SR)
    m = np.zeros((n, 2))
    beat = 60 / 96
    # A: tensión antes del logo — un bordón grave que crece
    a_dur = logo
    dr = pad([38, 45, 50], a_dur + 0.8)
    dr *= np.linspace(0.4, 1.0, len(dr))
    add(m, 0, dr, 1.4)
    for k in range(int(a_dur / (beat * 2))):
        add(m, k * beat * 2, kick() * 0.35, 1.2)
    # B: groove desde el logo
    acordes = [
        ([50, 54, 57, 61, 64], 38),  # Dmaj9
        ([47, 50, 54, 57, 61], 35),  # Bm9
        ([43, 47, 50, 54, 57], 31),  # Gmaj9
        ([45, 49, 52, 57, 59], 33),  # A6/9
    ]
    compas = beat * 4
    t = logo
    i = 0
    fin_groove = cierre + 4.5
    while t < fin_groove:
        notas, raiz = acordes[i % 4]
        dur = compas * 2
        add(m, t, pad(notas, dur + 0.6), 0.5, -0.2)
        add(m, t, pad([n + 12 for n in notas[2:]], dur + 0.6), 0.18, 0.3)
        # arpegio
        arp = [notas[0] + 12, notas[2] + 12, notas[3] + 12, notas[4] + 12, notas[3] + 12, notas[2] + 12, notas[1] + 12, notas[2] + 12]
        intensidad = 0.55 if t < 45 else 0.8
        for k in range(16):
            add(m, t + k * beat / 2, pluck(arp[k % 8], 0.5), 0.16 * intensidad, -0.4 if k % 2 else 0.4)
        # bajo
        for b, d in ((0, 1.4), (1.5, 0.45), (2, 1.4), (3.5, 0.45), (4, 1.4), (5.5, 0.45), (6, 1.4), (7.5, 0.45)):
            add(m, t + b * beat, bajo(raiz, d * beat), 0.42)
        # batería
        for k in range(8):
            tb = t + k * beat
            if tb > cierre + 2.2:
                break
            add(m, tb, kick(), 0.55)
            if t >= 45 and k % 2 == 1:
                add(m, tb, clap(), 0.55)
            add(m, tb + beat / 2, hat(), 0.5, 0.3)
            if t >= 45:
                add(m, tb, hat() * 0.6, 0.35, -0.3)
        t += dur
        i += 1
    # cierre: acorde final que se apaga
    add(m, cierre + 2.2, pad([50, 54, 57, 62, 66], 5.5) * np.linspace(1, 0, int(5.5 * SR)), 0.55)
    return m


def main():
    f = sys.argv[1] if len(sys.argv) > 1 else "h"
    datos = json.loads((RAIZ / "render" / f"sfx-{f}.json").read_text())
    tiempos = json.loads((RAIZ / "voz" / "tiempos.json").read_text())
    total = datos["total"]
    ini = {e["id"]: e["inicio"] for e in tiempos["escenas"]}
    n = int((total + 3) * SR)

    voz, sr = sf.read(RAIZ / "voz" / "voz.wav")
    tv = np.arange(int(len(voz) * SR / sr)) / SR
    voz = np.interp(tv, np.arange(len(voz)) / sr, voz)
    vb = np.zeros((n, 2))
    add(vb, 0, voz, 0.707)

    mus = musica(total, ini["logo"], ini["cierre"])[:n]
    # Ducking: la música baja cuando habla la voz
    e = np.abs(voz)
    w = int(0.05 * SR)
    e = np.convolve(e, np.ones(w) / w, mode="same")
    e = np.minimum(1, e / 0.08)
    # liberación lenta
    rel = np.exp(-1 / (0.35 * SR))
    for i in range(1, len(e)):
        if e[i] < e[i - 1] * rel:
            e[i] = e[i - 1] * rel
    duck = np.ones(n)
    duck[: len(e)] = 1 - 0.55 * e
    mus *= duck[:, None]

    fx = np.zeros((n, 2))
    for ev in datos["sfx"]:
        gen, g, off = EFECTOS[ev["tipo"]]
        add(fx, ev["t"] + off, gen(), g * ev["vol"], 0.0)

    mezcla = vb * 1.0 + reverb(mus, 2.0, 0.25) * 0.13 + reverb(fx, 1.2, 0.18) * 0.9
    # fundido final
    fin = int((total + 0.2) * SR)
    mezcla = mezcla[: fin + int(0.3 * SR)]
    mezcla[-int(1.2 * SR) :] *= np.linspace(1, 0, int(1.2 * SR))[:, None]
    mezcla = np.tanh(mezcla * 1.1) / np.tanh(1.1)
    mezcla /= max(1e-6, np.abs(mezcla).max()) / 0.95
    sf.write(RAIZ / "render" / f"mezcla-{f}.wav", mezcla.astype(np.float32), SR)
    print(f"Mezcla lista: {len(mezcla) / SR:.1f} s")


if __name__ == "__main__":
    main()
