/**
 * Reloj de la demo. Todo el mockup lee la hora de aquí para poder:
 * - acelerar el tiempo (×10) sin saltos: se ancla el momento del cambio;
 * - simular la franja horaria sin tocar el reloj real (ver `slotOverride` en el store).
 */
export interface DemoClock {
  anchorReal: number;
  anchorVirtual: number;
  scale: number;
}

export function createClock(realNow: number): DemoClock {
  return { anchorReal: realNow, anchorVirtual: realNow, scale: 1 };
}

export function virtualNow(clock: DemoClock, realNow: number): number {
  return clock.anchorVirtual + (realNow - clock.anchorReal) * clock.scale;
}

/** Cambia la velocidad conservando la hora virtual actual (sin saltos). */
export function setClockScale(clock: DemoClock, realNow: number, scale: number): DemoClock {
  return { anchorReal: realNow, anchorVirtual: virtualNow(clock, realNow), scale };
}
