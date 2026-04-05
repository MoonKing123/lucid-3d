/**
 * LineRenderer 测试 — LineGeometry + LineMaterial + Line
 * 验证 3D 线段渲染的数据容器、材质配置和场景图集成。
 */

import { describe, it, expect } from 'vitest';
import { vec3 } from '../../../src/math/vec3';
import * as mod from '../../../src/renderer/line-renderer';

const isStub = '__STUB__' in mod && (mod as any).__STUB__ === true;
const describeImpl = isStub ? describe.skip : describe;

describeImpl('LineGeometry', () => {
  it('creates from array of Vec3 points', () => {
    const geo = new mod.LineGeometry({
      points: [vec3(0, 0, 0), vec3(1, 0, 0), vec3(1, 1, 0)],
    });
    // 3 points × 3 floats = 9
    expect(geo.positions.length).toBe(9);
    expect(geo.positions[0]).toBe(0);
    expect(geo.positions[3]).toBe(1);
    expect(geo.positions[7]).toBe(1);
  });

  it('supports per-vertex colors', () => {
    const geo = new mod.LineGeometry({
      points: [vec3(0, 0, 0), vec3(1, 0, 0)],
      colors: [vec3(1, 0, 0), vec3(0, 1, 0)],
    });
    expect(geo.colors.length).toBe(6);
    expect(geo.colors[0]).toBe(1); // R of first vertex
    expect(geo.colors[3]).toBe(0); // R of second vertex
    expect(geo.colors[4]).toBe(1); // G of second vertex
  });

  it('defaults to white when no colors specified', () => {
    const geo = new mod.LineGeometry({
      points: [vec3(0, 0, 0), vec3(1, 0, 0)],
    });
    // 2 vertices × 3 floats = 6, all 1.0 (white)
    expect(geo.colors.length).toBe(6);
    for (let i = 0; i < 6; i++) {
      expect(geo.colors[i]).toBe(1);
    }
  });

  it('setPoints updates positions buffer', () => {
    const geo = new mod.LineGeometry({
      points: [vec3(0, 0, 0), vec3(1, 0, 0)],
    });
    expect(geo.positions.length).toBe(6);

    geo.setPoints([vec3(0, 0, 0), vec3(2, 0, 0), vec3(2, 2, 0)]);
    expect(geo.positions.length).toBe(9);
    expect(geo.positions[3]).toBe(2);
  });

  it('setColors updates colors buffer', () => {
    const geo = new mod.LineGeometry({
      points: [vec3(0, 0, 0), vec3(1, 0, 0)],
    });
    geo.setColors([vec3(1, 0, 0), vec3(0, 0, 1)]);
    expect(geo.colors[0]).toBe(1); // R
    expect(geo.colors[5]).toBe(1); // B of second
  });

  it('pointCount returns number of points', () => {
    const geo = new mod.LineGeometry({
      points: [vec3(0, 0, 0), vec3(1, 0, 0), vec3(2, 0, 0), vec3(3, 0, 0)],
    });
    expect(geo.pointCount).toBe(4);
  });
});

describeImpl('LineMaterial', () => {
  it('creates with default color white and lineWidth 1', () => {
    const mat = new mod.LineMaterial();
    expect(mat.color).toEqual(vec3(1, 1, 1));
    expect(mat.lineWidth).toBe(1);
    expect(mat.opacity).toBe(1);
  });

  it('accepts custom color and lineWidth', () => {
    const mat = new mod.LineMaterial({ color: vec3(1, 0, 0), lineWidth: 3 });
    expect(mat.color).toEqual(vec3(1, 0, 0));
    expect(mat.lineWidth).toBe(3);
  });

  it('supports opacity', () => {
    const mat = new mod.LineMaterial({ opacity: 0.5 });
    expect(mat.opacity).toBe(0.5);
  });
});

describeImpl('Line', () => {
  it('is a Node3D with geometry, material, and drawMode', () => {
    const geo = new mod.LineGeometry({ points: [vec3(0, 0, 0), vec3(1, 1, 1)] });
    const mat = new mod.LineMaterial({ color: vec3(0, 1, 0) });
    const line = new mod.Line(geo, mat);
    expect(line.geometry).toBe(geo);
    expect(line.material).toBe(mat);
  });

  it('defaults to LINE_STRIP drawMode', () => {
    const line = new mod.Line(
      new mod.LineGeometry({ points: [vec3(0, 0, 0), vec3(1, 0, 0)] }),
    );
    expect(line.drawMode).toBe('LINE_STRIP');
  });

  it('accepts explicit LINES drawMode', () => {
    const line = new mod.Line(
      new mod.LineGeometry({ points: [vec3(0, 0, 0), vec3(1, 0, 0)] }),
      new mod.LineMaterial(),
      'LINES',
    );
    expect(line.drawMode).toBe('LINES');
  });

  it('accepts LINE_LOOP drawMode', () => {
    const line = new mod.Line(
      new mod.LineGeometry({ points: [vec3(0, 0, 0), vec3(1, 0, 0), vec3(0, 1, 0)] }),
      new mod.LineMaterial(),
      'LINE_LOOP',
    );
    expect(line.drawMode).toBe('LINE_LOOP');
  });

  it('creates default LineMaterial when none provided', () => {
    const line = new mod.Line(
      new mod.LineGeometry({ points: [vec3(0, 0, 0), vec3(1, 0, 0)] }),
    );
    expect(line.material).toBeInstanceOf(mod.LineMaterial);
  });

  it('inherits Node3D transform — position, rotation, scale', () => {
    const line = new mod.Line(
      new mod.LineGeometry({ points: [vec3(0, 0, 0), vec3(1, 0, 0)] }),
    );
    line.position = vec3(5, 10, 0);
    expect(line.position).toEqual(vec3(5, 10, 0));
    expect(line.worldMatrix).toBeDefined();
  });
});
