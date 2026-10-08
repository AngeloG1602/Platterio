"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import {
  normalizeEmail,
  trialEnd,
  uniqueSlug,
  validateSignup,
  DAY_MS,
  type Account,
  type SignupErrors,
} from "@/lib/domain/accounts";
import { authActions } from "./actions";
import { newId } from "./ids";
import { TRIAL_DAYS } from "./plans";
import { useAppStore } from "./store";

/**
 * Cuentas de negocio de la versión local: viven en este navegador para poder probar el recorrido
 * completo (registro, prueba de 7 días, ingreso). NO es seguro: la autenticación real, con
 * contraseñas protegidas en el servidor, llega con la base de datos (fase 9).
 */
interface AccountsState {
  accounts: Account[];
  currentId: string | null;
}

export const useAccountsStore = create<AccountsState>()(
  persist(() => ({ accounts: [], currentId: null }) as AccountsState, {
    name: "platterio:cuentas",
    version: 1,
    storage: createJSONStorage(() => localStorage),
    skipHydration: true,
  }),
);

async function hashPassword(password: string, salt: string): Promise<string> {
  const data = new TextEncoder().encode(`${salt}:${password}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

const newSalt = () =>
  Array.from(crypto.getRandomValues(new Uint8Array(12)), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");

type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string; fields?: SignupErrors };

/** El dueño entra como administrador del negocio y el negocio toma el nombre de la cuenta. */
function openOwnerSession(account: Account): boolean {
  const state = useAppStore.getState();
  const admin = state.staff.find((u) => u.role === "admin" && u.active);
  if (!admin) return false;
  useAppStore.setState((s) => ({ restaurant: { ...s.restaurant, name: account.businessName } }));
  authActions.loginAsDemo(admin.id);
  useAccountsStore.setState({ currentId: account.id });
  return true;
}

export const accountActions = {
  async signUp(input: {
    businessName: string;
    email: string;
    password: string;
    plan?: Account["plan"];
  }): Promise<Result<{ account: Account }>> {
    const fields = validateSignup(input);
    if (Object.keys(fields).length > 0)
      return { ok: false, error: "Revisa los datos marcados", fields };
    const { accounts } = useAccountsStore.getState();
    const email = normalizeEmail(input.email);
    if (accounts.some((a) => a.email === email))
      return {
        ok: false,
        error: "Ya hay una cuenta con ese correo",
        fields: { email: "Ya hay una cuenta con este correo. Inicia sesión." },
      };
    const salt = newSalt();
    const now = Date.now();
    const account: Account = {
      id: newId("cuenta"),
      email,
      businessName: input.businessName.trim(),
      slug: uniqueSlug(
        input.businessName,
        accounts.map((a) => a.slug),
      ),
      passwordSalt: salt,
      passwordHash: await hashPassword(input.password, salt),
      createdAt: now,
      validUntil: trialEnd(now, TRIAL_DAYS),
      kind: "prueba",
      ...(input.plan ? { plan: input.plan } : {}),
    };
    useAccountsStore.setState((s) => ({ accounts: [...s.accounts, account] }));
    if (!openOwnerSession(account))
      return { ok: false, error: "No pudimos preparar tu negocio. Intenta de nuevo." };
    return { ok: true, account };
  },

  async signIn(emailInput: string, password: string): Promise<Result<{ account: Account }>> {
    const email = normalizeEmail(emailInput);
    const account = useAccountsStore.getState().accounts.find((a) => a.email === email);
    // El mismo mensaje si no existe o si la contraseña no es: no se revela qué correos tienen cuenta.
    const wrong = { ok: false, error: "Correo o contraseña incorrectos" } as const;
    if (!account) return wrong;
    if ((await hashPassword(password, account.passwordSalt)) !== account.passwordHash) return wrong;
    if (!openOwnerSession(account))
      return { ok: false, error: "No pudimos abrir tu negocio. Intenta de nuevo." };
    return { ok: true, account };
  },

  signOut() {
    useAccountsStore.setState({ currentId: null });
    authActions.logout();
  },

  /** Solo para la demo: adelanta el reloj de la cuenta actual para ver los avisos de la prueba. */
  simulateDays(days: number) {
    const { currentId } = useAccountsStore.getState();
    useAccountsStore.setState((s) => ({
      accounts: s.accounts.map((a) =>
        a.id === currentId ? { ...a, validUntil: a.validUntil - days * DAY_MS } : a,
      ),
    }));
  },
  /** Solo para la demo: deja la prueba vencida. */
  expireNow() {
    const { currentId } = useAccountsStore.getState();
    useAccountsStore.setState((s) => ({
      accounts: s.accounts.map((a) =>
        a.id === currentId ? { ...a, validUntil: Date.now() - 1 } : a,
      ),
    }));
  },
  /** Solo para la demo: simula que el pago entró y la cuenta queda activa 30 días. */
  simulateActivation() {
    const { currentId } = useAccountsStore.getState();
    useAccountsStore.setState((s) => ({
      accounts: s.accounts.map((a) =>
        a.id === currentId
          ? { ...a, kind: "suscripcion", validUntil: Date.now() + 30 * DAY_MS }
          : a,
      ),
    }));
  },
};

export function useCurrentAccount(): Account | undefined {
  return useAccountsStore((s) => s.accounts.find((a) => a.id === s.currentId));
}
