'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import * as THREE from 'three';
import { createIndigoRenderer, type IndigoRenderer } from './engine/renderer';
import { InputManager } from './engine/input';
import { CameraController } from './engine/camera';
import { SceneManager } from './engine/scene-manager';
import { GameStateManager, type SceneId } from './engine/game-state';
import { IndigoSynthEngine } from './audio/synth-engine';
import { INDIGO_HEX } from './engine/palette';
import TitleScreen from './ui/title-screen';
import GameUI, { type InteractionHint } from './ui/game-ui';
import PauseMenu from './ui/pause-menu';
// Import scenes to trigger registration side effects
import './scenes';

/**
 * IndigoFrequency — master orchestrator.
 *
 * State machine: title → playing → paused → ended → title
 *
 * This component owns the game loop, all engine systems,
 * and coordinates between UI layers and the Three.js world.
 */

type GameFlowState = 'title' | 'playing' | 'paused' | 'ended';

export default function IndigoFrequency() {
  // ─── State ──────────────────────────────────────────────────────────────
  const [flowState, setFlowState] = useState<GameFlowState>('title');
  const [interactHint, setInteractHint] = useState<InteractionHint>(null);
  const [showSceneTitle, setShowSceneTitle] = useState(false);
  const [currentSceneId, setCurrentSceneId] = useState<string | null>(null);
  const [inDialogue, setInDialogue] = useState(false);

  // ─── Refs ───────────────────────────────────────────────────────────────
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<IndigoRenderer | null>(null);
  const inputRef = useRef<InputManager | null>(null);
  const cameraCtrlRef = useRef<CameraController | null>(null);
  const sceneManagerRef = useRef<SceneManager | null>(null);
  const gameStateRef = useRef<GameStateManager | null>(null);
  const audioRef = useRef<IndigoSynthEngine | null>(null);
  const rafRef = useRef<number | null>(null);
  const fpsRef = useRef<HTMLDivElement | null>(null);
  const frameTimesRef = useRef<number[]>([]);
  const flowStateRef = useRef<GameFlowState>('title');

  // Keep ref in sync with state (for use in game loop)
  useEffect(() => {
    flowStateRef.current = flowState;
  }, [flowState]);

  // ─── Game loop ──────────────────────────────────────────────────────────

  const gameLoop = useCallback(() => {
    const engine = engineRef.current;
    const input = inputRef.current;
    const camCtrl = cameraCtrlRef.current;
    const sceneMgr = sceneManagerRef.current;

    if (!engine) return;

    const delta = engine.clock.getDelta();
    const elapsed = engine.clock.getElapsedTime();

    // Only run game logic when playing
    if (flowStateRef.current === 'playing') {
      // Update input smoothing
      input?.update(delta);

      // Update scene manager (scene lifecycle + transitions + dialogue)
      sceneMgr?.update(delta, elapsed, input?.state);

      // Update camera from input
      if (camCtrl && input) {
        camCtrl.update(input.state, delta);

        // Update interaction hint from POI proximity
        const poi = camCtrl.getActivePoi();
        if (poi?.label) {
          setInteractHint({
            label: poi.label,
            type: 'listen',
          });
        } else {
          setInteractHint(null);
        }
      }
    }

    engine.render(delta, elapsed);

    // Dev FPS counter
    if (fpsRef.current && process.env.NODE_ENV === 'development') {
      const now = performance.now();
      const times = frameTimesRef.current;
      times.push(now);
      while (times.length > 60) times.shift();
      if (times.length > 1) {
        const avgMs = (times[times.length - 1] - times[0]) / (times.length - 1);
        fpsRef.current.textContent = `${Math.round(1000 / avgMs)} fps`;
      }
    }

    rafRef.current = requestAnimationFrame(gameLoop);
  }, []);

  // ─── Engine initialization ──────────────────────────────────────────────

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    // Create renderer
    const engine = createIndigoRenderer({ container, width, height });
    engineRef.current = engine;

    // Input
    const input = new InputManager(container);
    inputRef.current = input;

    // Camera controller
    const camCtrl = new CameraController({
      camera: engine.camera,
      walkSpeed: 2.5,
      eyeHeight: 1.7,
      bobAmplitude: 0.04,
      bobFrequency: 1.6,
    });
    cameraCtrlRef.current = camCtrl;

    // Game state
    const gameState = new GameStateManager();
    gameState.load();
    gameStateRef.current = gameState;

    // Audio
    const audio = new IndigoSynthEngine();
    audioRef.current = audio;

    // Scene manager
    const sceneMgr = new SceneManager(engine, gameState, camCtrl);
    sceneMgr.installStaticPass();
    sceneMgr.container = container;
    sceneMgr.audio = audio;
    sceneManagerRef.current = sceneMgr;

    // Wire scene manager callbacks
    sceneMgr.onTransitionVoid = (_from, to) => {
      // Crossfade audio to new scene
      audio.setScene(gameState.toAudioSceneName(to)).catch(() => {});
    };

    sceneMgr.onTransitionComplete = (sceneId) => {
      setCurrentSceneId(sceneId);
      setShowSceneTitle(true);
      // Auto-hide title after display
      setTimeout(() => setShowSceneTitle(false), 4000);
    };

    sceneMgr.onDialogueStateChange = (inDialogue) => {
      setInDialogue(inDialogue);
    };

    // Start render loop (always running for smooth visuals)
    engine.clock.start();
    rafRef.current = requestAnimationFrame(gameLoop);

    // Resize handler
    const onResize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      engine.resize(w, h);
    };
    window.addEventListener('resize', onResize);

    return () => {
      window.removeEventListener('resize', onResize);
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      input.dispose();
      sceneMgr.dispose();
      audio.destroy();
      engine.dispose();
      engineRef.current = null;
      inputRef.current = null;
      cameraCtrlRef.current = null;
      sceneManagerRef.current = null;
      gameStateRef.current = null;
      audioRef.current = null;
    };
  }, [gameLoop]);

  // ─── Escape key for pause ───────────────────────────────────────────────

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== 'Escape') return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (flowStateRef.current === 'playing') {
        e.preventDefault();
        setFlowState('paused');
        audioRef.current?.suspend();
        // Exit pointer lock on pause
        if (document.pointerLockElement) {
          document.exitPointerLock();
        }
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // ─── Flow transitions ──────────────────────────────────────────────────

  const handleTitleStart = useCallback(async () => {
    const audio = audioRef.current;
    const sceneMgr = sceneManagerRef.current;
    const gameState = gameStateRef.current;

    // Initialize audio on first user interaction
    if (audio && !audio.isRunning) {
      await audio.init();
    }

    // Load the first scene (or resume from save)
    const startScene: SceneId = gameState?.currentScene ?? 'radio-tower';
    if (sceneMgr) {
      await sceneMgr.loadScene(startScene);
    }

    // Start audio for the scene
    if (audio && gameState) {
      await audio.setScene(gameState.toAudioSceneName(startScene));
    }

    // Begin scene entry camera move
    const camCtrl = cameraCtrlRef.current;
    if (camCtrl) {
      camCtrl.startSceneEntry(
        new THREE.Vector3(0, 4, 25),
        new THREE.Vector3(0, 1.7, 15),
        new THREE.Vector3(0, 0, 0),
        4.0,
      );
    }

    setCurrentSceneId(startScene);
    setShowSceneTitle(true);
    setTimeout(() => setShowSceneTitle(false), 4000);
    setFlowState('playing');
  }, []);

  const handleResume = useCallback(() => {
    setFlowState('playing');
    audioRef.current?.resume();
  }, []);

  const handleRestart = useCallback(async () => {
    const gameState = gameStateRef.current;
    gameState?.reset();

    setFlowState('title');
    setCurrentSceneId(null);
    setShowSceneTitle(false);
    setInteractHint(null);

    audioRef.current?.destroy();
  }, []);

  const handleQuit = useCallback(() => {
    // Navigate back to main site
    window.location.href = '/';
  }, []);

  // ─── Render ─────────────────────────────────────────────────────────────

  return (
    <div
      className="relative w-full h-screen overflow-hidden"
      style={{ background: INDIGO_HEX.voidBlack }}
    >
      {/* Three.js canvas container */}
      <div ref={containerRef} className="w-full h-full" />

      {/* Title screen */}
      <TitleScreen
        visible={flowState === 'title'}
        onStart={handleTitleStart}
      />

      {/* In-game UI overlay */}
      {flowState === 'playing' && (
        <GameUI
          currentScene={currentSceneId}
          interactionHint={interactHint}
          showSceneTitle={showSceneTitle}
          inDialogue={inDialogue}
        />
      )}

      {/* Pause menu */}
      <PauseMenu
        visible={flowState === 'paused'}
        onResume={handleResume}
        onRestart={handleRestart}
        onQuit={handleQuit}
      />

      {/* End screen */}
      {flowState === 'ended' && (
        <EndScreen
          onReplay={() => handleRestart().then(() => setFlowState('title'))}
          onQuit={handleQuit}
        />
      )}

      {/* Dev FPS counter */}
      {process.env.NODE_ENV === 'development' && (
        <div
          ref={fpsRef}
          className="absolute bottom-4 right-4 font-mono text-[11px] text-violet-300/60 pointer-events-none select-none z-50"
        />
      )}
    </div>
  );
}

