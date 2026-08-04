"use client";

import { useEffect, useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
} from "@/components/ui/dropdown-menu";
import { Palette, Moon, Sun, Paintbrush } from "lucide-react";

const COLOR_THEMES = [
  { name: "Default (Lilac)", class: "theme-default", color: "bg-purple-500" },
  { name: "Crimson Red", class: "theme-red", color: "bg-red-500" },
  { name: "Emerald Green", class: "theme-green", color: "bg-emerald-500" },
  { name: "Royal Blue", class: "theme-blue", color: "bg-blue-500" },
  { name: "Amber Yellow", class: "theme-amber", color: "bg-amber-500" },
  { name: "Rose Pink", class: "theme-rose", color: "bg-rose-500" },
];

export default function ThemeToggle() {
  const [isDark, setIsDark] = useState(true);
  const [activeColor, setActiveColor] = useState("theme-default");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    // 1. Cek Mode (Dark/Light) - backward compatible dengan "theme" key lama
    const mode =
      localStorage.getItem("theme-mode") ||
      localStorage.getItem("theme") ||
      "dark";
    if (mode === "dark") {
      document.documentElement.classList.add("dark");
      setIsDark(true);
    } else {
      document.documentElement.classList.remove("dark");
      setIsDark(false);
    }

    // 2. Cek Warna (Color Theme)
    const color = localStorage.getItem("theme-color") || "theme-default";
    applyColorTheme(color, false);
  }, []);

  const setMode = (mode: "dark" | "light") => {
    if (mode === "dark") {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme-mode", "dark");
      localStorage.setItem("theme", "dark");
      setIsDark(true);
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme-mode", "light");
      localStorage.setItem("theme", "light");
      setIsDark(false);
    }
  };

  const applyColorTheme = (colorClass: string, saveToStorage = true) => {
    // Remove old themes
    COLOR_THEMES.forEach((t) => {
      document.documentElement.classList.remove(t.class);
    });
    // Add new theme if not default
    if (colorClass !== "theme-default") {
      document.documentElement.classList.add(colorClass);
    }

    if (saveToStorage) {
      localStorage.setItem("theme-color", colorClass);
    }
    setActiveColor(colorClass);
  };

  if (!mounted) {
    return (
      <button className="p-2 rounded-lg bg-card/50 border border-border opacity-50 cursor-wait">
        <Palette className="w-5 h-5 text-foreground/20" />
      </button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            className="p-2 rounded-lg bg-card/50 border border-border hover:border-primary/50 transition-all text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            aria-label="Toggle Theme Options"
          />
        }
      >
        <Palette className="w-5 h-5 text-primary" />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-56 mt-2 rounded-xl shadow-2xl border-border/50 bg-card/95 backdrop-blur-md"
      >
        <DropdownMenuGroup>
          <DropdownMenuLabel className="flex items-center gap-2 text-xs uppercase tracking-widest text-foreground/40 font-black">
            {isDark ? <Moon size={14} /> : <Sun size={14} />}
            Appearance Mode
          </DropdownMenuLabel>
          <DropdownMenuItem
            onClick={() => setMode("light")}
            className="cursor-pointer font-bold text-sm m-1 rounded-lg hover:bg-primary/10"
          >
            Light Mode
            {!isDark && (
              <div className="ml-auto w-2 h-2 rounded-full bg-primary" />
            )}
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => setMode("dark")}
            className="cursor-pointer font-bold text-sm m-1 rounded-lg hover:bg-primary/10"
          >
            Dark Mode
            {isDark && (
              <div className="ml-auto w-2 h-2 rounded-full bg-primary" />
            )}
          </DropdownMenuItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator className="bg-border/50 my-2" />

        <DropdownMenuGroup>
          <DropdownMenuLabel className="flex items-center gap-2 text-xs uppercase tracking-widest text-foreground/40 font-black">
            <Paintbrush size={14} />
            Accent Color
          </DropdownMenuLabel>

          <div className="grid grid-cols-1 gap-0.5 p-1">
            {COLOR_THEMES.map((theme) => (
              <DropdownMenuItem
                key={theme.class}
                onClick={() => applyColorTheme(theme.class)}
                className="cursor-pointer flex items-center justify-between font-bold text-sm rounded-lg hover:bg-primary/5"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-3 h-3 rounded-full ${theme.color} shadow-sm border border-black/10`}
                  />
                  <span>{theme.name}</span>
                </div>
                {activeColor === theme.class && (
                  <div className="w-2 h-2 rounded-full bg-foreground" />
                )}
              </DropdownMenuItem>
            ))}
          </div>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
