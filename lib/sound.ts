"use client";

/** Aviso sonoro suave (dos notas) con Web Audio, sin archivos. */
let ctx: AudioContext | null = null;

export function unlockSound() {
  if (typeof window === "undefined") return;
  ctx ??= new AudioContext();
  if (ctx.state === "suspended") void ctx.resume();
}

export function playChime(kind: "nuevo" | "listo" = "nuevo") {
  if (!ctx || ctx.state !== "running") return;
  const notes = kind === "nuevo" ? [660, 880] : [880, 1175];
  notes.forEach((freq, i) => {
    const osc = ctx!.createOscillator();
    const gain = ctx!.createGain();
    const start = ctx!.currentTime + i * 0.16;
    osc.type = "sine";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.12, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.4);
    osc.connect(gain).connect(ctx!.destination);
    osc.start(start);
    osc.stop(start + 0.45);
  });
}
