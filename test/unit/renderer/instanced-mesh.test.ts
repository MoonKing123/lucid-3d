/**
 * InstancedMesh 测试
 * 验证实例化渲染的数据管理 API：per-instance 变换矩阵和颜色。
 */
import { describe, it, expect } from 'vitest';
import * as mod from '../../src/renderer/instanced-mesh';
import { Geometry } from '../../src/renderer/geometry';
import { Material } from '../../src/renderer/material';
import { identity, translate } from '../../src/math/mat4';
import { vec3 } from '../../src/math/vec3';
import { Mesh } from '../../src/renderer/mesh';

const isStub = '__STUB__' in mod && (mod as any).__STUB__ === true;
const describeImpl = isStub ? describe.skip : describe;

/* ---------- helpers ---------- */

function triGeo(): Geometry {
  return new Geometry({
    positions: new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]),
  });
}

function dummyMat(): Material {
  return new Material(
    'precision mediump float;attribute vec3 a_position;uniform mat4 u_mvp;void main(){gl_Position=u_mvp*vec4(a_position,1.0);}',
    'precision mediump float;void main(){gl_FragColor=vec4(1.0);}',
  );
}

/* ---------- 构造 ---------- */

describeImpl('InstancedMesh construction', () => {
  it('should create with given count', () => {
    const im = new mod.InstancedMesh(triGeo(), dummyMat(), 10);
    expect(im.count).toBe(10);
    expect(im.instanceMatrix.length).toBe(10 * 16);
  });

  it('should extend Mesh', () => {
    const im = new mod.InstancedMesh(triGeo(), dummyMat(), 1);
    expect(im).toBeInstanceOf(Mesh);
  });

  it('should initialize all matrices to identity', () => {
    const im = new mod.InstancedMesh(triGeo(), dummyMat(), 3);
    const id = identity();
    for (let i = 0; i < 3; i++) {
      const m = im.getMatrixAt(i);
      for (let j = 0; j < 16; j++) {
        expect(m[j]).toBeCloseTo(id[j]);
      }
    }
  });

  it('should have null instanceColor by default', () => {
    const im = new mod.InstancedMesh(triGeo(), dummyMat(), 5);
    expect(im.instanceColor).toBeNull();
  });
});

/* ---------- Matrix 操作 ---------- */

describeImpl('InstancedMesh matrix operations', () => {
  it('should set and get matrix at index', () => {
    const im = new mod.InstancedMesh(triGeo(), dummyMat(), 5);
    const m = translate(identity(), vec3(1, 2, 3));
    im.setMatrixAt(2, m);
    const got = im.getMatrixAt(2);
    for (let i = 0; i < 16; i++) {
      expect(got[i]).toBeCloseTo(m[i]);
    }
  });

  it('should not affect other indices when setting one', () => {
    const im = new mod.InstancedMesh(triGeo(), dummyMat(), 3);
    const m = translate(identity(), vec3(5, 5, 5));
    im.setMatrixAt(1, m);

    // index 0 should still be identity
    const id = identity();
    const got0 = im.getMatrixAt(0);
    for (let i = 0; i < 16; i++) {
      expect(got0[i]).toBeCloseTo(id[i]);
    }
  });

  it('should throw RangeError for negative index', () => {
    const im = new mod.InstancedMesh(triGeo(), dummyMat(), 5);
    expect(() => im.setMatrixAt(-1, identity())).toThrow(RangeError);
    expect(() => im.getMatrixAt(-1)).toThrow(RangeError);
  });

  it('should throw RangeError for out-of-bounds index', () => {
    const im = new mod.InstancedMesh(triGeo(), dummyMat(), 5);
    expect(() => im.setMatrixAt(5, identity())).toThrow(RangeError);
    expect(() => im.getMatrixAt(5)).toThrow(RangeError);
  });
});

/* ---------- Color 操作 ---------- */

describeImpl('InstancedMesh color operations', () => {
  it('should allocate instanceColor on first setColorAt', () => {
    const im = new mod.InstancedMesh(triGeo(), dummyMat(), 3);
    expect(im.instanceColor).toBeNull();
    im.setColorAt(0, vec3(1, 0, 0));
    expect(im.instanceColor).not.toBeNull();
    expect(im.instanceColor!.length).toBe(3 * 3);
  });

  it('should set and get color correctly', () => {
    const im = new mod.InstancedMesh(triGeo(), dummyMat(), 5);
    im.setColorAt(3, vec3(0.2, 0.4, 0.6));
    const c = im.getColorAt(3);
    expect(c[0]).toBeCloseTo(0.2);
    expect(c[1]).toBeCloseTo(0.4);
    expect(c[2]).toBeCloseTo(0.6);
  });

  it('should return white when no color has been set', () => {
    const im = new mod.InstancedMesh(triGeo(), dummyMat(), 2);
    const c = im.getColorAt(0);
    expect(c[0]).toBeCloseTo(1);
    expect(c[1]).toBeCloseTo(1);
    expect(c[2]).toBeCloseTo(1);
  });

  it('should initialize unset colors to white on first setColorAt', () => {
    const im = new mod.InstancedMesh(triGeo(), dummyMat(), 3);
    im.setColorAt(1, vec3(1, 0, 0));
    // index 0 and 2 should default to white
    const c0 = im.getColorAt(0);
    expect(c0[0]).toBeCloseTo(1);
    expect(c0[1]).toBeCloseTo(1);
    expect(c0[2]).toBeCloseTo(1);
  });

  it('should throw RangeError for out-of-bounds color index', () => {
    const im = new mod.InstancedMesh(triGeo(), dummyMat(), 3);
    expect(() => im.setColorAt(3, vec3(1, 0, 0))).toThrow(RangeError);
    expect(() => im.getColorAt(-1)).toThrow(RangeError);
  });
});

/* ---------- 大规模实例 ---------- */

describeImpl('InstancedMesh large count', () => {
  it('should handle 1000 instances', () => {
    const im = new mod.InstancedMesh(triGeo(), dummyMat(), 1000);
    expect(im.count).toBe(1000);
    expect(im.instanceMatrix.length).toBe(1000 * 16);

    // 设置最后一个
    const m = translate(identity(), vec3(999, 0, 0));
    im.setMatrixAt(999, m);
    const got = im.getMatrixAt(999);
    expect(got[12]).toBeCloseTo(999); // tx in column-major
  });
});
