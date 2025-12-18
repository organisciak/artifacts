import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { GameManager } from '../GameManager';

const ensureWindow = () => {
  const globalAny = globalThis as any;
  if (!globalAny.window) {
    globalAny.window = { devicePixelRatio: 1 };
  } else if (typeof globalAny.window.devicePixelRatio === 'undefined') {
    globalAny.window.devicePixelRatio = 1;
  }
};

describe('GameManager spawn interval balancing', () => {
  beforeEach(() => {
    ensureWindow();
  });

  const createManager = () => {
    const canvas = {
      width: 800,
      height: 600
    } as unknown as HTMLCanvasElement;

    return new GameManager(canvas);
  };

  it('reduces spawn interval when the score increases', () => {
    const manager = createManager();
    const config = (manager as any).config;
    const baseInterval = config.spawnInterval;

    (manager as any).score = 5000;
    (manager as any).enemyFish = new Array(config.baseEnemyCount).fill(null);

    const interval = (manager as any).getCurrentSpawnInterval();
    assert.ok(interval < baseInterval, 'higher scores should spawn fish faster');
  });

  it('reduces spawn interval when there is an enemy deficit', () => {
    const manager = createManager();
    const config = (manager as any).config;
    const baseInterval = config.spawnInterval;

    (manager as any).score = 0;
    (manager as any).enemyFish = [];

    const interval = (manager as any).getCurrentSpawnInterval();
    assert.ok(interval < baseInterval, 'missing enemies should hasten spawns');
  });

  it('never drops below the configured minimum spawn interval', () => {
    const manager = createManager();
    const config = (manager as any).config;

    (manager as any).score = 1_000_000;
    (manager as any).enemyFish = [];

    const interval = (manager as any).getCurrentSpawnInterval();
    assert.equal(interval, config.minSpawnInterval);
  });
});
