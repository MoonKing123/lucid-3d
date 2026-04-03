/**
 * SceneManager — pre-written tests (Architect)
 * Validates: register, loadScene, unload, update delegation, activeScene
 */
import { describe, it, expect, vi } from 'vitest';
import * as mod from '../../../src/core/scene-manager';
import { Node3D } from '../../../src/core/node3d';

const isStub = '__STUB__' in mod && (mod as any).__STUB__ === true;
const describeImpl = isStub ? describe.skip : describe;

function makeScene(name: string, overrides?: Partial<mod.GameScene>): mod.GameScene {
  return {
    name,
    init: vi.fn(),
    update: vi.fn(),
    cleanup: vi.fn(),
    ...overrides,
  };
}

describeImpl('SceneManager', () => {
  /* ---------- construction ---------- */

  it('should start with no active scene', () => {
    const mgr = new mod.SceneManager();
    expect(mgr.activeScene).toBeNull();
    expect(mgr.activeRoot).toBeNull();
  });

  /* ---------- register ---------- */

  it('should register a scene without loading it', () => {
    const mgr = new mod.SceneManager();
    const scene = makeScene('menu');
    mgr.register(scene);
    expect(mgr.activeScene).toBeNull();
  });

  it('should throw when registering duplicate scene name', () => {
    const mgr = new mod.SceneManager();
    mgr.register(makeScene('menu'));
    expect(() => mgr.register(makeScene('menu'))).toThrow();
  });

  /* ---------- loadScene ---------- */

  it('should load a registered scene', () => {
    const mgr = new mod.SceneManager();
    const scene = makeScene('menu');
    mgr.register(scene);
    mgr.loadScene('menu');
    expect(mgr.activeScene).toBe(scene);
  });

  it('should call init with a fresh Node3D root', () => {
    const mgr = new mod.SceneManager();
    const scene = makeScene('menu');
    mgr.register(scene);
    mgr.loadScene('menu');
    expect(scene.init).toHaveBeenCalledOnce();
    const root = (scene.init as any).mock.calls[0][0];
    expect(root).toBeInstanceOf(Node3D);
  });

  it('should provide activeRoot after loading', () => {
    const mgr = new mod.SceneManager();
    mgr.register(makeScene('game'));
    mgr.loadScene('game');
    expect(mgr.activeRoot).toBeInstanceOf(Node3D);
  });

  it('should throw when loading unregistered scene', () => {
    const mgr = new mod.SceneManager();
    expect(() => mgr.loadScene('nonexistent')).toThrow();
  });

  /* ---------- scene switching ---------- */

  it('should cleanup previous scene when loading new one', () => {
    const mgr = new mod.SceneManager();
    const menu = makeScene('menu');
    const game = makeScene('game');
    mgr.register(menu);
    mgr.register(game);
    mgr.loadScene('menu');
    mgr.loadScene('game');
    expect(menu.cleanup).toHaveBeenCalledOnce();
    expect(mgr.activeScene).toBe(game);
  });

  it('should call cleanup before init of new scene', () => {
    const mgr = new mod.SceneManager();
    const menu = makeScene('menu');
    const game = makeScene('game');
    mgr.register(menu);
    mgr.register(game);
    mgr.loadScene('menu');
    mgr.loadScene('game');
    expect((menu.cleanup as any).mock.invocationCallOrder[0]).toBeLessThan(
      (game.init as any).mock.invocationCallOrder[0],
    );
  });

  it('should create a new root for each scene load', () => {
    const mgr = new mod.SceneManager();
    const scene = makeScene('menu');
    mgr.register(scene);
    mgr.loadScene('menu');
    const root1 = mgr.activeRoot;
    // reload same scene
    mgr.loadScene('menu');
    const root2 = mgr.activeRoot;
    expect(root1).not.toBe(root2);
  });

  /* ---------- update ---------- */

  it('should delegate update to active scene', () => {
    const mgr = new mod.SceneManager();
    const scene = makeScene('game');
    mgr.register(scene);
    mgr.loadScene('game');
    mgr.update(0.016);
    expect(scene.update).toHaveBeenCalledWith(0.016);
  });

  it('should not throw when updating with no active scene', () => {
    const mgr = new mod.SceneManager();
    expect(() => mgr.update(0.016)).not.toThrow();
  });

  it('should handle scene without update method', () => {
    const mgr = new mod.SceneManager();
    const scene: mod.GameScene = { name: 'simple', init: vi.fn() };
    mgr.register(scene);
    mgr.loadScene('simple');
    expect(() => mgr.update(0.016)).not.toThrow();
  });

  /* ---------- unloadCurrent ---------- */

  it('should unload current scene and reset state', () => {
    const mgr = new mod.SceneManager();
    const scene = makeScene('menu');
    mgr.register(scene);
    mgr.loadScene('menu');
    mgr.unloadCurrent();
    expect(scene.cleanup).toHaveBeenCalledOnce();
    expect(mgr.activeScene).toBeNull();
    expect(mgr.activeRoot).toBeNull();
  });

  it('should not throw when unloading with no active scene', () => {
    const mgr = new mod.SceneManager();
    expect(() => mgr.unloadCurrent()).not.toThrow();
  });
});
