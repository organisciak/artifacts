"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  getDrawingStorageKey,
  getLessonById,
  HAND_PREFERENCE_KEY,
} from "@/data/learn-to-draw";

type HandPreference = "left" | "right";

export default function LearnToDrawLessonPage() {
  const params = useParams<{ animal: string }>();
  const animal = params.animal;
  const lesson = useMemo(() => getLessonById(animal), [animal]);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const canvasWrapRef = useRef<HTMLDivElement | null>(null);
  const drawingRef = useRef(false);
  const pointerIdRef = useRef<number | null>(null);

  const [step, setStep] = useState(lesson?.steps ?? 1);
  const [stepOpacity, setStepOpacity] = useState(1);
  const [hand, setHand] = useState<HandPreference | null>(null);
  const [showHandPrompt, setShowHandPrompt] = useState(false);
  const [hasInk, setHasInk] = useState(false);
  const [autoPlay, setAutoPlay] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const canvasFirst = hand === "left";

  const setupCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const wrap = canvasWrapRef.current;
    if (!canvas || !wrap) return;

    const dpr = window.devicePixelRatio || 1;
    const width = wrap.clientWidth;
    const height = Math.max(280, Math.min(460, Math.floor(window.innerHeight * 0.55)));

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
    ctx.lineWidth = 6;
    ctx.strokeStyle = "#000000";
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);

    if (lesson) {
      const saved = localStorage.getItem(getDrawingStorageKey(lesson.id));
      if (saved) {
        const image = new Image();
        image.onload = () => {
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(image, 0, 0, width, height);
          setHasInk(true);
        };
        image.src = saved;
      }
    }
  }, [lesson]);

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    const width = canvas.width / dpr;
    const height = canvas.height / dpr;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    setHasInk(false);
    setSaveMessage(null);
  }, []);

  const saveCanvas = useCallback(() => {
    if (!canvasRef.current || !lesson) return;

    const dataUrl = canvasRef.current.toDataURL("image/png");
    localStorage.setItem(getDrawingStorageKey(lesson.id), dataUrl);
    setSaveMessage("Saved to gallery! 🎉");
  }, [lesson]);

  const getCanvasPoint = useCallback((e: PointerEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return null;

    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }, []);

  useEffect(() => {
    if (!lesson) return;

    const savedHand = localStorage.getItem(HAND_PREFERENCE_KEY);
    if (savedHand === "left" || savedHand === "right") {
      setHand(savedHand);
      setShowHandPrompt(false);
      return;
    }

    setShowHandPrompt(true);
  }, [lesson]);

  useEffect(() => {
    if (!lesson) return;

    setStep(lesson.steps);
    setStepOpacity(1);

    const timers: number[] = [];
    let elapsed = 250;

    for (let next = lesson.steps - 1; next >= 1; next--) {
      timers.push(
        window.setTimeout(() => {
          setStepOpacity(0);
        }, elapsed)
      );

      timers.push(
        window.setTimeout(() => {
          setStep(next);
          setStepOpacity(1);
        }, elapsed + 250)
      );

      elapsed += 800;
    }

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [lesson]);

  useEffect(() => {
    if (!lesson) return;

    setupCanvas();
    const onResize = () => setupCanvas();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [lesson, setupCanvas]);

  useEffect(() => {
    if (!lesson) return;
    if (!autoPlay) return;

    const timer = window.setInterval(() => {
      setStep((prev) => (prev >= lesson.steps ? 1 : prev + 1));
    }, 900);

    return () => window.clearInterval(timer);
  }, [autoPlay, lesson]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const onPointerDown = (e: PointerEvent) => {
      drawingRef.current = true;
      pointerIdRef.current = e.pointerId;
      canvas.setPointerCapture(e.pointerId);

      const point = getCanvasPoint(e);
      if (!point) return;

      ctx.beginPath();
      ctx.moveTo(point.x, point.y);
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!drawingRef.current || pointerIdRef.current !== e.pointerId) return;

      const point = getCanvasPoint(e);
      if (!point) return;

      setHasInk(true);
      ctx.lineTo(point.x, point.y);
      ctx.stroke();
    };

    const onPointerUp = (e: PointerEvent) => {
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
    canvas.addEventListener("pointerup", onPointerUp);
    canvas.addEventListener("pointercancel", onPointerUp);

    return () => {
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("pointercancel", onPointerUp);
    };
  }, [getCanvasPoint]);

  if (!lesson) {
    return (
      <main className="min-h-screen p-6 bg-slate-100">
        <div className="mx-auto max-w-xl rounded-3xl bg-white p-6 shadow text-center space-y-4">
          <h1 className="text-3xl font-black text-slate-700">That animal is not ready yet 🐾</h1>
          <Link href="/learn-to-draw" className="inline-flex rounded-xl bg-blue-500 text-white px-4 py-3 font-bold">
            Back to gallery
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-100 via-cyan-100 to-teal-100 p-3 sm:p-5">
      <div className="mx-auto max-w-7xl space-y-4">
        <header className="rounded-3xl bg-white/90 shadow p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-3xl sm:text-4xl font-black text-blue-700">Draw a {lesson.name}! 🐧</h1>
            <p className="text-blue-900/80 text-lg">Follow each step, then make it your own.</p>
          </div>
          <Link href="/learn-to-draw" className="inline-flex justify-center rounded-2xl bg-white border border-blue-200 px-4 py-3 text-lg font-bold text-blue-700">
            Gallery
          </Link>
        </header>

        <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className={canvasFirst ? "order-1" : "order-2 lg:order-2"}>
            <div className="h-full rounded-3xl bg-white p-4 shadow-xl border border-blue-100 space-y-3">
              <h2 className="text-2xl font-black text-slate-800">Your Drawing</h2>
              <div ref={canvasWrapRef} className="rounded-2xl border-4 border-slate-200 overflow-hidden bg-white">
                <canvas ref={canvasRef} className="w-full touch-none" />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                <button
                  onClick={clearCanvas}
                  className="rounded-2xl bg-slate-100 py-3 text-lg font-black text-slate-700 active:scale-[0.98]"
                >
                  Clear
                </button>
                <button
                  onClick={saveCanvas}
                  className="rounded-2xl bg-green-500 py-3 text-lg font-black text-white active:scale-[0.98]"
                >
                  Save
                </button>
                <button
                  onClick={() => {
                    setAutoPlay(false);
                    setStep(1);
                  }}
                  className="rounded-2xl bg-amber-100 py-3 text-lg font-black text-amber-800 active:scale-[0.98]"
                >
                  Step 1
                </button>
              </div>

              <p className="min-h-6 text-base font-semibold text-green-700">
                {saveMessage ?? (hasInk ? "Looks awesome! Save it when you are ready." : "Start drawing with your finger or stylus.")}
              </p>
            </div>
          </div>

          <div className={canvasFirst ? "order-2" : "order-1 lg:order-1"}>
            <div className="h-full rounded-3xl bg-white p-4 shadow-xl border border-blue-100 space-y-3">
              <h2 className="text-2xl font-black text-slate-800">Steps</h2>
              <div className="relative rounded-2xl border-4 border-blue-200 bg-white overflow-hidden">
                <Image
                  src={lesson.stepImage(step)}
                  alt={`${lesson.name} drawing step ${step}`}
                  width={1024}
                  height={1024}
                  unoptimized
                  className="w-full aspect-square object-contain transition-opacity duration-300"
                  style={{ opacity: stepOpacity }}
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => {
                    setAutoPlay(false);
                    setStep((prev) => Math.max(1, prev - 1));
                  }}
                  className="rounded-2xl bg-blue-100 py-4 text-xl font-black text-blue-800 active:scale-[0.98]"
                >
                  ←
                </button>
                <button
                  onClick={() => setAutoPlay((prev) => !prev)}
                  className={`rounded-2xl py-4 text-lg font-black active:scale-[0.98] ${
                    autoPlay ? "bg-purple-500 text-white" : "bg-purple-100 text-purple-800"
                  }`}
                >
                  {autoPlay ? "Stop" : "Play"}
                </button>
                <button
                  onClick={() => {
                    setAutoPlay(false);
                    setStep((prev) => Math.min(lesson.steps, prev + 1));
                  }}
                  className="rounded-2xl bg-blue-100 py-4 text-xl font-black text-blue-800 active:scale-[0.98]"
                >
                  →
                </button>
              </div>

              <p className="text-center text-lg font-bold text-blue-700">Step {step} of {lesson.steps}</p>
            </div>
          </div>
        </section>
      </div>

      {showHandPrompt && (
        <div className="fixed inset-0 bg-black/45 p-4 flex items-center justify-center z-20">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl space-y-4 text-center">
            <h2 className="text-3xl font-black text-slate-800">Which hand do you draw with?</h2>
            <p className="text-lg text-slate-600">We will put the canvas on your favorite side.</p>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => {
                  localStorage.setItem(HAND_PREFERENCE_KEY, "left");
                  setHand("left");
                  setShowHandPrompt(false);
                }}
                className="rounded-2xl bg-pink-100 py-4 text-xl font-black text-pink-800 active:scale-[0.98]"
              >
                Left
              </button>
              <button
                onClick={() => {
                  localStorage.setItem(HAND_PREFERENCE_KEY, "right");
                  setHand("right");
                  setShowHandPrompt(false);
                }}
                className="rounded-2xl bg-cyan-100 py-4 text-xl font-black text-cyan-800 active:scale-[0.98]"
              >
                Right
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
