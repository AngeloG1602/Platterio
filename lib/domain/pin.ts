/** PIN de 4 dígitos que no se repite entre las mesas abiertas. */
export function newPin(inUse: readonly string[], rand: () => number = Math.random): string {
  for (let tries = 0; tries < 50; tries++) {
    const pin = String(Math.floor(rand() * 10_000)).padStart(4, "0");
    if (!inUse.includes(pin)) return pin;
  }
  // Con casi todos los PIN ocupados (no pasa con un salón real), se toma el primero libre.
  for (let n = 0; n < 10_000; n++) {
    const pin = String(n).padStart(4, "0");
    if (!inUse.includes(pin)) return pin;
  }
  return "0000";
}
