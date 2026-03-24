"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import confetti from "canvas-confetti";
import { allWords, getConfusables, shuffleArray, WordEntry } from "@/data/sight-words";
import { KidsNav, useKidsFont } from "@/components/ui/kids-nav";

type Phase = "menu" | "show" | "draw" | "check" | "result" | "win";

type ResultState = {
  kind: "correct" | "wrong";
  message: string;
};

const ROUND_GOAL = 5;
const LOOK_MS = 3500;

const ALPHABET = "abcdefghijklmnopqrstuvwxyz".split("");

function playSound(type: "correct" | "wrong") {
  const ctx = new AudioContext();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);

  if (type === "correct") {
    osc.type = "sine";
    osc.frequency.setValueAtTime(523, ctx.currentTime);
    osc.frequency.setValueAtTime(659, ctx.currentTime + 0.08);
    osc.frequency.setValueAtTime(784, ctx.currentTime + 0.16);
    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
    osc.start();
    osc.stop(ctx.currentTime + 0.35);
    return;
  }

  osc.type = "triangle";
  osc.frequency.setValueAtTime(210, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.22);
  gain.gain.setValueAtTime(0.22, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
  osc.start();
  osc.stop(ctx.currentTime + 0.3);
}

function speakWord(word: string) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    return;
  }

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(word);
  utterance.rate = 0.8;
  utterance.pitch = 1.05;
  utterance.lang = "en-US";
  window.speechSynthesis.speak(utterance);
}

function getLetterChoices(word: string, confusables: string[]) {
  const needed = word.toLowerCase().split("");
  const confusableLetters = confusables.join("").toLowerCase().split("");
  
  // ALWAYS include all needed letters first (this was the bug - they could get cut off)
  const result: string[] = [...needed];
  
  // Add distractor letters from confusables + random alphabet letters
  const distractors = shuffleArray([...confusableLetters, ...ALPHABET]);
  
  for (const letter of distractors) {
    // Add if we don't already have it (or need duplicates)
    const currentCount = result.filter((x) => x === letter).length;
    const neededCount = needed.filter((x) => x === letter).length;
    if (currentCount < Math.max(neededCount, 1) || (!result.includes(letter) && result.length < 12)) {
      if (result.length < 12) {
        result.push(letter);
      }
    }
    if (result.length >= 12) break;
  }

  return shuffleArray(result);
}

