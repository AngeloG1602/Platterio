import { describe, expect, it } from "vitest";
import { createClock, setClockScale, virtualNow } from "./clock";

describe("reloj de demo", () => {
  it("a velocidad normal sigue al reloj real", () => {
    const clock = createClock(1_000);
    expect(virtualNow(clock, 6_000)).toBe(6_000);
  });

  it("acelera sin saltos y conserva lo transcurrido", () => {
    const clock = createClock(0);
    const fast = setClockScale(clock, 10_000, 10);
    expect(virtualNow(fast, 10_000)).toBe(10_000);
    expect(virtualNow(fast, 11_000)).toBe(20_000);
    const normal = setClockScale(fast, 12_000, 1);
    expect(virtualNow(normal, 12_000)).toBe(30_000);
    expect(virtualNow(normal, 13_000)).toBe(31_000);
  });
});
