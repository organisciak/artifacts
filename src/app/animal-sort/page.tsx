"use client";

import confetti from "canvas-confetti";
import { Caveat, Dancing_Script } from "next/font/google";
import { useCallback, useEffect, useMemo, useState } from "react";

type SortItem = {
  id: string;
  name: string;
  emoji: string;
};

type CategoryId = "animals" | "food" | "objects" | "vehicles";

type CategoryConfig = {
  label: string;
  items: SortItem[];
};

type BucketFontStyle = "print" | "handwriting" | "cursive";
type BucketLetterCase = "upper" | "lower";

type DragState = {
  id: string;
  x: number;
  y: number;
  offsetX: number;
  offsetY: number;
  pointerId: number;
};

const caveat = Caveat({ subsets: ["latin"], weight: ["700"] });
const dancingScript = Dancing_Script({ subsets: ["latin"], weight: ["700"] });

const CATEGORIES: Record<CategoryId, CategoryConfig> = {
  animals: {
    label: "Animals",
    items: [
      { id: "lion", name: "Lion", emoji: "🦁" },
      { id: "elephant", name: "Elephant", emoji: "🐘" },
      { id: "cat", name: "Cat", emoji: "🐱" },
      { id: "dog", name: "Dog", emoji: "🐶" },
      { id: "zebra", name: "Zebra", emoji: "🦓" },
      { id: "bear", name: "Bear", emoji: "🐻" },
      { id: "frog", name: "Frog", emoji: "🐸" },
      { id: "monkey", name: "Monkey", emoji: "🐵" },
      { id: "owl", name: "Owl", emoji: "🦉" },
      { id: "turtle", name: "Turtle", emoji: "🐢" },
      { id: "fox", name: "Fox", emoji: "🦊" },
      { id: "dolphin", name: "Dolphin", emoji: "🐬" },
      { id: "rabbit", name: "Rabbit", emoji: "🐰" },
      { id: "whale", name: "Whale", emoji: "🐋" },
    ],
  },
  food: {
    label: "Food",
    items: [
      { id: "apple", name: "Apple", emoji: "🍎" },
      { id: "banana", name: "Banana", emoji: "🍌" },
      { id: "pizza", name: "Pizza", emoji: "🍕" },
      { id: "burger", name: "Burger", emoji: "🍔" },
      { id: "carrot", name: "Carrot", emoji: "🥕" },
      { id: "grapes", name: "Grapes", emoji: "🍇" },
      { id: "pear", name: "Pear", emoji: "🍐" },
      { id: "strawberry", name: "Strawberry", emoji: "🍓" },
      { id: "taco", name: "Taco", emoji: "🌮" },
      { id: "watermelon", name: "Watermelon", emoji: "🍉" },
    ],
  },
  objects: {
    label: "Objects",
    items: [
      { id: "ball", name: "Ball", emoji: "⚽" },
      { id: "book", name: "Book", emoji: "📘" },
      { id: "clock", name: "Clock", emoji: "🕒" },
      { id: "drum", name: "Drum", emoji: "🥁" },
      { id: "gift", name: "Gift", emoji: "🎁" },
      { id: "key", name: "Key", emoji: "🔑" },
      { id: "lamp", name: "Lamp", emoji: "💡" },
      { id: "phone", name: "Phone", emoji: "📱" },
      { id: "umbrella", name: "Umbrella", emoji: "☂️" },
    ],
  },
  vehicles: {
    label: "Vehicles",
    items: [
      { id: "airplane", name: "Airplane", emoji: "✈️" },
      { id: "bicycle", name: "Bicycle", emoji: "🚲" },
      { id: "boat", name: "Boat", emoji: "🚤" },
      { id: "bus", name: "Bus", emoji: "🚌" },
      { id: "car", name: "Car", emoji: "🚗" },
      { id: "helicopter", name: "Helicopter", emoji: "🚁" },
      { id: "rocket", name: "Rocket", emoji: "🚀" },
      { id: "train", name: "Train", emoji: "🚆" },
    ],
  },
};

const STORAGE_KEYS = {
  fontStyle: "animal-sort-font-style",
  letterCase: "animal-sort-letter-case",
  category: "animal-sort-category",
};

let audioCtx: AudioContext | null = null;

