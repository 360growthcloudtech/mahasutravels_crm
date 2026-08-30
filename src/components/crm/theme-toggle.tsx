"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, ready, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={
        !ready ? "Toggle theme" : isDark ? "Switch to light theme" : "Switch to dark theme"
      }
      className={cn(
        "flex size-9 shrink-0 items-center justify-center rounded-md border border-border bg-card text-slate transition-colors hover:bg-secondary",
        className
      )}
    >
      {/* Keep a stable placeholder until mounted so SSR and client HTML match. */}
      {!ready ? (
        <span className="size-4" aria-hidden />
      ) : isDark ? (
        <Sun className="size-4" />
      ) : (
        <Moon className="size-4" />
      )}
    </button>
  );
}
