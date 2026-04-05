import { describe, it, expect } from 'vitest';
import { SpotLight } from '../../../src/core/spot-light';
import { vec3 } from '../../../src/math/vec3';
import { Scene } from '../../../src/core/scene';
import { Node3D } from '../../../src/core/node3d';

describe('SpotLight', () => {
  it('creates with default values', () => {
    const light = new SpotLight();
    expect(light.color).toEqual(vec3(1, 1, 1));
    expect(light.intensity).toBe(1);
    expect(light.distance).toBe(0);
    expect(light.decay).toBe(2);
    expect(light.angle).toBeCloseTo(Math.PI / 4);
    expect(light.penumbra).toBe(0);
    expect(light.direction).toEqual(vec3(0, -1, 0));
  });

  it('creates with custom options', () => {
    const light = new SpotLight({
      color: vec3(1, 0, 0),
      intensity: 2,
      distance: 50,
      decay: 1,
      angle: Math.PI / 6,
      penumbra: 0.5,
      direction: vec3(0, 0, -1),
    });
    expect(light.color).toEqual(vec3(1, 0, 0));
    expect(light.intensity).toBe(2);
    expect(light.distance).toBe(50);
    expect(light.decay).toBe(1);
    expect(light.angle).toBeCloseTo(Math.PI / 6);
    expect(light.penumbra).toBe(0.5);
    expect(light.direction).toEqual(vec3(0, 0, -1));
  });

  it('is a Node3D — can be added to scene graph', () => {
    const scene = new Scene();
    const light = new SpotLight();
    scene.addChild(light);
    expect(scene.children).toContain(light);
  });

  it('computes worldPosition from worldMatrix', () => {
    const light = new SpotLight();
    light.position = vec3(10, 5, -3);
    const wp = light.worldPosition;
    expect(wp[0]).toBeCloseTo(10);
    expect(wp[1]).toBeCloseTo(5);
    expect(wp[2]).toBeCloseTo(-3);
  });

  it('worldDirection defaults to (0, -1, 0) without parent rotation', () => {
    const light = new SpotLight();
    const wd = light.worldDirection;
    expect(wd[0]).toBeCloseTo(0);
    expect(wd[1]).toBeCloseTo(-1);
    expect(wd[2]).toBeCloseTo(0);
  });

  it('worldDirection respects parent transform', () => {
    const parent = new Node3D('holder');
    parent.rotation = vec3(0, Math.PI / 2, 0); // 绕Y转90度
    const light = new SpotLight({ direction: vec3(0, 0, -1) });
    parent.addChild(light);
    const wd = light.worldDirection;
    // 绕Y旋转90度后，(0,0,-1) → (-1,0,0) 大致方向
    expect(Math.abs(wd[0])).toBeGreaterThan(0.9);
  });

  it('clamps angle to [0, PI/2]', () => {
    const light1 = new SpotLight({ angle: Math.PI }); // 超过 PI/2
    expect(light1.angle).toBeLessThanOrEqual(Math.PI / 2);
    const light2 = new SpotLight({ angle: -1 });
    expect(light2.angle).toBeGreaterThanOrEqual(0);
  });

  it('clamps penumbra to [0, 1]', () => {
    const light1 = new SpotLight({ penumbra: 2 });
    expect(light1.penumbra).toBeLessThanOrEqual(1);
    const light2 = new SpotLight({ penumbra: -0.5 });
    expect(light2.penumbra).toBeGreaterThanOrEqual(0);
  });

  it('is collected by Scene.collectLights() in spot array', () => {
    const scene = new Scene();
    scene.addChild(new SpotLight({ color: vec3(1, 0, 0), intensity: 2 }));
    scene.addChild(new SpotLight({ color: vec3(0, 1, 0) }));
    const lights = scene.collectLights();
    expect(lights.spot).toBeDefined();
    expect(lights.spot.length).toBe(2);
    expect(lights.spot[0].color).toEqual(vec3(1, 0, 0));
    expect(lights.spot[0].intensity).toBe(2);
  });

  it('getAttenuationAt returns spot intensity factor', () => {
    const light = new SpotLight({
      distance: 10,
      decay: 2,
      angle: Math.PI / 4,
      penumbra: 0,
    });
    light.position = vec3(0, 5, 0);
    // 正下方 — 在锥内
    const atten = light.getAttenuationAt(vec3(0, 0, 0));
    expect(atten).toBeGreaterThan(0);
  });

  it('getAttenuationAt returns 0 outside cone', () => {
    const light = new SpotLight({
      angle: Math.PI / 8,  // 窄锥
      penumbra: 0,
    });
    light.position = vec3(0, 5, 0);
    // 水平远处 — 在锥外
    const atten = light.getAttenuationAt(vec3(100, 5, 0));
    expect(atten).toBe(0);
  });
});
