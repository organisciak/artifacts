"use client";

import { useState, useEffect, useCallback } from "react";
import {
  generateRound,
  GameRound,
  wordGroups,
  shuffleArray,
} from "@/data/sight-words";
import confetti from "canvas-confetti";

type GameState = "menu" | "playing" | "celebration";

type DifficultyLevel = "easy" | "medium" | "hard" | "expert";

const DIFFICULTY_CONFIG: Record<
  DifficultyLevel,
  { label: string; description: string; optionCount: number; showWordHint: boolean }
> = {
  easy: { label: "Easy", description: "2 choices, word shown", optionCount: 2, showWordHint: true },
  medium: { label: "Medium", description: "3 choices", optionCount: 3, showWordHint: false },
  hard: { label: "Hard", description: "4 choices", optionCount: 4, showWordHint: false },
  expert: { label: "Expert", description: "4 choices, all mixed", optionCount: 4, showWordHint: false },
};

function playSound(type: "correct" | "wrong") {
  const ctx = new AudioContext();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);

  if (type === "correct") {
    // Cheerful ascending ding
    osc.type = "sine";
    osc.frequency.setValueAtTime(523, ctx.currentTime); // C5
    osc.frequency.setValueAtTime(659, ctx.currentTime + 0.1); // E5
    osc.frequency.setValueAtTime(784, ctx.currentTime + 0.2); // G5
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
    osc.start();
    osc.stop(ctx.currentTime + 0.4);
  } else {
    // Gentle low bonk
    osc.type = "triangle";
    osc.frequency.setValueAtTime(200, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.2);
    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
    osc.start();
    osc.stop(ctx.currentTime + 0.3);
  }
}

function speakWord(word: string) {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(word);
  utterance.rate = 0.8;
  utterance.pitch = 1.1;
  window.speechSynthesis.speak(utterance);
}

