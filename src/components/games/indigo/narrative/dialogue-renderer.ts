/**
 * DialogueRenderer — floating poetic text in 3D space.
 *
 * Uses a DOM overlay positioned via Three.js world-to-screen projection
 * rather than CSS3DRenderer, keeping the rendering pipeline simple and
 * the text sharp at any resolution. EB Garamond, pale opal white,
 * words fading in one at a time like thoughts surfacing.
 */

import * as THREE from 'three';

// ─── Configuration ───────────────────────────────────────────────────────────

const TEXT_COLOR = '#e8dff5';
const TEXT_SHADOW = '0 0 12px rgba(107, 63, 160, 0.4), 0 0 24px rgba(26, 0, 51, 0.3)';
const WORD_FADE_DURATION = 280; // ms per word fade-in
const LINE_HOLD_DURATION = 2500; // ms to hold a completed line before fading out
const LINE_FADE_OUT_DURATION = 800; // ms for line fade-out
const LINE_SPACING = 1.6; // em
const MAX_VISIBLE_LINES = 4;

// ─── Types ───────────────────────────────────────────────────────────────────

interface ActiveLine {
  element: HTMLDivElement;
  words: HTMLSpanElement[];
  /** Index of the next word to reveal. */
  revealIndex: number;
  /** Timestamp when the last word was revealed. */
  lastRevealTime: number;
  /** Is the line fully revealed? */
  complete: boolean;
  /** Timestamp when the line became fully revealed. */
  completeTime: number;
  /** Is the line fading out? */
  fadingOut: boolean;
}

export type DialogueRendererConfig = {
  /** The container element to append the overlay to. */
  container: HTMLElement;
  /** The Three.js camera for world-to-screen projection. */
  camera: THREE.PerspectiveCamera;
};

// ─── Renderer ────────────────────────────────────────────────────────────────

export class DialogueRenderer {
  private container: HTMLElement;
  private camera: THREE.PerspectiveCamera;

  /** Root overlay element for all dialogue text. */
  private overlay: HTMLDivElement;
  /** The inner container that positions text near the character. */
  private textContainer: HTMLDivElement;

  /** Active lines being displayed. */
  private activeLines: ActiveLine[] = [];

  /** World position where text should appear. */
  private worldAnchor = new THREE.Vector3();

  /** Is the renderer currently showing dialogue? */
  private active = false;

  /** Callback when a line finishes its typewriter reveal. */
  onLineComplete: ((lineIndex: number) => void) | null = null;
  /** Callback when a line finishes fading out. */
  onLineFadedOut: ((lineIndex: number) => void) | null = null;

  constructor(config: DialogueRendererConfig) {
    this.container = config.container;
    this.camera = config.camera;

    // Create overlay
    this.overlay = document.createElement('div');
    this.overlay.style.cssText = `
      position: absolute;
      top: 0; left: 0;
      width: 100%; height: 100%;
      pointer-events: none;
      overflow: hidden;
      z-index: 10;
    `;

    // Text container — positioned via JS each frame
    this.textContainer = document.createElement('div');
    this.textContainer.style.cssText = `
      position: absolute;
      transform: translate(-50%, -100%);
      text-align: center;
      max-width: 480px;
      padding: 0 20px;
      transition: opacity 0.4s ease;
    `;

    this.overlay.appendChild(this.textContainer);
    this.container.appendChild(this.overlay);
  }

  // ─── Public API ──────────────────────────────────────────────────────────

  /** Set the world-space anchor point for text placement. */
  setAnchor(position: THREE.Vector3): void {
    this.worldAnchor.copy(position);
  }

  /**
   * Begin showing a new line of dialogue with typewriter effect.
   * Slashes in text are treated as line breaks within the stanza.
   */
  addLine(text: string, lineIndex: number): void {
    this.active = true;
    this.overlay.style.display = '';

    // Parse slashes into line breaks
    const displayText = text.replace(/\s*\/\s*/g, '\n');

    const lineEl = document.createElement('div');
    lineEl.style.cssText = `
      font-family: 'EB Garamond', serif;
      font-size: 1.2rem;
      font-weight: 400;
      font-style: italic;
      line-height: ${LINE_SPACING};
      letter-spacing: 0.04em;
      color: ${TEXT_COLOR};
      text-shadow: ${TEXT_SHADOW};
      margin-bottom: 0.8em;
      opacity: 1;
      transition: opacity ${LINE_FADE_OUT_DURATION}ms ease;
      white-space: pre-line;
    `;

    // Split into words, preserving newlines
    const words: HTMLSpanElement[] = [];
    const segments = displayText.split(/(\s+)/);

    for (const segment of segments) {
      if (segment === '\n') {
        lineEl.appendChild(document.createElement('br'));
        continue;
      }
      if (/^\s+$/.test(segment) && !segment.includes('\n')) {
        // Whitespace between words
        const space = document.createTextNode(' ');
        lineEl.appendChild(space);
        continue;
      }
      if (segment.trim() === '') continue;

      const span = document.createElement('span');
      span.textContent = segment;
      span.style.cssText = `
        opacity: 0;
        transition: opacity ${WORD_FADE_DURATION}ms ease;
        display: inline;
      `;
      words.push(span);
      lineEl.appendChild(span);
    }

    this.textContainer.appendChild(lineEl);

    const activeLine: ActiveLine = {
      element: lineEl,
      words,
      revealIndex: 0,
      lastRevealTime: performance.now(),
      complete: false,
      completeTime: 0,
      fadingOut: false,
    };

    this.activeLines.push(activeLine);

    // Trim old lines
    while (this.activeLines.length > MAX_VISIBLE_LINES) {
      const old = this.activeLines.shift();
      if (old) {
        old.element.remove();
      }
    }
  }

