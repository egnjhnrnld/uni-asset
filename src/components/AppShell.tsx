"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import clsx from "clsx";
import { useMemo, useState } from "react";
import { LayoutDashboard, Boxes, Landmark, ShieldCheck, LogIn, Search, Ticket } from "lucide-react";
import { Input } from "@/components/ui";

const nav = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/units", label: "Assets", icon: Boxes },
  { href: "/tickets", label: "Tickets", icon: Ticket },
  { href: "/labs", label: "Labs", icon: Landmark },
  { href: "/admin", label: "Admin", icon: ShieldCheck },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [q, setQ] = useState("");

  const pageTitle = useMemo(() => {
    if (pathname === "/") return "Dashboard";
    if (pathname.startsWith("/units")) return "Assets";
    if (pathname.startsWith("/labs")) return "Labs";
    if (pathname.startsWith("/admin")) return "Admin";
    return "Uni Asset App";
  }, [pathname]);

  return (
    <div className="min-h-screen bg-black text-zinc-100">
      <div className="flex min-h-screen">
        <aside className="w-64 border-r border-zinc-800 bg-zinc-950/70">
          <div className="border-b border-zinc-800 px-5 py-4">
            <Link href="/" className="no-underline">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-md bg-emerald-500/15 ring-1 ring-emerald-500/30" />
                <div>
                  <div className="text-sm font-semibold tracking-wide text-zinc-100">
                    Uni Asset App
                  </div>
                  <div className="text-[11px] text-zinc-500">Inventory & maintenance</div>
                </div>
              </div>
            </Link>
          </div>

          <nav className="px-2 py-3">
            {nav.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={clsx(
                    "group flex items-center gap-3 rounded-md px-3 py-2 text-sm no-underline transition-colors",
                    active
                      ? "bg-zinc-900/70 text-emerald-200 ring-1 ring-inset ring-emerald-500/30"
                      : "text-zinc-400 hover:bg-zinc-900/40 hover:text-zinc-200"
                  )}
                >
                  <span
                    className={clsx(
                      "inline-flex h-7 w-7 items-center justify-center rounded-md bg-zinc-900/40",
                      active && "bg-emerald-500/10 ring-1 ring-emerald-500/30"
                    )}
                  >
                    <Icon size={16} className={active ? "text-emerald-300" : "text-zinc-500"} />
                  </span>
                  <span className="flex-1">{item.label}</span>
                  {active ? <span className="h-2 w-2 rounded-full bg-emerald-400" /> : null}
                </Link>
              );
            })}

            <div className="mt-3 pt-3 border-t border-zinc-800">
              <Link
                href="/login"
                className="group flex items-center gap-3 rounded-md px-3 py-2 text-sm no-underline text-zinc-400 hover:bg-zinc-900/40 hover:text-zinc-200"
              >
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-zinc-900/40">
                  <LogIn size={16} className="text-zinc-500" />
                </span>
                <span>Login</span>
              </Link>
            </div>
          </nav>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="border-b border-zinc-800 bg-zinc-950/40 px-6 py-3">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="text-sm font-semibold tracking-wide text-zinc-100">{pageTitle}</div>
                <div className="text-[11px] text-zinc-500">Black theme with green highlights</div>
              </div>

              <form
                className="flex items-center gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  const qTrim = q.trim();
                  router.push(`/units${qTrim ? `?q=${encodeURIComponent(qTrim)}` : ""}`);
                }}
              >
                <div className="relative w-[320px] max-w-[46vw]">
                  <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600">
                    <Search size={14} />
                  </div>
                  <Input
                    className="pl-9"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Search assets…"
                  />
                </div>
                <button
                  type="submit"
                  className="rounded-md border border-zinc-800 bg-zinc-900/50 px-3 py-2 text-xs font-medium text-emerald-200 hover:border-emerald-500/30 hover:bg-zinc-900/70"
                >
                  Search
                </button>
              </form>
            </div>
          </header>

          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">{children}</div>

          <footer className="border-t border-zinc-800 bg-zinc-950/20 px-6 py-4 text-xs text-zinc-500">
            Uni Asset App (MVP) - transactional checkout/checkin, append-only logs, and maintenance tracking.
          </footer>
        </div>
      </div>
    </div>
  );
}

