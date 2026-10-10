import { describe, expect, it } from "vitest";
import {
  availableTimes,
  cancelReservation,
  completeReservation,
  confirmReservation,
  createReservation,
  DEFAULT_RESERVATIONS,
  messageReservationToBusiness,
  messageReservationToCustomer,
  quoteTotal,
  rejectReservation,
  reservationCode,
  reservationMs,
  reservationQueue,
  setQuote,
  slotTimes,
  usedCapacity,
  validateReservation,
  validateReservationConfig,
  type ReservationInput,
} from "./reservations";
import type { Reservation } from "./types";

const config = DEFAULT_RESERVATIONS;
const now = new Date(2026, 9, 9, 10, 0).getTime(); // viernes 9 de octubre de 2026, 10:00
const NOW = new Date(now).toISOString();
const input: ReservationInput = {
  kind: "mesa",
  name: " Ana Gómez ",
  phone: "+57 300 123 4567",
  date: "2026-10-10",
  time: "19:30",
  people: 4,
};
const make = (over: Partial<Reservation> = {}): Reservation => ({
  ...createReservation({ id: "r1", input, config, reservations: [], now: NOW }),
  ...over,
});

describe("horas disponibles", () => {
  it("lista las horas de la apertura al cierre", () => {
    const t = slotTimes(config);
    expect(t[0]).toBe("12:00");
    expect(t.at(-1)).toBe("21:00");
    expect(t).toHaveLength(19);
    expect(slotTimes({ ...config, opensAt: "xx" })).toEqual([]);
  });

  it("entiende fechas reales y descarta las imposibles", () => {
    expect(reservationMs("2026-10-10", "19:30")).toBe(new Date(2026, 9, 10, 19, 30).getTime());
    expect(reservationMs("2026-02-31", "12:00")).toBeNaN();
    expect(reservationMs("2026-13-01", "12:00")).toBeNaN();
    expect(reservationMs("hoy", "12:00")).toBeNaN();
  });

  it("cuenta solo lo que ocupa cupo, en esa hora", () => {
    const list = [
      make({ id: "a", people: 4 }),
      make({ id: "b", people: 3, status: "confirmada" }),
      make({ id: "c", people: 9, status: "cancelada" }),
      make({ id: "d", people: 9, status: "rechazada" }),
      make({ id: "e", people: 5, time: "20:00" }),
    ];
    expect(usedCapacity(list, "2026-10-10", "19:30")).toBe(7);
    expect(usedCapacity(list, "2026-10-10", "19:30", "a")).toBe(3);
    expect(usedCapacity(list, "2026-10-11", "19:30")).toBe(0);
  });

  it("marca no disponible lo que está lleno o ya casi pasa", () => {
    const full = make({ people: 40 });
    const slots = availableTimes(config, [full], "2026-10-10", 2, now);
    expect(slots.find((s) => s.time === "19:30")).toMatchObject({ available: false, left: 0 });
    expect(slots.find((s) => s.time === "20:00")).toMatchObject({ available: true, left: 40 });
    // El mismo día, con 2 horas de anticipación mínima, las 11:00 ya no se pueden reservar.
    const today = availableTimes(config, [], "2026-10-09", 2, now);
    expect(today.find((s) => s.time === "11:30")).toBeUndefined();
    expect(today.find((s) => s.time === "12:00")?.available).toBe(true);
    expect(today.find((s) => s.time === "12:00")?.left).toBe(40);
  });
});

