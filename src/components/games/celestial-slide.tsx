"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';

const TILE_PALETTES = [
  'from-indigo-500 to-purple-500',
  'from-sky-500 to-cyan-400',
  'from-rose-500 to-pink-400',
  'from-amber-500 to-orange-400',
  'from-emerald-500 to-lime-400',
  'from-fuchsia-500 to-violet-500',
  'from-blue-500 to-teal-400',
  'from-red-500 to-amber-500'
];

const BOARD_SIZES = [3, 4, 5] as const;

type BoardSize = (typeof BOARD_SIZES)[number];

type BestRecord = {
  moves: number;
  time: number;
};

type RecordStore = Record<BoardSize, BestRecord | null>;

const GOAL_STATE = (size: BoardSize) => {
  const total = size * size;
  return Array.from({ length: total }, (_, index) => (index + 1) % total);
};

const isSolvable = (board: number[], size: BoardSize) => {
  const inversions = board.reduce((count, value, index) => {
    if (value === 0) return count;
    for (let j = index + 1; j < board.length; j++) {
      if (board[j] !== 0 && board[j] < value) {
        count++;
      }
    }
    return count;
  }, 0);

  if (size % 2 === 1) {
    return inversions % 2 === 0;
  }

  const blankRowFromBottom = size - Math.floor(board.indexOf(0) / size);
  if (blankRowFromBottom % 2 === 0) {
    return inversions % 2 === 1;
  }
  return inversions % 2 === 0;
};

const shuffleBoard = (size: BoardSize) => {
  const goal = GOAL_STATE(size);
  const board = goal.slice();
  const total = size * size;
  const shuffleMoves = total * 40;

  let blankIndex = board.indexOf(0);

  const possibleMoves = (index: number) => {
    const moves: number[] = [];
    const row = Math.floor(index / size);
    const col = index % size;
    if (row > 0) moves.push(index - size);
    if (row < size - 1) moves.push(index + size);
    if (col > 0) moves.push(index - 1);
    if (col < size - 1) moves.push(index + 1);
    return moves;
  };

  for (let i = 0; i < shuffleMoves; i++) {
    const moves = possibleMoves(blankIndex);
    const target = moves[Math.floor(Math.random() * moves.length)];
    [board[blankIndex], board[target]] = [board[target], board[blankIndex]];
    blankIndex = target;
  }

  if (!isSolvable(board, size) || board.every((value, index) => value === goal[index])) {
    return shuffleBoard(size);
  }

  return board;
};