// ─── End Screen ──────────────────────────────────────────────────────────────

function EndScreen({ onReplay, onQuit }: { onReplay: () => void; onQuit: () => void }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      className="absolute inset-0 z-30 flex flex-col items-center justify-center select-none"
      style={{
        background: INDIGO_HEX.voidBlack,
        opacity: visible ? 1 : 0,
        transition: 'opacity 2s ease',
      }}
    >
      <p
        className="font-eb-garamond italic tracking-wider mb-4"
        style={{
          color: INDIGO_HEX.pearlWhite,
          fontSize: 'clamp(1rem, 2.5vw, 1.4rem)',
          opacity: 0.7,
          textShadow: '0 0 20px rgba(107, 63, 160, 0.3)',
        }}
      >
        The frequency fades.
      </p>
      <p
        className="font-eb-garamond tracking-wider mb-12"
        style={{
          color: INDIGO_HEX.signalViolet,
          fontSize: 'clamp(0.75rem, 1.5vw, 0.9rem)',
          opacity: 0.5,
        }}
      >
        But something was received.
      </p>

      <div className="flex gap-6">
        <button
          onClick={onReplay}
          className="font-eb-garamond tracking-wider px-6 py-2 cursor-pointer transition-all duration-300"
          style={{
            color: INDIGO_HEX.pearlWhite,
            fontSize: '0.9rem',
            background: 'transparent',
            border: `1px solid rgba(107, 63, 160, 0.3)`,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'rgba(107, 63, 160, 0.6)';
            e.currentTarget.style.background = 'rgba(107, 63, 160, 0.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'rgba(107, 63, 160, 0.3)';
            e.currentTarget.style.background = 'transparent';
          }}
        >
          Tune in again
        </button>
        <button
          onClick={onQuit}
          className="font-eb-garamond tracking-wider px-6 py-2 cursor-pointer transition-all duration-300"
          style={{
            color: INDIGO_HEX.pearlWhite,
            fontSize: '0.9rem',
            opacity: 0.5,
            background: 'transparent',
            border: '1px solid transparent',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = '0.8';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = '0.5';
          }}
        >
          Leave
        </button>
      </div>
    </div>
  );
}
