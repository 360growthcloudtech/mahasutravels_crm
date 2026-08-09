"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Compass,
  Eye,
  EyeOff,
  Lock,
  Mail,
  MapPin,
  Route,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getSession, login } from "@/lib/auth";
import { ThemeToggle } from "@/components/crm/theme-toggle";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [error, setError] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    getSession().then((session) => {
      if (!cancelled && session) router.replace("/");
    });
    return () => {
      cancelled = true;
    };
  }, [router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const result = await login(email, password);
    if (!result.ok) {
      setError(result.error);
      setLoading(false);
      return;
    }
    router.replace("/");
  }

  return (
    <div className="grid min-h-dvh bg-paper lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
      <aside className="relative hidden overflow-hidden bg-ink text-white lg:flex lg:flex-col lg:justify-between lg:p-12 xl:p-16">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.18]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 18% 20%, #f5a524 0, transparent 32%), radial-gradient(circle at 88% 78%, #0c8f8f 0, transparent 36%)",
          }}
        />
        <div className="pointer-events-none absolute inset-y-0 left-10 w-px bg-[repeating-linear-gradient(to_bottom,#2a3150_0_6px,transparent_6px_14px)]" />

        <div className="relative z-10 flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-xl bg-marigold text-ink shadow-lg shadow-marigold/25">
            <Compass className="size-6" strokeWidth={2.25} />
          </div>
          <div>
            <p className="font-display text-xl font-semibold tracking-tight">Mahasu Travels</p>
            <p className="font-mono-data text-[11px] tracking-[0.18em] text-white/45 uppercase">
              Dispatch CRM
            </p>
          </div>
        </div>

        <div className="relative z-10 max-w-md space-y-6">
          <p className="font-mono-data text-[11px] tracking-[0.2em] text-marigold uppercase">
            Himachal dispatch desk
          </p>
          <h1 className="font-display text-4xl leading-[1.12] font-semibold tracking-tight xl:text-5xl">
            Run every lead, cab, and booking from one route.
          </h1>
          <p className="max-w-sm text-sm leading-relaxed text-white/65">
            Assign drivers, track payments, and keep itineraries moving — without leaving the
            dispatch board.
          </p>

          <ul className="space-y-3 pt-2">
            {[
              { icon: MapPin, label: "Live booking & driver assignment" },
              { icon: Route, label: "Itineraries, hotels & quotes in one place" },
              { icon: ShieldCheck, label: "Role-based access for your ops team" },
            ].map((item) => (
              <li key={item.label} className="flex items-center gap-3 text-sm text-white/80">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-white/8 text-marigold">
                  <item.icon className="size-4" />
                </span>
                {item.label}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative z-10 text-xs text-white/35">
          © {new Date().getFullYear()} Mahasu Travels · Internal dispatch only
        </p>
      </aside>

      <main className="relative flex items-center justify-center px-4 py-10 sm:px-8">
        <ThemeToggle className="absolute top-4 right-4 sm:top-6 sm:right-6" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[radial-gradient(ellipse_at_top,var(--marigold-soft),transparent_70%)] lg:hidden" />

        <div className="relative w-full max-w-[26rem]">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <div className="flex size-10 items-center justify-center rounded-xl bg-marigold text-ink shadow-md shadow-marigold/20">
              <Compass className="size-5" strokeWidth={2.25} />
            </div>
            <div>
              <p className="font-display text-lg font-semibold text-ink-text">Mahasu Travels</p>
              <p className="font-mono-data text-[10px] tracking-[0.16em] text-slate-soft uppercase">
                Dispatch CRM
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6 shadow-[0_20px_60px_-28px_rgba(18,23,43,0.28)] sm:p-8">
            <div className="mb-6 space-y-1.5">
              <h2 className="font-display text-2xl font-semibold tracking-tight text-ink-text">
                Welcome back
              </h2>
              <p className="text-sm text-slate">Sign in to continue dispatching trips.</p>
            </div>

            <form className="space-y-4" onSubmit={onSubmit} autoComplete="on">
              <label className="block space-y-1.5">
                <span className="text-xs font-medium tracking-wide text-slate uppercase">Email</span>
                <div className="relative">
                  <Mail className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-soft" />
                  <Input
                    type="email"
                    name="email"
                    autoComplete="username"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setError("");
                    }}
                    placeholder="you@mahasutravels.com"
                    className="h-11 rounded-xl bg-wash pl-10"
                  />
                </div>
              </label>

              <label className="block space-y-1.5">
                <span className="text-xs font-medium tracking-wide text-slate uppercase">
                  Password
                </span>
                <div className="relative">
                  <Lock className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-soft" />
                  <Input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setError("");
                    }}
                    placeholder="Enter your password"
                    className="h-11 rounded-xl bg-wash pr-11 pl-10"
                  />
                  <button
                    type="button"
                    className="absolute top-1/2 right-3 -translate-y-1/2 text-slate-soft hover:text-ink-text"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </label>

              {error ? (
                <p className="rounded-lg bg-signal-soft px-3 py-2 text-sm text-signal">{error}</p>
              ) : null}

              <Button
                type="submit"
                variant="marigold"
                disabled={loading}
                className="h-11 w-full rounded-xl text-sm font-semibold"
              >
                {loading ? "Signing in…" : "Sign in to dispatch"}
              </Button>
            </form>

            <div className="mt-6 rounded-xl border border-dashed border-border bg-wash px-4 py-3">
              <p className="font-mono-data text-[10px] tracking-[0.14em] text-slate-soft uppercase">
                Demo access
              </p>
              <p className="mt-1 text-sm text-ink-text">
                priya@mahasutravels.com
                <span className="mx-1.5 text-slate-soft">·</span>
                Priya@123
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
