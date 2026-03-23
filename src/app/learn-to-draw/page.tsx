"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { lessons, getDrawingStorageKey } from "@/data/learn-to-draw";

type SavedDrawings = Record<string, string>;

export default function LearnToDrawGalleryPage() {
  const [savedDrawings, setSavedDrawings] = useState<SavedDrawings>({});

  useEffect(() => {
    const next: SavedDrawings = {};

    for (const lesson of lessons) {
      const saved = localStorage.getItem(getDrawingStorageKey(lesson.id));
      if (saved) {
        next[lesson.id] = saved;
      }
    }

    setSavedDrawings(next);
  }, []);

  return (
    <main className="min-h-screen bg-gradient-to-b from-cyan-200 via-sky-200 to-blue-300 p-4 sm:p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="rounded-3xl bg-white/85 p-6 shadow-lg text-center">
          <h1 className="text-4xl sm:text-5xl font-black text-blue-700">Learn to Draw ✏️</h1>
          <p className="mt-2 text-lg text-blue-900/80">
            Pick an animal and follow the steps. Save your masterpiece for the gallery.
          </p>
        </header>

        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {lessons.map((lesson) => {
            const image = savedDrawings[lesson.id] ?? lesson.preview;
            const isSaved = Boolean(savedDrawings[lesson.id]);

            return (
              <Link
                key={lesson.id}
                href={`/learn-to-draw/${lesson.id}`}
                className="group rounded-3xl bg-white/90 shadow-lg overflow-hidden border-2 border-white active:scale-[0.98] transition-transform"
              >
                <div className="aspect-[4/3] bg-white">
                  <Image
                    src={image}
                    alt={isSaved ? `${lesson.name} drawing saved by you` : `${lesson.name} drawing preview`}
                    width={800}
                    height={600}
                    unoptimized
                    className="h-full w-full object-contain bg-white"
                  />
                </div>
                <div className="p-4 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="text-2xl font-extrabold text-blue-700">{lesson.name}</h2>
                    {isSaved && (
                      <span className="rounded-full bg-green-100 px-3 py-1 text-sm font-bold text-green-700">
                        Saved 🎉
                      </span>
                    )}
                  </div>
                  <p className="text-blue-900/80 text-base">{lesson.steps} easy steps</p>
                </div>
              </Link>
            );
          })}
        </section>
      </div>
    </main>
  );
}
