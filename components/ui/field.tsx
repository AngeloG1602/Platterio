import { useId, type ComponentProps, type ReactNode } from "react";
import { CircleAlert } from "lucide-react";
import { cn } from "@/lib/cn";

const control =
  "w-full rounded-lg border border-line-strong bg-surface px-3.5 text-[15px] text-ink placeholder:text-muted/80 " +
  "transition-[border-color,box-shadow] outline-none focus:border-accent focus:ring-4 focus:ring-accent/15 " +
  "aria-[invalid=true]:border-danger aria-[invalid=true]:focus:ring-danger/15 disabled:bg-surface-2 disabled:text-muted";

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn(control, "h-11", className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return (
    <textarea
      className={cn(control, "min-h-24 resize-y py-2.5 leading-relaxed", className)}
      {...props}
    />
  );
}

export function Select({ className, ...props }: ComponentProps<"select">) {
  return (
    <select
      className={cn(control, "h-11 appearance-none bg-[length:16px] pr-9", className)}
      {...props}
    />
  );
}

/** Campo con etiqueta, ayuda y error; conecta los ids para lectores de pantalla. */
export function Field({
  label,
  hint,
  error,
  optional,
  children,
  className,
}: {
  label: string;
  hint?: string;
  error?: string;
  optional?: boolean;
  className?: string;
  children: (props: {
    id: string;
    "aria-invalid": boolean;
    "aria-describedby"?: string;
  }) => ReactNode;
}) {
  const id = useId();
  const hintId = `${id}-ayuda`;
  const errorId = `${id}-error`;
  const describedBy = [hint && hintId, error && errorId].filter(Boolean).join(" ") || undefined;
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className="text-ink text-sm font-medium">
        {label}
        {optional && <span className="text-muted ml-1.5 font-normal">(opcional)</span>}
      </label>
      {children({ id, "aria-invalid": Boolean(error), "aria-describedby": describedBy })}
      {hint && !error && (
        <p id={hintId} className="text-muted text-[13px]">
          {hint}
        </p>
      )}
      {error && (
        <p
          id={errorId}
          className="text-danger-ink flex items-center gap-1.5 text-[13px] font-medium"
        >
          <CircleAlert aria-hidden className="size-4 shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}
