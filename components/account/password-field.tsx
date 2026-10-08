"use client";

import { Eye, EyeOff } from "lucide-react";
import { useState, type ComponentProps } from "react";
import { Input } from "@/components/ui/field";

/** Campo de contraseña con botón para mostrarla (en el celular ayuda a no equivocarse). */
export function PasswordInput(props: Omit<ComponentProps<"input">, "type">) {
  const [shown, setShown] = useState(false);
  return (
    <div className="relative">
      <Input {...props} type={shown ? "text" : "password"} className="pr-12" />
      <button
        type="button"
        onClick={() => setShown((s) => !s)}
        aria-label={shown ? "Ocultar contraseña" : "Mostrar contraseña"}
        aria-pressed={shown}
        className="text-muted hover:text-ink absolute top-1/2 right-0.5 flex size-11 -translate-y-1/2 items-center justify-center"
      >
        {shown ? <EyeOff className="size-5" aria-hidden /> : <Eye className="size-5" aria-hidden />}
      </button>
    </div>
  );
}
