"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Caveat, Dancing_Script } from "next/font/google";

export type KidsFontStyle = "print" | "handwriting" | "cursive";

const FONT_STORAGE_KEY = "nora-font-style";

const caveat = Caveat({ subsets: ["latin"], weight: ["700"] });
const dancingScript = Dancing_Script({ subsets: ["latin"], weight: ["700"] });

export function getFontClass(style: KidsFontStyle) {
  if (style === "cursive") return `${dancingScript.className} tracking-wide`;
  if (style === "handwriting") return `${caveat.className} tracking-wide`;
  return "";
}

export function useKidsFont() {
  const [fontStyle, setFontStyleState] = useState<KidsFontStyle>("print");

  useEffect(() => {
    const saved = localStorage.getItem(FONT_STORAGE_KEY);
    if (saved === "print" || saved === "handwriting" || saved === "cursive") {
      setFontStyleState(saved);
    }
    // Migrate old animal-sort key
    const oldKey = localStorage.getItem("animal-sort-font-style");
    if (oldKey && !localStorage.getItem(FONT_STORAGE_KEY)) {
      if (oldKey === "print" || oldKey === "handwriting" || oldKey === "cursive") {
        localStorage.setItem(FONT_STORAGE_KEY, oldKey);
        setFontStyleState(oldKey);
      }
    }
  }, []);

  const setFontStyle = useCallback((style: KidsFontStyle) => {
    setFontStyleState(style);
    localStorage.setItem(FONT_STORAGE_KEY, style);
  }, []);

  return { fontStyle, setFontStyle, fontClass: getFontClass(fontStyle) };
}

const GAMES = [
  { href: "/sight-words", label: "Sight Words", emoji: "\u{1F524}" },
  { href: "/animal-sort", label: "Animal Sort", emoji: "\u{1F43E}" },
  { href: "/spelling-practice", label: "Spelling", emoji: "\u{270F}\u{FE0F}" },
  { href: "/learn-to-draw", label: "Learn to Draw", emoji: "\u{1F3A8}" },
];

const FONT_OPTIONS: { value: KidsFontStyle; label: string }[] = [
  { value: "print", label: "Print" },
  { value: "handwriting", label: "Handwriting" },
  { value: "cursive", label: "Cursive" },
];

export function KidsNav() {
  const pathname = usePathname();
  const { fontStyle, setFontStyle } = useKidsFont();

  return (
    <nav className="mx-auto max-w-4xl px-2 pt-2 pb-1">
      <div className="flex flex-wrap items-center justify-center gap-1 sm:gap-2">
        {GAMES.map((game) => {
          const active = pathname === game.href || pathname.startsWith(game.href + "/");
          return (
            <Link
              key={game.href}
              href={game.href}
              className={`rounded-2xl px-3 py-2 sm:px-4 sm:py-2.5 text-sm sm:text-base font-bold transition-all active:scale-95 ${
                active
                  ? "bg-white shadow-md text-blue-700 scale-105"
                  : "bg-white/50 text-slate-700 hover:bg-white/70"
              }`}
            >
              <span className="mr-1">{game.emoji}</span>
              <span className="hidden sm:inline">{game.label}</span>
              <span className="sm:hidden">{game.label.split(" ")[0]}</span>
            </Link>
          );
        })}

        <div className="ml-1 sm:ml-3">
          <select
            value={fontStyle}
            onChange={(e) => setFontStyle(e.target.value as KidsFontStyle)}
            className="rounded-xl border border-slate-200 bg-white/70 px-2 py-2 text-sm font-semibold text-slate-600"
            aria-label="Font style"
          >
            {FONT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </nav>
  );
}
