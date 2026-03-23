'use client';

import { useEffect, useCallback } from 'react';
import { INDIGO_HEX } from '../engine/palette';

/**
 * PauseMenu — minimal overlay when Escape is pressed.
 *
 * 'Paused' in EB Garamond. Three options: Resume, Restart, Quit.
 * Frosted glass over the frozen world. Nothing loud.
 */

export type PauseMenuProps = {
  visible: boolean;
  onResume: () => void;
  onRestart: () => void;
  onQuit: () => void;
};

export default function PauseMenu({ visible, onResume, onRestart, onQuit }: PauseMenuProps) {
  // Escape key resumes
  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      if (e.code === 'Escape' && visible) {
        e.preventDefault();
        onResume();
      }
    },
    [visible, onResume],
  );

  useEffect(() => {
    if (!visible) return;
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [visible, handleKey]);

  if (!visible) return null;

  return (
    <div
      className="absolute inset-0 z-40 flex flex-col items-center justify-center select-none"
      style={{
        background: 'rgba(10, 0, 18, 0.85)',
        backdropFilter: 'blur(12px)',
      }}
    >
      {/* Title */}
      <h2
        className="font-eb-garamond font-normal tracking-[0.25em] uppercase mb-12"
        style={{
          color: INDIGO_HEX.pearlWhite,
          fontSize: 'clamp(1.2rem, 3vw, 1.8rem)',
          opacity: 0.8,
          textShadow: '0 0 20px rgba(107, 63, 160, 0.3)',
        }}
      >
        Paused
      </h2>

      {/* Menu options */}
      <div className="flex flex-col items-center gap-4">
        <MenuButton label="Resume" onClick={onResume} />
        <MenuButton label="Restart" onClick={onRestart} />
        <MenuButton label="Quit" onClick={onQuit} />
      </div>
    </div>
  );
}

function MenuButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="font-eb-garamond tracking-wider px-8 py-3 rounded-sm cursor-pointer transition-all duration-300 focus:outline-none focus-visible:ring-1"
      style={{
        color: INDIGO_HEX.pearlWhite,
        fontSize: 'clamp(0.9rem, 2vw, 1.1rem)',
        background: 'transparent',
        border: `1px solid rgba(107, 63, 160, 0.25)`,
        minWidth: '180px',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'rgba(107, 63, 160, 0.6)';
        e.currentTarget.style.background = 'rgba(107, 63, 160, 0.1)';
        e.currentTarget.style.textShadow = `0 0 12px ${INDIGO_HEX.signalViolet}60`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'rgba(107, 63, 160, 0.25)';
        e.currentTarget.style.background = 'transparent';
        e.currentTarget.style.textShadow = 'none';
      }}
    >
      {label}
    </button>
  );
}
