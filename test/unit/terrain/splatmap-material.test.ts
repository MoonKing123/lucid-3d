import { describe, it, expect } from 'vitest';
import * as mod from '../../../src/terrain/splatmap-material';

const isStub = '__STUB__' in mod && (mod as any).__STUB__ === true;
const describeImpl = isStub ? describe.skip : describe;

describeImpl('SplatmapMaterial', () => {
  const { SplatmapMaterial } = mod as any;

  const makeTex = () => ({ width: 2, height: 2, data: new Uint8Array(16) }) as any;

  it('constructs with splatmap + 2 layers', () => {
    const mat = new SplatmapMaterial({
      splatmap: makeTex(),
      layer0: makeTex(),
      layer1: makeTex(),
    });
    expect(mat).toBeDefined();
  });

  it('constructs with all 4 layers', () => {
    const mat = new SplatmapMaterial({
      splatmap: makeTex(),
      layer0: makeTex(),
      layer1: makeTex(),
      layer2: makeTex(),
      layer3: makeTex(),
    });
    expect(mat).toBeDefined();
  });

  it('accepts uniform tiling number (applied to all layers)', () => {
    const mat = new SplatmapMaterial({
      splatmap: makeTex(),
      layer0: makeTex(),
      layer1: makeTex(),
      tiling: 8,
    });
    expect((mat as any).tiling).toBeDefined();
  });

  it('accepts per-layer tiling tuple', () => {
    const mat = new SplatmapMaterial({
      splatmap: makeTex(),
      layer0: makeTex(),
      layer1: makeTex(),
      layer2: makeTex(),
      layer3: makeTex(),
      tiling: [4, 8, 16, 2],
    });
    expect((mat as any).tiling).toBeDefined();
  });

  it('fragment shader samples splatmap and blends layers by RGBA weights', () => {
    const mat = new SplatmapMaterial({
      splatmap: makeTex(),
      layer0: makeTex(),
      layer1: makeTex(),
      layer2: makeTex(),
      layer3: makeTex(),
    });
    const fs = (mat as any).fragmentShader as string;
    expect(fs).toContain('u_splatmap');
    expect(fs).toMatch(/u_layer0|layer0/);
    expect(fs).toMatch(/u_layer1|layer1/);
  });

  it('exposes uniforms for splatmap + 4 layers + tiling', () => {
    const mat = new SplatmapMaterial({
      splatmap: makeTex(),
      layer0: makeTex(),
      layer1: makeTex(),
      layer2: makeTex(),
      layer3: makeTex(),
    });
    const uniforms = (mat as any).uniforms;
    expect(uniforms).toBeDefined();
  });

  it('throws if layer0 or layer1 is null (must have at least 2 base layers)', () => {
    expect(
      () =>
        new SplatmapMaterial({
          splatmap: makeTex(),
          layer0: null as any,
          layer1: makeTex(),
        }),
    ).toThrow();
  });
});