describe("validar la solicitud", () => {
  it("acepta una reserva de mesa correcta", () => {
    expect(validateReservation(input, config, [], now)).toEqual({});
  });

  it("explica cada error", () => {
    const e = validateReservation(
      { ...input, name: "A", phone: "123", date: "2026-10-09", time: "10:00", people: 0 },
      config,
      [],
      now,
    );
    expect(e.name).toBeTruthy();
    expect(e.phone).toMatch(/10 dígitos/);
    expect(e.time).toBeTruthy();
    expect(e.people).toMatch(/cuántas personas/);
  });

  it("no deja pasar el máximo por mesa ni reservar con demasiada anticipación", () => {
    expect(validateReservation({ ...input, people: 11 }, config, [], now).people).toMatch(/evento/);
    expect(validateReservation({ ...input, date: "2027-03-01" }, config, [], now).date).toMatch(
      /60 días/,
    );
  });

  it("rechaza una hora fuera de la lista y una sin cupo", () => {
    expect(validateReservation({ ...input, time: "23:00" }, config, [], now).time).toMatch(/lista/);
    const full = make({ people: 40 });
    expect(validateReservation(input, config, [full], now).time).toMatch(/cupo/);
  });

  it("los eventos piden motivo y un mínimo de personas", () => {
    const ev: ReservationInput = { ...input, kind: "evento", people: 20, occasion: "Grado" };
    expect(validateReservation(ev, config, [], now)).toEqual({});
    expect(validateReservation({ ...ev, people: 8 }, config, [], now).people).toMatch(/desde 12/);
    expect(validateReservation({ ...ev, occasion: " " }, config, [], now).occasion).toBeTruthy();
    expect(
      validateReservation(
        { ...ev },
        { ...config, events: { ...config.events, enabled: false } },
        [],
        now,
      ).kind,
    ).toBeTruthy();
  });
});

describe("crear y resolver", () => {
  it("queda por confirmar y normaliza los datos", () => {
    const r = make();
    expect(r).toMatchObject({
      status: "solicitada",
      name: "Ana Gómez",
      phone: "3001234567",
      kind: "mesa",
    });
    expect(r.code).toMatch(/^R-[A-Z2-9]{4}$/);
    expect(reservationCode("r1")).toBe(r.code);
  });

  it("se confirma sola si el negocio lo activa, hay cupo y es de mesa", () => {
    const auto = { ...config, autoConfirm: true };
    expect(
      createReservation({ id: "x", input, config: auto, reservations: [], now: NOW }).status,
    ).toBe("confirmada");
    const full = make({ id: "y", people: 38 });
    expect(
      createReservation({ id: "z", input, config: auto, reservations: [full], now: NOW }).status,
    ).toBe("solicitada");
    const ev: ReservationInput = { ...input, kind: "evento", people: 20, occasion: "Grado" };
    expect(
      createReservation({ id: "w", input: ev, config: auto, reservations: [], now: NOW }).status,
    ).toBe("solicitada");
  });

  it("confirma, rechaza (con motivo) y cancela según el estado", () => {
    const r = make();
    const ok = confirmReservation(r, NOW);
    expect(ok.ok && ok.reservation.status).toBe("confirmada");
    expect(confirmReservation(ok.ok ? ok.reservation : r, NOW).ok).toBe(false);
    expect(rejectReservation(r, " ", NOW)).toMatchObject({ ok: false });
    const no = rejectReservation(r, "Estamos llenos", NOW);
    expect(no.ok && no.reservation).toMatchObject({
      status: "rechazada",
      reason: "Estamos llenos",
    });
    expect(cancelReservation(make({ status: "confirmada" }), "", NOW).ok).toBe(true);
    expect(cancelReservation(make({ status: "realizada" }), "", NOW).ok).toBe(false);
    expect(completeReservation(make({ status: "solicitada" }), NOW).ok).toBe(false);
    expect(completeReservation(make({ status: "confirmada" }), NOW).ok).toBe(true);
  });

  it("una reserva cancelada libera el cupo", () => {
    const r = make({ people: 40 });
    const cancelled = cancelReservation(r, "", NOW);
    expect(usedCapacity([cancelled.ok ? cancelled.reservation : r], "2026-10-10", "19:30")).toBe(0);
  });
});

