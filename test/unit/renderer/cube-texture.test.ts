import { describe, it, expect } from 'vitest';
import { CubeTexture, CubeTextureFace } from '../../../src/renderer/cube-texture';

const isStub = '__STUB__' in CubeTexture && (CubeTexture as any).__STUB__ === true;

// re-export 模块级 __STUB__ 检查
const mod = await import('../../../src/renderer/cube-texture');
const modIsStub = '__STUB__' in mod && (mod as any).__STUB__ === true;
const describeImpl = modIsStub ? describe.skip : describe;

describeImpl('CubeTexture', () => {
  const FACE_SIZE = 2; // 2×2 pixel faces
  const FACE_BYTES = FACE_SIZE * FACE_SIZE * 4; // RGBA

  function makeFaceData(fill = 0): Uint8Array {
    return new Uint8Array(FACE_BYTES).fill(fill);
  }

  // ── 构造函数 ──────────────────────────────────────────────────

  it('should create with specified face size', () => {
    const ct = new CubeTexture(FACE_SIZE);
    expect(ct.faceSize).toBe(FACE_SIZE);
  });

  it('should initialize all 6 faces as null', () => {
    const ct = new CubeTexture(FACE_SIZE);
    expect(ct.faces).toHaveLength(6);
    for (let i = 0; i < 6; i++) {
      expect(ct.faces[i]).toBeNull();
    }
  });

  it('should start with needsUpdate = false', () => {
    const ct = new CubeTexture(FACE_SIZE);
    expect(ct.needsUpdate).toBe(false);
  });

  // ── setFace ───────────────────────────────────────────────────

  it('should store face data at correct index', () => {
    const ct = new CubeTexture(FACE_SIZE);
    const data = makeFaceData(255);
    ct.setFace(CubeTextureFace.PositiveX, data);
    expect(ct.faces[0]).toBe(data);
  });

  it('should set needsUpdate after setFace', () => {
    const ct = new CubeTexture(FACE_SIZE);
    ct.setFace(CubeTextureFace.NegativeZ, makeFaceData());
    expect(ct.needsUpdate).toBe(true);
  });

  it('should reject face data with wrong byte length', () => {
    const ct = new CubeTexture(FACE_SIZE);
    const wrongSize = new Uint8Array(10); // not FACE_BYTES
    expect(() => ct.setFace(CubeTextureFace.PositiveY, wrongSize)).toThrow();
  });

  it('should allow overwriting a face', () => {
    const ct = new CubeTexture(FACE_SIZE);
    const data1 = makeFaceData(100);
    const data2 = makeFaceData(200);
    ct.setFace(CubeTextureFace.NegativeX, data1);
    ct.setFace(CubeTextureFace.NegativeX, data2);
    expect(ct.faces[CubeTextureFace.NegativeX]).toBe(data2);
  });

  // ── isComplete ────────────────────────────────────────────────

  it('should return false when no faces set', () => {
    const ct = new CubeTexture(FACE_SIZE);
    expect(ct.isComplete()).toBe(false);
  });

  it('should return false with partial faces', () => {
    const ct = new CubeTexture(FACE_SIZE);
    ct.setFace(CubeTextureFace.PositiveX, makeFaceData());
    ct.setFace(CubeTextureFace.NegativeX, makeFaceData());
    ct.setFace(CubeTextureFace.PositiveY, makeFaceData());
    expect(ct.isComplete()).toBe(false);
  });

  it('should return true when all 6 faces set', () => {
    const ct = new CubeTexture(FACE_SIZE);
    for (let i = 0; i < 6; i++) {
      ct.setFace(i as any, makeFaceData(i));
    }
    expect(ct.isComplete()).toBe(true);
  });

  // ── dispose ───────────────────────────────────────────────────

  it('should clear all faces on dispose', () => {
    const ct = new CubeTexture(FACE_SIZE);
    for (let i = 0; i < 6; i++) {
      ct.setFace(i as any, makeFaceData());
    }
    ct.dispose();
    for (let i = 0; i < 6; i++) {
      expect(ct.faces[i]).toBeNull();
    }
  });

  it('should be incomplete after dispose', () => {
    const ct = new CubeTexture(FACE_SIZE);
    for (let i = 0; i < 6; i++) {
      ct.setFace(i as any, makeFaceData());
    }
    ct.dispose();
    expect(ct.isComplete()).toBe(false);
  });

  // ── CubeTextureFace 常量 ──────────────────────────────────────

  it('should define face constants 0-5', () => {
    expect(CubeTextureFace.PositiveX).toBe(0);
    expect(CubeTextureFace.NegativeX).toBe(1);
    expect(CubeTextureFace.PositiveY).toBe(2);
    expect(CubeTextureFace.NegativeY).toBe(3);
    expect(CubeTextureFace.PositiveZ).toBe(4);
    expect(CubeTextureFace.NegativeZ).toBe(5);
  });
});
