"use client";

import confetti from "canvas-confetti";
import { useCallback, useEffect, useMemo, useState } from "react";

type Animal = {
  id: string;
  name: string;
  emoji: string;
};

type DragState = {
  id: string;
  x: number;
  y: number;
  offsetX: number;
  offsetY: number;
  pointerId: number;
};

const ROUND_SIZE = 12;

const ANIMALS: Animal[] = [
  { id: "alligator", name: "Alligator", emoji: "🐊" },
  { id: "bear", name: "Bear", emoji: "🐻" },
  { id: "bee", name: "Bee", emoji: "🐝" },
  { id: "butterfly", name: "Butterfly", emoji: "🦋" },
  { id: "cat", name: "Cat", emoji: "🐱" },
  { id: "crab", name: "Crab", emoji: "🦀" },
  { id: "deer", name: "Deer", emoji: "🦌" },
  { id: "dog", name: "Dog", emoji: "🐶" },
  { id: "dolphin", name: "Dolphin", emoji: "🐬" },
  { id: "duck", name: "Duck", emoji: "🦆" },
  { id: "eagle", name: "Eagle", emoji: "🦅" },
  { id: "elephant", name: "Elephant", emoji: "🐘" },
  { id: "fox", name: "Fox", emoji: "🦊" },
  { id: "frog", name: "Frog", emoji: "🐸" },
  { id: "goat", name: "Goat", emoji: "🐐" },
  { id: "horse", name: "Horse", emoji: "🐴" },
  { id: "koala", name: "Koala", emoji: "🐨" },
  { id: "lion", name: "Lion", emoji: "🦁" },
  { id: "monkey", name: "Monkey", emoji: "🐵" },
  { id: "owl", name: "Owl", emoji: "🦉" },
  { id: "octopus", name: "Octopus", emoji: "🐙" },
  { id: "panda", name: "Panda", emoji: "🐼" },
  { id: "rabbit", name: "Rabbit", emoji: "🐰" },
  { id: "shark", name: "Shark", emoji: "🦈" },
  { id: "tiger", name: "Tiger", emoji: "🐯" },
  { id: "turtle", name: "Turtle", emoji: "🐢" },
  { id: "unicorn", name: "Unicorn", emoji: "🦄" },
  { id: "whale", name: "Whale", emoji: "🐋" },
  { id: "zebra", name: "Zebra", emoji: "🦓" },
];

let audioCtx: AudioContext | null = null;

function playSound(kind: "correct" | "wrong" | "win") {
  if (typeof window === "undefined") return;

  if (!audioCtx) {
    audioCtx = new AudioContext();
  }

  const ctx = audioCtx;
  const now = ctx.currentTime;

  const makeNote = (freq: number, start: number, duration: number, type: OscillatorType = "sine") => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.2, start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(start);
    osc.stop(start + duration);
  };

  if (kind === "correct") {
    makeNote(523, now, 0.12, "triangle");
    makeNote(659, now + 0.09, 0.12, "triangle");
  } else if (kind === "wrong") {
    makeNote(180, now, 0.18, "sawtooth");
  } else {
    makeNote(523, now, 0.14, "triangle");
    makeNote(659, now + 0.1, 0.14, "triangle");
    makeNote(784, now + 0.2, 0.16, "triangle");
    makeNote(1046, now + 0.32, 0.2, "triangle");
  }
}

function firstLetter(name: string) {
  return name.slice(0, 1).toUpperCase();
}

function secondLetter(name: string) {
  return (name.slice(1, 2) || name.slice(0, 1)).toUpperCase();
}

