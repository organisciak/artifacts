'use client';

import { useEffect, useState, useRef } from 'react';
import { INDIGO_HEX } from '../engine/palette';

/**
 * GameUI — minimal in-game overlay. No HUD. No health bars.
 * Just quiet prompts that dissolve back into the world.
 */

// ─── Scene title display names ───────────────────────────────────────────────

const SCENE_TITLES: Record<string, { station: string; name: string }> = {
  'radio-tower': { station: 'Station One', name: 'The Radio Tower' },
  'gas-station': { station: 'Station Two', name: 'The Gas Station' },
  'the-lake': { station: 'Station Three', name: 'The Lake' },
  'the-motel': { station: 'Station Four', name: 'The Motel' },
  'the-signal': { station: 'Station Five', name: 'The Signal' },
};

// ─── Types ───────────────────────────────────────────────────────────────────

export type InteractionHint = {
  label: string;
  type: 'listen' | 'open' | 'look' | 'touch';
} | null;

export type GameUIProps = {
  /** Current scene ID, shown briefly on entry. */
  currentScene: string | null;
  /** Interaction hint to display when near an interactive element. */
  interactionHint: InteractionHint;
  /** Whether to show the scene title (set true on scene entry, auto-fades). */
  showSceneTitle: boolean;
  /** Whether the game is currently in a dialogue (hides interaction hints). */
  inDialogue: boolean;
};

// ─── Component ───────────────────────────────────────────────────────────────

export default function GameUI({
  currentScene,
  interactionHint,
  showSceneTitle,
  inDialogue,
}: GameUIProps) {
  // ─── Scene title auto-fade ────────────────────────────────────────────
  const [titleVisible, setTitleVisible] = useState(false);
  const titleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (showSceneTitle && currentScene) {
      setTitleVisible(true);

      // Auto-fade after 3.5 seconds
      if (titleTimerRef.current) clearTimeout(titleTimerRef.current);
      titleTimerRef.current = setTimeout(() => {
        setTitleVisible(false);
      }, 3500);
    } else {
      setTitleVisible(false);
    }

    return () => {
      if (titleTimerRef.current) clearTimeout(titleTimerRef.current);
    };
  }, [showSceneTitle, currentScene]);

  const sceneInfo = currentScene ? SCENE_TITLES[currentScene] : null;

  // ─── Interaction hint fade ────────────────────────────────────────────
  const [hintVisible, setHintVisible] = useState(false);
  const [displayedHint, setDisplayedHint] = useState<InteractionHint>(null);

  useEffect(() => {
    if (interactionHint && !inDialogue) {
      setDisplayedHint(interactionHint);
      // Small delay before showing for smoothness
      requestAnimationFrame(() => setHintVisible(true));
    } else {
      setHintVisible(false);
      // Keep displayed for fade-out transition
      const timer = setTimeout(() => setDisplayedHint(null), 400);
      return () => clearTimeout(timer);
    }
  }, [interactionHint, inDialogue]);

  return (
    <>
      {/* Scene title — appears on entry, then fades */}
      {sceneInfo && (
        <div
          className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none select-none z-20 text-center"
          style={{
            opacity: titleVisible ? 1 : 0,
            transform: titleVisible
              ? 'translate(-50%, -50%) translateY(0)'
              : 'translate(-50%, -50%) translateY(6px)',
            transition: 'opacity 1.2s ease, transform 1.2s ease',
          }}
        >
          <p
            className="font-eb-garamond tracking-[0.3em] uppercase"
            style={{
              color: INDIGO_HEX.signalViolet,
              fontSize: 'clamp(0.65rem, 1.2vw, 0.8rem)',
              opacity: 0.6,
              marginBottom: '0.5rem',
            }}
          >
            {sceneInfo.station}
          </p>
          <h2
            className="font-eb-garamond font-normal italic tracking-wider"
            style={{
              color: INDIGO_HEX.pearlWhite,
              fontSize: 'clamp(1.4rem, 3.5vw, 2.2rem)',
              textShadow: '0 0 20px rgba(107, 63, 160, 0.4)',
            }}
          >
            {sceneInfo.name}
          </h2>
        </div>
      )}

      {/* Interaction prompt — small glowing dot + word at bottom center */}
      {displayedHint && (
        <div
          className="absolute bottom-20 left-1/2 -translate-x-1/2 pointer-events-none select-none z-20 flex flex-col items-center gap-2"
          style={{
            opacity: hintVisible ? 1 : 0,
            transition: 'opacity 0.35s ease',
          }}
        >
          {/* Glowing dot */}
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: INDIGO_HEX.pearlWhite,
              boxShadow: `0 0 8px ${INDIGO_HEX.signalViolet}, 0 0 16px ${INDIGO_HEX.signalViolet}40`,
              animation: 'pulse 2.5s ease-in-out infinite',
            }}
          />
          <span
            className="font-eb-garamond tracking-wider"
            style={{
              color: INDIGO_HEX.pearlWhite,
              fontSize: '0.75rem',
              opacity: 0.55,
            }}
          >
            {displayedHint.label}
          </span>
        </div>
      )}
    </>
  );
}