export default function SightWordsPage() {
  const [gameState, setGameState] = useState<GameState>("menu");
  const [score, setScore] = useState(0);
  const [targetScore, setTargetScore] = useState(5);
  const [difficulty, setDifficulty] = useState<DifficultyLevel>("medium");
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>(
    undefined
  );
  const [currentRound, setCurrentRound] = useState<GameRound | null>(null);
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const diffConfig = DIFFICULTY_CONFIG[difficulty];
  // Expert mode forces all categories mixed
  const effectiveCategory = difficulty === "expert" ? undefined : selectedCategory;

  const startGame = useCallback(() => {
    setScore(0);
    setGameState("playing");
    setCurrentRound(generateRound(diffConfig.optionCount, effectiveCategory));
    setFeedback(null);
    setSelectedIndex(null);
  }, [diffConfig.optionCount, effectiveCategory]);

  const nextRound = useCallback(() => {
    setCurrentRound(generateRound(diffConfig.optionCount, effectiveCategory));
    setFeedback(null);
    setSelectedIndex(null);
  }, [diffConfig.optionCount, effectiveCategory]);

  const handleChoice = useCallback(
    (index: number) => {
      if (feedback !== null || !currentRound) return;

      setSelectedIndex(index);

      if (index === currentRound.correctIndex) {
        playSound("correct");
        setFeedback("correct");
        const newScore = score + 1;
        setScore(newScore);

        if (newScore >= targetScore) {
          // Celebration!
          setTimeout(() => {
            setGameState("celebration");
            // Fire confetti
            confetti({
              particleCount: 100,
              spread: 70,
              origin: { y: 0.6 },
            });
            setTimeout(() => {
              confetti({
                particleCount: 50,
                angle: 60,
                spread: 55,
                origin: { x: 0 },
              });
              confetti({
                particleCount: 50,
                angle: 120,
                spread: 55,
                origin: { x: 1 },
              });
            }, 200);
          }, 800);
        } else {
          setTimeout(nextRound, 1000);
        }
      } else {
        playSound("wrong");
        setFeedback("wrong");
        setScore(Math.max(0, score - 1));
        setTimeout(() => {
          setFeedback(null);
          setSelectedIndex(null);
        }, 1200);
      }
    },
    [feedback, currentRound, score, targetScore, nextRound]
  );

  // Keyboard support: 1-4 keys select options
  useEffect(() => {
    if (gameState !== "playing") return;
    const handler = (e: KeyboardEvent) => {
      const num = parseInt(e.key);
      if (num >= 1 && num <= (currentRound?.options.length ?? 0)) {
        handleChoice(num - 1);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [gameState, currentRound, handleChoice]);

  // Word image component - uses pre-generated images from nano-banana-pro
  const WordImage = ({
    word,
    size = "large",
  }: {
    word: string;
    size?: "large" | "small";
  }) => {
    const sizeClass = size === "large" ? "w-48 h-48" : "w-24 h-24";
    const imgSrc = `/sight-words/${word}.png`;

    return (
      <img
        src={imgSrc}
        alt={word}
        className={`${sizeClass} rounded-2xl shadow-lg border-4 border-white object-cover bg-white`}
        onError={(e) => {
          // Fallback to colored placeholder if image missing
          const target = e.target as HTMLImageElement;
          target.style.display = "none";
          const parent = target.parentElement;
          if (parent) {
            const fallback = document.createElement("div");
            fallback.className = `${sizeClass} bg-purple-400 rounded-2xl flex items-center justify-center shadow-lg border-4 border-white`;
            fallback.innerHTML = `<span class="text-6xl font-bold text-white drop-shadow-md">${word.charAt(0).toUpperCase()}</span>`;
            parent.appendChild(fallback);
          }
        }}
      />
    );
  };

  // Menu screen
  if (gameState === "menu") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-sky-300 to-sky-500 flex flex-col items-center justify-center p-4">
        <h1 className="text-5xl font-bold text-white mb-8 drop-shadow-lg">
          🌟 Sight Words 🌟
        </h1>

        <div className="bg-white/90 rounded-3xl p-6 w-full max-w-md shadow-xl space-y-6">
          {/* Target score */}
          <div>
            <label className="block text-lg font-semibold text-gray-700 mb-2">
              Points to win: {targetScore}
            </label>
            <input
              type="range"
              min={3}
              max={20}
              value={targetScore}
              onChange={(e) => setTargetScore(Number(e.target.value))}
              className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-green-500"
            />
            <div className="flex justify-between text-sm text-gray-500">
              <span>3</span>
              <span>20</span>
            </div>
          </div>

          {/* Difficulty */}
          <div>
            <label className="block text-lg font-semibold text-gray-700 mb-2">
              Difficulty
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(DIFFICULTY_CONFIG) as DifficultyLevel[]).map((level) => {
                const cfg = DIFFICULTY_CONFIG[level];
                return (
                  <button
                    key={level}
                    onClick={() => setDifficulty(level)}
                    className={`py-3 px-4 rounded-xl text-sm font-bold transition-all ${
                      difficulty === level
                        ? "bg-blue-500 text-white scale-105 shadow-md"
                        : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                    }`}
                  >
                    <div>{cfg.label}</div>
                    <div className={`text-xs font-normal mt-0.5 ${difficulty === level ? "text-blue-100" : "text-gray-500"}`}>{cfg.description}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="block text-lg font-semibold text-gray-700 mb-2">
              Word category
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setSelectedCategory(undefined)}
                className={`py-3 px-4 rounded-xl text-sm font-bold transition-all ${
                  selectedCategory === undefined
                    ? "bg-purple-500 text-white scale-105 shadow-md"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                All Words
              </button>
              {wordGroups.map((group) => {
                const cat = group.words[0]?.category;
                return (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`py-3 px-4 rounded-xl text-sm font-bold transition-all ${
                      selectedCategory === cat
                        ? "bg-purple-500 text-white scale-105 shadow-md"
                        : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                    }`}
                  >
                    {group.name.split(" ")[0]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Start button */}
          <button
            onClick={startGame}
            className="w-full py-4 bg-green-500 hover:bg-green-600 text-white text-2xl font-bold rounded-2xl shadow-lg transition-all hover:scale-105 active:scale-95"
          >
            🎮 Start Game!
          </button>
        </div>
      </div>
    );
  }

  // Celebration screen
  if (gameState === "celebration") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-yellow-300 via-pink-300 to-purple-400 flex flex-col items-center justify-center p-4">
        <div className="text-center animate-bounce">
          <div className="text-8xl mb-4">🎉</div>
          <h1 className="text-5xl font-bold text-white mb-4 drop-shadow-lg">
            Amazing!
          </h1>
          <p className="text-2xl text-white/90 mb-8 drop-shadow">
            You got {targetScore} points!
          </p>
          <div className="text-6xl mb-8">🌟⭐🌟</div>
          <p className="text-xl text-white/80 mb-8">
            Time for your prize! 🎁
          </p>
        </div>

        <div className="flex flex-col gap-4 w-full max-w-xs">
          <button
            onClick={startGame}
            className="w-full py-4 bg-green-500 hover:bg-green-600 text-white text-xl font-bold rounded-2xl shadow-lg transition-all hover:scale-105"
          >
            🔄 Play Again
          </button>
          <button
            onClick={() => setGameState("menu")}
            className="w-full py-3 bg-white/80 hover:bg-white text-gray-700 text-lg font-bold rounded-2xl shadow-lg transition-all"
          >
            ⚙️ Settings
          </button>
        </div>
      </div>
    );
  }

  // Playing screen
  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-300 to-sky-500 flex flex-col p-4">
      {/* Score header */}
      <div className="flex justify-between items-center mb-4">
        <button
          onClick={() => setGameState("menu")}
          className="p-2 bg-white/80 rounded-full shadow"
        >
          ⚙️
        </button>
        <div className="flex items-center gap-2">
          <span className="text-2xl">⭐</span>
          <div className="bg-white/90 rounded-full px-4 py-2 shadow">
            <span className="text-2xl font-bold text-gray-700">
              {score} / {targetScore}
            </span>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-white/30 rounded-full h-4 mb-6 overflow-hidden">
        <div
          className="bg-yellow-400 h-full rounded-full transition-all duration-500 shadow-inner"
          style={{ width: `${(score / targetScore) * 100}%` }}
        />
      </div>

      {/* Main game area */}
      {currentRound && (
        <div className="flex-1 flex flex-col items-center justify-center gap-8">
          {/* Target word/image display */}
          <div className="text-center">
            <p className="text-white text-lg mb-2 drop-shadow">
              Which word is this?
            </p>
            {diffConfig.showWordHint && (
              <p className="text-5xl font-bold text-white mb-4 drop-shadow-lg tracking-wide">
                {currentRound.targetWord.word}
              </p>
            )}
            <button
              type="button"
              onClick={() => speakWord(currentRound.targetWord.word)}
              className="focus:outline-none active:scale-95 transition-transform"
              aria-label={`Hear the word`}
            >
              <WordImage word={currentRound.targetWord.word} size="large" />
            </button>
            <p className="text-white/70 text-sm mt-2 drop-shadow">Tap picture to hear the word</p>
          </div>

          {/* Options */}
          <div
            className={`grid gap-3 w-full max-w-md ${
              currentRound.options.length === 2 ? "grid-cols-2" : ""
            } ${currentRound.options.length === 3 ? "grid-cols-3" : ""} ${
              currentRound.options.length === 4 ? "grid-cols-2" : ""
            }`}
          >
            {currentRound.options.map((option, index) => {
              let buttonClass =
                "bg-white hover:bg-gray-50 text-gray-800 border-4 border-gray-200";

              if (selectedIndex === index) {
                if (feedback === "correct") {
                  buttonClass =
                    "bg-green-400 text-white border-4 border-green-500 scale-105";
                } else if (feedback === "wrong") {
                  buttonClass =
                    "bg-red-400 text-white border-4 border-red-500 shake";
                }
              } else if (
                feedback === "wrong" &&
                index === currentRound.correctIndex
              ) {
                // Highlight correct answer when wrong
                buttonClass =
                  "bg-green-200 text-green-800 border-4 border-green-400";
              }

              const pulseClass =
                selectedIndex === index && feedback
                  ? feedback === "correct"
                    ? "animate-pulse"
                    : ""
                  : "";

              return (
                <button
                  key={index}
                  onClick={() => handleChoice(index)}
                  disabled={feedback !== null}
                  className={`py-6 px-4 rounded-2xl text-3xl font-bold shadow-lg transition-all ${buttonClass} ${pulseClass}`}
                >
                  <span className="text-xs opacity-50 block mb-1">{index + 1}</span>
                  {option}
                </button>
              );
            })}
          </div>

          {/* Feedback */}
          {feedback && (
            <div
              className={`text-4xl ${feedback === "correct" ? "animate-bounce" : "animate-pulse"}`}
            >
              {feedback === "correct" ? "✅ Great!" : "❌ Try again!"}
            </div>
          )}
        </div>
      )}

      <style jsx>{`
        @keyframes shake {
          0%,
          100% {
            transform: translateX(0);
          }
          20%,
          60% {
            transform: translateX(-5px);
          }
          40%,
          80% {
            transform: translateX(5px);
          }
        }
        .shake {
          animation: shake 0.5s ease-in-out;
        }
      `}</style>
    </div>
  );
}