function shuffle<T>(items: T[]) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export default function AnimalSortPage() {
  const [roundAnimals, setRoundAnimals] = useState<Animal[]>([]);
  const [firstSorted, setFirstSorted] = useState<Set<string>>(new Set());
  const [secondSorted, setSecondSorted] = useState<Set<string>>(new Set());
  const [drillLetter, setDrillLetter] = useState<string | null>(null);
  const [dragging, setDragging] = useState<DragState | null>(null);
  const [hoverBucket, setHoverBucket] = useState<string | null>(null);
  const [selectedAnimalId, setSelectedAnimalId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string>("Drag an animal into the right letter bucket");
  const [sparkleBucket, setSparkleBucket] = useState<string | null>(null);

  const startNewRound = useCallback(() => {
    setRoundAnimals(shuffle(ANIMALS).slice(0, ROUND_SIZE));
    setFirstSorted(new Set());
    setSecondSorted(new Set());
    setDrillLetter(null);
    setSelectedAnimalId(null);
    setDragging(null);
    setHoverBucket(null);
    setSparkleBucket(null);
    setFeedback("Drag an animal into the right letter bucket");
  }, []);

  useEffect(() => {
    startNewRound();
  }, [startNewRound]);

  const sortedByFirst = firstSorted.size;
  const firstComplete = roundAnimals.length > 0 && sortedByFirst === roundAnimals.length;

  const unsortedFirstAnimals = useMemo(
    () => roundAnimals.filter((animal) => !firstSorted.has(animal.id)),
    [roundAnimals, firstSorted]
  );

  const firstBuckets = useMemo(() => {
    return Array.from(new Set(roundAnimals.map((animal) => firstLetter(animal.name)))).sort();
  }, [roundAnimals]);

  const sortedInDrillLetter = useMemo(() => {
    if (!drillLetter) return [];
    return roundAnimals
      .filter((animal) => firstSorted.has(animal.id) && firstLetter(animal.name) === drillLetter)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [drillLetter, firstSorted, roundAnimals]);

  const drillRemaining = useMemo(
    () => sortedInDrillLetter.filter((animal) => !secondSorted.has(animal.id)),
    [sortedInDrillLetter, secondSorted]
  );

  const drillBuckets = useMemo(() => {
    if (!drillLetter) return [];
    return Array.from(new Set(sortedInDrillLetter.map((animal) => secondLetter(animal.name)))).sort();
  }, [drillLetter, sortedInDrillLetter]);

  const visibleAnimals = drillLetter ? drillRemaining : unsortedFirstAnimals;
  const activeBuckets = drillLetter ? drillBuckets : firstBuckets;

  const checkDrop = useCallback(
    (animalId: string, bucket: string | null) => {
      const animal = roundAnimals.find((item) => item.id === animalId);
      if (!animal || !bucket) {
        setSelectedAnimalId(null);
        return;
      }

      const expected = drillLetter ? secondLetter(animal.name) : firstLetter(animal.name);
      const correct = expected === bucket;

      if (correct) {
        playSound("correct");
        setSparkleBucket(bucket);
        setTimeout(() => setSparkleBucket(null), 300);

        if (drillLetter) {
          setSecondSorted((prev) => {
            const next = new Set(prev);
            next.add(animal.id);
            return next;
          });
          setFeedback(`Nice! ${animal.name} goes in ${bucket}.`);
        } else {
          setFirstSorted((prev) => {
            const next = new Set(prev);
            next.add(animal.id);
            return next;
          });
          setFeedback(`Great! ${animal.name} starts with ${bucket}.`);
        }
      } else {
        playSound("wrong");
        setFeedback(`Oops! ${animal.name} starts with ${expected}. Try again.`);
      }

      setSelectedAnimalId(null);
    },
    [drillLetter, roundAnimals]
  );

  useEffect(() => {
    if (!dragging) return;

    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerId !== dragging.pointerId) return;

      setDragging((current) =>
        current
          ? {
              ...current,
              x: event.clientX,
              y: event.clientY,
            }
          : current
      );

      const element = document.elementFromPoint(event.clientX, event.clientY) as HTMLElement | null;
      const bucketEl = element?.closest("[data-bucket]") as HTMLElement | null;
      setHoverBucket(bucketEl?.dataset.bucket ?? null);
    };

    const onPointerFinish = (event: PointerEvent) => {
      if (event.pointerId !== dragging.pointerId) return;
      const element = document.elementFromPoint(event.clientX, event.clientY) as HTMLElement | null;
      const bucketEl = element?.closest("[data-bucket]") as HTMLElement | null;
      checkDrop(dragging.id, bucketEl?.dataset.bucket ?? null);
      setDragging(null);
      setHoverBucket(null);
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerFinish);
    window.addEventListener("pointercancel", onPointerFinish);

    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerFinish);
      window.removeEventListener("pointercancel", onPointerFinish);
    };
  }, [checkDrop, dragging]);

  useEffect(() => {
    if (!firstComplete) return;
    playSound("win");
    confetti({ particleCount: 130, spread: 85, origin: { y: 0.65 } });
  }, [firstComplete]);

  useEffect(() => {
    if (!drillLetter) return;
    if (drillRemaining.length > 0) return;

    setFeedback(`Awesome! You sorted ${drillLetter} animals by second letter.`);
    confetti({ particleCount: 70, spread: 65, origin: { y: 0.7 } });
    setTimeout(() => {
      setDrillLetter(null);
    }, 900);
  }, [drillLetter, drillRemaining.length]);

  return (
    <main className="min-h-screen bg-gradient-to-b from-amber-100 via-sky-100 to-indigo-100 p-4 pb-8">
      <div className="mx-auto max-w-4xl space-y-4">
        <header className="rounded-3xl bg-white/85 p-4 shadow-lg">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h1 className="text-3xl font-extrabold text-slate-800">🐾 Animal Letter Sorting</h1>
              <p className="text-sm text-slate-600">
                {drillLetter
                  ? `Bonus round, ${drillLetter} animals by second letter!`
                  : "Match each animal to the first letter of its name."}
              </p>
            </div>
            <button
              type="button"
              onClick={startNewRound}
              className="rounded-2xl bg-violet-500 px-4 py-3 text-sm font-bold text-white shadow active:scale-95"
            >
              New Game
            </button>
          </div>

          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between text-sm font-semibold text-slate-700">
              <span>Progress</span>
              <span>
                {sortedByFirst}/{roundAnimals.length}
              </span>
            </div>
            <div className="h-4 overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full rounded-full bg-gradient-to-r from-green-400 to-emerald-500 transition-all duration-500"
                style={{ width: `${roundAnimals.length ? (sortedByFirst / roundAnimals.length) * 100 : 0}%` }}
              />
            </div>
          </div>

          <p className="mt-3 rounded-xl bg-amber-100 px-3 py-2 text-sm font-semibold text-amber-900">{feedback}</p>

          {firstComplete && (
            <div className="mt-4 rounded-2xl bg-green-100 p-3 text-green-900">
              <p className="text-lg font-extrabold">🎉 You sorted all {roundAnimals.length} animals!</p>
              <p className="text-sm">Tap a first-letter bucket below to play a second-letter bonus round.</p>
            </div>
          )}
        </header>

        <section className="rounded-3xl bg-white/80 p-4 shadow-lg">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-700">Animals</h2>
            {selectedAnimalId && (
              <button
                type="button"
                onClick={() => setSelectedAnimalId(null)}
                className="rounded-xl bg-slate-200 px-3 py-1 text-xs font-bold text-slate-700"
              >
                Clear selection
              </button>
            )}
          </div>

          {visibleAnimals.length === 0 ? (
            <div className="rounded-2xl bg-slate-100 p-6 text-center text-slate-600">
              {drillLetter ? "This bonus round is complete!" : "All animals sorted. Great work!"}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {visibleAnimals.map((animal) => {
                const isDragging = dragging?.id === animal.id;
                const isSelected = selectedAnimalId === animal.id;

                return (
                  <button
                    key={animal.id}
                    type="button"
                    onClick={() => {
                      if (dragging) return;
                      setSelectedAnimalId((current) => (current === animal.id ? null : animal.id));
                    }}
                    onPointerDown={(event) => {
                      if (event.button !== 0) return;
                      const target = event.currentTarget.getBoundingClientRect();
                      setSelectedAnimalId(null);
                      setDragging({
                        id: animal.id,
                        x: event.clientX,
                        y: event.clientY,
                        offsetX: event.clientX - target.left,
                        offsetY: event.clientY - target.top,
                        pointerId: event.pointerId,
                      });
                    }}
                    className={`relative rounded-2xl border-2 bg-white p-3 text-center shadow transition-all active:scale-95 ${
                      isSelected ? "border-violet-500 ring-2 ring-violet-300" : "border-slate-200"
                    } ${isDragging ? "opacity-25" : "opacity-100"}`}
                    style={{ touchAction: "none" }}
                    aria-label={`Drag ${animal.name}`}
                  >
                    <div className="text-4xl">{animal.emoji}</div>
                    <div className="mt-1 text-base font-bold text-slate-800">{animal.name}</div>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        <section className="rounded-3xl bg-white/80 p-4 shadow-lg">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-700">Letter Buckets</h2>
            {drillLetter && (
              <button
                type="button"
                onClick={() => setDrillLetter(null)}
                className="rounded-xl bg-slate-200 px-3 py-1 text-xs font-bold text-slate-700"
              >
                Exit bonus round
              </button>
            )}
          </div>

          <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-8">
            {activeBuckets.map((bucket) => {
              const sortedCount = roundAnimals.filter(
                (animal) => firstSorted.has(animal.id) && firstLetter(animal.name) === bucket
              ).length;

              const canDrill = !drillLetter && sortedCount >= 2;
              const isHighlighted = hoverBucket === bucket || sparkleBucket === bucket;

              return (
                <button
                  key={bucket}
                  type="button"
                  data-bucket={bucket}
                  onClick={() => {
                    if (selectedAnimalId) {
                      checkDrop(selectedAnimalId, bucket);
                      return;
                    }
                    if (canDrill) {
                      setDrillLetter(bucket);
                      setFeedback(`Now sort ${bucket} animals by their second letter!`);
                    }
                  }}
                  className={`rounded-2xl border-2 px-1 py-3 text-center transition-all ${
                    isHighlighted
                      ? "scale-105 border-emerald-400 bg-emerald-100"
                      : "border-slate-200 bg-slate-50"
                  } ${selectedAnimalId ? "ring-2 ring-violet-300" : ""}`}
                >
                  <div className="text-2xl font-black text-slate-800">{bucket}</div>
                  {!drillLetter && sortedCount > 0 && (
                    <div className="text-[10px] font-semibold text-slate-500">{sortedCount} sorted</div>
                  )}
                  {canDrill && (
                    <div className="mt-1 text-[10px] font-bold text-violet-600">Tap for 2nd letter</div>
                  )}
                </button>
              );
            })}
          </div>
        </section>
      </div>

      {dragging && (
        <div
          className="pointer-events-none fixed z-50 rounded-2xl border-2 border-violet-300 bg-white px-4 py-3 text-center shadow-2xl"
          style={{
            left: dragging.x - dragging.offsetX,
            top: dragging.y - dragging.offsetY,
            width: 120,
          }}
        >
          {(() => {
            const animal = roundAnimals.find((item) => item.id === dragging.id);
            if (!animal) return null;
            return (
              <>
                <div className="text-4xl">{animal.emoji}</div>
                <div className="text-sm font-bold text-slate-800">{animal.name}</div>
              </>
            );
          })()}
        </div>
      )}
    </main>
  );
}
