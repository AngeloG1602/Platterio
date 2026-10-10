"""Genera la voz del video con Kokoro (local, sin internet) y la línea de tiempo.

Uso: python3 video/voz/generar.py
Necesita los modelos en video/.modelos (ver video/README.md). Produce:
  video/voz/voz.wav          la voz completa, ya ubicada en el tiempo
  video/voz/tiempos.json     inicio y duración de cada escena y de cada frase
  video/salida/subtitulos.srt
"""
import json
import os
import re
from pathlib import Path

import numpy as np
import soundfile as sf
from kokoro_onnx import Kokoro

RAIZ = Path(__file__).resolve().parents[1]
MODELOS = Path(os.environ.get("KOKORO_DIR", RAIZ / ".modelos"))
SR = 24000

# Respiros del montaje (segundos)
ENTRADA = 0.45  # antes de la primera frase de cada escena
ENTRE = 0.28  # entre frases
SALIDA = 0.55  # después de la última frase
MINIMO = {"gancho": 7.0, "pregunta": 4.6, "logo": 6.2, "marca": 6.0, "planes": 7.0, "cierre": 8.5}
EXTRA = {"gancho": 0.6, "logo": 0.8, "tiempo": 0.6, "cierre": 2.4}


def recortar(a, umbral=0.012):
    idx = np.where(np.abs(a) > umbral)[0]
    if len(idx) == 0:
        return a
    ini = max(idx[0] - int(0.03 * SR), 0)
    fin = min(idx[-1] + int(0.08 * SR), len(a))
    return a[ini:fin]


def srt_t(s):
    ms = int(round(s * 1000))
    h, ms = divmod(ms, 3_600_000)
    m, ms = divmod(ms, 60_000)
    seg, ms = divmod(ms, 1000)
    return f"{h:02}:{m:02}:{seg:02},{ms:03}"


def partir(texto, dur):
    """Parte un subtítulo largo en trozos de ~42 caracteres, repartiendo el tiempo por letras."""
    if len(texto) <= 46:
        return [(texto, 0.0, dur)]
    palabras = texto.split()
    trozos, actual = [], ""
    for p in palabras:
        if actual and len(actual) + 1 + len(p) > 42:
            trozos.append(actual)
            actual = p
        else:
            actual = f"{actual} {p}".strip()
    trozos.append(actual)
    total = sum(len(t) for t in trozos)
    out, t = [], 0.0
    for tr in trozos:
        d = dur * len(tr) / total
        out.append((tr, t, d))
        t += d
    return out


def main():
    guion = json.loads((RAIZ / "guion.json").read_text())
    k = Kokoro(str(MODELOS / "kokoro.onnx"), str(MODELOS / "voices.bin"))
    escenas, pistas, t = [], [], 0.0
    for e in guion["escenas"]:
        frases, cursor = [], ENTRADA
        for i, f in enumerate(e["frases"]):
            audio, sr = k.create(f.get("decir", f["texto"]), voice=guion["voz"], speed=guion["velocidad"], lang="es")
            assert sr == SR
            audio = recortar(audio)
            d = len(audio) / SR
            frases.append({"texto": f["texto"], "inicio": round(t + cursor, 3), "dur": round(d, 3)})
            pistas.append((t + cursor, audio))
            cursor += d + ENTRE
        dur = cursor - ENTRE + SALIDA + EXTRA.get(e["id"], 0)
        dur = max(dur, MINIMO.get(e["id"], 0))
        escenas.append({"id": e["id"], "inicio": round(t, 3), "dur": round(dur, 3), "frases": frases})
        print(f"{e['id']:12} {t:6.2f}s  +{dur:5.2f}s")
        t += dur
    total = t
    voz = np.zeros(int(total * SR) + SR, dtype=np.float32)
    for ini, a in pistas:
        i = int(ini * SR)
        voz[i : i + len(a)] += a
    voz = voz / max(1e-6, np.abs(voz).max()) * 0.9
    sf.write(RAIZ / "voz" / "voz.wav", voz, SR)
    (RAIZ / "voz" / "tiempos.json").write_text(
        json.dumps({"total": round(total, 3), "sitio": guion["sitio"], "escenas": escenas}, ensure_ascii=False, indent=1)
    )
    (RAIZ / "salida").mkdir(exist_ok=True)
    n, lineas = 1, []
    for e in escenas:
        for f in e["frases"]:
            for texto, o, d in partir(f["texto"], f["dur"]):
                lineas.append(f"{n}\n{srt_t(f['inicio'] + o)} --> {srt_t(f['inicio'] + o + d)}\n{texto}\n")
                n += 1
    (RAIZ / "salida" / "subtitulos.srt").write_text("\n".join(lineas))
    print(f"Total: {total:.1f} s")


if __name__ == "__main__":
    main()
