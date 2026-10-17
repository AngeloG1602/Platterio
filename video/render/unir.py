"""Une el video sin audio con la mezcla y normaliza el volumen para redes (-14 LUFS).

Uso: python3 video/render/unir.py h|v
Deja video/salida/platterio-horizontal.mp4 o platterio-vertical.mp4.
"""
import os
import subprocess
import sys
from pathlib import Path

import imageio_ffmpeg

RAIZ = Path(__file__).resolve().parents[1]
f = sys.argv[1] if len(sys.argv) > 1 else "h"
ffmpeg = os.environ.get("FFMPEG") or imageio_ffmpeg.get_ffmpeg_exe()
nombre = "platterio-horizontal.mp4" if f == "h" else "platterio-vertical.mp4"
salida = RAIZ / "salida" / nombre
subprocess.run(
    [
        ffmpeg, "-y", "-loglevel", "error",
        "-i", str(RAIZ / "render" / f"tmp-{f}" / "mudo.mp4"),
        "-i", str(RAIZ / "render" / f"mezcla-{f}.wav"),
        "-map", "0:v", "-map", "1:a",
        "-c:v", "libx264", "-preset", "slow", "-crf", "19", "-pix_fmt", "yuv420p", "-profile:v", "high",
        "-af", "loudnorm=I=-14:TP=-1.5:LRA=11",
        "-c:a", "aac", "-b:a", "192k", "-ar", "48000",
        "-movflags", "+faststart", "-shortest",
        str(salida),
    ],
    check=True,
)
print("Listo:", salida)