function playSound(kind: "correct" | "wrong" | "win") {
  if (typeof window === "undefined") return;

  if (!audioCtx) {
    audioCtx = new AudioContext();
  }

  // iOS/iPadOS requires resuming AudioContext from a user gesture
  if (audioCtx.state === "suspended") {
    audioCtx.resume();
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

function displayBucketLetter(letter: string, letterCase: BucketLetterCase) {
  return letterCase === "lower" ? letter.toLowerCase() : letter.toUpperCase();
}

function labelVisible(attemptsByItem: Record<string, number>, itemId: string) {
  return (attemptsByItem[itemId] ?? 0) >= 2;
}

function introText(categoryLabel: string) {
  return `Drag a ${categoryLabel.slice(0, -1).toLowerCase()} into the right letter bucket`;
}

export default function AnimalSortPage() {
  const [categoryId, setCategoryId] = useState<CategoryId>("animals");
  const [showSettings, setShowSettings] = useState(false);
  const [bucketFontStyle, setBucketFontStyle] = useState<BucketFontStyle>("print");
  const [bucketLetterCase, setBucketLetterCase] = useState<BucketLetterCase>("lower");

  const [roundItems, setRoundItems] = useState<SortItem[]>([]);
  const [firstSorted, setFirstSorted] = useState<Set<string>>(new Set());
  const [secondSorted, setSecondSorted] = useState<Set<string>>(new Set());
  const [wrongAttemptsByItem, setWrongAttemptsByItem] = useState<Record<string, number>>({});
  const [drillLetter, setDrillLetter] = useState<string | null>(null);
  const [dragging, setDragging] = useState<DragState | null>(null);
  const [hoverBucket, setHoverBucket] = useState<string | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string>(introText(CATEGORIES.animals.label));
  const [sparkleBucket, setSparkleBucket] = useState<string | null>(null);

  const activeCategory = CATEGORIES[categoryId];

  useEffect(() => {
    if (typeof window === "undefined") return;

    const savedStyle = window.localStorage.getItem(STORAGE_KEYS.fontStyle);
    const savedCase = window.localStorage.getItem(STORAGE_KEYS.letterCase);
    const savedCategory = window.localStorage.getItem(STORAGE_KEYS.category);

    if (savedStyle === "print" || savedStyle === "handwriting" || savedStyle === "cursive") {
      setBucketFontStyle(savedStyle);
    }

    if (savedCase === "upper" || savedCase === "lower") {
      setBucketLetterCase(savedCase);
    }

    if (savedCategory && savedCategory in CATEGORIES) {
      setCategoryId(savedCategory as CategoryId);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEYS.fontStyle, bucketFontStyle);
  }, [bucketFontStyle]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEYS.letterCase, bucketLetterCase);
  }, [bucketLetterCase]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEYS.category, categoryId);
  }, [categoryId]);

  const startNewRound = useCallback(() => {
    setRoundItems(shuffle(activeCategory.items));
    setFirstSorted(new Set());
    setSecondSorted(new Set());
    setWrongAttemptsByItem({});
    setDrillLetter(null);
    setSelectedItemId(null);
    setDragging(null);
    setHoverBucket(null);
    setSparkleBucket(null);
    setFeedback(introText(activeCategory.label));
  }, [activeCategory.items, activeCategory.label]);

  useEffect(() => {
    startNewRound();
  }, [startNewRound]);

  const sortedByFirst = firstSorted.size;
  const firstComplete = roundItems.length > 0 && sortedByFirst === roundItems.length;

  const unsortedFirstItems = useMemo(
    () => roundItems.filter((item) => !firstSorted.has(item.id)),
    [roundItems, firstSorted]
  );

  const firstBuckets = useMemo(() => {
    return Array.from(new Set(roundItems.map((item) => firstLetter(item.name)))).sort();
  }, [roundItems]);

  const sortedInDrillLetter = useMemo(() => {
    if (!drillLetter) return [];
    return roundItems
      .filter((item) => firstSorted.has(item.id) && firstLetter(item.name) === drillLetter)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [drillLetter, firstSorted, roundItems]);

  const drillRemaining = useMemo(
    () => sortedInDrillLetter.filter((item) => !secondSorted.has(item.id)),
    [sortedInDrillLetter, secondSorted]
  );

  const drillBuckets = useMemo(() => {
    if (!drillLetter) return [];
    return Array.from(new Set(sortedInDrillLetter.map((item) => secondLetter(item.name)))).sort();
  }, [drillLetter, sortedInDrillLetter]);

  const visibleItems = drillLetter ? drillRemaining : unsortedFirstItems;
  const activeBuckets = drillLetter ? drillBuckets : firstBuckets;

  const checkDrop = useCallback(
    (itemId: string, bucket: string | null) => {
      const item = roundItems.find((entry) => entry.id === itemId);
      if (!item || !bucket) {
        setSelectedItemId(null);
        return;
      }

      const expected = drillLetter ? secondLetter(item.name) : firstLetter(item.name);
      const correct = expected === bucket;

      if (correct) {
        playSound("correct");
        setSparkleBucket(bucket);
        setTimeout(() => setSparkleBucket(null), 300);

        if (drillLetter) {
          setSecondSorted((prev) => {
            const next = new Set(prev);
            next.add(item.id);
            return next;
          });
          setFeedback(`Nice! ${item.name} goes in ${bucket}.`);
        } else {
          setFirstSorted((prev) => {
            const next = new Set(prev);
            next.add(item.id);
            return next;
          });
          setFeedback(`Great! ${item.name} starts with ${bucket}.`);
        }
      } else {
        playSound("wrong");
        setWrongAttemptsByItem((prev) => ({
          ...prev,
          [item.id]: (prev[item.id] ?? 0) + 1,
        }));
        setFeedback(`Oops! ${item.name} starts with ${expected}. Try again.`);
      }

      setSelectedItemId(null);
    },
    [drillLetter, roundItems]
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

    setFeedback(`Awesome! You sorted ${drillLetter} ${activeCategory.label.toLowerCase()} by second letter.`);
    confetti({ particleCount: 70, spread: 65, origin: { y: 0.7 } });
    setTimeout(() => {
      setDrillLetter(null);
    }, 900);
  }, [activeCategory.label, drillLetter, drillRemaining.length]);

  const bucketLetterClass =
    bucketFontStyle === "cursive"
      ? `${dancingScript.className} text-3xl font-bold tracking-wide text-slate-800`
      : bucketFontStyle === "handwriting"
        ? `${caveat.className} text-3xl font-bold tracking-wide text-slate-800`
        : "text-2xl font-black text-slate-800";

  return (
    <main className="min-h-screen bg-gradient-to-b from-amber-100 via-sky-100 to-indigo-100 p-4 pb-8">
      <div className="mx-auto max-w-4xl space-y-4">
        <header className="rounded-3xl bg-white/85 p-4 shadow-lg">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h1 className="text-3xl font-extrabold text-slate-800">🧺 Emoji Letter Sorting</h1>
              <p className="text-sm text-slate-600">
                {drillLetter
                  ? `Bonus round, ${drillLetter} ${activeCategory.label.toLowerCase()} by second letter!`
                  : `Match each ${activeCategory.label.slice(0, -1).toLowerCase()} to the first letter of its name.`}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowSettings((current) => !current)}
                className="rounded-2xl bg-slate-200 px-3 py-3 text-sm font-bold text-slate-700 shadow active:scale-95"
                aria-expanded={showSettings}
              >
                ⚙️
              </button>
              <button
                type="button"
                onClick={startNewRound}
                className="rounded-2xl bg-violet-500 px-4 py-3 text-sm font-bold text-white shadow active:scale-95"
              >
                New Game
              </button>
            </div>
          </div>

          {showSettings && (
            <div className="mt-4 rounded-2xl bg-slate-100 p-3">
              <div className="grid gap-3 sm:grid-cols-3">
                <label className="flex flex-col gap-1 text-sm font-semibold text-slate-700">
                  Category
                  <select
                    value={categoryId}
                    onChange={(event) => setCategoryId(event.target.value as CategoryId)}
                    className="rounded-xl border border-slate-300 bg-white px-2 py-2"
                  >
                    {(Object.keys(CATEGORIES) as CategoryId[]).map((id) => (
                      <option key={id} value={id}>
                        {CATEGORIES[id].label} ({CATEGORIES[id].items.length})
                      </option>
                    ))}
                  </select>
                </label>

                <label className="flex flex-col gap-1 text-sm font-semibold text-slate-700">
                  Bucket font
                  <select
                    value={bucketFontStyle}
                    onChange={(event) => setBucketFontStyle(event.target.value as BucketFontStyle)}
                    className="rounded-xl border border-slate-300 bg-white px-2 py-2"
                  >
                    <option value="print">Print</option>
                    <option value="handwriting">Handwriting</option>
                    <option value="cursive">Cursive</option>
                  </select>
                </label>

                <label className="flex flex-col gap-1 text-sm font-semibold text-slate-700">
                  Letter case
                  <select
                    value={bucketLetterCase}
                    onChange={(event) => setBucketLetterCase(event.target.value as BucketLetterCase)}
                    className="rounded-xl border border-slate-300 bg-white px-2 py-2"
                  >
                    <option value="upper">Uppercase</option>
                    <option value="lower">Lowercase</option>
                  </select>
                </label>
              </div>
            </div>
          )}

          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between text-sm font-semibold text-slate-700">
              <span>Progress</span>
              <span>
                {sortedByFirst}/{roundItems.length}
              </span>
            </div>
            <div className="h-4 overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full rounded-full bg-gradient-to-r from-green-400 to-emerald-500 transition-all duration-500"
                style={{ width: `${roundItems.length ? (sortedByFirst / roundItems.length) * 100 : 0}%` }}
              />
            </div>
          </div>

          <p className="mt-3 rounded-xl bg-amber-100 px-3 py-2 text-sm font-semibold text-amber-900">{feedback}</p>

          {firstComplete && (
            <div className="mt-4 rounded-2xl bg-green-100 p-3 text-green-900">
              <p className="text-lg font-extrabold">🎉 You sorted all {roundItems.length} {activeCategory.label.toLowerCase()}!</p>
              <p className="text-sm">Tap a first-letter bucket below to play a second-letter bonus round.</p>
            </div>
          )}
        </header>

        <section className="rounded-3xl bg-white/80 p-4 shadow-lg">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-700">{activeCategory.label}</h2>
            {selectedItemId && (
              <button
                type="button"
                onClick={() => setSelectedItemId(null)}
                className="rounded-xl bg-slate-200 px-3 py-1 text-xs font-bold text-slate-700"
              >
                Clear selection
              </button>
            )}
          </div>

          {visibleItems.length === 0 ? (
            <div className="rounded-2xl bg-slate-100 p-6 text-center text-slate-600">
              {drillLetter ? "This bonus round is complete!" : `All ${activeCategory.label.toLowerCase()} sorted. Great work!`}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {visibleItems.map((item) => {
                const isDragging = dragging?.id === item.id;
                const isSelected = selectedItemId === item.id;
                const showLabel = labelVisible(wrongAttemptsByItem, item.id);

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      if (dragging) return;
                      setSelectedItemId((current) => (current === item.id ? null : item.id));
                    }}
                    onPointerDown={(event) => {
                      if (event.button !== 0) return;
                      const target = event.currentTarget.getBoundingClientRect();
                      setSelectedItemId(null);
                      setDragging({
                        id: item.id,
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
                    aria-label={`Drag ${item.name}`}
                  >
                    <div className="text-4xl">{item.emoji}</div>
                    {showLabel && (
                      <div className="mt-1 text-base font-bold text-slate-800">{item.name}</div>
                    )}
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
              const sortedByBucket = drillLetter
                ? sortedInDrillLetter.filter((item) => secondSorted.has(item.id) && secondLetter(item.name) === bucket)
                : roundItems.filter((item) => firstSorted.has(item.id) && firstLetter(item.name) === bucket);

              const canDrill = !drillLetter && sortedByBucket.length >= 2;
              const isHighlighted = hoverBucket === bucket || sparkleBucket === bucket;

              return (
                <button
                  key={bucket}
                  type="button"
                  data-bucket={bucket}
                  onClick={() => {
                    if (selectedItemId) {
                      checkDrop(selectedItemId, bucket);
                      return;
                    }
                    if (canDrill) {
                      setDrillLetter(bucket);
                      setFeedback(`Now sort ${bucket} ${activeCategory.label.toLowerCase()} by their second letter!`);
                    }
                  }}
                  className={`rounded-2xl border-2 px-1 py-3 text-center transition-all ${
                    isHighlighted
                      ? "scale-105 border-emerald-400 bg-emerald-100"
                      : "border-slate-200 bg-slate-50"
                  } ${selectedItemId ? "ring-2 ring-violet-300" : ""}`}
                >
                  <div className={bucketLetterClass}>{displayBucketLetter(bucket, bucketLetterCase)}</div>

                  <div className="mt-2 flex min-h-5 flex-wrap justify-center gap-1">
                    {sortedByBucket.slice(0, 8).map((item) => (
                      <span key={item.id} className="text-lg leading-none">
                        {item.emoji}
                      </span>
                    ))}
                  </div>

                  {sortedByBucket.length > 8 && (
                    <div className="text-[10px] font-semibold text-slate-500">+{sortedByBucket.length - 8}</div>
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
            left: dragging.x - dragging.offsetX - 60,
            top: dragging.y - dragging.offsetY - 60,
            width: 120,
          }}
        >
          {(() => {
            const item = roundItems.find((entry) => entry.id === dragging.id);
            if (!item) return null;
            const showLabel = labelVisible(wrongAttemptsByItem, item.id);

            return (
              <>
                <div className="text-4xl">{item.emoji}</div>
                {showLabel && <div className="text-sm font-bold text-slate-800">{item.name}</div>}
              </>
            );
          })()}
        </div>
      )}
    </main>
  );
}