const formatTime = (milliseconds: number) => {
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  const fractional = Math.floor((milliseconds % 1000) / 10)
    .toString()
    .padStart(2, '0');
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}.${fractional}`;
};

const recordStorageKey = 'celestial-slide-records';

const loadStoredRecords = (): RecordStore => {
  if (typeof window === 'undefined') {
    return {
      3: null,
      4: null,
      5: null
    } as RecordStore;
  }

  try {
    const raw = window.localStorage.getItem(recordStorageKey);
    if (!raw) {
      return {
        3: null,
        4: null,
        5: null
      } as RecordStore;
    }
    const parsed = JSON.parse(raw) as RecordStore;
    return {
      3: parsed[3] ?? null,
      4: parsed[4] ?? null,
      5: parsed[5] ?? null
    } as RecordStore;
  } catch (error) {
    console.warn('Failed to load saved records', error);
    return {
      3: null,
      4: null,
      5: null
    } as RecordStore;
  }
};

const saveRecords = (records: RecordStore) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(recordStorageKey, JSON.stringify(records));
  } catch (error) {
    console.warn('Failed to save puzzle records', error);
  }
};

const useInterval = (callback: () => void, delay: number | null) => {
  const savedCallback = useRef<() => void>();

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (delay === null) return undefined;
    const tick = () => savedCallback.current?.();
    const id = setInterval(tick, delay);
    return () => clearInterval(id);
  }, [delay]);
};

export function CelestialSlide() {
  const [size, setSize] = useState<BoardSize>(4);
  const [board, setBoard] = useState<number[]>(() => GOAL_STATE(4));
  const [moves, setMoves] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [isSolved, setIsSolved] = useState(false);
  const [records, setRecords] = useState<RecordStore>(() => loadStoredRecords());
  const [celebrate, setCelebrate] = useState(false);

  const goal = useMemo(() => GOAL_STATE(size), [size]);

  const startNewPuzzle = useCallback(() => {
    const shuffled = shuffleBoard(size);
    setBoard(shuffled);
    setMoves(0);
    setStartTime(Date.now());
    setElapsed(0);
    setIsSolved(false);
    setCelebrate(false);
  }, [size]);

  useEffect(() => {
    startNewPuzzle();
  }, [startNewPuzzle]);

  useInterval(() => {
    if (startTime && !isSolved) {
      setElapsed(Date.now() - startTime);
    }
  }, isSolved || !startTime ? null : 100);

  const handleMove = useCallback((index: number) => {
    if (isSolved) return;
    const blankIndex = board.indexOf(0);
    const row = Math.floor(index / size);
    const col = index % size;
    const blankRow = Math.floor(blankIndex / size);
    const blankCol = blankIndex % size;
    const isAdjacent =
      (row === blankRow && Math.abs(col - blankCol) === 1) ||
      (col === blankCol && Math.abs(row - blankRow) === 1);

    if (!isAdjacent) return;

    const nextBoard = board.slice();
    [nextBoard[index], nextBoard[blankIndex]] = [nextBoard[blankIndex], nextBoard[index]];
    const nextMoves = moves + 1;
    setBoard(nextBoard);
    setMoves(nextMoves);

    if (nextBoard.every((value, tileIndex) => value === goal[tileIndex])) {
      setIsSolved(true);
      if (startTime) {
        const totalTime = Date.now() - startTime;
        setElapsed(totalTime);
        const existing = records[size];
        if (!existing || totalTime < existing.time || nextMoves < existing.moves) {
          const updated: RecordStore = {
            ...records,
            [size]: {
              moves: existing ? Math.min(existing.moves, nextMoves) : nextMoves,
              time: existing ? Math.min(existing.time, totalTime) : totalTime
            }
          } as RecordStore;
          setRecords(updated);
          saveRecords(updated);
        }
      }
      setTimeout(() => setCelebrate(true), 120);
    }
  }, [board, goal, isSolved, moves, size, startTime, records]);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (isSolved) return;
      const blankIndex = board.indexOf(0);
      const row = Math.floor(blankIndex / size);
      const col = blankIndex % size;
      let target = -1;

      switch (event.key) {
        case 'ArrowUp':
          if (row < size - 1) target = blankIndex + size;
          break;
        case 'ArrowDown':
          if (row > 0) target = blankIndex - size;
          break;
        case 'ArrowLeft':
          if (col < size - 1) target = blankIndex + 1;
          break;
        case 'ArrowRight':
          if (col > 0) target = blankIndex - 1;
          break;
        default:
          return;
      }

      if (target >= 0) {
        event.preventDefault();
        handleMove(target);
      }
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [board, handleMove, isSolved, size]);

  const tileSizeClass = useMemo(() => {
    switch (size) {
      case 3:
        return 'text-3xl';
      case 4:
        return 'text-2xl';
      default:
        return 'text-xl';
    }
  }, [size]);

  return (
    <section className="relative mx-auto flex max-w-5xl flex-col gap-6 rounded-3xl bg-slate-950/70 p-6 text-slate-50 shadow-xl ring-1 ring-white/10">
      <div className="absolute inset-0 -z-10 overflow-hidden rounded-3xl">
        <div className="absolute inset-0 animate-pulse bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.25),_transparent_55%),_radial-gradient(circle_at_bottom,_rgba(236,72,153,0.2),_transparent_45%)]" />
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900/40 via-slate-950/60 to-slate-900/40" />
      </div>

      <header className="flex flex-col gap-2">
        <p className="text-sm uppercase tracking-[0.3em] text-sky-200/80">Puzzle Lab</p>
        <h1 className="text-4xl font-semibold text-white sm:text-5xl">Celestial Slide</h1>
        <p className="max-w-2xl text-base text-slate-300">
          Guide the stardust tiles back into orbit. Glide pieces into the open space to rebuild the
          constellation faster than ever before.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              {BOARD_SIZES.map((candidate) => (
                <Button
                  key={candidate}
                  variant={candidate === size ? 'default' : 'secondary'}
                  className={`rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm font-medium backdrop-blur transition ${candidate === size ? 'bg-sky-500/80 text-white shadow-lg shadow-sky-500/25 hover:bg-sky-400/80' : 'text-slate-200 hover:bg-white/20'}`}
                  onClick={() => setSize(candidate)}
                >
                  {candidate} × {candidate}
                </Button>
              ))}
            </div>
            <Button
              onClick={startNewPuzzle}
              className="rounded-full bg-white/90 px-4 py-2 text-slate-900 transition hover:bg-white"
            >
              New Stardust Layout
            </Button>
          </div>

          <div
            className={`grid aspect-square gap-2 rounded-3xl border border-white/10 bg-slate-900/60 p-3 shadow-inner shadow-black/40 transition-all`}
            style={{ gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))` }}
          >
            {board.map((value, index) => {
              if (value === 0) {
                return (
                  <button
                    key={`blank-${index}`}
                    aria-label="Empty orbit"
                    className="rounded-2xl border border-dashed border-white/10 bg-white/5"
                    disabled
                  />
                );
              }

              const palette = TILE_PALETTES[(value - 1) % TILE_PALETTES.length];

              return (
                <button
                  key={value}
                  onClick={() => handleMove(index)}
                  className={`group flex items-center justify-center rounded-2xl bg-gradient-to-br ${palette} ${tileSizeClass} font-semibold text-white shadow-lg shadow-black/30 transition-transform duration-150 hover:scale-[1.03] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-200`}
                >
                  <span className="drop-shadow-[0_6px_12px_rgba(15,23,42,0.35)]">{value}</span>
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-2 gap-3 text-center text-sm font-medium text-slate-200 sm:grid-cols-4">
            <div className="rounded-2xl bg-white/5 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-400">Moves</p>
              <p className="mt-1 text-2xl font-semibold text-white">{moves}</p>
            </div>
            <div className="rounded-2xl bg-white/5 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-400">Time</p>
              <p className="mt-1 text-2xl font-semibold text-white">{formatTime(elapsed)}</p>
            </div>
            <div className="rounded-2xl bg-white/5 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-400">Best Moves</p>
              <p className="mt-1 text-2xl font-semibold text-white">{records[size]?.moves ?? '—'}</p>
            </div>
            <div className="rounded-2xl bg-white/5 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-400">Best Time</p>
              <p className="mt-1 text-2xl font-semibold text-white">
                {records[size]?.time ? formatTime(records[size]!.time) : '—'}
              </p>
            </div>
          </div>
        </div>

        <aside className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-white/5 p-5 text-sm text-slate-200">
          <h2 className="text-lg font-semibold text-white">How to reach stellar harmony</h2>
          <ul className="space-y-3">
            <li className="flex gap-3">
              <span className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-sky-500/40 text-sm font-semibold text-sky-100">1</span>
              <span>Click or arrow-key adjacent tiles to slide them into the shimmering void.</span>
            </li>
            <li className="flex gap-3">
              <span className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-sky-500/40 text-sm font-semibold text-sky-100">2</span>
              <span>Watch the live tracker to pace your moves and perfect your celestial choreography.</span>
            </li>
            <li className="flex gap-3">
              <span className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-sky-500/40 text-sm font-semibold text-sky-100">3</span>
              <span>Try different board sizes—larger constellations demand daring strategies.</span>
            </li>
          </ul>

          <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4 shadow-inner shadow-black/30">
            <p className="text-xs uppercase tracking-wide text-slate-400">Preview Orbit</p>
            <div
              className="mt-3 grid gap-1"
              style={{ gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))` }}
            >
              {goal.map((value) => (
                <div
                  key={`goal-${value}`}
                  className={`aspect-square rounded-lg border border-white/10 bg-gradient-to-br ${value === 0 ? 'bg-white/10' : 'from-slate-700 to-slate-800'} text-center text-xs font-semibold uppercase tracking-wide text-slate-200`}
                >
                  {value !== 0 ? value : ''}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-sky-500/30 bg-sky-500/10 p-4 text-sky-100">
            <p className="text-sm font-semibold">Pro tip</p>
            <p className="mt-1 text-xs leading-relaxed text-sky-100/80">
              Aim to solve corner clusters first, then sweep rows into place. Every smooth glide protects your move streak for the leaderboard.
            </p>
          </div>
        </aside>
      </div>

      {celebrate && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="animate-[pulse_2s_ease-in-out_infinite] rounded-full bg-white/10 p-12 text-center shadow-[0_0_120px_rgba(56,189,248,0.35)]">
            <p className="text-sm uppercase tracking-[0.4em] text-sky-200">Constellation aligned</p>
            <p className="text-4xl font-semibold text-white">✨ Stellar!</p>
            <p className="text-xs text-slate-200/70">New orbit ready whenever you are.</p>
          </div>
        </div>
      )}
    </section>
  );
}

export default CelestialSlide;