export default function SpellingPracticePage() {
  const { fontClass } = useKidsFont();
  const [phase, setPhase] = useState<Phase>("menu");
  const [audioOn, setAudioOn] = useState(true);
  const [roundWords, setRoundWords] = useState<WordEntry[]>([]);
  const [roundIndex, setRoundIndex] = useState(0);
  const [showStartTime, setShowStartTime] = useState<number>(Date.now());
  const [typedAnswer, setTypedAnswer] = useState<string>("");
  const [result, setResult] = useState<ResultState | null>(null);
  const [hasInk, setHasInk] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const drawingRef = useRef(false);
  const pointerIdRef = useRef<number | null>(null);

  const currentWord = roundWords[roundIndex] ?? null;
  const progress = roundWords.length ? roundIndex / roundWords.length : 0;

  const confusables = useMemo(() => {
    if (!currentWord) return [];
    return getConfusables(currentWord, 3);
  }, [currentWord]);

  const letterChoices = useMemo(() => {
    if (!currentWord) return [];
    return getLetterChoices(currentWord.word, confusables);
  }, [currentWord, confusables]);

  const setupCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const wrapper = wrapperRef.current;
    if (!canvas || !wrapper) return;

    const dpr = window.devicePixelRatio || 1;
    const width = wrapper.clientWidth;
    const height = Math.max(220, Math.min(340, Math.floor(window.innerHeight * 0.35)));

    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = 11;
    ctx.strokeStyle = "#1d4ed8";
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
  }, []);

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = canvas.width / dpr;
    const height = canvas.height / dpr;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    setHasInk(false);
  }, []);

  const getCanvasPoint = useCallback((e: PointerEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return null;
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }, []);

  const startRound = useCallback((index: number) => {
    setRoundIndex(index);
    setTypedAnswer("");
    setResult(null);
    setHasInk(false);
    setPhase("show");
    setShowStartTime(Date.now());
  }, []);

  const startGame = useCallback(() => {
    const words = shuffleArray(allWords).slice(0, ROUND_GOAL);
    setRoundWords(words);
    startRound(0);
  }, [startRound]);

  useEffect(() => {
    if (phase !== "draw") return;
    setupCanvas();
    clearCanvas();
    const onResize = () => setupCanvas();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [phase, setupCanvas, clearCanvas]);

  useEffect(() => {
    if (phase !== "show" || !currentWord) return;

    if (audioOn) {
      speakWord(currentWord.word);
    }

    const timer = window.setTimeout(() => {
      setPhase("draw");
    }, LOOK_MS);

    return () => window.clearTimeout(timer);
  }, [phase, currentWord, audioOn]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || phase !== "draw") return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const onPointerDown = (e: PointerEvent) => {
      drawingRef.current = true;
      pointerIdRef.current = e.pointerId;
      canvas.setPointerCapture(e.pointerId);
      const p = getCanvasPoint(e);
      if (!p) return;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!drawingRef.current || pointerIdRef.current !== e.pointerId) return;
      const p = getCanvasPoint(e);
      if (!p) return;
      setHasInk(true);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
    };

    const onPointerEnd = (e: PointerEvent) => {
      if (pointerIdRef.current !== e.pointerId) return;
      drawingRef.current = false;
      pointerIdRef.current = null;
      ctx.closePath();
      if (canvas.hasPointerCapture(e.pointerId)) {
        canvas.releasePointerCapture(e.pointerId);
      }
    };

    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerup", onPointerEnd);
    canvas.addEventListener("pointercancel", onPointerEnd);

    return () => {
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerEnd);
      canvas.removeEventListener("pointercancel", onPointerEnd);
    };
  }, [phase, getCanvasPoint]);

  const handleCheck = useCallback(() => {
    if (!currentWord) return;

    if (!hasInk) {
      setResult({ kind: "wrong", message: "Oops, draw your word first ✍️" });
      setPhase("result");
      playSound("wrong");
      return;
    }

    setTypedAnswer("");
    setResult(null);
    setPhase("check");
  }, [currentWord, hasInk]);

  const evaluateAnswer = useCallback(
    (answer: string) => {
      if (!currentWord) return;

      const normalized = answer.toLowerCase();
      const expected = currentWord.word.toLowerCase();

      if (normalized === expected) {
        playSound("correct");
        setResult({ kind: "correct", message: `Yes! ${currentWord.word} 🎉` });
        setPhase("result");

        confetti({ particleCount: 70, spread: 70, origin: { y: 0.65 } });

        window.setTimeout(() => {
          const nextIndex = roundIndex + 1;
          if (nextIndex >= ROUND_GOAL) {
            setPhase("win");
            confetti({ particleCount: 120, spread: 100, origin: { y: 0.6 } });
          } else {
            startRound(nextIndex);
          }
        }, 1100);
      } else {
        playSound("wrong");
        setResult({ kind: "wrong", message: "Nice try, let’s fix it together 💛" });
        setPhase("result");
      }
    },
    [currentWord, roundIndex, startRound]
  );

  const pushLetter = useCallback(
    (letter: string) => {
      if (!currentWord) return;
      if (typedAnswer.length >= currentWord.word.length) return;

      const next = `${typedAnswer}${letter}`;
      setTypedAnswer(next);

      if (next.length === currentWord.word.length) {
        evaluateAnswer(next);
      }
    },
    [currentWord, typedAnswer, evaluateAnswer]
  );

  const popLetter = useCallback(() => {
    setTypedAnswer((prev) => prev.slice(0, -1));
  }, []);

  if (phase === "menu") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-cyan-300 via-sky-400 to-blue-500 p-4 flex flex-col items-center">
        <KidsNav />
        <div className="flex-1 flex items-center justify-center w-full">
        <div className="w-full max-w-md rounded-3xl bg-white/95 shadow-2xl p-6 text-center space-y-5">
          <h1 className="text-4xl font-black text-blue-700">✍️ Spelling Practice</h1>
          <p className="text-gray-700 text-lg">
            Look, cover, write, check. Win by spelling {ROUND_GOAL} words.
          </p>

          <label className="flex items-center justify-center gap-3 text-lg font-semibold text-gray-700">
            <input
              type="checkbox"
              className="h-5 w-5"
              checked={audioOn}
              onChange={(e) => setAudioOn(e.target.checked)}
            />
            Say each word out loud
          </label>

          <button
            onClick={startGame}
            className="w-full rounded-2xl bg-green-500 text-white text-2xl font-bold py-4 shadow-lg active:scale-95"
          >
            Start ✨
          </button>
        </div>
        </div>
      </div>
    );
  }

  if (!currentWord) {
    return null;
  }

  const revealOpacity = phase === "show" && Date.now() - showStartTime > LOOK_MS * 0.6 ? 0.15 : 1;

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-200 via-blue-300 to-indigo-400 p-3 sm:p-5">
      <KidsNav />
      <div className="max-w-3xl mx-auto">
        <div className="bg-white/90 rounded-2xl p-3 sm:p-4 shadow mb-3">
          <div className="flex items-center justify-between">
            <p className="text-lg sm:text-xl font-bold text-blue-800">
              Word {Math.min(roundIndex + 1, ROUND_GOAL)} of {ROUND_GOAL}
            </p>
            <button
              onClick={() => setPhase("menu")}
              className="rounded-xl bg-white px-3 py-2 text-sm font-semibold text-gray-700 shadow"
            >
              Menu
            </button>
          </div>
          <div className="mt-2 h-3 rounded-full bg-blue-100 overflow-hidden">
            <div
              className="h-full bg-yellow-400 transition-all duration-500"
              style={{ width: `${Math.max(6, progress * 100)}%` }}
            />
          </div>
        </div>

        <div className="rounded-3xl bg-white/95 p-4 sm:p-6 shadow-xl space-y-4">
          <div className="flex flex-col items-center text-center gap-2">
            <Image
              src={`/sight-words/${currentWord.word}.png`}
              alt={currentWord.word}
              width={176}
              height={176}
              className="w-36 h-36 sm:w-44 sm:h-44 object-cover rounded-2xl border-4 border-white shadow"
              unoptimized
            />
            <p className="text-gray-600 text-sm sm:text-base">Write this word from memory</p>
            <p
              className={`text-5xl sm:text-6xl font-black text-blue-700 transition-opacity duration-1000 ${fontClass}`}
              style={{ opacity: phase === "show" ? revealOpacity : 0 }}
            >
              {currentWord.word}
            </p>
            {phase === "show" && (
              <p className="text-orange-600 font-semibold">Look closely... it will hide soon 👀</p>
            )}
          </div>

          {(phase === "draw" || phase === "check" || phase === "result") && (
            <>
              <div ref={wrapperRef} className="rounded-2xl border-4 border-blue-200 overflow-hidden bg-white">
                <canvas ref={canvasRef} className="w-full touch-none" />
              </div>

              {phase === "draw" && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                  <button
                    onClick={clearCanvas}
                    className="rounded-xl bg-slate-100 py-3 text-lg font-bold text-slate-700"
                  >
                    Clear
                  </button>
                  <button
                    onClick={() => speakWord(currentWord.word)}
                    className="rounded-xl bg-purple-100 py-3 text-lg font-bold text-purple-700"
                  >
                    Hear
                  </button>
                  <button
                    onClick={() => {
                      setPhase("show");
                      setShowStartTime(Date.now());
                    }}
                    className="rounded-xl bg-amber-100 py-3 text-lg font-bold text-amber-700"
                  >
                    Peek
                  </button>
                  <button
                    onClick={handleCheck}
                    className="rounded-xl bg-green-500 py-3 text-lg font-bold text-white"
                  >
                    Check
                  </button>
                </div>
              )}
            </>
          )}

          {phase === "check" && (
            <div className="space-y-4">
              <p className="text-center text-lg font-semibold text-gray-700">
                Tap letters to spell what you wrote
              </p>

              <div className="flex justify-center gap-2 flex-wrap">
                {Array.from({ length: currentWord.word.length }).map((_, i) => (
                  <div
                    key={i}
                    className={`h-12 w-12 rounded-xl bg-blue-50 border-2 border-blue-200 text-2xl font-bold text-blue-700 flex items-center justify-center ${fontClass}`}
                  >
                    {typedAnswer[i] ?? "_"}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                {letterChoices.map((letter, i) => (
                  <button
                    key={`${letter}-${i}`}
                    onClick={() => pushLetter(letter)}
                    className={`rounded-xl bg-blue-100 py-3 text-xl font-black text-blue-800 active:scale-95 ${fontClass}`}
                  >
                    {letter}
                  </button>
                ))}
              </div>

              <div className="flex gap-2 justify-center">
                <button
                  onClick={() => setTypedAnswer("")}
                  className="rounded-xl bg-slate-100 px-4 py-2 text-base font-semibold text-slate-700"
                >
                  Clear letters
                </button>
                <button
                  onClick={popLetter}
                  className="rounded-xl bg-slate-100 px-4 py-2 text-base font-semibold text-slate-700"
                >
                  Backspace
                </button>
              </div>
            </div>
          )}

          {phase === "result" && result && (
            <div
              className={`rounded-2xl p-4 text-center space-y-3 ${
                result.kind === "correct" ? "bg-green-100" : "bg-amber-100"
              }`}
            >
              <p className="text-2xl font-black">{result.message}</p>
              {result.kind === "wrong" && (
                <div className="flex gap-2 justify-center">
                  <button
                    onClick={() => {
                      setTypedAnswer("");
                      setResult(null);
                      setPhase("draw");
                    }}
                    className="rounded-xl bg-white px-4 py-2 font-bold text-amber-800"
                  >
                    Try again
                  </button>
                  <button
                    onClick={() => {
                      setTypedAnswer("");
                      setResult(null);
                      setPhase("show");
                      setShowStartTime(Date.now());
                    }}
                    className="rounded-xl bg-white px-4 py-2 font-bold text-blue-700"
                  >
                    Show word
                  </button>
                </div>
              )}
            </div>
          )}

          {phase === "win" && (
            <div className="text-center rounded-2xl bg-yellow-100 p-6 space-y-3">
              <p className="text-6xl">🏆</p>
              <h2 className="text-3xl font-black text-yellow-700">You won!</h2>
              <p className="text-lg text-yellow-800">You spelled all {ROUND_GOAL} words.</p>
              <div className="flex justify-center gap-2">
                <button
                  onClick={startGame}
                  className="rounded-xl bg-green-500 text-white px-4 py-2 text-lg font-bold"
                >
                  Play again
                </button>
                <button
                  onClick={() => setPhase("menu")}
                  className="rounded-xl bg-white px-4 py-2 text-lg font-bold text-gray-700"
                >
                  Menu
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