  /** Force-complete the current line's typewriter (reveal all words). */
  completeCurrentLine(): void {
    const current = this.activeLines[this.activeLines.length - 1];
    if (!current || current.complete) return;

    for (let i = current.revealIndex; i < current.words.length; i++) {
      current.words[i].style.opacity = '1';
    }
    current.revealIndex = current.words.length;
    current.complete = true;
    current.completeTime = performance.now();
  }

  /** Start fading out the most recent completed line. */
  fadeOutCurrentLine(lineIndex: number): void {
    const line = this.activeLines.find(
      (_, idx) => idx === this.activeLines.length - 1
    );
    if (!line) return;

    line.fadingOut = true;
    line.element.style.opacity = '0';

    setTimeout(() => {
      line.element.remove();
      const idx = this.activeLines.indexOf(line);
      if (idx >= 0) this.activeLines.splice(idx, 1);
      this.onLineFadedOut?.(lineIndex);
    }, LINE_FADE_OUT_DURATION);
  }

  /** Fade out all visible text and reset. */
  clear(): void {
    for (const line of this.activeLines) {
      line.element.style.opacity = '0';
    }
    setTimeout(() => {
      for (const line of this.activeLines) {
        line.element.remove();
      }
      this.activeLines = [];
      this.active = false;
    }, LINE_FADE_OUT_DURATION);
  }

  /** Call once per frame to update word reveals and screen positioning. */
  update(): void {
    if (!this.active) return;

    const now = performance.now();

    // Update typewriter reveals
    for (const line of this.activeLines) {
      if (line.complete || line.fadingOut) continue;

      if (
        line.revealIndex < line.words.length &&
        now - line.lastRevealTime >= WORD_FADE_DURATION
      ) {
        line.words[line.revealIndex].style.opacity = '1';
        line.revealIndex++;
        line.lastRevealTime = now;

        if (line.revealIndex >= line.words.length) {
          line.complete = true;
          line.completeTime = now;
          // Notify
          const lineIdx = this.activeLines.indexOf(line);
          this.onLineComplete?.(lineIdx);
        }
      }
    }

    // Project world anchor to screen
    this.updateScreenPosition();
  }

  /** Remove the overlay from the DOM. */
  dispose(): void {
    this.activeLines = [];
    this.overlay.remove();
  }

  /** Show a 'spent' line — a single, quieter echo of the final thought. */
  showSpentLine(text: string): void {
    this.active = true;
    this.overlay.style.display = '';

    // Clear any existing
    for (const line of this.activeLines) {
      line.element.remove();
    }
    this.activeLines = [];

    const lineEl = document.createElement('div');
    lineEl.style.cssText = `
      font-family: 'EB Garamond', serif;
      font-size: 1rem;
      font-weight: 400;
      font-style: italic;
      line-height: ${LINE_SPACING};
      letter-spacing: 0.04em;
      color: ${TEXT_COLOR};
      text-shadow: ${TEXT_SHADOW};
      opacity: 0;
      transition: opacity 1.2s ease;
      white-space: pre-line;
    `;
    lineEl.textContent = text.replace(/\s*\/\s*/g, '\n');

    this.textContainer.appendChild(lineEl);

    // Fade in slowly
    requestAnimationFrame(() => {
      lineEl.style.opacity = '0.5'; // Quieter than normal dialogue
    });

    this.activeLines.push({
      element: lineEl,
      words: [],
      revealIndex: 0,
      lastRevealTime: 0,
      complete: true,
      completeTime: performance.now(),
      fadingOut: false,
    });

    // Auto-fade after a few seconds
    setTimeout(() => {
      lineEl.style.opacity = '0';
      setTimeout(() => {
        lineEl.remove();
        this.activeLines = [];
        this.active = false;
      }, 1200);
    }, 3000);
  }

  // ─── Internal ──────────────────────────────────────────────────────────

  private updateScreenPosition(): void {
    // Project world anchor to NDC
    const projected = this.worldAnchor.clone().project(this.camera);

    // Check if behind camera
    if (projected.z > 1) {
      this.textContainer.style.display = 'none';
      return;
    }
    this.textContainer.style.display = '';

    // Convert NDC to screen pixels
    const rect = this.container.getBoundingClientRect();
    const x = (projected.x * 0.5 + 0.5) * rect.width;
    const y = (-projected.y * 0.5 + 0.5) * rect.height;

    this.textContainer.style.left = `${x}px`;
    this.textContainer.style.top = `${y}px`;
  }
}