describe("cotización de eventos", () => {
  const ev = make({ kind: "evento", people: 20, occasion: "Grado" });
  const quote = {
    items: [
      { label: " Menú por persona ", amount: 1_200_000 },
      { label: "Decoración", amount: 300_000 },
    ],
    deposit: 500_000,
    depositPaid: true,
  };

  it("suma los ítems y guarda el anticipo", () => {
    const r = setQuote(ev, quote, NOW);
    expect(r.ok && quoteTotal(r.reservation.quote!)).toBe(1_500_000);
    expect(r.ok && r.reservation.quote!.items[0]!.label).toBe("Menú por persona");
    expect(r.ok && r.reservation.quote!.depositPaid).toBe(true);
  });

  it("valida los ítems, el anticipo y el tipo de reserva", () => {
    expect(setQuote(ev, { ...quote, deposit: 2_000_000 }, NOW).ok).toBe(false);
    expect(setQuote(ev, { ...quote, items: [] }, NOW).ok).toBe(false);
    expect(setQuote(ev, { ...quote, items: [{ label: " ", amount: 5 }] }, NOW).ok).toBe(false);
    expect(setQuote(ev, { ...quote, items: [{ label: "x", amount: -5 }] }, NOW).ok).toBe(false);
    expect(setQuote(make(), quote, NOW).ok).toBe(false);
    expect(setQuote({ ...ev, status: "cancelada" }, quote, NOW).ok).toBe(false);
  });

  it("un anticipo en cero no queda como recibido", () => {
    const r = setQuote(ev, { ...quote, deposit: 0, depositPaid: true }, NOW);
    expect(r.ok && r.reservation.quote!.depositPaid).toBe(false);
  });
});

describe("cola del personal", () => {
  it("separa por confirmar, próximas, por cerrar y resueltas", () => {
    const list = [
      make({ id: "1", date: "2026-10-12" }),
      make({ id: "2", date: "2026-10-10", status: "confirmada" }),
      make({ id: "3", date: "2026-10-08", status: "confirmada" }),
      make({ id: "4", status: "cancelada", updatedAt: "2026-10-08T10:00:00.000Z" }),
      make({ id: "5", status: "realizada", updatedAt: "2026-10-09T09:00:00.000Z" }),
    ];
    const q = reservationQueue(list, now);
    expect(q.pending.map((r) => r.id)).toEqual(["1"]);
    expect(q.upcoming.map((r) => r.id)).toEqual(["2"]);
    expect(q.toClose.map((r) => r.id)).toEqual(["3"]);
    expect(q.past.map((r) => r.id)).toEqual(["5", "4"]);
  });
});

describe("configuración", () => {
  it("la de fábrica es válida", () => {
    expect(validateReservationConfig(config)).toBeNull();
  });
  it("detecta valores imposibles", () => {
    expect(validateReservationConfig({ ...config, opensAt: "22:00", closesAt: "12:00" })).toMatch(
      /última hora/,
    );
    expect(validateReservationConfig({ ...config, slotMin: 20 })).toMatch(/cada 15/);
    expect(validateReservationConfig({ ...config, maxParty: 80 })).toMatch(/cupo/);
    expect(
      validateReservationConfig({ ...config, events: { ...config.events, minPeople: 5 } }),
    ).toMatch(/más personas/);
    expect(
      validateReservationConfig({
        ...config,
        events: { ...config.events, occasions: ["Grado", "grado"] },
      }),
    ).toMatch(/repetido/);
  });
});

describe("mensajes de WhatsApp", () => {
  it("el del cliente al negocio trae todo lo que pidió", () => {
    const r = make({
      kind: "evento",
      people: 20,
      occasion: "Grado",
      details: "Menú de tres tiempos",
      budget: 3_000_000,
    });
    const text = messageReservationToBusiness(r, "Fogón 27");
    expect(text).toContain("evento en Fogón 27");
    expect(text).toContain(r.code);
    expect(text).toContain("Personas: 20");
    expect(text).toContain("Motivo: Grado");
    expect(text).toContain("Menú de tres tiempos");
    expect(text).toContain("Presupuesto aproximado");
  });

  it("el del negocio al cliente cambia con el estado", () => {
    expect(messageReservationToCustomer(make({ status: "confirmada" }), "Fogón 27")).toContain(
      "está confirmada",
    );
    expect(
      messageReservationToCustomer(
        make({ status: "rechazada", reason: "Estamos llenos" }),
        "Fogón 27",
      ),
    ).toContain("Estamos llenos");
    expect(messageReservationToCustomer(make(), "Fogón 27")).toContain("por confirmar");
  });
});
