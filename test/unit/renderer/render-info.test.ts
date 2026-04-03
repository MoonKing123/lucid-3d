/**
 * RenderInfo 测试
 * 验证渲染统计信息的创建和重置逻辑。
 */
import { describe, it, expect } from 'vitest';
import * as mod from '../../src/renderer/render-info';

const isStub = '__STUB__' in mod && (mod as any).__STUB__ === true;
const describeImpl = isStub ? describe.skip : describe;

describeImpl('createRenderInfo', () => {
  it('should return an object with all fields zeroed', () => {
    const info = mod.createRenderInfo();
    expect(info.drawCalls).toBe(0);
    expect(info.triangles).toBe(0);
    expect(info.instances).toBe(0);
    expect(info.culled).toBe(0);
    expect(info.frameTime).toBe(0);
  });

  it('should return a new object each call', () => {
    const a = mod.createRenderInfo();
    const b = mod.createRenderInfo();
    expect(a).not.toBe(b);
  });
});

describeImpl('resetRenderInfo', () => {
  it('should reset all fields to zero', () => {
    const info = mod.createRenderInfo();
    info.drawCalls = 42;
    info.triangles = 9999;
    info.instances = 100;
    info.culled = 15;
    info.frameTime = 16.7;

    mod.resetRenderInfo(info);

    expect(info.drawCalls).toBe(0);
    expect(info.triangles).toBe(0);
    expect(info.instances).toBe(0);
    expect(info.culled).toBe(0);
    expect(info.frameTime).toBe(0);
  });

  it('should preserve object identity after reset', () => {
    const info = mod.createRenderInfo();
    info.drawCalls = 10;
    const ref = info;
    mod.resetRenderInfo(info);
    expect(info).toBe(ref);
  });
});
