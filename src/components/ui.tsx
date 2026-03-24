"use client";

import clsx from "clsx";

export function Card({
  title,
  children,
  className,
}: {
  title?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={clsx("rounded-lg border border-zinc-800 bg-zinc-900/30 p-5", className)}>
      {title ? <h2 className="text-sm font-semibold text-zinc-100">{title}</h2> : null}
      <div className={clsx(title && "mt-3")}>{children}</div>
    </section>
  );
}

export function Button({
  children,
  variant = "primary",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger";
}) {
  const base =
    "inline-flex items-center justify-center rounded-md px-3 py-2 text-sm font-medium no-underline disabled:opacity-50";
  const styles = {
    primary: "bg-zinc-100 text-zinc-900 hover:bg-white",
    secondary: "border border-zinc-700 text-zinc-100 hover:border-zinc-500",
    danger: "bg-red-600 text-white hover:bg-red-500",
  } as const;
  return (
    <button className={clsx(base, styles[variant], className)} {...props}>
      {children}
    </button>
  );
}

export function Input({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={clsx(
        "w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-zinc-400 focus:outline-none",
        className
      )}
      {...props}
    />
  );
}

export function Select({
  className,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={clsx(
        "w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus:border-zinc-400 focus:outline-none",
        className
      )}
      {...props}
    />
  );
}

