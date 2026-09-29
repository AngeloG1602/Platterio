import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "ink";
type Size = "sm" | "md" | "lg";

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-accent-strong text-accent-ink hover:brightness-[1.06] active:brightness-95 shadow-[inset_0_1px_0_rgb(255_255_255/0.15)]",
  secondary: "bg-surface text-ink border border-line-strong hover:bg-surface-2 active:bg-surface-2",
  ghost: "bg-transparent text-ink hover:bg-surface-2 active:bg-surface-2",
  danger: "bg-danger text-white hover:brightness-110 active:brightness-95",
  ink: "bg-ink text-bg hover:bg-ink-soft",
};

const SIZES: Record<Size, string> = {
  sm: "h-9 px-3.5 text-sm gap-1.5 rounded-md",
  md: "h-11 px-4.5 text-[15px] gap-2 rounded-lg",
  lg: "h-13 px-6 text-base gap-2.5 rounded-xl",
};

export interface ButtonProps extends ComponentProps<"button"> {
  variant?: Variant;
  size?: Size;
  block?: boolean;
}

export function buttonClasses({
  variant = "primary",
  size = "md",
  block,
  className,
}: Pick<ButtonProps, "variant" | "size" | "block" | "className">) {
  return cn(
    "inline-flex shrink-0 select-none items-center justify-center font-medium whitespace-nowrap",
    "transition-[background-color,filter,transform,box-shadow] duration-150 active:scale-[0.98]",
    "disabled:pointer-events-none disabled:opacity-45 disabled:shadow-none",
    "[&_svg]:size-[1.1em] [&_svg]:shrink-0",
    VARIANTS[variant],
    SIZES[size],
    block && "w-full",
    className,
  );
}

export function Button({
  variant,
  size,
  block,
  className,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button type={type} className={buttonClasses({ variant, size, block, className })} {...props} />
  );
}

interface IconButtonProps extends ComponentProps<"button"> {
  label: string;
  variant?: "ghost" | "secondary" | "surface";
}

/** Botón de solo ícono con zona táctil de 44 px y etiqueta accesible. */
export function IconButton({
  label,
  variant = "ghost",
  className,
  type = "button",
  ...props
}: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={cn(
        "text-ink inline-flex size-11 shrink-0 items-center justify-center rounded-full transition-colors",
        "disabled:pointer-events-none disabled:opacity-40 [&_svg]:size-5",
        variant === "ghost" && "hover:bg-surface-2",
        variant === "secondary" && "border-line-strong bg-surface hover:bg-surface-2 border",
        variant === "surface" && "bg-surface/90 shadow-card hover:bg-surface backdrop-blur",
        className,
      )}
      {...props}
    />
  );
}
